package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 자료실 API 통합테스트 (TDD Red — senior-dev 작성)
 *
 * 계약 문서: 설계/04_API계약.md §3 (자료실)
 * - 5개 엔드포인트 전부 비로그인 GET(permitAll) — 인증 헤더 없이 호출하는 것이 곧 계약 검증이다.
 * - 목록 응답은 기존 PageResponse 재사용(content·page·size·totalElements·totalPages·first·last).
 *
 * 이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class LibraryApiIntegrationTest extends ApiIntegrationTestSupport {

    private static final String KANJI = "/api/library/kanji";
    private static final String GRAMMAR = "/api/library/grammar";
    private static final String VOCABULARY = "/api/library/vocabulary";

    private JsonNode dataOf(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    // ── 한자 자료실 ─────────────────────────────────────────────────────────

    @Test
    void kanji_list_returns_first_page_in_learning_order_without_login() throws Exception {
        MvcResult result = mockMvc.perform(get(KANJI))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                // 기본 페이지 크기 60. 총계는 CourseCatalog에서 파생한다 — 코스가 열리면 자동으로 늘어난다
                .andExpect(jsonPath("$.data.content", hasSize(60)))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(60))
                .andExpect(jsonPath("$.data.totalElements").value(CourseCatalog.totalKanji()))
                // 페이지 수도 총계에서 파생한다(기본 크기 60)
                .andExpect(jsonPath("$.data.totalPages").value((CourseCatalog.totalKanji() + 59) / 60))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.last").value(false))
                // 학습 순서 = N5부터 (인수 8)
                // 한자 자료실의 첫 항목은 한자가 있는 가장 낮은 코스다(입문은 한자 0자라 빠진다)
                .andExpect(jsonPath("$.data.content[0].level").value("N5"))
                .andReturn();

        for (JsonNode kanji : dataOf(result).path("content")) {
            // 목록 항목: 글자·훈음·음독·훈독·레벨 (음독/훈독은 없는 쪽이 null 가능 — 인수 9)
            assertThat(kanji.path("letter").asText()).hasSize(1);
            assertThat(kanji.path("meaningKo").asText()).isNotBlank();
            assertThat(kanji.path("level").asText()).isIn("N5", "N4", "N3", "N2");
            assertThat(kanji.has("onyomi")).isTrue();
            assertThat(kanji.has("kunyomi")).isTrue();
        }
    }

    @Test
    void list_provides_both_filtered_and_total_counts() throws Exception {
        // 결과 개수 문구 "1,000자 중 350자" — totalElements(필터 후) + totalAll(전체) (§7-14 ①, 인수 5)
        mockMvc.perform(get(KANJI))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(CourseCatalog.totalKanji()))
                .andExpect(jsonPath("$.data.totalAll").value(CourseCatalog.totalKanji()));

        mockMvc.perform(get(KANJI).param("level", "N3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(350))
                .andExpect(jsonPath("$.data.totalAll").value(CourseCatalog.totalKanji()));

        // 검색으로 좁혀도 totalAll은 전체를 유지한다
        mockMvc.perform(get(GRAMMAR).param("hasRules", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(CourseCatalog.totalRuleTables()))
                .andExpect(jsonPath("$.data.totalAll").value(CourseCatalog.totalGrammar()));

        // 어휘도 동일 — totalAll은 병합 후 전체 개수
        MvcResult vocab = mockMvc.perform(get(VOCABULARY).param("q", "応援"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andReturn();
        JsonNode data = dataOf(vocab);
        assertThat(data.path("totalAll").asInt())
                .as("어휘 totalAll은 병합 후 전체 개수")
                .isGreaterThan(1).isLessThan(CourseCatalog.totalVocabulary());
    }

    @Test
    void kanji_list_level_filter_returns_only_that_level() throws Exception {
        // N3만 → 350자 (인수 10)
        MvcResult result = mockMvc.perform(get(KANJI).param("level", "N3").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(350))
                .andReturn();
        for (JsonNode kanji : dataOf(result).path("content")) {
            assertThat(kanji.path("level").asText()).isEqualTo("N3");
        }

        // 복수 선택(콤마 구분): N5(100) + N4(200) = 300
        mockMvc.perform(get(KANJI).param("level", "N5,N4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(300));
    }

    @Test
    void kanji_search_matches_letter_meaning_onyomi_kunyomi() throws Exception {
        // 글자·훈음(한국어)·음독·훈독 어느 것으로도 '人'이 나온다 (인수 11)
        for (String q : new String[]{"人", "사람", "ジン", "ひと"}) {
            MvcResult result = mockMvc.perform(get(KANJI).param("q", q))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode content = dataOf(result).path("content");
            assertThat(content.size()).as("검색어 '%s' 결과 수", q).isPositive();
            boolean found = false;
            for (JsonNode kanji : content) {
                if ("人".equals(kanji.path("letter").asText())) {
                    found = true;
                }
            }
            assertThat(found).as("검색어 '%s'로 '人'이 나와야 한다", q).isTrue();
        }
    }

    @Test
    void kanji_search_blank_query_returns_full_list() throws Exception {
        // 공백만 입력하면 검색 해제 = 전체 목록 (오류 아님)
        mockMvc.perform(get(KANJI).param("q", "   "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(CourseCatalog.totalKanji()));
    }

    @Test
    void kanji_detail_returns_words_and_learned_in() throws Exception {
        // 人 = 시드 id 11, N5 유닛 3 (인수 12·13)
        mockMvc.perform(get(KANJI + "/{kanjiId}", 11L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(11))
                .andExpect(jsonPath("$.data.letter").value("人"))
                .andExpect(jsonPath("$.data.meaningKo").value("사람 인"))
                .andExpect(jsonPath("$.data.onyomi").isNotEmpty())
                .andExpect(jsonPath("$.data.level").value("N5"))
                .andExpect(jsonPath("$.data.words[0].word").isNotEmpty())
                .andExpect(jsonPath("$.data.words[0].meaningKo").isNotEmpty())
                // "어디서 배우나" — 유닛 학습 화면으로 가는 역링크 (인수 13·32)
                .andExpect(jsonPath("$.data.learnedIn.courseId").value(2))
                .andExpect(jsonPath("$.data.learnedIn.courseTitle").value("왕초보"))
                .andExpect(jsonPath("$.data.learnedIn.level").value("N5"))
                .andExpect(jsonPath("$.data.learnedIn.unitNo").value(3))
                .andExpect(jsonPath("$.data.learnedIn.unitTitle").value("여기는 어디예요?"));
    }

    @Test
    void kanji_detail_not_found_returns_404() throws Exception {
        // 없는 상세 주소 (인수 34)
        mockMvc.perform(get(KANJI + "/{kanjiId}", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    // ── 문법 자료실 ─────────────────────────────────────────────────────────

    @Test
    void grammar_list_returns_every_grammar_with_level_and_has_rules() throws Exception {
        MvcResult result = mockMvc.perform(get(GRAMMAR))
                .andExpect(status().isOk())
                // 기본 페이지 크기 20. 총계는 CourseCatalog에서 파생한다 — 코스가 열리면 자동으로 늘어난다
                .andExpect(jsonPath("$.data.content", hasSize(20)))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(CourseCatalog.totalGrammar()))
                // 학습 순서 정렬이라 첫 항목은 가장 낮은 코스다. 레벨 코드는 course.level_code에서 온다(설계/03 §1·§3)
                .andExpect(jsonPath("$.data.content[0].level").value(CourseCatalog.COURSES.get(0).levelCode))
                .andReturn();

        for (JsonNode grammar : dataOf(result).path("content")) {
            assertThat(grammar.path("name").asText()).isNotBlank();
            assertThat(grammar.path("nameKo").asText()).isNotBlank();
            // 레벨 코드는 표에 있는 값 중 하나다 — 코스가 열리면 표만 고치면 된다
            assertThat(grammar.path("level").asText())
                    .isIn(CourseCatalog.available().stream().map(course -> course.levelCode).toList());
            assertThat(grammar.path("hasRules").isBoolean()).isTrue();
        }
    }

    @Test
    void grammar_list_has_rules_filter_returns_only_grammars_with_rule_table() throws Exception {
        // 활용표 있는 것만 = 규칙표 25건(N5 7 + N4 7 + N3 6 + N2 5 — 시드 기준) (인수 16)
        MvcResult result = mockMvc.perform(get(GRAMMAR).param("hasRules", "true").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = dataOf(result);
        assertThat(data.path("totalElements").asInt()).isEqualTo(CourseCatalog.totalRuleTables());
        for (JsonNode grammar : data.path("content")) {
            assertThat(grammar.path("hasRules").asBoolean())
                    .as("문법 '%s'는 활용표가 있어야 한다", grammar.path("name").asText())
                    .isTrue();
        }
    }

    @Test
    void grammar_search_matches_japanese_name_and_korean_subtitle() throws Exception {
        // 물결표 없이 'てから'로도 '〜たあとで・〜てから'가 나온다 (인수 17)
        MvcResult result = mockMvc.perform(get(GRAMMAR).param("q", "てから"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = dataOf(result).path("content");
        assertThat(content.size()).isPositive();
        boolean found = false;
        for (JsonNode grammar : content) {
            if (grammar.path("name").asText().contains("てから")) {
                found = true;
            }
        }
        assertThat(found).as("'てから' 검색으로 해당 문법이 나와야 한다").isTrue();

        // 한국어 부제로도 찾힌다 — '가능형' → 動詞可能形(동사 가능형 만들기)
        MvcResult koResult = mockMvc.perform(get(GRAMMAR).param("q", "가능형"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode koContent = dataOf(koResult).path("content");
        assertThat(koContent.size()).isPositive();
        boolean koFound = false;
        for (JsonNode grammar : koContent) {
            if (grammar.path("nameKo").asText().contains("가능형")) {
                koFound = true;
            }
        }
        assertThat(koFound).as("'가능형' 검색으로 해당 문법이 나와야 한다").isTrue();
    }

    @Test
    void grammar_detail_returns_examples_rules_and_learned_in() throws Exception {
        // 유닛 학습(§3-3)과 같은 내용 — 예문 전부 + 활용 규칙표 (인수 18)
        // grammar_point 37 = N5 유닛 18 동사 て형 (규칙표 있음)
        MvcResult result = mockMvc.perform(get(GRAMMAR + "/{grammarId}", 37L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(37))
                .andExpect(jsonPath("$.data.name").isNotEmpty())
                .andExpect(jsonPath("$.data.nameKo").isNotEmpty())
                .andExpect(jsonPath("$.data.explanation").isNotEmpty())
                .andExpect(jsonPath("$.data.level").value("N5"))
                .andExpect(jsonPath("$.data.learnedIn.courseId").value(2))
                .andExpect(jsonPath("$.data.learnedIn.unitNo").value(18))
                .andReturn();

        JsonNode data = dataOf(result);
        assertThat(data.path("examples").size()).isGreaterThanOrEqualTo(1);
        for (JsonNode example : data.path("examples")) {
            assertThat(example.path("jp").asText()).isNotBlank();
            assertThat(example.path("meaningKo").asText()).isNotBlank();
            assertThat(example.has("kana")).isTrue();
        }
        // て형은 규칙표 5행 이상 (§7-7)
        assertThat(data.path("rules").size()).isGreaterThanOrEqualTo(5);
        for (JsonNode rule : data.path("rules")) {
            assertThat(rule.path("groupLabel").asText()).isNotBlank();
            assertThat(rule.path("pattern").asText()).isNotBlank();
            assertThat(rule.path("exampleBefore").asText()).isNotBlank();
            assertThat(rule.path("exampleAfter").asText()).isNotBlank();
        }
    }

    @Test
    void grammar_detail_without_rules_returns_empty_rules_array() throws Exception {
        // 규칙표 없는 문법은 빈 배열 — 프론트가 빈 표를 그리지 않는다 (인수 19)
        mockMvc.perform(get(GRAMMAR + "/{grammarId}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.rules").isArray())
                .andExpect(jsonPath("$.data.rules", hasSize(0)));
    }

    @Test
    void grammar_detail_not_found_returns_404() throws Exception {
        mockMvc.perform(get(GRAMMAR + "/{grammarId}", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    // ── 어휘 자료실 (병합 — §7-13 ①) ────────────────────────────────────────

    @Test
    void vocabulary_list_returns_merged_rows_with_senses() throws Exception {
        MvcResult result = mockMvc.perform(get(VOCABULARY))
                .andExpect(status().isOk())
                // 기본 페이지 크기 50
                .andExpect(jsonPath("$.data.content", hasSize(50)))
                .andExpect(jsonPath("$.data.size").value(50))
                .andExpect(jsonPath("$.data.page").value(0))
                .andReturn();

        JsonNode data = dataOf(result);
        // 병합 후 개수 — 원본 합계보다 작아야 한다(표기+읽기가 같은 행이 합쳐지므로). 고정 숫자를 쓰지 않는다
        int total = data.path("totalElements").asInt();
        assertThat(total).isPositive().isLessThan(CourseCatalog.totalVocabulary());

        for (JsonNode vocab : data.path("content")) {
            assertThat(vocab.path("id").asLong()).isPositive();
            assertThat(vocab.path("word").asText()).isNotBlank();
            assertThat(vocab.has("kana")).as("kana는 null이어도 항상 직렬화(§2)").isTrue();
            assertThat(vocab.path("partOfSpeech").asText()).isNotBlank();
            assertThat(vocab.path("levels").size()).isGreaterThanOrEqualTo(1);
            assertThat(vocab.path("senses").size()).isGreaterThanOrEqualTo(1);
            // senses는 뜻 기준으로 합쳐지고 출처는 배열이다 (§7-17 ①)
            for (JsonNode sense : vocab.path("senses")) {
                assertThat(sense.path("meaningKo").asText()).isNotBlank();
                assertThat(sense.path("vocabularyIds").size()).isGreaterThanOrEqualTo(1);
                assertThat(sense.path("learnedIn").isArray()).as("learnedIn은 배열이다").isTrue();
                assertThat(sense.path("learnedIn").size()).isGreaterThanOrEqualTo(1);
                for (JsonNode learnedIn : sense.path("learnedIn")) {
                    assertThat(learnedIn.path("courseId").asLong()).isPositive();
                    assertThat(learnedIn.path("unitNo").asInt()).isPositive();
                    assertThat(learnedIn.path("unitTitle").asText()).isNotBlank();
                }
            }
            // 같은 뜻이 두 sense로 갈리지 않는다 — 화면에 "응원 · 응원"이 뜨는 결함 (인수 25)
            List<String> meanings = new ArrayList<>();
            for (JsonNode sense : vocab.path("senses")) {
                meanings.add(sense.path("meaningKo").asText());
            }
            assertThat(meanings)
                    .as("어휘 '%s'의 뜻 목록에 중복이 있다", vocab.path("word").asText())
                    .doesNotHaveDuplicates();
        }
    }

    @Test
    void vocabulary_same_word_and_kana_is_merged_into_one_row() throws Exception {
        // 応援(おうえん)은 N4·N3·N2 시드에 각각 있다 → 한 줄로 합쳐 나온다 (인수 25)
        MvcResult result = mockMvc.perform(get(VOCABULARY).param("q", "応援"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].word").value("応援"))
                .andExpect(jsonPath("$.data.content[0].kana").value("おうえん"))
                .andReturn();

        JsonNode row = dataOf(result).path("content").get(0);
        // 応援은 N4·N3 "응원" + N2 "지원" — 뜻은 2개로 합쳐진다("응원 · 응원 · 지원"이 아니다. 인수 25)
        assertThat(row.path("senses").size()).as("서로 다른 뜻의 개수만큼만 sense가 있어야 한다").isEqualTo(2);
        assertThat(row.path("senses").get(0).path("meaningKo").asText()).isEqualTo("응원");
        assertThat(row.path("senses").get(1).path("meaningKo").asText()).isEqualTo("지원");
        // 같은 뜻의 출처는 배열로 모인다 — "응원"은 N4·N3 두 곳에서 배운다 (인수 26)
        JsonNode firstSenseSources = row.path("senses").get(0).path("learnedIn");
        assertThat(firstSenseSources.size()).isEqualTo(2);
        assertThat(firstSenseSources.get(0).path("level").asText()).isEqualTo("N4");
        assertThat(firstSenseSources.get(1).path("level").asText()).isEqualTo("N3");
        // 레벨 배지는 해당 레벨 전부, 학습 순서
        assertThat(row.path("levels").toString()).contains("N4").contains("N3").contains("N2");
    }

    @Test
    void vocabulary_same_kana_but_different_word_stays_separate() throws Exception {
        // 병합 키는 "표기 + 읽기" — 읽기가 같아도 표기가 다르면 별개 단어다(동음이의). §7-17 ③
        MvcResult result = mockMvc.perform(get(VOCABULARY).param("q", "あつい"))
                .andExpect(status().isOk())
                .andReturn();

        List<String> words = new ArrayList<>();
        for (JsonNode vocab : dataOf(result).path("content")) {
            words.add(vocab.path("word").asText());
        }
        assertThat(words).as("暑い와 熱い는 읽기가 같아도 따로 나와야 한다").contains("暑い", "熱い");
    }

    @Test
    void vocabulary_level_filter_keeps_other_level_badges() throws Exception {
        // N2 필터에도 応援이 남고, levels에는 N4도 그대로 보인다 ("여기에도 나와요" — 기획 확정)
        MvcResult result = mockMvc.perform(get(VOCABULARY).param("q", "応援").param("level", "N2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andReturn();

        JsonNode row = dataOf(result).path("content").get(0);
        assertThat(row.path("levels").toString()).contains("N2").contains("N4");

        // 필터한 레벨의 뜻이 senses 앞에 온다 (§7-14 ③ — 필터 레벨 뜻이 먼저 읽혀야 한다)
        assertThat(row.path("senses").get(0).path("meaningKo").asText())
                .as("level=N2 필터 시 첫 sense는 N2에서 배우는 뜻이어야 한다")
                .isEqualTo("지원");
        assertThat(row.path("senses").get(0).path("learnedIn").get(0).path("level").asText()).isEqualTo("N2");
        // levels 배지는 정렬 규칙과 무관하게 항상 학습 순서(낮은 레벨 먼저)
        assertThat(row.path("levels").get(0).asText()).isEqualTo("N4");

        // 레벨 필터가 실제로 좁히기는 한다 — N5만 고르면 N5 어휘만
        MvcResult n5 = mockMvc.perform(get(VOCABULARY).param("level", "N5").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();
        for (JsonNode vocab : dataOf(n5).path("content")) {
            assertThat(vocab.path("levels").toString())
                    .as("어휘 '%s'는 N5에서 배우는 것이어야 한다", vocab.path("word").asText())
                    .contains("N5");
        }
    }

    @Test
    void vocabulary_part_of_speech_filter_works_with_level_filter() throws Exception {
        // 품사 단독 (인수 22)
        MvcResult result = mockMvc.perform(get(VOCABULARY).param("pos", "VERB").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = dataOf(result).path("content");
        assertThat(content.size()).isPositive();
        for (JsonNode vocab : content) {
            assertThat(vocab.path("partOfSpeech").asText()).isEqualTo("VERB");
        }

        // 품사 + 레벨 동시 — 두 조건을 모두 만족 (인수 22)
        MvcResult combined = mockMvc.perform(get(VOCABULARY)
                        .param("pos", "VERB").param("level", "N5").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode combinedData = dataOf(combined);
        assertThat(combinedData.path("totalElements").asInt())
                .isLessThanOrEqualTo(dataOf(result).path("totalElements").asInt());
        for (JsonNode vocab : combinedData.path("content")) {
            assertThat(vocab.path("partOfSpeech").asText()).isEqualTo("VERB");
            assertThat(vocab.path("levels").toString()).contains("N5");
        }
    }

    @Test
    void vocabulary_search_matches_word_kana_and_meaning() throws Exception {
        // 읽는 법(たてもの)·한국어 뜻(건물)로도 建物이 나온다 (인수 24)
        for (String q : new String[]{"建物", "たてもの", "건물"}) {
            MvcResult result = mockMvc.perform(get(VOCABULARY).param("q", q))
                    .andExpect(status().isOk())
                    .andReturn();

            boolean found = false;
            for (JsonNode vocab : dataOf(result).path("content")) {
                if ("建物".equals(vocab.path("word").asText())) {
                    found = true;
                }
            }
            assertThat(found).as("검색어 '%s'로 '建物'이 나와야 한다", q).isTrue();
        }
    }

    @Test
    void vocabulary_kana_sort_orders_katakana_together_with_hiragana() throws Exception {
        // 가나순 정렬 — 가타카나도 히라가나와 같은 자리에 섞여 정렬된다 (인수 23)
        MvcResult result = mockMvc.perform(get(VOCABULARY).param("sort", "KANA").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode content = dataOf(result).path("content");
        assertThat(content.size()).isPositive();

        String previous = null;
        for (JsonNode vocab : content) {
            String raw = vocab.path("kana").isNull() ? vocab.path("word").asText() : vocab.path("kana").asText();
            String key = toHiragana(raw);
            if (previous != null) {
                assertThat(key)
                        .as("가나순 정렬이 어긋났다: '%s' 뒤에 '%s'", previous, key)
                        .isGreaterThanOrEqualTo(previous);
            }
            previous = key;
        }
    }

    /** 가타카나 → 히라가나 (정렬 비교용 — 사용자에게 ア와 あ는 같은 자리) */
    private String toHiragana(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        text.codePoints().forEach(cp -> sb.appendCodePoint(cp >= 0x30A1 && cp <= 0x30F6 ? cp - 0x60 : cp));
        return sb.toString();
    }

    // ── 공통 규약 (페이지 보정·잘못된 필터·비로그인·SPA 라우트) ──────────────

    @Test
    void list_out_of_range_page_falls_back_to_first_page() throws Exception {
        // 999페이지 → 1페이지 내용 (인수 35 — 빈 화면 금지). 응답 page에도 실제 번호 0
        mockMvc.perform(get(KANJI).param("page", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.content", hasSize(60)))
                .andExpect(jsonPath("$.data.first").value(true));

        mockMvc.perform(get(VOCABULARY).param("page", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.content", hasSize(50)));
    }

    @Test
    void list_size_is_capped_at_100() throws Exception {
        // 과대 요청 방어 — 기존 max-page-size 정책과 동일
        mockMvc.perform(get(KANJI).param("size", "5000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.size").value(100))
                .andExpect(jsonPath("$.data.content", hasSize(100)));
    }

    @Test
    void invalid_filter_value_returns_400() throws Exception {
        // 조용히 무시하지 않는다 (§7-13 ④)
        mockMvc.perform(get(KANJI).param("level", "N9"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));

        mockMvc.perform(get(VOCABULARY).param("pos", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));

        mockMvc.perform(get(VOCABULARY).param("sort", "WRONG"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void search_with_no_result_returns_empty_page_not_error() throws Exception {
        // 0건은 오류가 아니다 — 빈 목록 + totalElements 0 (인수 33은 화면 문구, API는 정상 응답)
        mockMvc.perform(get(KANJI).param("q", "존재하지않는검색어"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(0)))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    void spa_library_routes_forward_to_index_without_login() throws Exception {
        // 링크 공유·새로고침 (인수 6)
        for (String path : new String[]{
                "/library", "/library/kanji", "/library/grammar", "/library/vocabulary"}) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }

        mockMvc.perform(get("/library/kanji/{id}", 11L))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
        mockMvc.perform(get("/library/grammar/{id}", 37L))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void unmapped_screen_path_forwards_to_spa_and_unmapped_api_returns_404() throws Exception {
        // 화면 경로: 없는 하위 경로도 SPA로 넘겨 프론트 404 화면이 뜨게 한다 (§7-17 ② — 지금은 500)
        for (String path : new String[]{
                "/library/zzz", "/library/vocabulary/1", "/courses/2/zzz", "/community/zzz"}) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }

        // API 경로: 404 JSON — 재시도해도 소용없다는 것이 드러나야 한다("다시 시도" 무한 반복 방지)
        for (String path : new String[]{
                "/api/library/foo", "/api/library/kanji/1/extra", "/api/courses/2/units/1/extra"}) {
            mockMvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
        }
    }

    @Test
    void grammar_has_rules_accepts_only_boolean_values() throws Exception {
        // false = 필터 미적용(전체), 그 밖의 값은 400 (§7-17 ④ — 계약을 코드에 맞춰 확정)
        mockMvc.perform(get(GRAMMAR).param("hasRules", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(CourseCatalog.totalGrammar()));

        mockMvc.perform(get(GRAMMAR).param("hasRules", "xyz"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("TYPE_MISMATCH"));
    }
}

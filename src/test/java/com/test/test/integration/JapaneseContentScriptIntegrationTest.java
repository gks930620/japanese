package com.test.test.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 일본어 콘텐츠의 <b>문자 종류</b> 전수 검증 (설계/06 §2 · 설계/03 테이블 정의) — senior-dev 작성, 2026-09-21.
 *
 * <p><b>왜 이 파일이 생겼나</b>: `grammar_point.name`은 <b>일본어 명칭</b>, `name_ko`는 <b>한국어 부제</b>라고
 * 설계/06 §2와 설계/03이 적어 두었지만 <b>그 규칙을 지키는 테스트가 없었다.</b> 그래서 문법 295개 중 한 건
 * (`5017 '〜いかん 계열'`)이 한국어 낱말을 이름에 달고 운영까지 나갔고, QA가 N1 진단 보기에서 우연히 발견했다
 * (2026-09-21 QA 결함 B — 80시드 중 8회 노출).
 *
 * <p><b>왜 "눈에 띄는 것"이 결함인가</b>: N2·N1 진단은 <b>보기도 일본어</b>다(설계/09 §3-4).
 * 보기 다섯 중 하나만 한글이면 학습자가 <b>뜻을 몰라도 그 보기를 골라낼 수 있다</b> — 측정이 흐려진다.
 * 문법 이름은 진단·확인 문제의 오답 풀(설계/09 §1-2 `GRAMMAR_CLOZE`)로 그대로 쓰이므로,
 * 이름 한 건의 표기 사고가 <b>다른 문항의 보기</b>까지 오염시킨다.
 *
 * <p><b>왜 사람이 아니라 테스트가 잡아야 하나</b>: 이건 화면을 열어 보면 보이는 종류의 결함이 아니다.
 * 295개 중 1개, 그것도 무작위로 뽑히는 보기 자리에서만 드러난다. 콘텐츠는 앞으로도 계속 늘어나므로
 * 전수 순회가 유일하게 믿을 만한 관문이다(설계/06 §9 — "문서에만 적힌 계약은 지켜지지 않는다").
 *
 * <p><b>영어 과정은 대상이 아니다</b>: 영어 문법의 `name`은 `be동사 현재형`처럼 <b>한국어가 정상</b>이다
 * (설계/06 §11-8). 그래서 여기서는 일본어 자료실(`/api/library/*`)만 훑고, 영어(`/api/en/library/*`)는
 * {@code EnglishContentRuleIntegrationTest}가 자기 규칙으로 본다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class JapaneseContentScriptIntegrationTest extends ApiIntegrationTestSupport {

    /** 한글 음절 + 자모 — 일본어 콘텐츠의 일본어 자리에 있어서는 안 되는 문자 */
    private static final Pattern HANGUL = Pattern.compile("[\\uAC00-\\uD7A3\\u3130-\\u318F]");

    /** 히라가나 · 가타카나 · 한자 — 하나라도 있어야 "일본어 명칭"이다 */
    private static final Pattern JAPANESE = Pattern.compile("[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF]");

    /** 자료실 목록 API의 size 상한 (설계/04 §3-1) */
    private static final int PAGE_SIZE = 100;

    /**
     * 문법 이름은 일본어, 부제는 한국어. <b>둘을 한 테스트에서 보는 이유</b>는 이것이 한 쌍의 규칙이기 때문이다 —
     * 이름에서 한국어를 빼는 것만 강제하면 "한국어 설명을 이름에 넣고 싶은 충동"의 출구(부제)가 있다는 사실이 사라진다.
     */
    @Test
    void grammar_name_is_japanese_and_name_ko_is_korean() throws Exception {
        List<JsonNode> grammars = allLibraryItems("/api/library/grammar");
        assertThat(grammars).as("일본어 자료실 문법 전수 — 한 건도 못 읽었다면 순회 자체가 깨진 것이다").isNotEmpty();

        for (JsonNode grammar : grammars) {
            String where = "문법 " + grammar.path("id").asInt();
            String name = text(grammar.path("name"));
            String nameKo = text(grammar.path("nameKo"));

            assertNoHangul(name, where + " name");
            assertThat(JAPANESE.matcher(name).find())
                    .as("%s name '%s' — 일본어 명칭이어야 한다(설계/06 §2). 한국어 설명은 nameKo의 자리다", where, name)
                    .isTrue();
            assertThat(HANGUL.matcher(nameKo).find())
                    .as("%s nameKo '%s' — 한국어 부제여야 한다(설계/06 §2). 여기가 비면 학습자가 읽을 줄이 없다",
                            where, nameKo)
                    .isTrue();
        }
    }

    /**
     * 한자·어휘의 일본어 자리에도 한글이 섞이지 않는다. 문법 이름과 <b>같은 종류의 사고</b>이고,
     * 이 값들도 퀴즈·진단의 지문과 보기로 그대로 나간다(설계/09 §1-2).
     *
     * <p>뜻(`meaningKo`)·품사·출처는 한국어가 정상이므로 검사 대상이 아니다 — <b>필드를 지정해서</b> 본다.
     */
    @Test
    void kanji_and_vocabulary_japanese_fields_carry_no_hangul() throws Exception {
        for (JsonNode kanji : allLibraryItems("/api/library/kanji")) {
            String where = "한자 '" + text(kanji.path("letter")) + "'";
            assertNoHangul(text(kanji.path("letter")), where + " letter");
            assertNoHangul(text(kanji.path("onyomi")), where + " onyomi");
            assertNoHangul(text(kanji.path("kunyomi")), where + " kunyomi");
        }

        for (JsonNode vocabulary : allLibraryItems("/api/library/vocabulary")) {
            String where = "어휘 '" + text(vocabulary.path("word")) + "'";
            assertNoHangul(text(vocabulary.path("word")), where + " word");
            assertNoHangul(text(vocabulary.path("kana")), where + " kana");
        }
    }

    private void assertNoHangul(String value, String where) {
        assertThat(HANGUL.matcher(value).find())
                .as("%s에 한글이 섞였다: '%s' — 일본어 콘텐츠의 일본어 자리다(설계/06 §2)."
                        + " N2·N1 진단은 보기도 일본어라, 한 보기만 한글이면 뜻을 몰라도 눈에 띈다(설계/09 §3-4)", where, value)
                .isFalse();
    }

    /** null·누락은 빈 문자열로 — 값이 없는 것은 이 테스트의 관심사가 아니다(그건 각 콘텐츠 계약의 몫이다) */
    private String text(JsonNode node) {
        return node.isNull() || node.isMissingNode() ? "" : node.asText();
    }

    /** 자료실 목록을 마지막 페이지까지 이어 붙인다 — 한자 1,350건·어휘 1,734건이라 한 번에 오지 않는다 */
    private List<JsonNode> allLibraryItems(String path) throws Exception {
        List<JsonNode> items = new ArrayList<>();
        int page = 0;
        while (true) {
            MvcResult result = mockMvc.perform(get(path)
                            .param("page", String.valueOf(page))
                            .param("size", String.valueOf(PAGE_SIZE)))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
            JsonNode content = data.path("content");
            for (JsonNode item : content) {
                items.add(item);
            }
            if (content.size() == 0 || data.path("last").asBoolean() || page >= data.path("totalPages").asInt()) {
                return items;
            }
            page++;
        }
    }
}

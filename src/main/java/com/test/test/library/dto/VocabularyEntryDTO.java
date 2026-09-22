package com.test.test.library.dto;

import com.test.test.library.repository.VocabularyRow;
import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 어휘 자료실 목록 1행 = 병합 단위 (설계 §4-B-5, §7-13 ①)
 *
 * <ul>
 *   <li>병합 키는 표기(word) + 읽기(일본어 {@code kana} · 영어 {@code ipa}) 둘 다 — 읽기가 다르면 별개 행</li>
 *   <li>{@code id}·{@code partOfSpeech}는 그룹에서 학습 순서가 가장 이른 항목의 값(§7-14 ②)</li>
 *   <li>{@code levels}는 정렬 규칙과 무관하게 항상 학습 순서(낮은 레벨 먼저)</li>
 *   <li>{@code senses}는 펼침용 추가 호출이 없도록 목록에 미리 싣는다(§7-13 ②)</li>
 *   <li>{@code senses}는 <b>뜻(meaningKo) 기준으로 합친 목록</b>이라 개수 = 서로 다른 뜻의 개수다(§7-17 ①).
 *       같은 뜻을 여러 코스에서 배우면 출처가 {@code learnedIn} 배열로 모인다</li>
 * </ul>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyEntryDTO {

    private Long id;
    private String word;
    private String kana;
    /**
     * 발음 — 영어 어휘만 값이 있고 일본어는 항상 null이다(계약 J-8 · 판정 §7-3).
     * <b>필드를 언어별로 빼지 않는다</b>: 04 §1-3이 "필드 없음과 값이 null인 것을 프론트가 구분하지 않아도 되게 한다"이고,
     * 언어마다 필드 유무가 갈리면 그 규칙이 깨진다. 화면은 kana 열과 같은 방식으로 null이면 아무것도 그리지 않는다.
     */
    private String ipa;
    private String koApprox;
    private String partOfSpeech;
    private List<String> levels;
    private List<SenseDTO> senses;

    /**
     * @param learningOrderedRows 병합 그룹의 원본 행 — 학습 순서(대표값·levels의 근거)
     * @param senseGroups         같은 행들을 뜻 기준으로 묶고(§7-17 ①) senses 정렬 규칙(§4-B-5)대로
     *                            늘어놓은 것. 묶음 안의 행 순서는 학습 순서다
     */
    public static VocabularyEntryDTO of(List<VocabularyRow> learningOrderedRows,
                                        List<List<VocabularyRow>> senseGroups) {
        VocabularyRow representative = learningOrderedRows.get(0);
        return VocabularyEntryDTO.builder()
                .id(representative.getId())
                .word(representative.getWord())
                .kana(representative.getKana())
                // 병합 표제어의 발음은 대표 행의 값이다 — 표기+읽기가 같은 것끼리 묶였으니 발음도 하나다(판정 §7-3).
                // 영어의 읽기가 ipa가 되면서(08 A-8) 이 문장이 영어에서도 참이 됐다 — 그룹의 모든 행이 같은 ipa다
                .ipa(representative.getIpa())
                .koApprox(representative.getKoApprox())
                .partOfSpeech(representative.getPartOfSpeech() == null
                        ? null : representative.getPartOfSpeech().name())
                .levels(learningOrderedRows.stream()
                        .map(VocabularyRow::getLevelCode)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList())
                .senses(senseGroups.stream().map(SenseDTO::from).toList())
                .build();
    }

    /**
     * 뜻 1개 (설계 §4-B-5 · §7-17 ①)
     *
     * <p>같은 뜻이 여러 코스에 나오면 sense를 나누지 않고 출처만 모은다 — 화면에 "응원 · 응원"이
     * 반복되던 결함의 근본 대응이다. 그래서 {@code vocabularyIds}·{@code learnedIn}이 배열이다.</p>
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SenseDTO {

        private String meaningKo;
        private List<Long> vocabularyIds;
        private List<LearnedInDTO> learnedIn;

        /** @param sameMeaningRows 뜻이 같은 원본 행들 — 학습 순서 */
        public static SenseDTO from(List<VocabularyRow> sameMeaningRows) {
            return SenseDTO.builder()
                    .meaningKo(sameMeaningRows.get(0).getMeaningKo().trim())
                    .vocabularyIds(sameMeaningRows.stream().map(VocabularyRow::getId).toList())
                    .learnedIn(sameMeaningRows.stream()
                            .map(row -> LearnedInDTO.of(row.getCourseId(), row.getCourseTitle(),
                                    row.getLevelCode(), row.getUnitNo(), row.getUnitTitle()))
                            .toList())
                    .build();
        }
    }
}

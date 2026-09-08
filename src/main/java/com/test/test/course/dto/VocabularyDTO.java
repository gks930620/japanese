package com.test.test.course.dto;

import com.test.test.course.content.VocabularyEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유닛 학습의 어휘 DTO (설계 §3-3 vocabularies[])
 * kana는 단어가 전부 가나면 null (화면은 "─" 표기 — 설계 §2).
 * partOfSpeech(§7-12)는 enum 코드 문자열 — 한국어 라벨은 내려주지 않는다(프론트 상수 매핑).
 *
 * <p>{@code entryId}(설계/04 §6-1)는 그 어휘가 속한 <b>자료실 표제어 행의 id</b>다 —
 * ★ 판정의 대상 id가 되어, 같은 단어를 유닛에서 담았을 때와 자료실에서 담았을 때가 같은 항목이 된다.
 * 표기+읽기가 같은 행이 하나뿐이면 {@code id}와 같은 값이다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyDTO {

    private Long id;
    private Long entryId;
    private String word;
    private String kana;
    private String meaningKo;
    private String partOfSpeech;

    public static VocabularyDTO from(VocabularyEntity entity, Long entryId) {
        return VocabularyDTO.builder()
                .id(entity.getId())
                .entryId(entryId)
                .word(entity.getWord())
                .kana(entity.getKana())
                .meaningKo(entity.getMeaningKo())
                .partOfSpeech(entity.getPartOfSpeech() == null ? null : entity.getPartOfSpeech().name())
                .build();
    }
}

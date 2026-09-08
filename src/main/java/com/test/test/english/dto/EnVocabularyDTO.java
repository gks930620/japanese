package com.test.test.english.dto;

import com.test.test.course.content.VocabularyEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 유닛 학습의 어휘 DTO (설계/04 §8-1) — 일본어 {@code VocabularyDTO}에서 {@code kana} 자리가
 * {@code ipa} + {@code koApprox} 두 필드로 바뀐 것이다(판정 J-8 · 08 F-18).
 *
 * <p>DTO를 따로 두는 이유: 하나로 합치면 일본어 응답에 항상 {@code null}인 {@code ipa}가,
 * 영어 응답에 항상 {@code null}인 {@code kana}가 붙는다. 클라이언트가 "이 필드는 언제 값이 있나"를
 * 다시 배워야 하고, 그 지식은 문서 밖에서 갈린다.</p>
 *
 * <p>{@code entryId}(설계/04 §6-1)는 일본어와 같은 뜻이다 — 그 어휘가 속한 자료실 표제어 행의 id.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnVocabularyDTO {

    private Long id;
    private Long entryId;
    private String word;
    private String ipa;
    private String koApprox;
    private String meaningKo;
    private String partOfSpeech;

    public static EnVocabularyDTO from(VocabularyEntity entity, Long entryId) {
        return EnVocabularyDTO.builder()
                .id(entity.getId())
                .entryId(entryId)
                .word(entity.getWord())
                .ipa(entity.getIpa())
                .koApprox(entity.getKoApprox())
                .meaningKo(entity.getMeaningKo())
                .partOfSpeech(entity.getPartOfSpeech() == null ? null : entity.getPartOfSpeech().name())
                .build();
    }
}

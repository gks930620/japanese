package com.test.test.editor.dto;

import com.test.test.course.content.VocabularyEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 어휘 수정 응답 (설계/04 §9) — 저장 후 값. 표제(word)는 언제나 원래 값이다 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorVocabularyDTO {

    private Long id;
    private String word;
    private String kana;
    private String meaningKo;
    private String partOfSpeech;

    public static EditorVocabularyDTO from(VocabularyEntity vocabulary) {
        return EditorVocabularyDTO.builder()
                .id(vocabulary.getId())
                .word(vocabulary.getWord())
                .kana(vocabulary.getKana())
                .meaningKo(vocabulary.getMeaningKo())
                .partOfSpeech(vocabulary.getPartOfSpeech() == null ? null : vocabulary.getPartOfSpeech().name())
                .build();
    }
}

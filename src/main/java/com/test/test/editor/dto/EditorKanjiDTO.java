package com.test.test.editor.dto;

import com.test.test.course.content.KanjiEntity;
import com.test.test.course.content.KanjiWordEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 한자 수정 응답 (설계/04 §9) — <b>저장 후 값</b>이다. 화면은 이 값으로 즉시 갱신한다(A9) */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorKanjiDTO {

    private Long id;
    private String letter;
    private String meaningKo;
    private String onyomi;
    private String kunyomi;
    private List<WordDTO> words;

    public static EditorKanjiDTO from(KanjiEntity kanji) {
        return EditorKanjiDTO.builder()
                .id(kanji.getId())
                .letter(kanji.getLetter())
                .meaningKo(kanji.getMeaningKo())
                .onyomi(kanji.getOnyomi())
                .kunyomi(kanji.getKunyomi())
                .words(kanji.getWords().stream().map(WordDTO::from).toList())
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WordDTO {

        private Long id;
        private String word;
        private String kana;
        private String meaningKo;

        public static WordDTO from(KanjiWordEntity word) {
            return WordDTO.builder()
                    .id(word.getId())
                    .word(word.getWord())
                    .kana(word.getKana())
                    .meaningKo(word.getMeaningKo())
                    .build();
        }
    }
}

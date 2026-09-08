package com.test.test.course.dto;

import com.test.test.course.content.KanjiEntity;
import com.test.test.course.content.KanjiWordEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유닛 학습의 한자 카드 DTO (설계 §3-3 kanjis[])
 * onyomi/kunyomi는 각각 null 가능하되 둘 다 null 금지 (데이터 검증 책임).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KanjiDTO {

    private Long id;
    private String letter;
    private String meaningKo;
    private String onyomi;
    private String kunyomi;
    private List<WordDTO> words;

    public static KanjiDTO from(KanjiEntity entity) {
        return KanjiDTO.builder()
                .id(entity.getId())
                .letter(entity.getLetter())
                .meaningKo(entity.getMeaningKo())
                .onyomi(entity.getOnyomi())
                .kunyomi(entity.getKunyomi())
                .words(entity.getWords().stream().map(WordDTO::from).toList())
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WordDTO {
        // 편집 패널이 PUT /api/editor/kanji의 words[].id를 이 값으로 조립한다(설계/04 §9) — 추가 필드라 기존 화면은 무해
        private Long id;
        private String word;
        private String kana;
        private String meaningKo;

        public static WordDTO from(KanjiWordEntity entity) {
            return WordDTO.builder()
                    .id(entity.getId())
                    .word(entity.getWord())
                    .kana(entity.getKana())
                    .meaningKo(entity.getMeaningKo())
                    .build();
        }
    }
}

package com.test.test.library.dto;

import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.KanjiEntity;
import com.test.test.course.content.KanjiWordEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 한자 자료실 상세 (설계 §4-B-2)
 * 예시 단어는 유닛 학습과 같은 데이터(kanji_word), learnedIn은 이 한자를 배우는 유닛으로의 역링크.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KanjiDetailDTO {

    private Long id;
    private String letter;
    private String meaningKo;
    private String onyomi;
    private String kunyomi;
    private String level;
    private List<WordDTO> words;
    private LearnedInDTO learnedIn;

    public static KanjiDetailDTO from(KanjiEntity entity, CourseUnitEntity unit) {
        LearnedInDTO learnedIn = LearnedInDTO.from(unit);
        return KanjiDetailDTO.builder()
                .id(entity.getId())
                .letter(entity.getLetter())
                .meaningKo(entity.getMeaningKo())
                .onyomi(entity.getOnyomi())
                .kunyomi(entity.getKunyomi())
                .level(learnedIn.getLevel())
                .words(entity.getWords().stream().map(WordDTO::from).toList())
                .learnedIn(learnedIn)
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WordDTO {

        // 편집 패널이 PUT /api/editor/kanji의 words[].id를 <b>지금 보고 있는 응답</b>에서 조립한다(설계/04 §9).
        // 유닛 학습 DTO에만 넣고 여기서 빠뜨리면 자료실에서 연 편집은 항상 400이 된다.
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

package com.test.test.library.dto;

import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.GrammarExampleEntity;
import com.test.test.course.content.GrammarPointEntity;
import com.test.test.course.content.GrammarRuleEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 문법 자료실 상세 (설계 §4-B-4)
 * examples·rules는 유닛 학습(§3-3)과 동일한 형태·동일한 데이터 — 콘텐츠를 두 번 만들지 않는다.
 * rules는 없으면 빈 배열(null 아님) — 프론트가 rules.length로 표 표시 여부를 정한다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrammarDetailDTO {

    private Long id;
    private String name;
    private String nameKo;
    private String explanation;
    private String level;
    private List<ExampleDTO> examples;
    private List<RuleDTO> rules;
    private LearnedInDTO learnedIn;

    public static GrammarDetailDTO from(GrammarPointEntity entity, CourseUnitEntity unit) {
        LearnedInDTO learnedIn = LearnedInDTO.from(unit);
        return GrammarDetailDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .nameKo(entity.getNameKo())
                .explanation(entity.getExplanation())
                .level(learnedIn.getLevel())
                .examples(entity.getExamples().stream().map(ExampleDTO::from).toList())
                .rules(entity.getRules().stream().map(RuleDTO::from).toList())
                .learnedIn(learnedIn)
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExampleDTO {

        // 편집 패널이 PUT /api/editor/grammar의 examples[].id를 이 값으로 조립한다(설계/04 §9)
        private Long id;
        private String jp;
        private String kana;
        private String meaningKo;

        public static ExampleDTO from(GrammarExampleEntity entity) {
            return ExampleDTO.builder()
                    .id(entity.getId())
                    .jp(entity.getJp())
                    .kana(entity.getKana())
                    .meaningKo(entity.getMeaningKo())
                    .build();
        }
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RuleDTO {

        private String groupLabel;
        private String pattern;
        private String exampleBefore;
        private String exampleAfter;

        public static RuleDTO from(GrammarRuleEntity entity) {
            return RuleDTO.builder()
                    .groupLabel(entity.getGroupLabel())
                    .pattern(entity.getPattern())
                    .exampleBefore(entity.getExampleBefore())
                    .exampleAfter(entity.getExampleAfter())
                    .build();
        }
    }
}

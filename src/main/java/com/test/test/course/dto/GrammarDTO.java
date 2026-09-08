package com.test.test.course.dto;

import com.test.test.course.content.GrammarExampleEntity;
import com.test.test.course.content.GrammarPointEntity;
import com.test.test.course.content.GrammarRuleEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유닛 학습의 문법 항목 DTO (설계 §3-3 grammars[])
 * 예문 3줄 스택: jp / kana(원문이 전부 가나면 null — 필드는 항상 직렬화) / meaningKo.
 * rules(§7-7)는 항상 배열 — 규칙 없는 문법은 빈 배열 [] (null 아님).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrammarDTO {

    private Long id;
    private String name;
    private String nameKo;
    private String explanation;
    private List<ExampleDTO> examples;
    private List<RuleDTO> rules;

    public static GrammarDTO from(GrammarPointEntity entity) {
        return GrammarDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .nameKo(entity.getNameKo())
                .explanation(entity.getExplanation())
                .examples(entity.getExamples().stream().map(ExampleDTO::from).toList())
                .rules(entity.getRules().stream().map(RuleDTO::from).toList())
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

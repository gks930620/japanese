package com.test.test.editor.dto;

import com.test.test.course.content.GrammarExampleEntity;
import com.test.test.course.content.GrammarPointEntity;
import com.test.test.course.content.GrammarRuleEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 문법 수정 응답 (설계/04 §9) — 저장 후 값. 활용표는 교체 후 배열 순서 그대로다 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorGrammarDTO {

    private Long id;
    private String name;
    private String nameKo;
    private String explanation;
    private List<ExampleDTO> examples;
    private List<RuleDTO> rules;

    public static EditorGrammarDTO from(GrammarPointEntity grammar) {
        return EditorGrammarDTO.builder()
                .id(grammar.getId())
                .name(grammar.getName())
                .nameKo(grammar.getNameKo())
                .explanation(grammar.getExplanation())
                .examples(grammar.getExamples().stream().map(ExampleDTO::from).toList())
                .rules(grammar.getRules().stream().map(RuleDTO::from).toList())
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExampleDTO {

        private Long id;
        private String jp;
        private String kana;
        private String meaningKo;

        public static ExampleDTO from(GrammarExampleEntity example) {
            return ExampleDTO.builder()
                    .id(example.getId())
                    .jp(example.getJp())
                    .kana(example.getKana())
                    .meaningKo(example.getMeaningKo())
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

        public static RuleDTO from(GrammarRuleEntity rule) {
            return RuleDTO.builder()
                    .groupLabel(rule.getGroupLabel())
                    .pattern(rule.getPattern())
                    .exampleBefore(rule.getExampleBefore())
                    .exampleAfter(rule.getExampleAfter())
                    .build();
        }
    }
}

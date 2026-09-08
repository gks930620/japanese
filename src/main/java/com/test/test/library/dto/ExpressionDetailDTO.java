package com.test.test.library.dto;

import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.ExpressionEntity;
import com.test.test.course.content.ExpressionExampleEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 표현 자료실 상세 (설계/04 §8-2) — {@link GrammarDetailDTO}와 같은 형태.
 * examples는 유닛 학습과 동일한 데이터다 — 자료실을 위해 콘텐츠를 두 번 만들지 않는다(01 §4).
 * examples는 없으면 빈 배열(null 아님) — 배열은 절대 null이 아니다(04 §1-3).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpressionDetailDTO {

    private Long id;
    private String text;
    private String meaningKo;
    private String usageNote;
    private String ipa;
    private String koApprox;
    private String level;
    private List<ExampleDTO> examples;
    private LearnedInDTO learnedIn;

    public static ExpressionDetailDTO from(ExpressionEntity entity, CourseUnitEntity unit) {
        LearnedInDTO learnedIn = LearnedInDTO.from(unit);
        return ExpressionDetailDTO.builder()
                .id(entity.getId())
                .text(entity.getText())
                .meaningKo(entity.getMeaningKo())
                .usageNote(entity.getUsageNote())
                .ipa(entity.getIpa())
                .koApprox(entity.getKoApprox())
                .level(learnedIn.getLevel())
                .examples(entity.getExamples().stream().map(ExampleDTO::from).toList())
                .learnedIn(learnedIn)
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExampleDTO {

        private Long id;
        private String en;
        private String meaningKo;

        public static ExampleDTO from(ExpressionExampleEntity entity) {
            return ExampleDTO.builder()
                    .id(entity.getId())
                    .en(entity.getEn())
                    .meaningKo(entity.getMeaningKo())
                    .build();
        }
    }
}

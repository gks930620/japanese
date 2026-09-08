package com.test.test.course.dto;

import com.test.test.course.content.ExpressionEntity;
import com.test.test.course.content.ExpressionExampleEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 유닛 학습의 표현 DTO (설계/04 §8-1 expressions[]) — 일본어 유닛의 {@link KanjiDTO} 자리다.
 *
 * <p>발음은 {@code ipa} + {@code koApprox} 두 가지를 <b>둘 다</b> 내려준다(08 F-18) — 화면이 고르는 것이
 * 아니라 나란히 표기한다. kana 필드는 없다(계약 J-8).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpressionDTO {

    private Long id;
    private String text;
    private String meaningKo;
    private String usageNote;
    private String ipa;
    private String koApprox;
    private List<ExampleDTO> examples;

    public static ExpressionDTO from(ExpressionEntity entity) {
        return ExpressionDTO.builder()
                .id(entity.getId())
                .text(entity.getText())
                .meaningKo(entity.getMeaningKo())
                .usageNote(entity.getUsageNote())
                .ipa(entity.getIpa())
                .koApprox(entity.getKoApprox())
                .examples(entity.getExamples().stream().map(ExampleDTO::from).toList())
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

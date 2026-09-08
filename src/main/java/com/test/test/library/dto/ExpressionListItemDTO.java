package com.test.test.library.dto;

import com.test.test.library.repository.ExpressionRow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 표현 자료실 목록 항목 (설계/04 §8-2) — {@link GrammarListItemDTO}와 같은 자리다.
 * {@code level}은 {@code course.level_code} 값 그대로다(E1~E5) — 프론트가 이 값을 가공 없이 필터에 넣는다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpressionListItemDTO {

    private Long id;
    private String text;
    private String meaningKo;
    private String ipa;
    private String koApprox;
    private String level;

    public static ExpressionListItemDTO from(ExpressionRow row) {
        return ExpressionListItemDTO.builder()
                .id(row.getId())
                .text(row.getText())
                .meaningKo(row.getMeaningKo())
                .ipa(row.getIpa())
                .koApprox(row.getKoApprox())
                .level(row.getLevelCode())
                .build();
    }
}

package com.test.test.library.dto;

import com.test.test.library.repository.GrammarRow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 문법 자료실 목록 항목 (설계 §4-B-3)
 * hasRules = 활용 규칙표(grammar_rule) 보유 여부 — 프론트의 "활용표 있는 것만" 배지·필터 표시 근거.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrammarListItemDTO {

    private Long id;
    private String name;
    private String nameKo;
    private String level;
    private boolean hasRules;

    public static GrammarListItemDTO from(GrammarRow row, boolean hasRules) {
        return GrammarListItemDTO.builder()
                .id(row.getId())
                .name(row.getName())
                .nameKo(row.getNameKo())
                .level(row.getLevelCode())
                .hasRules(hasRules)
                .build();
    }
}

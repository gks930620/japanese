package com.test.test.library.dto;

import com.test.test.library.repository.KanjiRow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 한자 자료실 목록 항목 (설계 §4-B-1)
 * onyomi·kunyomi는 없는 쪽이 null 가능하되 필드는 항상 직렬화한다(§2).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KanjiListItemDTO {

    private Long id;
    private String letter;
    private String meaningKo;
    private String onyomi;
    private String kunyomi;
    /** 레벨 코드(설계/03 §1·§3) — course.level_code 값 그대로다. 프론트는 이 값을 필터에 그대로 넣는다 */
    private String level;

    public static KanjiListItemDTO from(KanjiRow row) {
        return KanjiListItemDTO.builder()
                .id(row.getId())
                .letter(row.getLetter())
                .meaningKo(row.getMeaningKo())
                .onyomi(row.getOnyomi())
                .kunyomi(row.getKunyomi())
                .level(row.getLevelCode())
                .build();
    }
}

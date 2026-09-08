package com.test.test.library.repository;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 한자 목록 조회 프로젝션 (설계 §4-B-7 — 매핑·유닛·코스를 조인해 DTO로 직접 프로젝션, N+1 회피)
 * level은 course.level_code를 그대로 담는다 — courseNo 파생을 폐기했다(설계/03 §1·§3 판정 J-4).
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class KanjiRow {

    private Long id;
    private String letter;
    private String meaningKo;
    private String onyomi;
    private String kunyomi;
    private String levelCode;
}

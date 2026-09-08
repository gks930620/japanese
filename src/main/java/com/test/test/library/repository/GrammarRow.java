package com.test.test.library.repository;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 문법 목록 조회 프로젝션 (설계 §4-B-3, 성능 §4-B-7)
 * hasRules는 규칙표 보유 문법 id 집합(요청당 1회 조회)과 대조해 채운다 — 문법당 추가 쿼리를 만들지 않는다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class GrammarRow {

    private Long id;
    private String name;
    private String nameKo;
    private String levelCode;
}

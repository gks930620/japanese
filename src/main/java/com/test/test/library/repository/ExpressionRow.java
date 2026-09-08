package com.test.test.library.repository;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 표현 목록 조회 프로젝션 (설계/04 §8-2 자료실 표현 탭) — {@link GrammarRow}와 같은 자리다.
 * 발음 두 표기(ipa·koApprox)를 목록에서 이미 싣는다 — 표현 목록의 주된 쓸모가 "소리 내어 읽어 보기"라서다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ExpressionRow {

    private Long id;
    private String text;
    private String meaningKo;
    private String ipa;
    private String koApprox;
    private String levelCode;
}

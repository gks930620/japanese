package com.test.test.common.paging;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * 정렬은 <b>서버가 정한다</b> — 클라이언트 {@code Pageable}에서 {@code sort}를 떼어낸다
 * (설계/04 §1-5 · 08 C-26, 2026-09-21 qa 결함 B).
 *
 * <p><b>왜 검증이 아니라 제거인가</b>: {@code ?sort=nope,desc}가 500을 낸 원인은 <b>클라이언트 입력이
 * JPA 속성 경로로 들어갔다</b>는 것이다({@code PropertyReferenceException}). 허용 목록으로 걸러도 그 길은 남는다 —
 * 길 자체를 없애는 것이 정렬 주입의 정석 방어다. 목록의 순서는 리포지토리 {@code @Query}의
 * {@code ORDER BY}가 단일 출처다.</p>
 *
 * <p><b>왜 400이 아닌가</b>: {@code sort}는 계약에 없는 파라미터다. 계약에 없는 쿼리 파라미터를 거절하기 시작하면
 * {@code utm_*}이 붙은 공유 링크에서 화면이 깨진다. 계약에 <b>있는</b> 파라미터의 잘못된 값만 400이다
 * (자료실의 {@code sort=LEARNING|KANA} — 이름만 같을 뿐 다른 것이다).</p>
 *
 * <p>페이징은 계약이므로 <b>번호·크기는 그대로</b> 살린다. {@code PageClamp.query}가 범위 밖 재조회에서
 * {@code pageable.getSort()}를 다시 쓰므로, 제거는 <b>PageClamp에 넘기기 전에</b> 해야 한다.</p>
 */
public final class ClientSort {

    private ClientSort() {
    }

    /** 페이지 번호·크기만 남긴 {@code Pageable} — 정렬은 서버(리포지토리)가 정한다 */
    public static Pageable ignore(Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return pageable;
        }
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        return PageRequest.of(Math.max(pageable.getPageNumber(), 0), pageable.getPageSize());
    }
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * 라우터 state로 전달된 일회성 성공 안내(`state.notice`).
 * 첫 렌더 값에 고정해 표시하고, **히스토리 state는 즉시 비운다** —
 * 뒤로가기·새로고침에 안내가 다시 나타나면 방금 또 성공한 것처럼 읽힌다(코드리뷰 반영).
 */
export function useRouteNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(location.state?.notice ?? null);

  useEffect(() => {
    if (location.state?.notice) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
    // 마운트 시 1회 — location은 이때의 값이면 충분하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return notice;
}

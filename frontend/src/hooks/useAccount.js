import { useCallback, useEffect, useState } from "react";
import { callApi } from "../lib/http.js";

/**
 * 계정 정보 조회 (`GET /api/me/account`) — 마이페이지·프로필 수정·비밀번호 변경 **세 화면이 같은 출처**를 본다.
 *
 * 화면은 `provider === "LOCAL"`을 해석하지 않는다(설계/04 §4-1).
 * 무엇이 되고 무엇이 안 되는가는 **`passwordChangeable`·`emailEditable` 두 플래그**로만 판단한다 —
 * 서버가 강제하는 규칙과 화면이 숨기는 것이 같은 출처에서 나와야 갈리지 않는다.
 * `provider` 문자열은 **문구를 고를 때만** 쓴다(§2-4 문구표).
 */
export function useAccount() {
  const [state, setState] = useState({ account: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    callApi("/api/me/account")
      .then((body) => {
        if (!cancelled) setState({ account: body?.data ?? null, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ account: null, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}

/** provider → 사람이 읽는 이름. 문구 분기 전용이며 권한 판단에 쓰지 않는다. */
export function providerLabel(provider) {
  if (provider === "kakao") return "카카오";
  if (provider === "google") return "구글";
  return "아이디";
}
/**
 * 마이페이지 프로필 카드의 "로그인 방식" 값.
 *
 * ⚠️ 소셜은 제공자 이름을 여기서 반복하지 않는다("카카오 로그인"이 아니라 "소셜 로그인").
 * 제공자 이름은 같은 화면의 "계정 관리" 안내 한 줄에서만 말한다.
 * 라벨 문구의 단일 출처는 이 함수다 — 문서로 복사하지 않는다(설계/05 §17 머리말).
 * MyPage.test가 제공자 이름을 화면 전체에서 "하나"로 찾기 때문이다(getByText는 복수 매치 시 실패).
 */
export function loginMethodLabel(provider) {
  return provider === "LOCAL" ? "아이디로 로그인" : "소셜 로그인";
}

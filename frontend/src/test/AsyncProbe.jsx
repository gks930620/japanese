// 테스트 공용 — **인증·진도가 도착했는지**를 DOM으로 드러내는 탐침 (senior-dev, 2026-11-14 · 08 E-4)
//
// 진도·보관함은 인증 판정 뒤에 비동기로 온다. 그 전의 화면은 "아직 아무것도 안 한 사람" 화면이라,
// 거기서 단언하면 거짓 실패(부하 때 무작위)·거짓 통과(부재 단언)가 둘 다 난다.
// **왜·어떻게 기다리는지는 `userDataWait.js`** 에 적혀 있다. 규칙은 `작업자(AI)_문서/02 §5-4`.
//
// 이 파일은 **컴포넌트만** 내보낸다 — 대기 함수를 같이 내보내면 react-refresh 규칙 위반이다
// (`AuthContext.jsx`/`authStore.js`와 같은 가름).
import { useContext } from "react";
import { AuthContext } from "../context/authStore.js";
import { useUserData } from "../context/userDataStore.js";
import { lastPositionKey } from "./userDataWait.js";

/**
 * 렌더 트리 안(Provider 안쪽)에 둔다. 화면에 보이지 않는 표식 하나만 그린다 —
 * **프로덕션 DOM은 건드리지 않는다**(테스트 때문에 제품 마크업에 표식을 심지 않는다는 뜻이다).
 * `ready`는 `useUserData()`가 이미 내놓는 값이라, 테스트가 그것을 그리기만 하면 된다.
 */
export function AsyncProbe() {
  const auth = useContext(AuthContext);
  const { ready, progress } = useUserData();

  return (
    <i
      data-auth={auth ? auth.status : "no-provider"}
      data-completed={progress.completedUnits.length}
      data-last={lastPositionKey(progress.lastPosition)}
      data-ready={String(ready)}
      data-testid="async-probe"
    />
  );
}

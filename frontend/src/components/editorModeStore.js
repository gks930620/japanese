import { createContext, useContext } from "react";

/**
 * 편집 모드 상태 (설계/04 §9) — 기본값은 "꺼짐".
 * Provider 없이 렌더돼도 편집 흔적이 0인 것이 안전 기본값이다(A1 — 꺼진 환경 흔적 없음).
 * 훅·컨텍스트를 컴포넌트 파일과 분리하는 것은 react-refresh 규칙(기존 userDataStore와 동일 패턴).
 */
export const EditorModeContext = createContext({ enabled: false });

/**
 * 편집 모드 여부 — 유일한 판단 근거는 `GET /api/editor/status`다(Provider가 조회).
 * provider·역할 같은 다른 신호로 우회 판단하지 않는다.
 */
export function useEditorMode() {
  return useContext(EditorModeContext);
}

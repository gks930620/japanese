import { createContext, useContext } from "react";

/**
 * 인증 컨텍스트·훅 — 컴포넌트 파일에서 분리했다.
 *
 * `AuthContext.jsx`가 Provider(컴포넌트)와 `useAuth`(훅)를 함께 export하면
 * react-refresh 규칙 위반이라 개발 중 Fast Refresh가 깨진다.
 * `userDataStore.js`·`editorModeStore.js`와 같은 패턴이다.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

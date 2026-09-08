// 화면에 편집 패널은 하나뿐이다(설계/05 §15-4) — 열려 있는 패널의 닫기 콜백을 모듈에 둔다.
// 컴포넌트 파일과 분리한 이유는 react-refresh 규칙(컴포넌트 파일은 컴포넌트만 export).
let currentClose = null;

export function getCurrentClose() {
  return currentClose;
}

export function setCurrentClose(next) {
  currentClose = next;
}

/** 테스트 전용 — 모듈 상태 초기화 */
export function resetEditorForTest() {
  currentClose = null;
}

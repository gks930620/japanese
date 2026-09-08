import { createContext, useContext } from "react";

/**
 * 기본값 = '기록 없음' 상태 + 아무 일도 하지 않는 동작들.
 * Provider 없이 렌더되는 경우(단위 테스트에서 화면 하나만 띄울 때)에도 화면이 깨지지 않게 한다 —
 * 진도·보관함은 부가 정보이므로 없으면 현행(진도 이전) 화면과 같아야 한다(AC-P-28과 같은 판단).
 */
const DEFAULT_VALUE = {
  ready: true,
  isAuthenticated: false,
  progress: { completedUnits: [], lastPosition: null },
  bookmarkIds: { kanji: [], grammar: [], vocabulary: [] },
  bookmarkCounts: { kanji: 0, grammar: 0, vocabulary: 0, total: 0 },
  alert: null,
  showAlert: () => {},
  dismissAlert: () => {},
  isBookmarked: () => false,
  toggleBookmark: async () => ({ ok: true }),
  setUnitCompleted: async () => ({ ok: true }),
  saveLastPosition: () => Promise.resolve({ ok: true }),
  clearBookmarks: async () => ({ ok: true }),
  clearProgress: async () => ({ ok: true }),
  discardGuestData: () => {},
  merge: { state: null, counts: null, result: null },
  mergeGuest: async () => ({ ok: true }),
  discardMerge: () => {},
  closeMerge: () => {},
};

const UserDataContext = createContext(DEFAULT_VALUE);

export { UserDataContext };

export function useUserData() {
  return useContext(UserDataContext);
}

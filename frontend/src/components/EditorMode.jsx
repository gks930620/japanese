import { useEffect, useState } from "react";
import { callPublicApi } from "../lib/http.js";
import { EditorModeContext, useEditorMode } from "./editorModeStore.js";

/**
 * 편집 모드 게이트 (설계/04 §9 · 기획 A1·A2·C4).
 *
 * 프론트의 유일한 판단 근거는 `GET /api/editor/status`다 — 200 + enabled=true면 켜짐.
 * 꺼진 환경에서는 컨트롤러 빈이 없어 **404**가 온다(다른 없는 주소와 구별 불가 — 흔적 없음).
 * 404·네트워크 실패·이상 응답 전부 "꺼짐"으로 취급하고, 띠·[고치기]·안내를 **하나도 렌더하지 않는다**
 * — 없는 기능을 사과하지 않는다(설계/05 §12).
 */
export function EditorModeProvider({ children }) {
  const [enabled, setEnabled] = useState(false);

  // 앱 기동당 한 번만 묻는다(Provider가 최상위 하나뿐이므로) — 화면마다 다시 묻지 않는다
  useEffect(() => {
    let cancelled = false;
    callPublicApi("/api/editor/status")
      .then((body) => {
        if (!cancelled && body?.data?.enabled === true) setEnabled(true);
      })
      .catch(() => {
        // 꺼짐과 동일 — 아무것도 하지 않는다(기본값이 이미 꺼짐)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <EditorModeContext.Provider value={{ enabled }}>{children}</EditorModeContext.Provider>;
}

/** 상단 상시 띠 (A2) — 휘발성 고지가 핵심이다: 이걸 모르면 반드시 사고가 난다(설계/05 §15-4) */
export function EditorModeBar() {
  const { enabled } = useEditorMode();
  if (!enabled) return null;

  return (
    <div className="notice warn row editor-mode-bar">
      <span>
        ✎ 편집 모드 — 여기서 고친 내용은 서버를 다시 시작하면 사라져요. 시드 반영은 따로 해야 해요.
      </span>
    </div>
  );
}

/**
 * [고치기] 버튼 (A3) — 담긴 화면이 어디든 이 컴포넌트 하나만 쓴다.
 * @param {string} label 무엇을 고치는지(패널 제목에도 쓰인다 — A4). 접근 이름에 포함된다.
 */
export function EditButton({ label, onClick }) {
  const { enabled } = useEditorMode();
  if (!enabled) return null;

  return (
    <button aria-label={`${label} 고치기`} className="btn ghost edit-btn" type="button" onClick={onClick}>
      ✎ 고치기
    </button>
  );
}

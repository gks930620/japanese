import { useMemo, useState } from "react";
import { callPublicApi } from "../lib/http.js";
import { useEditorMode } from "./editorModeStore.js";
import { EditButton } from "./EditorMode.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { PART_OF_SPEECH } from "../constants/partOfSpeech.js";

/**
 * [고치기] + 인라인 편집 패널 (설계/05 §15-4) — 모달이 아니라 그 블록 바로 아래로 펼쳐진다.
 * 원본 블록은 위에 그대로 남는다 — 변경 전 값을 보면서 고친다.
 *
 * 한 화면에 편집 패널은 1개(§6-3): 모듈 레지스트리가 이전 패널(깨끗한 것)을 닫는다.
 * dirty 취소는 ConfirmDialog. 밖 클릭으로 닫지 않는다 — [취소]·[✕]·ESC만.
 *
 * @param {(saved: object) => void} [onSaved] 저장 응답 — 화면이 그 값으로 즉시 갱신한다(A9)
 */

import { getCurrentClose, setCurrentClose } from "./editorPanelStore.js";

/** kind → API 경로·필드 구성 (설계/04 §9) */
const KINDS = {
  kanji: {
    endpoint: (id) => `/api/editor/kanji/${id}`,
    toForm: (t) => ({
      meaningKo: t.meaningKo ?? "",
      onyomi: t.onyomi ?? "",
      kunyomi: t.kunyomi ?? "",
      words: (t.words ?? []).map((w) => ({ id: w.id, word: w.word ?? "", kana: w.kana ?? "", meaningKo: w.meaningKo ?? "" })),
    }),
    toPayload: (f) => ({
      meaningKo: f.meaningKo.trim(),
      onyomi: f.onyomi.trim() || null,
      kunyomi: f.kunyomi.trim() || null,
      words: f.words.map((w) => ({ id: w.id, word: w.word.trim(), kana: w.kana.trim() || null, meaningKo: w.meaningKo.trim() })),
    }),
    validate: (f) => {
      if (!f.meaningKo.trim()) return "이 칸은 비울 수 없어요";
      if (!f.onyomi.trim() && !f.kunyomi.trim()) return "음독과 훈독 중 하나는 있어야 해요";
      return null;
    },
  },
  grammar: {
    endpoint: (id) => `/api/editor/grammar/${id}`,
    toForm: (t) => ({
      explanation: t.explanation ?? "",
      examples: (t.examples ?? []).map((e) => ({ id: e.id, jp: e.jp ?? "", kana: e.kana ?? "", meaningKo: e.meaningKo ?? "" })),
      rules: (t.rules ?? []).map((r) => ({ ...r })),
    }),
    toPayload: (f) => ({
      explanation: f.explanation.trim(),
      examples: f.examples.map((e) => ({ id: e.id, jp: e.jp.trim(), kana: e.kana.trim() || null, meaningKo: e.meaningKo.trim() })),
      rules: f.rules.map((r) => ({
        groupLabel: r.groupLabel.trim(),
        pattern: r.pattern.trim(),
        exampleBefore: r.exampleBefore.trim(),
        exampleAfter: r.exampleAfter.trim(),
      })),
    }),
    validate: (f) => {
      if (!f.explanation.trim()) return "이 칸은 비울 수 없어요";
      if (f.rules.some((r) => !r.groupLabel.trim() || !r.pattern.trim() || !r.exampleBefore.trim() || !r.exampleAfter.trim()))
        return "활용표의 칸은 비울 수 없어요";
      return null;
    },
  },
  vocabulary: {
    endpoint: (id) => `/api/editor/vocabulary/${id}`,
    toForm: (t) => ({ meaningKo: t.meaningKo ?? "", kana: t.kana ?? "", partOfSpeech: t.partOfSpeech ?? "NOUN" }),
    toPayload: (f) => ({ meaningKo: f.meaningKo.trim(), kana: f.kana.trim() || null, partOfSpeech: f.partOfSpeech }),
    validate: (f) => (!f.meaningKo.trim() ? "이 칸은 비울 수 없어요" : null),
  },
  dialog: {
    endpoint: (id) => `/api/editor/dialogs/${id}`,
    toForm: (t) => ({
      title: t.title ?? "",
      lines: (t.lines ?? []).map((l) => ({ id: l.id, speaker: l.speaker ?? "", jp: l.jp ?? "", kana: l.kana ?? "", meaningKo: l.meaningKo ?? "" })),
    }),
    toPayload: (f) => ({
      title: f.title.trim(),
      lines: f.lines.map((l) => ({ id: l.id, speaker: l.speaker.trim(), jp: l.jp.trim(), kana: l.kana.trim() || null, meaningKo: l.meaningKo.trim() })),
    }),
    validate: (f) => (!f.title.trim() ? "이 칸은 비울 수 없어요" : null),
  },
};

const FIELD_LABELS = {
  meaningKo: "뜻",
  onyomi: "음독",
  kunyomi: "훈독",
  kana: "읽기",
  explanation: "설명",
  title: "장면 제목",
  partOfSpeech: "품사",
};

/** 저장 결과의 전 → 후 요약 (§6-8) — 바뀐 필드만 한 줄씩 */
function buildDiff(kind, before, after) {
  const lines = [];
  const scalar = (key) => {
    if ((before[key] ?? "") !== (after[key] ?? "")) {
      lines.push(`${FIELD_LABELS[key] ?? key}: ${before[key] || "(없음)"} → ${after[key] || "(없음)"}`);
    }
  };
  Object.keys(before).forEach((key) => {
    const value = before[key];
    if (Array.isArray(value)) {
      if (key === "rules") {
        if (JSON.stringify(value) !== JSON.stringify(after.rules)) {
          lines.push(`활용표: ${value.length}행 → ${after.rules.length}행 (전체 교체)`);
        }
        return;
      }
      value.forEach((row, i) => {
        Object.keys(row).forEach((k) => {
          if (k === "id") return;
          const next = after[key]?.[i]?.[k];
          if ((row[k] ?? "") !== (next ?? "")) {
            lines.push(`${FIELD_LABELS[k] ?? k} #${i + 1}: ${row[k] || "(없음)"} → ${next || "(없음)"}`);
          }
        });
      });
      return;
    }
    scalar(key);
  });
  return lines;
}

function Field({ id, label, value, onChange, area = false }) {
  const Tag = area ? "textarea" : "input";
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag className={area ? "area" : "input"} id={id} type={area ? undefined : "text"} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function EditorLauncher({ kind, target, title, onSaved }) {
  const { enabled } = useEditorMode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [savedDiff, setSavedDiff] = useState(null);
  const [copied, setCopied] = useState(false);

  const spec = KINDS[kind];
  const initial = useMemo(() => (target ? spec.toForm(target) : null), [target, spec]);

  if (!enabled) return null; // 꺼진 환경 — 흔적 0(A1)

  const dirty = open && form && JSON.stringify(form) !== JSON.stringify(initial);
  const validationMessage = form ? spec.validate(form) : null;

  const openPanel = () => {
    const previous = getCurrentClose();
    if (previous && previous !== closeClean) previous();
    setCurrentClose(closeClean);
    setForm(spec.toForm(target));
    setSavedDiff(null);
    setSaveError("");
    setOpen(true);
  };

  function closeClean() {
    setOpen(false);
    setForm(null);
    if (getCurrentClose() === closeClean) setCurrentClose(null);
  }

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else closeClean();
  };

  const save = async () => {
    // 변경 없음 — 요청 없이 닫는다(A12)
    if (!dirty) {
      closeClean();
      return;
    }
    if (validationMessage) return;
    setSaving(true);
    setSaveError("");
    try {
      const body = await callPublicApi(spec.endpoint(target.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec.toPayload(form)),
      });
      const saved = body?.data ?? null;
      const after = spec.toForm(saved ?? spec.toPayload(form));
      setSavedDiff(buildDiff(kind, initial, after));
      // 응답이 진실이다(A9) — 화면은 요청값이 아니라 응답값으로 갱신한다
      if (saved) onSaved?.(saved);
      closeClean();
    } catch (e) {
      setSaveError(
        e?.status === 404
          ? "이 항목을 찾을 수 없어요. 화면을 새로 고쳐 주세요"
          : "저장하지 못했어요. 다시 시도해 주세요",
      );
    } finally {
      setSaving(false);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n${savedDiff.join("\n")}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사 실패는 조용히 — 사용자가 드래그로 복사할 수 있다
    }
  };

  const patch = (patchValue) => setForm((prev) => ({ ...prev, ...patchValue }));
  const patchRow = (listKey, index, key, value) =>
    setForm((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));

  return (
    <>
      <EditButton label={title} onClick={open ? requestClose : openPanel} />

      {open && form && (
        <div className="panel padded editor-panel">
          <div className="editor-panel-head">
            <h3>{title}</h3>
            <button aria-label="닫기" className="merge-close" type="button" onClick={requestClose}>
              ✕
            </button>
          </div>

          {saveError && (
            <div className="notice error" role="alert">
              {saveError}
            </div>
          )}

          {kind === "kanji" && (
            <>
              <Field id="ed-meaning" label="훈음(뜻)" value={form.meaningKo} onChange={(v) => patch({ meaningKo: v })} />
              <Field id="ed-onyomi" label="음독" value={form.onyomi} onChange={(v) => patch({ onyomi: v })} />
              <Field id="ed-kunyomi" label="훈독" value={form.kunyomi} onChange={(v) => patch({ kunyomi: v })} />
              <div className="step-caption">예시 단어 (수정만 — 추가·삭제 없음)</div>
              {form.words.map((word, i) => (
                <div key={word.id} className="editor-row">
                  <Field id={`ed-w-${i}`} label={`단어 #${i + 1}`} value={word.word} onChange={(v) => patchRow("words", i, "word", v)} />
                  <Field id={`ed-wk-${i}`} label={`읽기 #${i + 1}`} value={word.kana} onChange={(v) => patchRow("words", i, "kana", v)} />
                  <Field id={`ed-wm-${i}`} label={`뜻 #${i + 1}`} value={word.meaningKo} onChange={(v) => patchRow("words", i, "meaningKo", v)} />
                </div>
              ))}
            </>
          )}

          {kind === "grammar" && (
            <>
              <Field area id="ed-exp" label="설명" value={form.explanation} onChange={(v) => patch({ explanation: v })} />
              <div className="step-caption">예문 (수정만 — 추가·삭제 없음)</div>
              {form.examples.map((example, i) => (
                <div key={example.id} className="editor-row">
                  <Field id={`ed-ej-${i}`} label={`원문 #${i + 1}`} value={example.jp} onChange={(v) => patchRow("examples", i, "jp", v)} />
                  <Field id={`ed-ek-${i}`} label={`읽기 #${i + 1}`} value={example.kana} onChange={(v) => patchRow("examples", i, "kana", v)} />
                  <Field id={`ed-em-${i}`} label={`뜻 #${i + 1}`} value={example.meaningKo} onChange={(v) => patchRow("examples", i, "meaningKo", v)} />
                </div>
              ))}
              <div className="step-caption">활용표 (0~20행)</div>
              {form.rules.map((rule, i) => (
                <div key={i} className="editor-row">
                  <Field id={`ed-rg-${i}`} label={`구분 #${i + 1}`} value={rule.groupLabel} onChange={(v) => patchRow("rules", i, "groupLabel", v)} />
                  <Field id={`ed-rp-${i}`} label={`형태 #${i + 1}`} value={rule.pattern} onChange={(v) => patchRow("rules", i, "pattern", v)} />
                  <Field id={`ed-rb-${i}`} label={`변환 전 #${i + 1}`} value={rule.exampleBefore} onChange={(v) => patchRow("rules", i, "exampleBefore", v)} />
                  <Field id={`ed-ra-${i}`} label={`변환 후 #${i + 1}`} value={rule.exampleAfter} onChange={(v) => patchRow("rules", i, "exampleAfter", v)} />
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => patch({ rules: form.rules.filter((_, j) => j !== i) })}
                  >
                    행 삭제
                  </button>
                </div>
              ))}
              <button
                className="btn ghost"
                disabled={form.rules.length >= 20}
                type="button"
                onClick={() =>
                  patch({ rules: [...form.rules, { groupLabel: "", pattern: "", exampleBefore: "", exampleAfter: "" }] })
                }
              >
                + 행 추가
              </button>
            </>
          )}

          {kind === "vocabulary" && (
            <>
              <Field id="ed-vm" label="뜻" value={form.meaningKo} onChange={(v) => patch({ meaningKo: v })} />
              <Field id="ed-vk" label="읽기" value={form.kana} onChange={(v) => patch({ kana: v })} />
              <div className="field">
                <label htmlFor="ed-vp">품사</label>
                <select
                  className="filter-select"
                  id="ed-vp"
                  value={form.partOfSpeech}
                  onChange={(e) => patch({ partOfSpeech: e.target.value })}
                >
                  {PART_OF_SPEECH.map((pos) => (
                    <option key={pos.code} value={pos.code}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {kind === "dialog" && (
            <>
              <Field id="ed-dt" label="장면 제목" value={form.title} onChange={(v) => patch({ title: v })} />
              <div className="step-caption">대사 (수정만 — 추가·삭제 없음)</div>
              {form.lines.map((line, i) => (
                <div key={line.id} className="editor-row">
                  <Field id={`ed-ls-${i}`} label={`화자 #${i + 1}`} value={line.speaker} onChange={(v) => patchRow("lines", i, "speaker", v)} />
                  <Field id={`ed-lj-${i}`} label={`원문 #${i + 1}`} value={line.jp} onChange={(v) => patchRow("lines", i, "jp", v)} />
                  <Field id={`ed-lk-${i}`} label={`읽기 #${i + 1}`} value={line.kana} onChange={(v) => patchRow("lines", i, "kana", v)} />
                  <Field id={`ed-lm-${i}`} label={`뜻 #${i + 1}`} value={line.meaningKo} onChange={(v) => patchRow("lines", i, "meaningKo", v)} />
                </div>
              ))}
            </>
          )}

          {validationMessage && dirty && <p className="field-error">{validationMessage}</p>}

          <div className="form-actions">
            <button
              className="btn primary"
              disabled={saving || Boolean(validationMessage && dirty)}
              type="button"
              onClick={save}
            >
              {saving ? "저장 중…" : "저장"}
            </button>
            <button className="btn ghost" type="button" onClick={requestClose}>
              취소
            </button>
          </div>
        </div>
      )}

      {savedDiff && (
        <div className="notice ok editor-saved" role="status">
          <p>저장했어요. 지금 실행 중인 서버에만 반영되며, 서버를 다시 시작하면 원래 내용으로 돌아갑니다.</p>
          {savedDiff.length > 0 && <pre className="editor-diff">{savedDiff.join("\n")}</pre>}
          <p>영구히 반영하려면 이 내용을 콘텐츠 원본에도 반영해야 해요.</p>
          <span className="notice-actions">
            <button className="btn" type="button" onClick={copySummary}>
              {copied ? "복사했어요 ✓" : "요약 복사"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setSavedDiff(null)}>
              닫기
            </button>
          </span>
        </div>
      )}

      <ConfirmDialog
        confirmLabel="버리기"
        description="저장하지 않은 수정 내용이 사라져요."
        open={confirmDiscard}
        title="고친 내용을 버릴까요?"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          closeClean();
          return { ok: true };
        }}
      />
    </>
  );
}

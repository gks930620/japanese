import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { callApi } from "../lib/http.js";
import { useAuth } from "../context/authStore.js";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { btnClass, cardClass, fieldClass, helpClass, inputClass } from "../components/ui/kitClass.js";

const CONFIRM_TEXT = "탈퇴합니다"; // 계약 상수 — 서버가 검증하는 값과 화면 문구가 같아야 한다

/**
 * 회원 탈퇴 (설계/04 §4-1) — **차분한 명세 + 마지막 한 문장**.
 * 빨간 경고 상자·⚠️·만류 문구를 쓰지 않는다. 빨강은 `.btn-danger` 둘(화면의 [탈퇴하기], 대화상자의 [탈퇴])뿐이고,
 * 되돌릴 수 없다는 사실만 한 줄 굵게 못 박는다. 가장 정직한 경고는 **실제 숫자**다.
 */
export function WithdrawPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmValue, setConfirmValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [alertText, setAlertText] = useState("");
  const confirmRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    callApi("/api/me/withdrawal-preview")
      .then((body) => {
        if (!cancelled) {
          setPreview(body?.data ?? null);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // 무엇이 지워지는지 모르는 채로 탈퇴 버튼을 노출하지 않는다
  if (loadError) return <ApiErrorCard onRetry={() => setAttempt((n) => n + 1)} />;
  if (!preview) {
    return (
      <section aria-hidden="true">
        <div className={cardClass()}>
          <div className="k-skeleton sk-line w70" />
          <div className="k-skeleton sk-line w70" />
          <div className="k-skeleton sk-line w40" />
        </div>
      </section>
    );
  }

  const isText = preview.confirmationType === "TEXT";
  const bookmarks = preview.bookmarkCounts ?? { kanji: 0, grammar: 0, vocabulary: 0, total: 0 };
  const removing = [
    preview.completedUnitCount > 0
      ? { label: "학습 기록", value: `완료한 ${preview.completedUnitCount}개 유닛과 이어보기 위치` }
      : null,
    bookmarks.total > 0
      ? {
          label: "보관함",
          value: [
            bookmarks.kanji > 0 ? `한자 ${bookmarks.kanji}` : null,
            bookmarks.grammar > 0 ? `문법 ${bookmarks.grammar}` : null,
            bookmarks.vocabulary > 0 ? `어휘 ${bookmarks.vocabulary}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
  ].filter(Boolean);

  const staying = [
    preview.communityCount > 0 || preview.commentCount > 0
      ? { label: "커뮤니티", value: `내가 쓴 글 ${preview.communityCount}개 · 댓글 ${preview.commentCount}개` }
      : null,
  ].filter(Boolean);

  // 소셜은 문구가 정확할 때만 열린다 — 되돌릴 수 없는 요청을 "서버가 막아 주겠지"로 보내지 않는다
  const confirmationReady = isText ? confirmValue.trim() === CONFIRM_TEXT : confirmValue.length > 0;
  const canSubmit = confirmationReady && checked;

  const withdraw = async () => {
    setAlertText("");
    try {
      await callApi("/api/me/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isText ? { confirmText: confirmValue.trim() } : { password: confirmValue }),
      });
      setDialogOpen(false);
      // 서버가 쿠키를 만료시킨다 — 화면은 로컬 인증 상태만 게스트로 내린다
      await logout();
      navigate("/", { state: { notice: "탈퇴가 완료되었어요. 그동안 이용해 주셔서 고맙습니다." } });
      return { ok: true };
    } catch (e) {
      // 고칠 곳이 대화상자 밖 입력칸이면 **대화상자를 닫고** 그 칸으로 보낸다(§4-5)
      if (e.errorCode === "PASSWORD_MISMATCH") {
        setDialogOpen(false);
        setConfirmValue("");
        setFieldError("비밀번호가 맞지 않아요");
        confirmRef.current?.focus();
        return { ok: true };
      }
      if (e.errorCode === "CONFIRM_TEXT_MISMATCH") {
        setDialogOpen(false);
        setFieldError(`'${CONFIRM_TEXT}' 를 그대로 입력해 주세요`); // 비우지 않는다 — 오타를 스스로 보게
        confirmRef.current?.focus();
        return { ok: true };
      }
      return { ok: false, error: e }; // 5xx·네트워크 — 대화상자를 닫지 않고 그 안에서 알린다
    }
  };

  // 0인 것은 말하지 않는다(08 C-12 ① — B-L2): "0개가 지워져요"는 판단에 아무 도움이 안 되고,
  // 같은 화면 위쪽 패널은 이미 지울 것만 나열하고 있다. 되돌릴 수 없다는 사실은 언제나 말한다.
  const erasedParts = [
    preview.completedUnitCount > 0 ? `완료한 ${preview.completedUnitCount}개 유닛` : null,
    bookmarks.total > 0 ? `보관함 ${bookmarks.total}개` : null,
  ].filter(Boolean);
  const erasedDescription = erasedParts.length
    ? `${erasedParts.join("과 ")}가 지워져요. 되돌릴 수 없어요.`
    : "계정과 학습 기록이 지워져요. 되돌릴 수 없어요.";

  return (
    <section>
      <div className="k-flex page-header">
        <div aria-hidden="true" className="k-avatar page-avatar">
          ◎
        </div>
        <div className="page-head-text">
          <h1 className="k-page-title">회원 탈퇴</h1>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="panel-title">탈퇴하면 아래 기록이 지워져요</h2>
        {removing.length > 0 ? (
          removing.map((row) => (
            <div key={row.label} className="kv-row">
              <span className="kv-label">{row.label}</span>
              <span className="kv-value">{row.value}</span>
            </div>
          ))
        ) : (
          <p className="muted-text">지워질 학습 기록이 없어요</p>
        )}
      </div>

      {/* 남을 것이 없으면 패널째 없앤다(빈 블록 금지) */}
      {staying.length > 0 && (
        <div className={cardClass()}>
          <h2 className="panel-title">아래는 지워지지 않고 &lsquo;탈퇴한 회원&rsquo; 이름으로 남아요</h2>
          {staying.map((row) => (
            <div key={row.label} className="kv-row">
              <span className="kv-label">{row.label}</span>
              <span className="kv-value">{row.value}</span>
            </div>
          ))}
          <p className="field-hint">
            먼저 지우고 싶다면{" "}
            <a
              title="새 탭에서 열려요"
              href={`/community?searchType=nickname&keyword=${encodeURIComponent(user?.nickname ?? "")}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              내가 쓴 글 찾기
              <span aria-hidden="true" className="ext-mark">
                ↗
              </span>
            </a>
          </p>
        </div>
      )}

      <p className="withdraw-final">탈퇴한 뒤에는 되돌릴 수 없어요.</p>
      {/* 소셜은 다시 로그인하면 새 계정이 된다(설계/04 §4-1) — 아이디 재가입 문구는 로컬에만 */}
      {!isText && <p className="withdraw-final">같은 아이디로 다시 가입할 수 없어요.</p>}

      <div className={cardClass()}>
        {alertText && (
          <div className="inline-alert" role="alert">
            {alertText}
          </div>
        )}

        <div className={fieldClass()}>
          <label htmlFor="confirmation">{isText ? "확인 문구" : "비밀번호"}</label>
          <input
            aria-describedby={fieldError ? "confirmation-error" : undefined}
            className={inputClass()}
            id="confirmation"
            ref={confirmRef}
            type={isText ? "text" : "password"}
            value={confirmValue}
            onChange={(e) => {
              setConfirmValue(e.target.value);
              setFieldError("");
            }}
          />
          {isText && !fieldError && <p className="field-hint">&lsquo;{CONFIRM_TEXT}&rsquo; 를 그대로 입력해 주세요</p>}
          {fieldError && (
            <p className={helpClass({ error: true })} id="confirmation-error">
              {fieldError}
            </p>
          )}
        </div>

        <div className="k-check-row check-row">
          <input
            checked={checked}
            className="k-checkbox"
            id="withdraw-check"
            type="checkbox"
            onChange={(e) => setChecked(e.target.checked)}
          />
          <label htmlFor="withdraw-check">위 내용을 확인했어요</label>
        </div>

        <div className="form-actions">
          <button className={btnClass({ variant: "danger" })} disabled={!canSubmit} type="button" onClick={() => setDialogOpen(true)}>
            탈퇴하기
          </button>
          <Link className={btnClass({ variant: "ghost" })} to="/mypage">
            취소
          </Link>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="탈퇴"
        description={erasedDescription}
        errorText="탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요."
        open={dialogOpen}
        title="정말 탈퇴할까요?"
        onCancel={() => setDialogOpen(false)}
        onConfirm={withdraw}
      />
    </section>
  );
}

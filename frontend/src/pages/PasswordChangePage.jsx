import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { callApi } from "../lib/http.js";
import { useAccount, providerLabel } from "../hooks/useAccount.js";
import { ApiErrorCard } from "../components/StateCards.jsx";

const FIELDS = { current: "current", next: "next", confirm: "confirm" };

/**
 * errorCode → 화면 동작 (설계/04 §4-1). **"틀린 것만 지운다."**
 * 화면은 `message` 문자열이 아니라 **errorCode로만** 분기한다(설계/04 §1-1).
 */
const ERROR_RULES = {
  PASSWORD_MISMATCH: {
    field: FIELDS.current,
    message: "현재 비밀번호가 맞지 않아요",
    clear: [FIELDS.current], // 틀린 것은 현재 비밀번호뿐 — 새 비밀번호를 다시 치게 하지 않는다
  },
  NEW_PASSWORD_CONFIRM_MISMATCH: {
    field: FIELDS.confirm,
    message: "새 비밀번호가 서로 달라요",
    clear: [FIELDS.confirm], // 확인 칸만 — 새 비밀번호를 남겨야 사용자가 자기 값을 대조할 수 있다
  },
  NEW_PASSWORD_SAME_AS_CURRENT: {
    field: FIELDS.next,
    message: "지금 쓰는 비밀번호와 다르게 정해 주세요",
    clear: [FIELDS.next, FIELDS.confirm], // 확인만 남으면 다음 제출에서 즉시 불일치가 난다
  },
};

const EMPTY_FORM = { current: "", next: "", confirm: "" };

export function PasswordChangePage() {
  const navigate = useNavigate();
  const { account, loading, error, reload } = useAccount();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldError, setFieldError] = useState(null); // { field, message }
  const [alertText, setAlertText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notSupported, setNotSupported] = useState(false);
  const refs = { current: useRef(null), next: useRef(null), confirm: useRef(null) };

  // passwordChangeable을 모르는 동안에는 **폼도 안내도 그리지 않는다**(소셜에게 폼이 한순간 번쩍이지 않게)
  if (loading) {
    return (
      <section aria-hidden="true">
        <div className="panel padded">
          <div className="skeleton sk-line w40" />
          <div className="skeleton sk-line w70" />
          <div className="skeleton sk-line w70" />
        </div>
      </section>
    );
  }
  if (error || !account) return <ApiErrorCard onRetry={reload} />;

  const header = (
    <div className="page-header">
      <div aria-hidden="true" className="page-avatar">
        ◎
      </div>
      <div className="page-head-text">
        <h1>비밀번호 변경</h1>
        {account.passwordChangeable && !notSupported && <p>바꾸면 다른 기기에서는 다시 로그인해야 해요</p>}
      </div>
    </div>
  );

  // 소셜 계정: 자동 리다이렉트하지 않는다 — 주소를 직접 친 사람은 왜 안 되는지 알아야 한다
  if (!account.passwordChangeable || notSupported) {
    const label = providerLabel(account.provider);
    return (
      <section>
        {header}
        <div className="panel padded">
          <p>이 계정은 비밀번호를 사용하지 않아요.</p>
          <p>
            {label} 계정으로 로그인하고 있어서 비밀번호는 {label}에서 관리해요.
          </p>
          <div className="form-actions">
            {/* 막다른 화면의 유일한 출구에 그라디언트를 얹지 않는다(§3-7) */}
            <Link className="btn" to="/mypage">
              마이페이지로
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const focusField = (field) => refs[field]?.current?.focus();

  const onSubmit = async (event) => {
    event.preventDefault();
    setFieldError(null);
    setAlertText("");

    // 화면이 막는 것은 "빈 칸"뿐이다 — 나머지 판정 순서는 서버를 흉내 내지 않는다
    const firstEmpty = [FIELDS.current, FIELDS.next, FIELDS.confirm].find((field) => !form[field]);
    if (firstEmpty) {
      setAlertText("세 칸을 모두 입력해 주세요");
      focusField(firstEmpty);
      return;
    }

    setSaving(true);
    try {
      await callApi("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
          newPasswordConfirm: form.confirm,
        }),
      });
      // 웹은 쿠키가 갱신되므로 화면이 토큰을 만지지 않는다(설계/04 §4-1)
      navigate("/mypage", {
        state: { notice: "비밀번호를 변경했어요. 다른 기기에서는 다시 로그인해야 해요." },
      });
    } catch (e) {
      if (e.status === 403 && e.errorCode === "PASSWORD_NOT_SUPPORTED") {
        // 플래그와 서버 판정이 어긋난 경우에도 같은 안내 화면으로
        setNotSupported(true);
        return;
      }
      const rule = ERROR_RULES[e.errorCode];
      if (rule) {
        setForm((prev) => {
          const next = { ...prev };
          rule.clear.forEach((field) => {
            next[field] = "";
          });
          return next;
        });
        setFieldError({ field: rule.field, message: rule.message });
        setAlertText(rule.message);
        focusField(rule.field);
      } else if (e.status === 400 && e.errors?.length) {
        // VALIDATION_ERROR — 자기가 뭘 쳤는지 보고 고쳐야 하므로 **비우지 않는다**
        const field = e.errors[0].field === "newPassword" ? FIELDS.next : FIELDS.current;
        const message = "비밀번호는 4자 이상이어야 해요";
        setFieldError({ field, message });
        setAlertText(message);
        focusField(field);
      } else {
        setAlertText("변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSaving(false);
    }
  };

  const passwordField = (field, label, hint) => (
    <div className="field">
      <label htmlFor={field}>{label}</label>
      <input
        aria-describedby={fieldError?.field === field ? `${field}-error` : undefined}
        className="input"
        id={field}
        ref={refs[field]}
        type="password"
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
      />
      {hint && !(fieldError?.field === field) && <p className="field-hint">{hint}</p>}
      {fieldError?.field === field && (
        <p className="field-error" id={`${field}-error`}>
          {fieldError.message}
        </p>
      )}
    </div>
  );

  return (
    <section>
      {header}
      <form className="panel padded form-panel" onSubmit={onSubmit}>
        {alertText && (
          <div className="inline-alert" role="alert">
            {alertText}
          </div>
        )}

        {passwordField(FIELDS.current, "현재 비밀번호")}
        {passwordField(FIELDS.next, "새 비밀번호", "4자 이상")}
        {passwordField(FIELDS.confirm, "새 비밀번호 확인")}

        <div className="form-actions">
          <button className="btn primary" disabled={saving} type="submit">
            {saving ? "변경 중…" : "변경"}
          </button>
          <Link className="btn ghost" to="/mypage">
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}

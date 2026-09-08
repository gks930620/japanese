import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/authStore.js";
import { Link, useNavigate } from "react-router-dom";
import { callApi } from "../lib/http.js";
import { useAccount, providerLabel } from "../hooks/useAccount.js";
import { ApiErrorCard } from "../components/StateCards.jsx";

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 회원정보 수정 (설계/04 §4-1).
 *
 * 아이디는 **입력칸으로 그리지 않는다** — 바꿀 수 없는 값을 readonly 입력칸으로 보여주면
 * "바꿀 수 있다"고 읽힌다. 이메일은 소셜에서 `disabled`가 아니라 **`readonly`**다(읽기·복사는 되게).
 * 실패해도 **입력값을 지우지 않는다**.
 */
export function ProfileEditPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { account, loading, error, reload } = useAccount();
  const [form, setForm] = useState(null);
  const [fieldError, setFieldError] = useState(null); // { field, message }
  const [alertText, setAlertText] = useState("");
  const [saving, setSaving] = useState(false);
  const nicknameRef = useRef(null);
  const emailRef = useRef(null);

  // 계정 정보가 도착하면 폼을 그 값으로 채운다(빈 폼을 먼저 그리지 않는다 — §2 상태별 UI)
  useEffect(() => {
    if (account) setForm({ nickname: account.nickname ?? "", email: account.email ?? "" });
  }, [account]);

  if (loading || (!form && !error)) {
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

  const focusField = (field) => {
    const target = field === "email" ? emailRef.current : nicknameRef.current;
    target?.focus();
  };

  const fail = (field, message) => {
    setFieldError({ field, message });
    setAlertText(message);
    focusField(field);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFieldError(null);
    setAlertText("");

    // 화면이 먼저 막는 것: 길이·형식. 나머지는 전부 서버 판정을 따른다
    const nickname = form.nickname.trim();
    if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
      fail("nickname", `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요`);
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      fail("email", "이메일 형식이 아니에요");
      return;
    }

    setSaving(true);
    try {
      // 소셜도 email을 그대로 실어 보낸다 — 서버가 무시하고 현재 값을 되돌려 준다(설계/04 §4-1)
      const body = await callApi("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email: form.email.trim() }),
      });
      // 헤더 배지는 AuthContext의 user를 읽는다 — 다시 받아 오지 않으면 화면만 옛 닉네임으로 남는다(B-M1)
      await refreshUser();
      // 성공 안내는 주소가 아니라 라우터 state로 넘긴다(새로고침·링크 공유에 남지 않게)
      navigate("/mypage", { state: { notice: "수정했어요", nickname: body?.data?.nickname } });
    } catch (e) {
      if (e.status === 409) {
        fail("email", "이미 사용 중인 이메일이에요");
      } else if (e.status === 400 && e.errors?.length) {
        fail(e.errors[0].field === "email" ? "email" : "nickname", e.errors[0].message ?? "입력값을 확인해 주세요");
      } else {
        setAlertText("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="page-header">
        <div aria-hidden="true" className="page-avatar">
          ◎
        </div>
        <div className="page-head-text">
          <h1>회원정보 수정</h1>
          <p>닉네임과 이메일을 고칠 수 있어요</p>
        </div>
      </div>

      <form className="panel padded form-panel" onSubmit={onSubmit}>
        {/* 실패 알림은 오버레이가 아니라 패널 맨 위에 끼어들어 폼을 아래로 민다 */}
        {alertText && (
          <div className="inline-alert" role="alert">
            {alertText}
          </div>
        )}

        <div className="kv-row">
          <span className="kv-label">아이디</span>
          <span className="kv-value">
            {account.username}
            <span className="field-hint">바꿀 수 없어요</span>
          </span>
        </div>

        <div className="field">
          <label htmlFor="nickname">닉네임</label>
          <input
            aria-describedby={fieldError?.field === "nickname" ? "nickname-error" : undefined}
            className="input"
            id="nickname"
            ref={nicknameRef}
            type="text"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
          {fieldError?.field === "nickname" && (
            <p className="field-error" id="nickname-error">
              {fieldError.message}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">이메일</label>
          <input
            aria-describedby={fieldError?.field === "email" ? "email-error" : undefined}
            className="input"
            id="email"
            readOnly={!account.emailEditable}
            ref={emailRef}
            type="text"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {/* 사과가 아니라 사실 — 금지형("수정할 수 없습니다")을 쓰지 않는다 */}
          {!account.emailEditable && (
            <p className="field-hint">{providerLabel(account.provider)}에서 가져온 정보예요</p>
          )}
          {fieldError?.field === "email" && (
            <p className="field-error" id="email-error">
              {fieldError.message}
            </p>
          )}
        </div>

        <div className="form-actions">
          <button className="btn primary" disabled={saving} type="submit">
            {saving ? "저장 중…" : "저장"}
          </button>
          <Link className="btn ghost" to="/mypage">
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}

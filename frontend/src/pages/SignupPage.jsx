import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { callApi } from "../lib/http.js";
import { getErrorMessage } from "../lib/format.js";

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    email: "",
    nickname: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]); // 서버 검증 실패 문장들(B-L5)
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await callApi("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email,
          nickname: form.nickname,
        }),
      });
      navigate(`/login?username=${encodeURIComponent(form.username)}`);
    } catch (e) {
      if (e?.errors?.length) {
        // 필드 변수명(username 등)은 사용자의 말이 아니다 — 서버가 준 한국어 문장만 줄로 나눈다(B-L5)
        setFieldErrors(e.errors.map((item) => item.message));
        setError("");
      } else {
        setFieldErrors([]);
        setError(getErrorMessage(e, "회원가입에 실패했습니다."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="logo-section">
        <div className="logo-icon">
          <span className="material-icons">person_add</span>
        </div>
        <h1 className="logo-title">회원가입</h1>
      </div>

      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="signupUsername">아이디</label>
          <div className="input-wrapper">
            <span className="material-icons">person</span>
            <input
              id="signupUsername"
              required
              type="text"
              className="input-field"
              placeholder="아이디를 입력하세요"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="signupPassword">비밀번호</label>
          <div className="input-wrapper">
            <span className="material-icons">lock</span>
            <input
              id="signupPassword"
              required
              minLength={4}
              type="password"
              className="input-field"
              placeholder="비밀번호 (4자 이상)"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="signupPasswordConfirm">비밀번호 확인</label>
          <div className="input-wrapper">
            <span className="material-icons">lock</span>
            <input
              id="signupPasswordConfirm"
              required
              minLength={4}
              type="password"
              className="input-field"
              placeholder="비밀번호를 다시 입력하세요"
              value={form.passwordConfirm}
              onChange={(e) => setForm((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="signupEmail">이메일</label>
          <div className="input-wrapper">
            <span className="material-icons">email</span>
            <input
              id="signupEmail"
              required
              type="email"
              className="input-field"
              placeholder="이메일을 입력하세요"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="signupNickname">닉네임</label>
          <div className="input-wrapper">
            <span className="material-icons">badge</span>
            <input
              id="signupNickname"
              required
              type="text"
              className="input-field"
              placeholder="닉네임을 입력하세요"
              value={form.nickname}
              onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))}
            />
          </div>
        </div>

        <div className={`error-message ${error || fieldErrors.length ? "show" : ""}`}>
          {fieldErrors.length > 0 ? (
            <ul className="error-list">
              {fieldErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : (
            <span className="pre-line">{error}</span>
          )}
        </div>

        <button className="submit-btn" disabled={loading} type="submit">
          {loading ? "처리 중..." : "회원가입"}
        </button>
      </form>

      <div className="login-link">
        <span>이미 계정이 있으신가요? </span>
        <Link to="/login">로그인</Link>
      </div>
    </div>
  );
}

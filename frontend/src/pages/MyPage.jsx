import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authStore.js";
import { useUserData } from "../context/userDataStore.js";
import { useAccount, loginMethodLabel, providerLabel } from "../hooks/useAccount.js";
import { useRouteNotice } from "../hooks/useRouteNotice.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { ApiErrorCard } from "../components/StateCards.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { resumeTarget } from "../lib/resume.js";
import { alertClass, btnClass, cardClass } from "../components/ui/kitClass.js";

/**
 * 마이페이지 허브 (설계/05 §7) — 읽기 전용 4항목 → 카드 4장.
 *
 * 로그인 방식 분기의 근거는 **`passwordChangeable` 플래그 하나**다(설계/04 §4-1).
 * 소셜 계정에는 [비밀번호 변경]을 **회색 비활성이 아니라 아예 렌더하지 않는다** —
 * 회색 버튼은 "언젠가 되는 것"으로 읽혀 사용자가 왜 안 되는지 찾게 만든다.
 */
export function MyPage() {
  const { logout } = useAuth();
  const { bookmarkCounts, progress, clearProgress } = useUserData();
  const { account, loading, error, reload } = useAccount();
  // 두 과정의 코스 목록 — 마지막 위치가 어느 과정의 코스인지 여기서 찾는다(B-H3)
  const { data: jaCourses } = useApiQuery("/api/courses");
  const { data: enCourses } = useApiQuery("/api/en/courses");
  const notice = useRouteNotice();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (loading) {
    return (
      <section aria-hidden="true">
        <div className="k-flex page-header">
          <div className="k-skeleton sk-avatar" />
          <div className="page-head-text">
            <div className="k-skeleton sk-line w40" />
          </div>
        </div>
        <div className="mypage-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="k-skeleton sk-card" />
          ))}
        </div>
      </section>
    );
  }

  // 계정 정보가 곧 본문이라 조회 실패는 본문 전체를 오류 카드로 바꾼다
  if (error || !account) return <ApiErrorCard onRetry={reload} />;

  const email = account.email ? account.email : "정보 없음";
  const completed = progress.completedUnits.length;
  // 마지막 위치의 코스를 **두 과정 목록**에서 찾는다 — 영어 진도를 일본어 주소에 끼우면 404다(B-H3)
  const resume = resumeTarget(progress, { ja: jaCourses ?? [], en: enCourses ?? [] });
  const counts = [
    bookmarkCounts.kanji > 0 ? `한자 ${bookmarkCounts.kanji}` : null,
    bookmarkCounts.grammar > 0 ? `문법 ${bookmarkCounts.grammar}` : null,
    bookmarkCounts.vocabulary > 0 ? `어휘 ${bookmarkCounts.vocabulary}` : null,
  ].filter(Boolean);

  return (
    <section>
      {/* 프로필 수정·비밀번호 변경이 성공하면 이 자리에 한 줄로 알린다(토스트를 만들지 않는다) */}
      {notice && (
        <div className={alertClass({ tone: "ok" })} role="status">
          {notice}
        </div>
      )}

      <div className="k-flex page-header">
        <div aria-hidden="true" className="k-avatar page-avatar">
          ◎
        </div>
        <div className="page-head-text">
          <h1 className="k-page-title">마이페이지</h1>
          <p className="k-page-desc">{account.nickname} 님</p>
        </div>
      </div>

      <div className="mypage-grid">
        <div className={cardClass({ className: "mypage-card" })}>
          <div className="card-body">
            <h2>프로필</h2>
            <div className="kv-row">
              <span className="kv-label">아이디</span>
              <span className="kv-value">{account.username}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">닉네임</span>
              <span className="kv-value">{account.nickname}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">이메일</span>
              <span className={`kv-value${account.email ? "" : " muted-text"}`}>{email}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">로그인 방식</span>
              <span className="kv-value">{loginMethodLabel(account.provider)}</span>
            </div>
            <div className="card-actions">
              <Link className={btnClass({ variant: "secondary" })} to="/mypage/edit">
                정보 수정
              </Link>
            </div>
          </div>
        </div>

        <div className={cardClass({ className: "mypage-card" })}>
          <div className="card-body">
            <h2>내 학습</h2>
            {completed > 0 ? (
              /* 분모(전체 유닛 수)는 코스 API에 있고 이 화면은 부르지 않는다 —
                 100% 막대는 거짓이므로 완료 개수만 사실대로 적는다 */
              <p className="card-note">완료한 유닛 {completed}개</p>
            ) : (
              <p className="muted-text">아직 학습 기록이 없어요</p>
            )}
            {/* 코스 이름까지 적는다 — "유닛 1"만으로는 어디였는지 알 수 없다(B-L3, 홈과 같은 문장) */}
            {resume && <p className="card-note">{resume.text}</p>}
            <div className="card-actions">
              {resume && (
                <Link className={btnClass({ variant: "primary" })} to={resume.to}>
                  {/* 완주했으면 "이어서"가 아니다 — 문구도 resume 판정에서 온다(2026-09 결정 D-2) */}
                  {resume.ctaLabel}
                </Link>
              )}
              {/* 지울 것이 없으면 지우는 버튼도 없다(08 C-12 ① — B-L1) */}
              {completed > 0 && (
                <button className={btnClass({ variant: "ghost" })} type="button" onClick={() => setConfirmOpen(true)}>
                  학습 기록 초기화
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={cardClass({ className: "mypage-card" })}>
          <div className="card-body">
            <h2>내 보관함</h2>
            {counts.length > 0 ? (
              <p className="card-note">{counts.join(" · ")}</p>
            ) : (
              <p className="muted-text">아직 담은 것이 없어요</p>
            )}
            <div className="card-actions">
              <Link className={btnClass({ variant: "secondary" })} to="/bookmarks">
                보관함 열기
              </Link>
            </div>
          </div>
        </div>

        <div className={cardClass({ className: "mypage-card" })}>
          <div className="card-body">
            <h2>계정 관리</h2>
            <div className="card-actions">
              {/* 분기 근거는 플래그 하나. provider는 문구를 고를 때만 쓴다 */}
              {account.passwordChangeable && (
                <Link className={btnClass({ variant: "secondary" })} to="/mypage/password">
                  비밀번호 변경
                </Link>
              )}
              <button className={btnClass({ variant: "ghost" })} type="button" onClick={logout}>
                로그아웃
              </button>
            </div>
            {!account.passwordChangeable && (
              <div className={alertClass()}>
                {providerLabel(account.provider)} 계정으로 로그인하고 있어요. 비밀번호는{" "}
                {providerLabel(account.provider)}에서 관리해요.
              </div>
            )}
            {/* 구분선 아래로 떼어 놓아 오조작을 막는다 — 빨갛게 하지 않는다 */}
            <div className="card-danger-zone">
              <Link className={btnClass({ variant: "ghost", className: "withdraw-link" })} to="/mypage/withdraw">
                회원 탈퇴
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="초기화"
        description="완료 표시와 이어보기 위치가 지워져요. 보관함은 그대로 남습니다. 되돌릴 수 없어요."
        errorText="초기화하지 못했어요. 잠시 후 다시 시도해 주세요."
        open={confirmOpen}
        title={`완료한 ${completed}개 유닛 기록을 지울까요?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          const result = await clearProgress();
          if (result.ok) setConfirmOpen(false);
          return result;
        }}
      />
    </section>
  );
}

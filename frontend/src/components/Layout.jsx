import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/authStore.js";
import { toggleTheme } from "../lib/theme.js";
import { LOGO_GLYPH, SITE_NAME } from "../constants/site.js";
import { navItems, isNavItemActive, COURSE_TRACKS, activeTrack } from "../lib/nav.js";
import { EditorModeBar } from "./EditorMode.jsx";

export function Layout() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  // 초기 테마는 index.html 인라인 스크립트가 CSS 로드 전에 이미 적용해 뒀다 — 여기선 결과만 읽는다(부수효과 없음)
  const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");

  const closeMobile = () => setMobileOpen(false);
  const track = activeTrack(pathname); // 과정 스위처 — 메뉴를 늘리지 않고 과정만 바꾼다(설계/05 §16)
  const menu = navItems(pathname); // GNB는 보고 있는 과정을 따라간다(A-H1)

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate("/");
  };

  const trackSwitch = (pill) => (
    <div aria-label="과정 선택" className={pill ? "track-switch mobile" : "track-switch"} role="group">
      {COURSE_TRACKS.map((item) => (
        <Link
          key={item.key}
          aria-current={item.key === track.key ? "true" : undefined}
          className={`track-pill${item.key === track.key ? " active" : ""}`}
          to={item.to}
          onClick={closeMobile}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  const authArea = (pill) => (
    <>
      {status === "loading" && <span aria-hidden="true" className="skeleton sk-auth" />}
      {status !== "loading" && user && (
        <>
          <Link className={pill ? "mobile-nav-item" : "nav-pill"} to="/mypage" onClick={closeMobile}>
            마이페이지
          </Link>
          <span className="hdr-badge">{user.nickname}</span>
          <button className="btn ghost" type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </>
      )}
      {status !== "loading" && !user && (
        <Link className={pill ? "mobile-nav-item" : "btn"} to="/login" onClick={closeMobile}>
          로그인
        </Link>
      )}
    </>
  );

  return (
    <div className="app-root">
      {/* 편집 모드 띠 — GNB보다 위, 모든 화면 상시(A2). 꺼진 환경에서는 미렌더 */}
      <EditorModeBar />
      <header className="app-header">
        <div className="header-container">
          <Link className="header-logo" to="/">
            <span aria-hidden="true" className="logo-badge">
              {LOGO_GLYPH}
            </span>
            <span>{SITE_NAME}</span>
          </Link>

          {trackSwitch(false)}

          <nav aria-label="주 메뉴" className="header-nav">
            {menu.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <Link
                  key={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`nav-pill${active ? " active" : ""}`}
                  to={item.to}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="header-right">
            <button
              aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
              className="theme-toggle"
              type="button"
              onClick={() => setDark(toggleTheme())}
            >
              {dark ? "☀" : "☾"}
            </button>
            <div className="header-auth">{authArea(false)}</div>
            <button
              aria-expanded={mobileOpen}
              aria-label="메뉴 열기"
              className="mobile-menu-btn"
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <span className="material-icons">{mobileOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <>
            {/* 패널 바깥 탭 시 닫힘 — 투명 클릭 캐처 */}
            <button aria-label="메뉴 닫기" className="mobile-nav-backdrop" type="button" onClick={() => setMobileOpen(false)} />
            <div className="mobile-nav-panel">
              {trackSwitch(true)}
              {menu.map((item) => {
                const active = isNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.to}
                    aria-current={active ? "page" : undefined}
                    className={`mobile-nav-item${active ? " active" : ""}`}
                    to={item.to}
                    onClick={closeMobile}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="mobile-nav-divider" />
              <div className="mobile-nav-auth">{authArea(true)}</div>
            </div>
          </>
        )}
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>© 2026 {SITE_NAME}</p>
      </footer>
    </div>
  );
}

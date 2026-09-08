import { useLocation } from "react-router-dom";
import { NotFoundCard } from "../components/StateCards.jsx";

// 404 — 기존 라우트 재사용, 설계/05 §8 시안으로 재도색.
// 없는 주소여도 **보고 있던 과정 안에 남긴다**(2026-08-25 판정 A-M3 · 인수 G-1):
// 영어 화면에서 오타 하나로 일본어 코스 목록에 떨어지면 과정을 잃는다.
export function NotFoundPage() {
  const { pathname } = useLocation();
  const english = pathname === "/en" || pathname.startsWith("/en/");
  // 전역 404는 대상을 특정하지 않는다(2026-09 판정 D-6) — "코스·유닛"은 코스 상세/유닛 화면의 404가 말할 일이다.
  const description = "주소가 바뀌었거나 없는 페이지예요";
  return english ? (
    <NotFoundCard description={description} label="영어 코스 목록으로" to="/en/courses" />
  ) : (
    <NotFoundCard description={description} />
  );
}

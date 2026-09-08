import { useLocation } from "react-router-dom";

/** 테스트용 — 현재 주소를 DOM에 노출해 쿼리스트링 동기화를 검증한다 */
export function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

import { cx } from "./kitClass.js";

/**
 * 진행 막대 — 킷 `.k-bar`.
 *
 * ⚠️ 이 폴더에서 `style` 속성이 나오는 유일한 자리다. 킷 클래스 계약(§4)이 채움을
 * `<div class="k-bar"><span style="width:72%"></span></div>` 로 규정한다 —
 * 비율은 데이터라 CSS로 표현할 수 없다. 우리가 만든 스타일이 아니라 킷의 API다.
 */
export function Bar({ percent, className, fillClassName, ...rest }) {
  return (
    <div className={cx("k-bar", className)} {...rest}>
      <span className={fillClassName} style={{ width: `${percent}%` }} />
    </div>
  );
}

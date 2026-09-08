import { cardClass } from "../ui/kitClass.js";

/**
 * 표현 카드 (설계/05 §16-4) — 유닛 표현 스텝과 표현 상세가 **같은 컴포넌트**를 쓴다.
 * 같은 내용은 같은 컴포넌트로 그린다(05 §7-1) — 두 벌로 두면 계약이 바뀔 때 한쪽만 갱신된다.
 *
 * 값이 없는 줄(발음·용법·예문)은 **줄째 만들지 않는다**(빈 블록 금지 — 05 §8).
 *
 * @param {object} expression text·meaningKo·usageNote·ipa·koApprox·examples
 * @param {import('react').ReactNode} [titleRight] 표제 우측 슬롯(상세: 레벨 배지)
 * @param {boolean} [bare] 카드 면 없이 패널 안에 바로 놓는다(상세 화면)
 */
export function ExpressionCard({ expression, titleRight = null, bare = false }) {
  const pron = [expression.ipa, expression.koApprox].filter(Boolean).join(" · ");
  return (
    <div className={bare ? "expr-body" : cardClass({ className: "expr-card" })}>
      <div className="expr-head">
        <span className="expr-text">{expression.text}</span>
        {titleRight}
      </div>
      {pron && <p className="expr-pron">{pron}</p>}
      <p className="expr-mean">{expression.meaningKo}</p>
      {expression.usageNote && <p className="expr-note">{expression.usageNote}</p>}
      {expression.examples?.map((example, i) => (
        <div key={example.id ?? i} className="expr-example">
          <div className="en">{example.en}</div>
          <div className="m">{example.meaningKo}</div>
        </div>
      ))}
    </div>
  );
}

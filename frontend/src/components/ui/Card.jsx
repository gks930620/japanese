import { cardClass } from "./kitClass.js";

/** 카드 — 킷 `.k-card`. 패딩은 킷이 준다(`padded` 같은 변형을 따로 두지 않는다).
 *  `<Link>`·`<a>`를 카드 면으로 쓸 때는 `kitClass.js`의 `cardClass()`를 쓴다. */
export function Card({ hover, flush, className, ...rest }) {
  return <div className={cardClass({ hover, flush, className })} {...rest} />;
}

/** 머리·본문·바닥 구획 — `flush` 카드와 함께 쓴다 */
export function CardHead({ className, ...rest }) {
  return <div className={className ? `k-card__head ${className}` : "k-card__head"} {...rest} />;
}

export function CardBody({ className, ...rest }) {
  return <div className={className ? `k-card__body ${className}` : "k-card__body"} {...rest} />;
}

export function CardFoot({ className, ...rest }) {
  return <div className={className ? `k-card__foot ${className}` : "k-card__foot"} {...rest} />;
}

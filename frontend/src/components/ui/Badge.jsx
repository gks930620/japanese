import { badgeClass } from "./kitClass.js";

/** 배지 — 킷 `.k-badge`. tone: point | ok | warn | err */
export function Badge({ tone, pill, className, ...rest }) {
  return <span className={badgeClass({ tone, pill, className })} {...rest} />;
}

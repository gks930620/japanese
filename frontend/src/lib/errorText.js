// 오류 코드별 화면 문구 — **재시도로 회복되지 않는 실패는 무엇을 하면 되는지 말한다**(08 C-12 ④).
// 서버 message를 그대로 쓰면 "파일이 너무 큽니다"처럼 한도를 모르는 문장이 되므로 여기서만 보강한다.
import { getErrorMessage } from "./format.js";

/** 업로드 한도 — 서버 제한과 같은 값(2026-08-25 도입) */
export const UPLOAD_LIMIT_TEXT = "10MB";

const TEXT_BY_CODE = {
  // 5회/15분 제한. "잠시 후"로 뭉개면 사용자가 계속 눌러 잠금이 연장된다
  TOO_MANY_LOGIN_ATTEMPTS: "로그인 시도가 너무 많아요. 15분 뒤에 다시 시도할 수 있어요.",
  PAYLOAD_TOO_LARGE: `파일이 너무 커요. 한 번에 ${UPLOAD_LIMIT_TEXT}까지 올릴 수 있어요.`,
};

/** 코드가 아는 것이면 그 문구, 아니면 서버 message(그다음 fallback) */
export function errorText(error, fallback) {
  return TEXT_BY_CODE[error?.errorCode] ?? getErrorMessage(error, fallback);
}

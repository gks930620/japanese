package com.test.test.common.exception;

import com.test.test.common.dto.ErrorResponse;
import com.test.test.common.web.SpaRoutes;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 전역 예외 처리 핸들러
 * Controller에서 발생하는 모든 예외를 처리
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    /** 응답에 실을 수 있는 문자열 거부값의 상한 — 넘으면 생략한다(설계/04 §1-2 · 08 C-28) */
    private static final int MAX_REJECTED_VALUE_LENGTH = 100;

    /**
     * 응답에 값을 되돌려주면 안 되는 필드 — 필드명에 password가 들어가면 전부(passwordConfirm·newPassword 포함).
     * 마스킹 = 키 생략(2026-09 판정 D-13)
     */
    private static boolean isSensitiveField(String field) {
        return field != null && field.toLowerCase().contains("password");
    }

    /**
     * 응답에 실어도 되는 거부값인가 — <b>짧은 스칼라만</b> 싣는다 (설계/04 §1-2 · 08 C-28).
     *
     * <p>싣는 것: 100자 이하 문자열 · 숫자 · 불리언 · null.
     * 생략하는 것: 비밀번호류(D-13) · 100자 초과 문자열 · <b>배열/컬렉션/맵/객체</b>.
     * 생략은 {@code null} 반환으로 표현되고, {@code ErrorResponse.FieldError}가 {@code NON_NULL}이라
     * <b>키 자체가 사라진다</b> — 마스킹 방식이 D-13과 하나다.</p>
     *
     * <p>검증 실패 응답의 목적은 "무엇이 왜 거부됐는지"를 알리는 것이지 요청을 되비추는 것이 아니다.
     * 501건 배열·15,000자 본문을 되돌려주면 에러 응답이 <b>요청 크기에 비례하는 증폭기</b>가 되고,
     * 그 값이 로그·에러 수집기에 한 번 더 복제된다. 사용자는 {@code message}로 고칠 수 있다.</p>
     */
    private static Object echoableRejectedValue(String field, Object rejectedValue) {
        if (rejectedValue == null || isSensitiveField(field)) {
            return null;
        }
        if (rejectedValue instanceof CharSequence text) {
            return text.length() <= MAX_REJECTED_VALUE_LENGTH ? rejectedValue : null;
        }
        if (rejectedValue instanceof Number || rejectedValue instanceof Boolean
                || rejectedValue instanceof Character || rejectedValue instanceof Enum<?>) {
            return rejectedValue;
        }
        return null; // 배열·컬렉션·맵·그 밖의 객체
    }

    /**
     * 필수 값 누락 응답 — <b>전송 방식과 무관하게 같은 답</b>이다 (설계/04 §1-2, 2026-09-21 qa 결함 D).
     *
     * <p>쿼리 파라미터 누락도 multipart 파트 누락도 여기서 문구를 만든다. 두 곳에서 만들면 곧 갈리고,
     * 클라이언트는 같은 상황("필수 입력이 안 왔다")을 두 갈래로 처리하게 된다.</p>
     */
    private ResponseEntity<ErrorResponse> missingParameter(String name) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(
                "필수 파라미터가 누락되었습니다: " + name,
                "MISSING_PARAMETER"
        ));
    }

    /**
     * 비즈니스 예외 처리 (커스텀 예외들의 부모)
     * - EntityNotFoundException → 404
     * - AccessDeniedException → 403
     * - BusinessRuleException → 400
     * - DuplicateResourceException → 409
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        log.warn("Business Exception: {} - {}", e.getErrorCode(), e.getMessage());

        ErrorResponse response = ErrorResponse.of(e.getMessage(), e.getErrorCode());
        return ResponseEntity.status(e.getStatus()).body(response);
    }

    /**
     * 유효성 검증 실패 (@Valid 검증 실패)
     * DTO의 @NotBlank, @Size 등 검증 실패 시 발생
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        log.warn("Validation Exception: {}", e.getMessage());

        List<ErrorResponse.FieldError> fieldErrors = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> ErrorResponse.FieldError.builder()
                        .field(error.getField())
                        .message(error.getDefaultMessage())
                        // 실어도 되는 값인지의 판정은 한 곳이다 — 비밀번호류·긴 문자열·배열/객체는 생략(D-13 · C-28)
                        .rejectedValue(echoableRejectedValue(error.getField(), error.getRejectedValue()))
                        .build())
                .collect(Collectors.toList());

        ErrorResponse response = ErrorResponse.of(
                "입력값이 올바르지 않습니다.",
                "VALIDATION_ERROR",
                fieldErrors
        );
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * JSON 파싱 실패 (잘못된 JSON 형식)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException e) {
        log.warn("JSON Parse Exception: {}", e.getMessage());

        ErrorResponse response = ErrorResponse.of(
                "요청 본문을 읽을 수 없습니다. JSON 형식을 확인해주세요.",
                "INVALID_JSON"
        );
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 필수 요청 파라미터 누락 → 400
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException e) {
        log.warn("Missing Parameter: {}", e.getParameterName());
        return missingParameter(e.getParameterName());
    }

    /**
     * multipart 필수 파트 누락 → <b>400</b> (설계/04 §1-2, 2026-09-21 qa 결함 D)
     *
     * <p>핸들러가 없으면 최후의 {@code Exception} 핸들러가 받아 500이 된다. 파트 누락은
     * <b>요청을 고쳐야 회복되는 클라이언트 잘못</b>이라 재시도로 낫지 않는데, 500이면 모니터링에
     * 서버 장애로 잡히고 프론트는 "잠시 후 다시 시도"를 띄운다(컨벤션 §2). 405·413·415를 이미 같은 이유로 고쳤다.</p>
     *
     * <p>응답은 쿼리 파라미터 누락과 <b>완전히 같다</b> — 같은 코드, 같은 문구({@link #missingParameter}).</p>
     */
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingPart(MissingServletRequestPartException e) {
        log.warn("Missing Part: {}", e.getRequestPartName());
        return missingParameter(e.getRequestPartName());
    }

    /**
     * 업로드 상한 초과 → <b>413</b> (판정 2026-08-25 E-1)
     *
     * <p>핸들러가 없으면 최후의 {@code Exception} 핸들러가 받아 500이 된다. 프론트는 500을
     * "잠시 후 다시 시도"로 그리는데 <b>파일이 큰 것은 재시도로 회복되지 않는다</b> —
     * 사용자는 같은 파일을 영원히 다시 올리게 된다. 404·405·415에서 이미 없앤 패턴이라 여기도 같게 맞춘다
     * (컨벤션 §2가 413을 이름까지 짚어 금지한다).</p>
     *
     * <p>상한값 자체는 설정({@code spring.servlet.multipart.max-file-size})이지 계약이 아니다 —
     * 계약은 "넘기면 413"이다. 그래서 메시지에 구체적인 MB 수를 박지 않는다.</p>
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException e) {
        log.warn("Upload size exceeded: {}", e.getMessage());

        ErrorResponse response = ErrorResponse.of(
                "업로드 가능한 크기를 초과했습니다.",
                "PAYLOAD_TOO_LARGE"
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
    }

    /**
     * 파라미터 타입 불일치 (예: Long에 문자열 전달)
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.warn("Type Mismatch: {} - {}", e.getName(), e.getValue());

        ErrorResponse response = ErrorResponse.of(
                "파라미터 타입이 올바르지 않습니다: " + e.getName(),
                "TYPE_MISMATCH"
        );
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 경로는 있는데 그 메서드가 없다 → <b>405</b> (설계/04 §1-2)
     *
     * <p>미매핑 경로를 500에서 404로 고친 것과 같은 이유다 — 500은 "잠시 후 다시 시도"로 읽히지만
     * 메서드 불일치는 <b>요청을 고쳐야 회복되는 클라이언트 잘못</b>이라 재시도로 낫지 않는다.</p>
     *
     * <p>RFC 9110에 따라 허용 메서드를 {@code Allow} 헤더로 함께 알린다.
     * 인증 판정은 시큐리티가 먼저 하므로, 비로그인 요청은 여기까지 오지 않고 401이다.</p>
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        log.warn("Method Not Allowed: {}", e.getMessage());

        HttpHeaders headers = new HttpHeaders();
        Set<HttpMethod> supportedMethods = e.getSupportedHttpMethods();
        if (supportedMethods != null && !supportedMethods.isEmpty()) {
            headers.setAllow(supportedMethods);
        }

        ErrorResponse response = ErrorResponse.of(
                "지원하지 않는 요청 메서드입니다: " + e.getMethod(),
                "METHOD_NOT_ALLOWED"
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).headers(headers).body(response);
    }

    /**
     * Content-Type 누락·미지원 → <b>415</b> (설계/04 §1-2)
     *
     * <p>본문을 읽을 수 없는 것이 아니라 <b>형식 협상이 실패한 것</b>이라 INVALID_JSON(400)과 구분한다.</p>
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException e) {
        log.warn("Unsupported Media Type: {}", e.getMessage());

        ErrorResponse response = ErrorResponse.of(
                "지원하지 않는 Content-Type입니다: " + e.getContentType(),
                "UNSUPPORTED_MEDIA_TYPE"
        );
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(response);
    }

    /**
     * 매핑된 핸들러도 정적 파일도 없다 → <b>화면이면 SPA로, 아니면 404</b> (설계/04 §1-7 · 08 C-25)
     *
     * <p>판정은 {@link SpaRoutes} 하나다 — 시큐리티 화이트리스트와 <b>같은 함수</b>를 본다(설계/07 §5-2).
     * <ul>
     *   <li>예약 밖의 <b>점 없는 GET·HEAD</b> → 200 + {@code forward:/index.html}.
     *       라우팅의 단일 기준은 React 라우터이고, 없는 화면은 {@code NotFoundPage}가 그린다.
     *       예전처럼 화면 경로를 열거하면 열거 밖 주소가 401 JSON 원문으로 보인다(qa 결함 A).</li>
     *   <li>그 밖 → 404 JSON. 없는 API에 index.html(200)을 주면 클라이언트가 HTML을 JSON으로 파싱하다 실패하고,
     *       없는 번들에 주면 브라우저가 HTML을 JS로 파싱해 죽는다.</li>
     * </ul>
     *
     * <p>두 예외를 함께 받는 이유: {@code throw-exception-if-no-handler-found=true}로 올라오는
     * NoHandlerFoundException 외에, 정적 리소스 핸들러({@code /**})가 파일을 못 찾을 때 던지는
     * NoResourceFoundException도 같은 상황이다(핸들러가 없으면 아래 Exception 핸들러에 걸려 500이 된다).</p>
     *
     * <p>forward를 여기서 하는 이유: 컨트롤러 매핑으로 {@code /**}를 잡으면 <b>정적 리소스 핸들러를 가려</b>
     * 실제 파일({@code /favicon.svg}·{@code /assets/*.js})까지 삼킨다. "핸들러도 파일도 없을 때"가
     * 정확히 폴백 조건이라, 그 지점에서 한 번만 판정한다.</p>
     */
    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ErrorResponse> handleNoHandlerFound(Exception e,
                                                              HttpServletRequest request,
                                                              HttpServletResponse response) throws Exception {
        if (SpaRoutes.isSpaFallback(request)) {
            // 200 + forward — 상태코드를 건드리지 않는다(주소창 진입의 결과는 화면이다)
            request.getRequestDispatcher(SpaRoutes.SPA_ENTRY).forward(request, response);
            return null;
        }

        log.warn("No handler found: {}", e.getMessage());

        ErrorResponse errorResponse = ErrorResponse.of("요청한 경로를 찾을 수 없습니다.", "NOT_FOUND");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * IllegalArgumentException 처리 (마이그레이션 중 기존 코드 호환)
     * 추후 커스텀 예외로 모두 변환되면 제거 가능
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("IllegalArgumentException: {}", e.getMessage());

        // 메시지 내용에 따라 적절한 상태 코드 반환
        HttpStatus status = determineStatusFromMessage(e.getMessage());
        String errorCode = determineErrorCodeFromMessage(e.getMessage());

        ErrorResponse response = ErrorResponse.of(e.getMessage(), errorCode);
        return ResponseEntity.status(status).body(response);
    }

    /**
     * IllegalStateException 처리
     * - 현재 코드에서 의도적으로 던지는 곳은 없음 → 대부분 프레임워크/프로그래밍 오류.
     * - 클라이언트에 내부 메시지를 노출하지 않고 500으로 처리한다.
     * - '충돌' 상황(이미 삭제 등)은 DuplicateResourceException(409)/BusinessRuleException(400) 같은
     *   전용 예외를 사용할 것.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException e) {
        log.error("IllegalStateException (예상치 못한 상태): ", e);

        ErrorResponse response = ErrorResponse.of(
                "서버 내부 오류가 발생했습니다.",
                "INTERNAL_SERVER_ERROR"
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    /**
     * 예상치 못한 예외 처리 (최후의 보루)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unexpected Exception: ", e);

        ErrorResponse response = ErrorResponse.of(
                "서버 내부 오류가 발생했습니다.",
                "INTERNAL_SERVER_ERROR"
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    /**
     * 메시지 내용으로 HTTP 상태 코드 결정 (마이그레이션 용)
     */
    private HttpStatus determineStatusFromMessage(String message) {
        if (message == null) return HttpStatus.BAD_REQUEST;

        if (message.contains("찾을 수 없습니다")) {
            return HttpStatus.NOT_FOUND;
        }
        if (message.contains("본인의") || message.contains("권한이 없습니다")) {
            return HttpStatus.FORBIDDEN;
        }
        return HttpStatus.BAD_REQUEST;
    }

    /**
     * 메시지 내용으로 에러 코드 결정 (마이그레이션 용)
     */
    private String determineErrorCodeFromMessage(String message) {
        if (message == null) return "BAD_REQUEST";

        if (message.contains("찾을 수 없습니다")) {
            return "NOT_FOUND";
        }
        if (message.contains("본인의") || message.contains("권한이 없습니다")) {
            return "ACCESS_DENIED";
        }
        return "BAD_REQUEST";
    }
}


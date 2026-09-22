# 04. API 계약

> **이 문서는 무엇인가**
> 지금 동작하는 REST 엔드포인트의 계약이다. 요청 파라미터, 응답 필드, 에러 형식을 실제 컨트롤러·DTO와 대조해 적었다.
> 과거 변경 이력은 담지 않는다 — **여기 적힌 것이 현행이고, 여기 없으면 없는 것이다.**
> 계약 변경(응답 필드 추가·삭제·의미 변경)은 senior-dev를 통해서만 한다. 임의로 바꾸면 다른 스택이 조용히 깨진다.

기준일: **2026-08-25** / 대조한 코드: `course/`, `english/`, `library/`, `editor/`, `jwt/`, `me/`, `progress/`, `bookmark/`, `community/`, `file/`, `common/`
(2026-08-25 갱신: 영어 §8 · 편집 §9 · 계정 §4-1 · 페이징 §1-5 · 로그인 시도 제한 §1-6 · 413/429 에러코드 · `username` 제거
 · **§2-1·§2-2·§3-1의 레벨 서술을 `level_code` 기준으로 정정** — `courseNo` 파생 서술이 03만 고쳐지고 여기 남아 있었다)

---

## 1. 공통 규약

### 1-1. 성공 응답 봉투

모든 JSON API는 `ApiResponse<T>`로 감싼다.

```json
{ "success": true, "message": "Course list fetched", "data": { } }
```

- `message`는 사람이 읽는 로그성 문구다. **프론트가 분기 근거로 쓰지 않는다.**
- "없음" 메시지는 `존재하지 않는 {리소스}입니다: {식별자}` 한 형식이다(`EntityNotFoundException.of`). 조사를 `을(를)`로 병기하지 않는다 — 한국어 제품에서 괄호 조사는 기계가 쓴 티가 난다.
- 실제 payload는 항상 `data` 안에 있다.

### 1-2. 에러 응답

`ErrorResponse` — `@JsonInclude(NON_NULL)`이라 값 없는 필드는 빠진다.

```json
{
  "success": false,
  "message": "존재하지 않는 코스입니다: 99",
  "errorCode": "NOT_FOUND",
  "timestamp": "2026-08-10T10:00:00",
  "errors": [ { "field": "nickname", "message": "...", "rejectedValue": "..." } ]
}
```

**프론트는 `errorCode`로 분기한다** (`status`만으로는 부족하다 — 예: 404가 두 종류다).

| errorCode | HTTP | 언제 | 던지는 곳 |
|---|---|---|---|
| `NOT_FOUND` | 404 | 리소스 없음 / 미매핑 경로 | `EntityNotFoundException`, `NoHandlerFoundException` |
| `COURSE_PREPARING` | 404 | **준비중 코스의 유닛**에 접근 | `CoursePreparingException` |
| `BUSINESS_RULE_VIOLATION` | 400 | 허용 밖 파라미터 값 등 | `BusinessRuleException` |
| `VALIDATION_ERROR` | 400 | `@Valid` 실패 (+ `errors[]`) | `MethodArgumentNotValidException` |
| `INVALID_JSON` / `MISSING_PARAMETER` / `TYPE_MISMATCH` | 400 | 요청 형식 오류 | 각 스프링 예외 |
| `METHOD_NOT_ALLOWED` | **405** | 경로는 있는데 그 메서드가 없음. 응답에 `Allow` 헤더 필수 | `HttpRequestMethodNotSupportedException` |
| `UNSUPPORTED_MEDIA_TYPE` | **415** | `Content-Type` 누락·미지원 | `HttpMediaTypeNotSupportedException` |
| `ACCESS_DENIED` | 403 | 본인 소유가 아닌 리소스 수정·삭제 | `AccessDeniedException` |
| `DUPLICATE_RESOURCE` | 409 | 중복·이미 삭제됨 | `DuplicateResourceException` |
| `TOKEN_EXPIRED` / `INVALID_TOKEN` / `NOT_AUTHENTICATED` | 401 | 인증 실패 (원인 구분) | SecurityConfig entryPoint |
| `TOKEN_REQUIRED` / `TOKEN_DISCARDED` / `TOKEN_EXPIRED` | 401 | 리프레시 실패 | `RefreshTokenException` |
| `PAYLOAD_TOO_LARGE` | **413** | 업로드 파일이 상한(단일 10MB / 요청 50MB) 초과 | `MaxUploadSizeExceededException` |
| `TOO_MANY_LOGIN_ATTEMPTS` | **429** | 로그인 연속 실패가 상한(기본 5회)을 넘음 — 창(기본 15분) 동안 비밀번호가 맞아도 거부 | 로그인 시도 제한 필터 |
| `INTERNAL_SERVER_ERROR` | 500 | 예상치 못한 예외 | 최후 핸들러 |

`COURSE_PREPARING`이 `NOT_FOUND`와 갈라져 있는 이유: 프론트가 "없는 주소" 화면과 "준비중 안내" 화면으로 다르게 분기해야 하기 때문이다.

**미매핑 경로는 500이 아니라 404다.** 500은 사용자에게 "잠시 후 다시 시도"로 읽혀, 성공하지 못할 재시도를 반복하게 만든다.

**같은 이유로 프레임워크 표준 4xx를 500으로 뭉개지 않는다**(code-convention §2) — 메서드 불일치는 **405**, 미디어타입 불일치는 **415**다.
둘 다 "요청을 고쳐야 하는 클라이언트 잘못"이라 재시도로 회복되지 않는데, 500이면 모니터링에 서버 장애로 잡히고 클라이언트는 재시도한다.

> **판정 순서는 시큐리티가 먼저다.** 화이트리스트에 없는 메서드(공개 GET 네임스페이스의 POST 등)는 405가 아니라 **401**이다 —
> 405로 답하면 비로그인에게 "그 경로가 존재한다"를 알려주게 된다. 405/415는 **인증을 통과한 요청**에서만 드러난다.
> 같은 이유로 **화이트리스트 밖 `/api` 경로는 404가 아니라 401**이다(`/api/nonexistent`). 공개 네임스페이스
> (`/api/courses/**`·`/api/library/**`·`/api/en/**`) 아래의 미매핑만 404다.

**필수 값 누락은 전송 방식과 무관하게 400 `MISSING_PARAMETER`다** (2026-09-21 qa 결함 D).
쿼리 파라미터 누락(`?refType` 없음)도, **multipart 파트 누락**(`files` 파트 없음)도 같은 코드·같은 형식이다 —
메시지는 `필수 파라미터가 누락되었습니다: {이름}`. 클라이언트가 보는 문제는 "필수 입력이 안 왔다" 하나인데
전송 방식에 따라 400/500으로 갈리면 프론트가 같은 상황을 두 갈래로 처리하게 된다.

#### `errors[].rejectedValue` — 짧은 스칼라만 싣는다 (2026-09-21 판정, qa 결함 F)

| 거부된 값 | 응답 |
|---|---|
| 100자 이하 문자열 · 숫자 · 불리언 · null | 그대로 싣는다 |
| 필드명에 `password` 포함 | **생략**(마스킹 = 키 생략 — 판정 D-13) |
| **100자 초과 문자열** | **생략** |
| **배열·컬렉션·맵·객체** | **생략** |

검증 실패 응답의 목적은 "무엇이 왜 거부됐는지"를 알리는 것이지 요청을 되비추는 것이 아니다.
501건 배열·15,000자 본문을 되돌려주면 **에러 응답이 요청 크기에 비례하는 증폭기**가 되고(50MB 요청 → 50MB 응답),
그 값이 로그·에러 수집기에 한 번 더 남는다. 사용자는 `message`("최대 500개까지 보낼 수 있습니다")로 고칠 수 있다.
고정 테스트: `integration/RejectedValueSizeContractIntegrationTest`

#### 메시지의 리소스 이름은 **사용자의 말**이다 (2026-09-21 판정, qa 결함 E)

`Community`·`Comment`·`User` 같은 **내부 클래스명을 응답에 싣지 않는다**(판정 2026-08-25 G-1) →
**게시글·댓글·사용자**. `존재하지 않는 게시글입니다: 99999` / `본인의 댓글만 수정할 수 있습니다.`
같은 리소스인데 경로마다 다른 말을 쓰면 사용자는 같은 상황에서 두 가지 품질의 문구를 본다.
고정 테스트: `integration/DomainErrorMessageContractIntegrationTest`

### 1-3. null 직렬화 규칙

학습·자료실 DTO는 **`@JsonInclude`를 걸지 않는다** — 값이 없는 필드도 `null`로 항상 내려간다.
프론트가 "필드가 없는 것"과 "값이 null인 것"을 구분하지 않아도 되게 하기 위해서다.
반대로 **배열은 절대 null이 아니다**(예: 규칙표 없는 문법은 `rules: []`). 프론트가 `.length`로 바로 분기한다.

### 1-4. 인증

- 학습(`/api/courses/**`)과 자료실(`/api/library/**`)의 **GET은 전부 비로그인 공개**다.
- SecurityConfig는 **화이트리스트 방식** — 명시하지 않은 모든 요청은 인증 필요가 기본값이다.
  **새 공개 API를 만들면 SecurityConfig의 permitAll 목록에 반드시 등록해야 한다.**
- 공개 경로를 `/api/courses/**`처럼 하위까지 여는 이유: 없는 하위 경로에 401을 주면 "로그인하면 되나?"로 읽히지만
  실제로는 존재하지 않는 주소다 — 404로 드러나야 한다.
- 토큰은 HttpOnly 쿠키(`access_token` 30분 / `refresh_token` 4시간, `SameSite=Lax`, 운영 `Secure=true`).
  앱에는 JSON 바디로 토큰을 내리는 이중 경로가 있다. **웹/앱 판별자가 엔드포인트마다 다르다**(2026-09-03 정정 — 예전 서술 "앱(Authorization 헤더)"은 로그인에는 맞지 않았다):

  | 엔드포인트 | 웹(쿠키)로 판정하는 조건 | 근거 |
  |---|---|---|
  | `POST /api/login` | 요청 `Accept`에 `text/html`이 **포함** (SPA는 `Accept: application/json, text/html`을 보낸다 — `AuthContext.jsx`) | `JwtLoginFilter` · `WebCookieAuthContractIntegrationTest` |
  | `POST /api/tokens/refresh` · `PUT /api/me/password` | `Authorization: Bearer` 헤더가 **없음** | `RefreshController` · `AccountController` |

  로그인에는 아직 토큰이 없으므로 Bearer로 가를 수 없어 `Accept`를 쓴다. `Accept` 없이 로그인하면 **쿠키가 오지 않고 바디로 토큰이 온다** — 웹 클라이언트가 이 헤더를 빠뜨리면 200인데 로그인 안 된 것처럼 보인다.
  판별자를 하나로 합치는 것은 앱(Flutter)이 붙을 때의 계약 변경이다(판정 M6).

---


### 1-5. 페이징 — **범위 밖 페이지는 서버가 0으로 보정한다**

목록 API(`Page`/`LibraryPageResponse`)의 공통 규칙이다.

| 요청 | 응답 |
|---|---|
| `page`가 총 페이지 수 이상 | **0페이지 내용** + 응답 `page: 0` (404도, 빈 배열도 아니다) |
| `page`가 음수 | 0으로 보정 |
| `size`가 상한 초과 | 상한으로 보정(공통 100, 자료실은 종류별 기본값이 따로 있다) |

**클라이언트는 요청한 `page`가 아니라 응답의 `page`를 신뢰한다.**
"999페이지를 요청했는데 1페이지가 왔다"는 결함이 아니라 이 계약의 결과다 —
보정을 화면마다 각자 구현하면 세 화면이 서로 다르게 동작한다(08 B-3).

> **왜 빈 배열이 아닌가**: 마지막 페이지를 보는 중에 글이 삭제돼 총 페이지가 줄어드는 일이 흔하다.
> 그때 사용자가 볼 것은 **빈 화면이 아니라 목록**이다. `totalElements`·`totalPages`가 함께 오므로
> 화면이 "마지막 페이지로 밀렸다"를 표현할 수 있다.

**정렬은 서버가 정한다 — `sort`는 계약에 없다** (2026-09-21 판정, qa 결함 B).
커뮤니티 글 목록·댓글 목록의 Spring `Pageable` `sort` 파라미터를 서버는 **읽지 않는다.**
알 수 없는 값(`?sort=nope,desc`)이든 존재하는 속성(`?sort=createdAt,asc`)이든 응답은 같다 — 서버 기준 정렬(최신순)의 **200**이다.

- **500은 계약 위반이다**: 지금 댓글 목록은 클라이언트 `sort`를 `@Query`+Pageable 리포지토리에 그대로 넘겨 500이 난다(§1-2).
- **400도 아니다**: `sort`는 계약 파라미터가 아니다. 계약에 없는 쿼리 파라미터를 거절하지 않는 것이 일반 규칙이고
  (그러지 않으면 `utm_*`이 붙은 링크에서 화면이 깨진다), 지금 200을 주는 글 목록을 400으로 바꾸면 계약이 **좁아져** 기존 클라이언트가 깨진다.
- **무엇보다 안 쓰는 것이 검증하는 것보다 안전하다** — 클라이언트 입력이 JPA 속성 경로로 들어가는 길 자체를 없애는 것이 정렬 주입의 정석 방어다.
- ⚠️ 자료실의 `sort`(`LEARNING`·`KANA`)는 **계약 파라미터**라 허용 밖 값이 400 `BUSINESS_RULE_VIOLATION`이다(§3-1). 이름만 같을 뿐 다른 것이다 —
  **계약에 있는 파라미터의 잘못된 값 = 400, 계약에 없는 파라미터 = 무시.**

고정 테스트: `integration/ListSortParameterContractIntegrationTest`

---


### 1-6. 로그인 시도 제한 (2026-08-25 신규)

| 항목 | 규칙 |
|---|---|
| 키 | **username 단위**(IP 아님 — NAT·모바일에서 무고한 사용자를 함께 막지 않기 위해) |
| 임계 | 연속 실패 **5회**(`app.login.attempt.max`) |
| 차단 | **15분**(`app.login.attempt.window-minutes`). 그 사이에는 **비밀번호가 맞아도** 429 |
| 검사 시점 | **비밀번호 대조 전.** 잠긴 상태의 요청은 실패 횟수로 **세지 않는다**(차단이 스스로 연장되지 않는다) |
| 해제 | 창 만료 **또는 성공 로그인 시 카운터 리셋** |
| 응답 | `429` + `errorCode: TOO_MANY_LOGIN_ATTEMPTS` |
| 한계 | 카운터는 **인스턴스 메모리**다. 다중화하면 `InMemoryAuthorizationRequestRepository`와 함께 Redis로 옮긴다 |

라이브러리를 도입하지 않았다 — 규칙이 이 표 하나로 끝나고, 같은 성격의 인메모리 선례가 이미 있다.
**비밀번호 최소 4자는 사용자 결정이라 건드리지 않았다.** 시도 제한은 그 결정의 대가를 줄이는 조치이지 상쇄가 아니다.
고정 테스트: `integration/LoginAttemptLimitContractIntegrationTest`

---

### 1-7. SPA 폴백 경계 — 무엇이 화면이고 무엇이 서버 자원인가 (2026-09-21 신규, qa 결함 A)

서버는 들어온 요청을 **세 부류**로 가른다. 이 경계가 곧 `HomeController`(forward 대상)와
`SecurityConfig`(permitAll)의 **공통 판정**이다 — 두 곳이 각자 판정하면 곧 갈린다(설계/07 §5-2).

| 부류 | 규칙 | 응답 |
|---|---|---|
| **① 예약 네임스페이스** | `/api` · `/uploads` · `/images` · `/h2-console` · `/actuator` · `/swagger-ui` · `/v3/api-docs` · `/error` · `/custom-oauth2` · `/oauth2` · **`/login/oauth2`** | 각자의 규칙 그대로(JSON 404 / 401 / 리다이렉트 …). **SPA로 보내지 않는다** |
| **② 점(확장자)이 있는 경로** | 마지막 세그먼트에 `.`이 있다(`/nope.js` · `/assets/x.css`) | 정적 자원 요청이다. 있으면 그 파일, **없으면 404** |
| **③ 그 밖의 GET·HEAD** | 위 둘이 아니다 | **200 + `forward:/index.html`** — React 라우터가 매칭하고, 없으면 `NotFoundPage`를 그린다 |

- **③이 이 절의 핵심이다.** 예전엔 화면 경로를 `HomeController`가 열거해, 열거 밖 주소(`/nonexistent-page`·`/bookmarks/zzz`·`/signup/x`)가
  화이트리스트에도 없어 **401 JSON 원문**이 화면에 그대로 보였다. 사용자는 "로그인하면 되나?"로 읽지만 실제로는 없는 주소다(§1-4).
  Vite dev(5103)는 200이라 **개발 중엔 보이지 않고 배포에서만 드러난다.**
- **①: `/api`는 절대 SPA가 되지 않는다.** 없는 API에 index.html(200)이 오면 클라이언트가 HTML을 JSON으로 파싱하다 엉뚱하게 실패한다.
  `/login`은 **화면**이고 `/login/oauth2/**`만 서버 콜백이다 — 더 긴 경로가 이긴다(`/login/zzz`는 화면이다).
- **②: 없는 번들에 index.html을 주지 않는다.** 배포 직후 캐시에 남은 옛 번들 요청(`/assets/index-옛해시.js`)에 200 HTML을 주면
  브라우저가 HTML을 JS로 파싱해 `Unexpected token '<'`로 죽는다. **404가 와야** 브라우저·CDN이 "없음"을 알고 새 번들을 받는다.
- **메서드**: SPA로 가는 것은 **GET·HEAD뿐**이다. 주소창 진입은 GET이다. 화면 경로로 오는 POST는 화이트리스트 밖이라 **401**이 유지된다(§1-2).
- **보안**: 폴백을 넓히면서 보호 네임스페이스가 함께 열리면 결함 하나를 고치고 구멍 하나를 여는 것이다.
  `/api/me/**`·`/api/progress/**`·`/api/bookmarks/**`는 401, `/actuator/metrics`는 401, `/h2-console/**`는 콘솔이 꺼진 환경에서 401 —
  **전부 그대로여야 한다.**

고정 테스트: `integration/SpaFallbackRouteContractIntegrationTest`

---

## 2. 학습 API (`/api/courses`) — 전부 GET, 공개

### 2-1. `GET /api/courses` — 코스 목록

`courseNo` 오름차순 6개.

```
data: [ { id, courseNo, levelLabel, levelCode, title, targetAudience, goal, notice, status, unitCount } ]
```

- `status`: `"AVAILABLE"` | `"PREPARING"`
- `levelCode`: 레벨 **코드**(`INTRO`·`N5`~`N1`). 자료실 `level=` 필터에 그대로 넘길 수 있는 유일한 값이다 — `levelLabel`(표시 문구)을 잘라 만들지 않는다(§3-1).
- `notice`: 코스 카드의 보조 안내. 값이 있는 코스만 표시(현재 N5만).
- `unitCount`: 유닛 수(DB 집계, PREPARING은 0) — 진도 막대의 분모다(§6-1).
- 프론트는 "시작 코스"를 하드코딩하지 않는다 — **AVAILABLE 중 `courseNo` 최솟값**을 시작점으로 계산한다
  (`frontend/src/lib/courses.js`). 입문(코스 0)이 열려 있으므로 현재 시작점은 코스 0이다.

### 2-2. `GET /api/courses/{courseId}` — 코스 상세

**준비중 코스도 200이다.** 빈 `units`와 0인 `summary`로 내려가고 프론트가 `status`로 분기한다.

```
data: {
  id, courseNo, levelLabel, levelCode, title, targetAudience, goal, notice, description, status,
  summary: { unitCount, grammarCount, kanjiCount, vocabCount },
  units: [ { unitNo, title, grammarCount, kanjiCount, vocabCount } ]
}
```

- `summary`는 **DB 집계값이다 — 하드코딩 금지 계약.** 유닛별 집계의 합이다.
- `units[]`에 회화 개수가 없는 이유: 유닛당 회화는 항상 정확히 1편(도메인 규칙)이라 내릴 필요가 없다.
- 없는 `courseId` → 404 `NOT_FOUND`.

### 2-3. `GET /api/courses/{courseId}/units/{unitNo}` — 유닛 학습 데이터

유닛 학습 화면의 **모든 스텝이 이 한 번의 호출로 렌더링된다.** 스텝마다 호출하지 않는다.

```
data: {
  courseId, courseTitle, levelCode, unitNo, title, totalUnits,
  coursePlannedUnits,               // 계획 유닛 수. null = 지금 있는 유닛이 전부 (§2-3-A)
  prevUnitNo, nextUnitNo,          // 첫/마지막 유닛이면 각각 null
  nextCourse,                       // 마지막 유닛에서만 값, 그 외 null
  grammars: [ {
    id, name, nameKo, explanation,
    examples: [ { id, jp, kana, meaningKo } ],
    rules:    [ { groupLabel, pattern, exampleBefore, exampleAfter } ]   // 없으면 []
  } ],
  dialog: { id, title, lines: [ { id, speaker, jp, kana, meaningKo } ] },
  kanjis: [ { id, letter, meaningKo, onyomi, kunyomi,
              words: [ { id, word, kana, meaningKo } ] } ],
  vocabularies: [ { id, word, kana, meaningKo, partOfSpeech, entryId } ],
  review: { fromUnitNo, toUnitNo, grammarNames: [] }   // 5의 배수 유닛에서만, 그 외 null
}
```

계약 세부:

| 필드 | 규칙 |
|---|---|
| `levelCode` | 그 코스의 레벨 코드(`INTRO`·`N5`~`N1`·`E1`~`E5`). **자료실 조회의 `level=` 필터와 같은 값**이라, 유닛 퀴즈가 같은 레벨의 오답 후보를 뽑는 근거가 된다(2026-08-25 감사 H2) |
| `examples[].id` · `lines[].id` · `words[].id` | 자식 행의 PK. **편집 모드가 "어느 행을 고쳤는지" 지목하는 키**다(§9). 편집이 꺼진 환경에서도 응답에는 항상 있다 |
| `kana` (예문·회화·어휘·한자 예시단어) | **원문에 한자가 포함될 때만 값.** 원문이 전부 가나면 `null` (화면은 `─` 표기) |
| `rules` | 항상 배열. 규칙표 없는 문법은 `[]` |
| `onyomi` / `kunyomi` | 각각 null 가능하되 **둘 다 null은 금지**(데이터 검증 책임). 없는 쪽 줄은 화면에서 생략 |
| `partOfSpeech` | enum 코드 문자열 7종. **한국어 라벨은 서버가 내려주지 않는다** → 프론트 `constants/partOfSpeech.js`가 단일 출처 |
| `nextCourse` | `{ id, courseNo, levelLabel, title, status }`. 다음 코스가 **준비중이어도 내려주고** 프론트가 `status`로 분기한다 |
| `review` | `unitNo % 5 == 0`일 때만. 구간은 자기 포함 직전 5유닛(`fromUnitNo = unitNo - 4`). 별도 시드 없이 `unit_grammar` 매핑 + `grammar_point.name`으로 구성(단일 출처) |
| `coursePlannedUnits` | 그 코스가 **최종적으로 갖게 될 유닛 수**(편집 계획값, `course.planned_unit_count`). `null`이면 계획값 없음 = **지금 있는 유닛이 전부**. `totalUnits`(DB 집계)에서 파생하지 않는다 — 서버가 가진 값을 그대로 싣는다. **null이어도 키는 항상 직렬화한다**(`nextCourse`·`review`와 같은 규칙) |

에러:

- 준비중 코스의 유닛 → **404 + `COURSE_PREPARING`** (없는 유닛의 `NOT_FOUND`와 구분)
- 없는 코스/유닛 → 404 `NOT_FOUND`

#### 2-3-A. 부분 공개 코스 — "완주"와 "열린 데까지의 끝"은 다른 상태다 (2026-09-21)

> **2026-09-22 현황**: E1은 **15/15로 계획을 채운 완주 코스**이고, **E2가 5/20으로 부분 공개**됐다.
> 즉 `totalUnits < coursePlannedUnits`인 코스가 **다시 존재한다**(E2 = 102). 한때 이 상태를 실데이터로 태우는
> 백엔드 테스트가 없었지만(설계/08 C-30), **E2 개통과 함께 복구했다** — 아래 커버리지 표의 마지막 줄.

`nextUnitNo == null`은 **"이 코스의 마지막 유닛"** 일 뿐 완주가 아니다. 유닛을 앞에서부터 채워 나가는
코스(E1은 2026-09-21 시점 15유닛 계획 중 **10유닛** 공개였다)에서는 **열린 마지막 유닛**도 `nextUnitNo: null`이라 두 상태가 겹친다.
겹친 채로 두면 화면이 "🎉 끝까지 봤어요"라고 거짓을 말한다(2026-09-21 영어 콘텐츠 검수 결함 2 — 기획 예외 E-4).
`coursePlannedUnits`가 그 둘을 가르는 **유일한 근거**다.

```
moreUnitsComing = coursePlannedUnits != null && totalUnits < coursePlannedUnits
completedCourse = nextUnitNo == null && !moreUnitsComing
```

- **언어와 무관한 일반 규칙이다.** 영어 전용 분기로 두지 않는다 — 일본어 코스도 부분 공개할 수 있고,
  그때 같은 결함을 두 번 고치지 않기 위해서다. 일본어 코스는 전부 `coursePlannedUnits: null`이라 동작이 한 줄도 바뀌지 않는다.
- **`notice`를 신호로 쓰지 않는다.** 일본어 N5(코스 2)는 20유닛이 다 차 있는데도 카드 안내 문구를 갖고 있다 —
  "notice가 있으면 부분 공개"는 곧바로 거짓이 된다. `notice`는 **사람이 쓴 문구**이고 `planned_unit_count`는 **상태**다(설계/08 C-29).
- **계획 수를 채우면 자동으로 완주가 된다**(`totalUnits >= coursePlannedUnits`). 사람이 플래그를 내리는 것을
  잊어 유닛 15에서 결함이 재발하는 경로를 만들지 않는다. **2026-09-22 실제로 그렇게 됐다** —
  시드에서 바뀐 것은 유닛 5개가 늘어난 것뿐이고 완주 판정은 아무도 손대지 않았다.
- **계획을 채운 코스는 `notice`를 남기지 않는다**(설계/06 §11-12 ③ R4 · 기획 AC-16). 문구를 지우는 것은 사람 일이지만
  **빠뜨렸는지는 기계가 본다**(2026-09-22 추가) — 잊으면 학습자가 다시 두 화면에서 모순된 말을 듣기 때문이다
  (유닛 끝은 "끝까지 봤어요", 코스 상세는 "채우는 중"). 계획이 **없는**(`planned_unit_count IS NULL`) 코스의 `notice`는
  이 규칙과 무관하다 — 일본어 N5의 안내 문구는 그대로 정당하다.
- 프론트는 **유닛 학습 응답 하나로** 판단한다(호출 한 번 계약, 08 B-7). 코스 상세를 추가로 부르지 않는다.

**고정 테스트 — 지금 무엇이 커버되는가** (2026-09-23 갱신 — E2 개통으로 마지막 줄이 복구됐다, 설계/08 C-30):

| 무엇 | 어디 | 실데이터로 태우는가 |
|---|---|---|
| 값이 실린다(E1 = 15) · 마지막 유닛 전용이 아니다 | `EnglishCourseApiIntegrationTest`의 "부분 공개 코스" 블록 | ○ |
| `totalUnits`에서 **파생하지 않는다** | `CourseApiIntegrationTest.unit_study_last_unit_has_no_next_unit` (일본어는 `totalUnits=20`인데 값이 `null`) | ○ |
| 계획을 채우면 **사람 손 없이** 완주가 된다 | `EnglishCourseApiIntegrationTest.the_last_unit_is_a_finished_course_because_the_plan_is_met` | ○ |
| 계획을 채운 코스에 `notice`가 남지 않는다 | `EnglishCourseApiIntegrationTest.a_course_that_met_its_plan_carries_no_leftover_notice` | ○ |
| **채우는 중인 코스는 `notice`를 달고 있다**(반대쪽 · §06 §11-12 ③ R6) | `EnglishCourseApiIntegrationTest.a_partly_published_course_carries_the_shared_notice` | ○ (E2) |
| 판정식(`moreUnitsComing`)과 상태 2 화면 | `frontend/src/pages/UnitStudyPage.partialCourse.test.jsx` | ✕ **픽스처** |
| **상태 2를 서버 응답으로 태우기**(`totalUnits 5 < coursePlannedUnits 20`) | `EnglishCourseApiIntegrationTest.the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course` | ○ **(E2 — 2026-09-22 복구)** |

> ⚠️ **마지막 줄은 데이터에 얹혀 있다.** E2가 20/20을 채우면 그 전제가 또 거짓이 된다(E1에서 한 번 겪었다 — C-30).
> 그때 **숫자만 고쳐 테스트를 살리지 않는다**: ① E3를 부분 공개하는 **같은 커밋**에서 대상을 옮기거나
> ② 옮길 대상이 없으면 이 표에 다시 `— 없다`를 적고 복구 조건을 `CourseCatalog.ENGLISH` 주석에 박는다.

일본어 테스트가 값이 아니라 **키의 존재**를 보는 이유: 필드가 통째로 빠져도 프론트 판정은 false가 되어 지금과 똑같이
동작하므로, 일본어를 부분 공개하는 날 **조용히** 거짓 완주 안내로 되돌아간다.

---

## 3. 자료실 API (`/api/library`) — 전부 GET, 공개

자료실은 코스에 들어간 데이터를 **사전 뷰로 다시 보여주는 것뿐이다.** 별도 콘텐츠를 만들지 않는다.

### 3-1. 공통 파라미터

| 파라미터 | 규칙 |
|---|---|
| `page` | 0부터. 음수 → 0으로 보정. **총 페이지 수 이상이면 0으로 보정**(빈 화면 금지) |
| `size` | 미지정/0 이하 → 자료실별 기본값. **최대 100으로 절삭**(과대 요청 방어) |
| `q` | 검색어. 공백만이면 미적용. 대소문자 무시 |
| `level` | **레벨 코드** 콤마 구분. 일본어 `INTRO,N5,N4,N3,N2,N1` / 영어 `E1`~`E5`(§8-2). 빈 값 → 필터 없음. **허용 밖 값은 400** — 다른 언어의 코드도 허용 밖이다(`/api/library/kanji?level=E1` → 400) |
| `ids` | 그 id의 항목만. **최대 200**, 숫자 아니거나 초과면 400. 없는 id는 조용히 빠진다 → §6-7 |
| `sort=GIVEN` | `ids`로 준 순서 그대로. `ids` 없이 쓰면 400 → §6-7 |

> ★ **레벨 표기는 두 가지다. 섞으면 필터가 조용히 빈 결과를 준다** (2026-08-20 — 3단계 qa 치명 결함의 뿌리).
>
> | 무엇 | 값 | 용도 |
> |---|---|---|
> | `course.levelLabel` | **표시 문구** — `"JLPT N5"` / 입문은 `"문자"`(N 코드 없음) | 화면에 쓰는 문구 |
> | 자료실 `level`(파라미터·응답 필드) | **코드** — `"N5"`. 유일한 근거는 **`course.level_code` 컬럼**이다 | 필터·조회 |
>
> `levelLabel`을 `level`에 그대로 넘기면 400이거나 빈 목록이다. **문자열을 잘라 코드를 만들지 않는다** — 입문("문자")처럼 접두 규칙이 통하지 않는 값이 실재한다. 클라이언트는 응답이 준 `levelCode`(§2-3)를 그대로 쓴다 — 스스로 만들지 않는다.

페이지 보정을 **서버가 하는 이유**: 프론트 3개 화면이 각자 같은 보정 로직을 구현하면 어긋난다.

**레벨은 `course.level_code` 컬럼이다 — `courseNo`에서 파생시키지 않는다.** ⚠️ **2026-08-20에 뒤집힌 서술이다(되돌리지 말 것).**
파생이 성립하려면 "코스 번호 → 레벨"이 **하나의 함수**여야 하는데, 언어가 둘이 되는 순간 성립하지 않는다 —
일본어 `courseNo=1`은 `N5`이고 영어 `courseNo=1`은 `E1`이다. 입문은 라벨이 `"문자"`라 문자열을 잘라 코드를 만들 수도 없다.
그래서 코드를 **DB에 직접** 두고 표시 문구(`levelLabel`)와 분리했다(03 §1·§3). `courseNo` 파생은 **3단계 qa 치명 결함의 뿌리**였다.

선택지는 **콘텐츠가 있는 코스 전부**다 — 일본어 `INTRO`·`N5`~`N1` 6종, 영어 `E1`~`E5` 5종(§8-2).
`level=INTRO`로 한자를 조회하면 400이 아니라 **200 + 빈 목록**이다(입문은 한자를 배우지 않는다 — 필터는 유효하고 결과가 없을 뿐이다).
허용 밖 값(오타·다른 언어의 코드)만 **400**이다. 조용히 무시하면 사용자는 필터가 걸린 줄 알고 잘못된 목록을 본다.

고정 테스트: `integration/LibraryLevelContractIntegrationTest`

### 3-2. 목록 응답 봉투 — `LibraryPageResponse<T>`

```
data: { content: [], page, size, totalElements, totalAll, totalPages, first, last }
```

공용 `PageResponse`와 필드가 전부 같고 **`totalAll` 하나가 더 있다.**

- `totalElements` — 필터·검색 적용 **후** 개수
- `totalAll` — 필터를 걸지 않았을 때의 전체 개수 → 화면의 "1,350자 중 350자" 문구용

공용 `PageResponse`에 `totalAll`을 넣지 않은 이유: 커뮤니티 등 다른 페이징 응답에 의미 없는 필드가 붙기 때문이다.

### 3-3. `GET /api/library/kanji` — 한자 목록

기본 `size=60`. 파라미터 `page` `size` `q` `level`. 정렬은 **학습 순서 고정**(정렬 옵션 없음).

```
content: [ { id, letter, meaningKo, onyomi, kunyomi, level } ]
```

### 3-4. `GET /api/library/kanji/{kanjiId}` — 한자 상세

```
data: { id, letter, meaningKo, onyomi, kunyomi, level,
        words: [ { word, kana, meaningKo } ],
        learnedIn: { courseId, courseTitle, level, unitNo, unitTitle } }
```

`learnedIn`은 유닛 학습 화면(`/courses/{courseId}/units/{unitNo}`)으로 되돌아가는 역링크다.
한자·문법은 유닛 매핑이 1:1이라 단일 객체다.

### 3-5. `GET /api/library/grammar` — 문법 목록

기본 `size=20`. 파라미터 `page` `size` `q` `level` `hasRules`.

```
content: [ {
  id, name, nameKo, level, hasRules,
  examples: [ { id, jp, kana, meaningKo } ]      // 2026-09-10 추가 — 없으면 [] (null 아님)
} ]
```

- `hasRules` — 활용 규칙표 보유 여부. 목록 배지와 필터가 이걸 근거로 한다.
- 필터로서의 `hasRules`는 **`true`만 지원한다.** `false`는 "규칙표 없는 것만"이 아니라 **필터 미적용**으로 처리된다.
- **`examples`는 상세(§3-6)의 예문과 같은 데이터·같은 모양**이다(같은 `ExampleDTO`). 목록이 예문을 따로 만들지 않는다(08 C-7).
  `kana`는 없으면 `null`이고, 예문이 없는 문법은 **`[]`** 다 — **`null`을 내려보내지 않는다**(08 B-5).
- **조건부 파라미터(`withExamples` 같은 스위치)를 두지 않는다.** shape이 요청에 따라 갈리면
  프론트가 "요청하지 않아서 빈 것"과 "예문이 없어서 빈 것"을 구분해야 해 분기가 두 겹이 된다(08 B-5·B-12).
- **왜 목록에 싣나**: 실력 진단의 문장 문항(`SENTENCE_MEANING`)·빈칸 문항(`GRAMMAR_CLOZE`) 재료가 예문인데,
  목록에 없으면 한 단계를 만들려고 상세를 **문법 수(최대 69회)만큼** 불러야 한다. 한 화면의 재료는 호출 한 번이다(08 B-7).
- **레벨 전량이 한 페이지에 온다**: 레벨별 문법은 최대 69개이고 자료실 `size` 상한이 100이라
  `?level={코드}&size=100` 한 번이면 그 레벨 전부다(진단이 이 호출을 쓴다).
- 영어 자료실(`/api/en/library/grammar`)은 **같은 서비스·같은 DTO**라 이 필드가 동시에 생긴다(§8).

고정 테스트: `integration/LibraryGrammarExamplesIntegrationTest`

### 3-6. `GET /api/library/grammar/{grammarId}` — 문법 상세

```
data: { id, name, nameKo, explanation, level,
        examples: [ { jp, kana, meaningKo } ],
        rules:    [ { groupLabel, pattern, exampleBefore, exampleAfter } ],   // 없으면 []
        learnedIn: { ... } }
```

`examples`·`rules`는 유닛 학습(§2-3)과 **완전히 같은 형태·같은 데이터**다.

### 3-7. `GET /api/library/vocabulary` — 어휘 목록 (**상세 화면 없음**)

기본 `size=50`. 파라미터 `page` `size` `q` `level` `pos` `sort`.

| 파라미터 | 값 |
|---|---|
| `pos` | `NOUN,VERB,I_ADJECTIVE,NA_ADJECTIVE,ADVERB,CONJUNCTION,EXPRESSION` 콤마 구분. 허용 밖 값은 400 |
| `sort` | `LEARNING`(기본 — 코스→유닛→유닛 내 순서) \| `KANA`(사전순). 허용 밖 값은 400 |

```
content: [ {
  id, word, kana, partOfSpeech,
  levels: [ "N5", "N3" ],
  senses: [ {
    meaningKo,
    vocabularyIds: [ ],
    learnedIn: [ { courseId, courseTitle, level, unitNo, unitTitle } ]
  } ]
} ]
```

**1행 = 병합 단위**다. 계약의 핵심:

| 규칙 | 내용 | 왜 |
|---|---|---|
| 병합 키 | **표기(word) + 읽기(kana) 둘 다** 같을 때만 한 행 | 읽기가 다르면 다른 단어다. 두 값의 **쌍**을 키로 쓰므로 문자열을 이어붙일 때 생기는 경계 모호성이 없고, 읽기 `null`도 그대로 키가 된다 |
| `senses` | **뜻(meaningKo) 기준으로 합친 목록** — 개수 = 서로 다른 뜻의 개수 | 같은 뜻을 여러 코스에서 배워도 화면에 "응원 · 응원"이 반복되지 않는다. 출처만 `learnedIn` 배열로 쌓인다 |
| `senses` 순서 | 그 뜻을 배우는 **가장 이른 학습 순서**. `level` 필터가 걸리면 그 레벨에서 배우는 뜻이 앞으로 온다 | |
| `id`·`partOfSpeech` | 그룹에서 **학습 순서가 가장 이른** 항목의 값 | |
| `levels` | 정렬 규칙과 무관하게 **항상 학습 순서**(낮은 레벨 먼저) | |
| `level` 필터 | 그룹 안 어느 sense라도 맞으면 통과 — **다른 레벨 배지는 그대로 남는다** | 그 단어가 실제로 여러 레벨에 나오는 것이 사실이므로 |
| `senses`를 목록에 미리 싣는다 | 행 펼침에 추가 API 호출이 없다 | |
| 검색 대상 | 표기·읽기(행 단위) + 뜻(sense 단위) 중 **하나라도** 맞으면 통과 | |
| `KANA` 정렬 | 읽기가 없으면 표기로 정렬. **가타카나를 히라가나 자리로 옮겨** 섞어 정렬 | 사전에서 찾는 감각과 맞추기 위해 |

**병합·정렬·슬라이스를 DB가 아니라 서비스(Java)에서 하는 이유** — 되돌리려 하지 말 것:

1. 페이징이 병합의 함수다. DB에서 먼저 자르면 같은 단어가 페이지 경계에 갈린다.
2. 총 개수가 병합 **후** 값이어야 한다.
3. 가타카나 → 히라가나 정규화를 DB `GROUP BY`로 할 수 없다.
4. 1,400행 규모라 전량 로드가 안전하다.

**어휘 자료실에는 상세 화면이 없다.** 유닛 학습에서 어휘를 클릭하면 `/library/vocabulary?q={단어}` 검색 상태로 연다.

---

## 4. 계정·인증 API

| 메서드 | 경로 | 인증 | 내용 |
|---|---|:---:|---|
| POST | `/api/users` | — | 회원가입. 201. 아이디 4~20자·비밀번호 4자 이상·닉네임 2~20자·이메일 형식. 아이디/이메일 중복 차단 |
| POST | `/api/login` | — | 로컬 로그인. 컨트롤러가 아니라 `JwtLoginFilter`가 처리 |
| POST | `/api/logout` | ✅ | `CustomLogoutSuccessHandler` |
| POST | `/api/tokens/refresh` | — | 토큰 **회전**(검증 → 기존 삭제 → 신규 발급, 원자적). 웹은 쿠키로, 헤더 요청은 JSON 바디로 |
| GET | `/api/users/me` | ✅ | `{ id, email, username, nickname, provider, roles }` |
| GET | `/custom-oauth2/login/web/{provider}` | — | OAuth2 시작 리다이렉트 (`kakao` \| `google`) |
| GET | `/login/oauth2/code/{provider}` | — | Spring 표준 콜백 |
| POST | `/api/oauth2/providers/{provider}/tokens` | — | 앱 네이티브 소셜 로그인용. **호출하는 앱이 아직 없다**(Flutter 미도입) |

#### 아이디·이메일은 **대소문자를 구분하지 않는다** (2026-09-21 판정, qa 결함 C)

애플리케이션이 `Locale.ROOT` **소문자로 정규화해 저장·대조**한다. DB collation에 기대지 않는다.

| 지점 | 규칙 |
|---|---|
| 가입(`POST /api/users`) | `username`·`email`을 정규화한 값으로 중복 검사하고, **정규화한 값으로 저장**한다. 중복이면 409 `DUPLICATE_RESOURCE` |
| 로그인(`POST /api/login`) | 제출된 `username`을 정규화한 뒤 조회·시도제한 카운트. `USER4`·`User4`·`user4`는 **같은 계정**이다 |
| 프로필 수정(`PUT /api/me/profile`) | 이메일을 정규화해 비교·저장. **대소문자만 바뀐 것은 "바뀐 것"이 아니다**(§4-1의 "값이 바뀔 때만 검사") |
| 응답 | `/api/users/me`·`/api/me/account`의 `username`·`email`은 **소문자**로 내려간다 |

- **왜 환경이 아니라 코드가 흡수하나**: 로컬 H2는 대소문자를 구분하고 운영 MySQL 기본 collation(ci)은 구분하지 않는다.
  같은 요청이 운영에서 `users.username` UNIQUE 위반(500)이 되거나 엉뚱한 계정을 조회한다 —
  **환경이 신원을 결정하는** 상태이고 로컬 테스트로는 드러나지 않는다(컨벤션 §5 "환경 차이는 프로파일·설정으로만, 동작은 같게").
- **왜 아이디까지인가**: ① `user4`/`USER4`가 별개 계정이면 같은 사람으로 보이는 두 계정이 생긴다.
  ② 로그인 시도 제한(§1-6)이 **username 키**라, 대소문자를 바꿔 부르면 카운터가 초기화돼 **제한을 우회**할 수 있다.
  ③ 사용자는 자기 아이디의 대소문자를 기억하지 못한다.
- 소셜 계정의 `username`(= 제공자 식별자)은 사람이 입력하는 값이 아니라 정규화 대상이 아니다.
- 기존 데이터는 시드·운영 모두 소문자다 → 마이그레이션 없음. (운영에 대문자 값이 있으면 **자동 변환하지 말고** 보고 후 결정.)

고정 테스트: `integration/AccountIdentityCaseContractIntegrationTest`


### 4-1. 계정 관리 (`/api/me/**`) — 전부 **인증 필요**

| 메서드 | 경로 | 내용 |
|---|---|---|
| GET | `/api/me/account` | 계정 화면 4개가 공유하는 정보 — `{ username, nickname, email, provider, social }` |
| PUT | `/api/me/profile` | 닉네임·이메일 수정. **소셜 계정의 이메일은 무시**된다(제공자 값). 이메일 중복은 **값이 바뀔 때만·로컬끼리만** 검사 → 409 |
| PUT | `/api/me/password` | 비밀번호 변경. 검사 순서 **소셜 → 형식 → 확인 불일치 → 현재 비밀번호 → 현재와 동일**. 성공 시 `token_version`이 올라 **다른 기기의 access 토큰이 즉시 죽고** refresh는 전량 삭제된다. 웹은 새 토큰을 `Set-Cookie`로, 앱(`Authorization: Bearer`)은 바디로 받는다 |
| GET | `/api/me/withdrawal-preview` | 탈퇴 화면이 보여줄 실제 집계 — 완료 유닛·보관함·글·댓글 수 + `social` |
| POST | `/api/me/withdrawal` | 탈퇴. 로컬은 `password`, 소셜은 `confirmText: "탈퇴합니다"`로 본인 확인. 성공 시 쿠키를 즉시 만료시킨다 |

- **DELETE가 아니라 POST인 이유**: 본인 확인 값을 실어야 하는데 DELETE 바디는 유실될 수 있고,
  되돌릴 수 없는 동작이 URL+메서드만으로 실행되는 형태를 만들지 않는다.
- 탈퇴는 users 행을 **지우지 않고 익명화**한다(글·댓글이 `user_id NOT NULL FK`라 지우면 함께 사라진다).
  닉네임은 `탈퇴한 회원`, 이메일은 `null`, 소셜은 username까지 끊는다(같은 계정으로 재로그인해도 되살아나지 않게).
- `/api/users/me`는 **신원**(헤더·인증 상태), `/api/me/account`는 **권한**(무엇이 되고 무엇이 안 되는가)이다. 둘을 합치지 않는다.

프론트의 토큰 갱신 흐름(`lib/http.js`): 401 + `errorCode === "TOKEN_EXPIRED"`일 때만 갱신을 시도하고,
동시 요청이 겹쳐도 갱신은 한 번만 나간다(promise 공유). 갱신 실패 시 `auth:expired` 이벤트를 쏘아
`AuthContext`가 게스트로 강등한다 — 이 배선이 없으면 "로그인된 것처럼 보이지만 아무것도 안 되는" 상태가 된다.

---

## 5. 커뮤니티·댓글·파일 API (보일러플레이트 유래)

학습 콘텐츠와 연결돼 있지 않지만 실제로 동작한다.

### 커뮤니티 · 댓글

| 메서드 | 경로 | 인증 | 비고 |
|---|---|:---:|---|
| GET | `/api/communities` | — | `searchType`(`title`\|`nickname`) `keyword` + Pageable. **본문 검색 없음** |
| GET | `/api/communities/{communityId}` | — | 조회수 원자적 +1 |
| POST | `/api/communities` | ✅ | |
| PUT / DELETE | `/api/communities/{communityId}` | ✅ | **작성자 본인만**. 삭제는 soft delete |
| GET | `/api/communities/{communityId}/comments` | — | 페이징 |
| POST | `/api/communities/{communityId}/comments` | ✅ | |
| PUT / DELETE | `/api/comments/{commentId}` | ✅ | 작성자 본인만 |

**본문 길이 상한 · 목록 응답** (2026-09-21 판정, qa 결함 G)

| 항목 | 상한 | 초과 시 |
|---|---|---|
| 게시글 제목 | 200자 | 400 `VALIDATION_ERROR` — `제목은 200자 이하여야 합니다` |
| **게시글 본문** | **15,000자** | 400 `VALIDATION_ERROR` — `내용은 15000자 이하여야 합니다` |
| **댓글 본문** | **2,000자** | 400 `VALIDATION_ERROR` — `댓글은 2000자 이하여야 합니다` |

- **왜 15,000인가**: `community.content`·`comment.content`는 `TEXT` 컬럼이고 **MySQL TEXT는 65,535바이트**다.
  전부 4바이트 문자여도 60,000바이트라 한계 안이다. 상한이 없던 동안 70,000자 글이 **로컬 H2에서는 201**이었지만
  운영 MySQL에서는 저장 오류(500)가 난다 — **로컬에서만 통과하는 종류의 버그**다.
  **애플리케이션이 400으로 거절하는 것이 DB가 500으로 터지는 것보다 낫다.**
  더 긴 글이 필요해지면 컬럼 타입(`MEDIUMTEXT`)과 이 값을 **함께** 올린다(값과 저장소는 같이 움직인다).
- **목록 응답은 본문을 싣지 않는다.** `GET /api/communities`의 각 행은
  `{ id, userId, nickname, title, viewCount, commentCount, imageUrls, attachments, createdAt, updatedAt }`이고 **`content` 키가 없다.**
  상세(`GET /api/communities/{id}`)는 그대로 싣는다 — 본문이 본체다.
  화면은 목록에서 본문을 쓰지 않는데(`CommunityListPage.jsx`) 긴 글 10건이면 한 페이지가 수백 KB가 된다.
  **목록과 상세는 다른 응답이다** — 같은 DTO를 쓰느라 목록이 상세만큼 무거워질 이유가 없다.

고정 테스트: `integration/CommunityBodySizeContractIntegrationTest`

### 채팅 — ❌ 제거됨 (2026-08-17, 사용자 결정)

> **채팅 기능은 사이트에서 완전히 제거됐다.** "웹사이트에 채팅이 기본 기능은 아니다" — 보일러플레이트 유래 기능이고
> 학습 사이트의 정체성과 무관하다. `/api/rooms/**`·`/ws-chat`·STOMP 발행/구독 경로는 **존재하지 않는다**.
> 코드는 git 이력에, 제거 경위는 `설계/08_결정기록.md` D-2 종결 기록에 있다. 커뮤니티 게시판은 유지다.


> ⚠️ **응답에 `username`이 없다 (2026-08-25 판정 C-1 — 반영 완료)**
> 커뮤니티 글·댓글 응답은 예전에 `username`(= **로그인 아이디**)을 실었다. 이 세 GET은 **비로그인 공개**다 —
> 자격증명의 절반이 목록으로 공개되는 셈이고, 비밀번호 최소 4자(사용자 결정)·시도 제한 없음과 겹치면 대상 목록이 된다.
> **계약**: 공개 응답에는 `nickname`(표시용)과 `userId`(동일인 판정용)만 싣는다.
> 화면의 "내 글인가"는 `userId` == `/api/users/me`의 `id`로 판정한다(08 F-11이 이미 "작성자 판정은 **id 기준**"이라고 적어 두었다).
> 서버 인가는 그대로다 — `isWrittenBy`는 **토큰 주체**로 판정하지 응답값을 쓰지 않는다.
> 고정 테스트: `integration/PublicResponseNoLoginIdContractIntegrationTest`

### 파일

| 메서드 | 경로 | 인증 | 비고 |
|---|---|:---:|---|
| GET | `/images/{filename}` | — | 인라인 이미지. **svg는 `image/*` 매핑에서 제외**(XSS 방어) |
| GET | `/uploads/{storedFileName}` | — | 저장 파일 서빙(버킷 private → 백엔드 프록시 스트리밍) |
| GET | `/api/files/paths` | — | `refId` `refType` `usage`. **웹이 호출하지 않는다**(2026-09-03 판정 L10 — `/api/bookmarks/summary`와 같은 처리: 삭제도 계약 변경이라 유지. 다음 감사에서 "미사용"으로 다시 올리지 말 것) |
| GET | `/api/files` | — | 파일 상세(원본 파일명 포함) |
| POST | `/api/files` | ✅ | multipart. 단일 10MB / 요청 전체 50MB |
| GET | `/api/files/{fileId}/content` | — | 다운로드 |
| DELETE | `/api/files/{fileId}` | ✅ | **업로더 본인만** |

`usage` 3종: `THUMBNAIL` / `IMAGES` / `ATTACHMENT`. `refType`: `COMMUNITY` / `USER`. 임시 업로드는 `refId=0`.

- **`refType`·`usage`는 enum으로 바인딩된다** — 허용 밖 값은 400 `TYPE_MISMATCH`다. 응답에 내부 클래스명을 싣지 않는다(2026-08-25 판정 G-1).
- 단일 파일 10MB / 요청 전체 50MB를 넘기면 **413 `PAYLOAD_TOO_LARGE`**(§1-2). 500이 아니다 — 재시도로 회복되지 않는 클라이언트 잘못이다.

---

## 6. 사용자 학습 데이터 API — 진도 · 보관함 (**전부 인증 필요**)

`/api/progress/**` · `/api/bookmarks/**` · `/api/me/**`.
`/api/courses/**`·`/api/library/**`가 GET 전면 공개 와일드카드라 **여기에 사용자 상태를 두지 않는다**(08 B-8, 07 §5-4).
세 접두사는 `SecurityConfig`에 `.authenticated()`로 **명시**돼 있다 — `anyRequest()`가 이미 막지만, 나중에 permitAll을 넓힐 때 눈에 보이게 하기 위해서다.

**공통**: 사용자는 **토큰에서 꺼낸다.** 클라이언트가 준 userId로 조회·수정하는 경로가 하나도 없다(IDOR 차단 — 컨벤션 §4-1).

### 6-1. 공개 API에 딸린 필드 2개 (사용자 상태가 아니다)

| API | 필드 | 규칙 |
|---|---|---|
| `GET /api/courses` | `unitCount` | 그 코스의 유닛 수(**DB 집계, 하드코딩 금지**). PREPARING은 0. 진도 막대의 **분모**이고, 비로그인도 막대를 그리므로 공개 API가 준다 |
| `GET /api/courses/{courseId}/units/{unitNo}` → `vocabularies[]` | `entryId` | 그 어휘가 속한 **자료실 표제어 행의 `id`**(= 03 §4-1의 어휘 `target_id`). 그룹이 하나뿐이면 `id`와 같다 |

**공개 응답에 `bookmarked`·`completed` 같은 사용자 상태 필드는 넣지 않는다.** 넣는 순간 "콘텐츠(공개)/사용자 상태(인증)"의 경계가 응답 본문에서 무너진다. ★ 판정은 `GET /api/bookmarks/ids`가 준 집합으로 한다.

### 6-2. `stepKey` — 스텝 식별자

| 값 | 스텝 |
|---|---|
| `grammar-0`, `grammar-1`, … | 문법 스텝(0-based) |
| `dialog` / `kanji` / `vocab` / `summary` | 회화 / 한자 / 어휘 / 정리 |

- **번호가 아니라 키를 저장한다**: 유닛의 문법 개수가 바뀌면 번호는 다른 스텝을 가리키지만, 키는 같은 스텝을 가리키거나 **없어진다**(그러면 프론트가 1번 스텝으로 되돌린다).
- 화면의 `(4/7)`는 저장값이 아니라 **키를 현재 스텝 목록에서 찾은 위치**로 계산한다(같은 사실을 두 곳에 두지 않는다).
- 서버 검증은 **형식만**이다(`^[a-z]+(-[0-9]{1,2})?$`, 1~40자) — 서버는 스텝 구성을 알 수 없다. 위반은 400 `VALIDATION_ERROR`.

### 6-3. 진도 (`/api/progress`)

| 메서드 | 경로 | 내용 |
|---|---|---|
| GET | `/api/progress` | 내 진도 전체 |
| PUT | `/api/progress/last-position` | 마지막 위치 upsert |
| PUT | `/api/progress/units/{courseId}/{unitNo}/completion` | 완료 켜기/끄기 |
| DELETE | `/api/progress` | 학습 기록 초기화 |

```
GET  data: {
  completedUnits: [ { courseId, unitNo } ],          // 없으면 [], courseId → unitNo 오름차순
  lastPosition:   { courseId, unitNo, stepKey, updatedAt } | null
}
PUT  /last-position   body { courseId, unitNo, stepKey }   → data = 저장된 lastPosition
PUT  /units/{c}/{u}/completion  body { completed }         → data { courseId, unitNo, completed }
DELETE /api/progress                                        → data { deletedUnitCount }
```

- 홈·코스 목록·코스 상세·유닛 학습·마이페이지가 **GET 한 번**으로 그린다. 코스별 완료 수·다음 유닛·배지 판정은 **프론트가 계산**한다 — 비로그인이 같은 계산을 localStorage 문서로 하기 때문에 서버에 두면 규칙이 두 벌이 된다.
- `updatedAt`은 **서버 시각**이다(클라이언트가 보내지 않는다).
- **지금 존재하는 유닛만** 내려간다. `lastPosition`이 사라졌거나 PREPARING이 된 코스를 가리키면 `null`이다.
- 완료 토글은 **PUT + 불리언 하나**다. 화면 동작이 토글 하나이고 성공·실패 처리도 하나여서 클라이언트 분기가 반으로 줄며, 멱등성도 PUT이 명확하다. **켜기·끄기 모두 동시 요청에서까지 멱등**이다(03 §4-1 잠금).
- 초기화는 **보관함을 건드리지 않는다**. 확인 모달은 화면의 몫이라 서버는 확인 파라미터를 요구하지 않는다.
- 에러: 없는 코스·유닛 404 `NOT_FOUND` / 준비중 코스 404 `COURSE_PREPARING` / 비로그인 401.

**완료는 서버가 추론하지 않는다.** 유닛 학습은 호출 한 번이라(§2-3, 08 B-7) 서버는 어느 스텝을 보는지 모른다.
"마지막 위치가 `summary`면 완료"로 추론하면 **[완료 취소]한 유닛이 재진입마다 되살아난다.**
프론트가 **정리 스텝에 도달하는 전환 시점에 1회** 보낸다(복원으로 그 스텝에서 열리는 것은 도달이 아니다).

### 6-4. 보관함 (`/api/bookmarks`)

경로의 `{type}`은 **소문자** `kanji|grammar|vocabulary`(자료실 경로와 맞춘다), 응답 바디의 `type`은 **대문자 enum 코드**다.
모르는 값·대소문자가 다른 값은 **404**다 — 틀린 필터 값이 아니라 존재하지 않는 주소이기 때문이다(08 B-1. 400은 `level`·`sort`의 몫 — B-2).

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/api/bookmarks/summary` | `{ kanji, grammar, vocabulary, total }` — ★ **웹은 쓰지 않는다**(아래 주) |
| GET | `/api/bookmarks/ids` | `{ kanji: [], grammar: [], vocabulary: [] }` — ★ 판정용 |
| GET | `/api/bookmarks/{type}` | `LibraryPageResponse<T>` (자료실 목록과 **같은 봉투·같은 항목 DTO**) |
| PUT | `/api/bookmarks/{type}/{targetId}` | `{ type, targetId, bookmarked, counts }` |
| DELETE | `/api/bookmarks/{type}` | `{ type, removed, counts }` |

- **개수·id 집합은 "지금 존재하는 항목"만** 센다(03 §4-1 읽기 시점 필터).
- 목록 파라미터: `page` `size`(기본 kanji 60 / grammar 20 / vocabulary 50, 최대 100) `q` `level` `sort`.
  `sort`는 `RECENT`(기본, 정렬 키 `created_at DESC, id DESC`) | `LEARNING`. 허용 밖 값은 400.
  **`pos`·`hasRules` 필터는 없다** — 담은 규모가 수백이라 자료실 필터 세트를 옮기면 "0건" 화면만 는다. 보내면 조용히 무시된다.
- `totalAll` = **내가 담은 전체 개수**(검색·필터 미적용) → "담은 34자 중 12자".
- **토글 응답이 `counts`를 함께 준다**: 자료실 상단 [내 보관함 (n)]이 상시 노출이라, 따로 물으면 별 한 번에 요청이 둘이 되고 두 응답 사이에 값이 어긋난다.
- **어휘는 서버가 대표 id로 정규화한다.** 응답의 `targetId`는 정규화된 값이므로 **프론트는 요청값이 아니라 응답값으로 상태를 갱신한다.**
- **존재 판정은 그 보관함의 과정 언어(JA) 안에서만 한다** — 다른 과정(영어)의 문법·어휘 id는 "없는 것"이라 404이고, 병합(§6-5)에서는 조용히 건너뛴다(2026-09-03 판정 H1).
  존재 판정과 목록 조회가 다른 언어 기준을 쓰면 개수와 목록이 갈린다. 고정 테스트: `integration/BookmarkLanguageContractIntegrationTest`
- **회원에게 개수 상한은 없다.** 종류별 200은 비로그인 저장소 전용이다(§7-6).
- `DELETE /api/bookmarks`(종류 없이 전부)는 **존재하지 않는다.** 기획에 없고, 있으면 실수 한 번으로 전 기록이 사라진다.
- **`GET /api/bookmarks/summary`는 현재 웹이 호출하지 않는다**(2026-08-25 판정 L1 — 감사에서 "미사용"으로 잡힌 항목).
  웹은 `/ids`로 받은 집합에서 개수를 세고(별 표시 판정에 어차피 필요한 응답이다), 토글·비우기 응답도 `counts`를 함께 준다 —
  즉 미사용은 **결함이 아니라 화면이 더 싼 경로를 고른 결과**다. **지우지 않고 유지한다**: 계약·구현·인가(401)·백엔드 테스트 5곳이
  이미 성립해 있고, 삭제 역시 계약 변경이라 비용이 든다. 담은 항목이 수천 규모가 되면 `/ids` 전량 전송 대신 이쪽이 필요해진다.
  다음 감사에서 다시 "미사용"으로 올리지 말 것.
- 에러: 없는 대상(자료실에 없는 항목 포함) 404 / `bookmarked` 누락 400 / 비로그인 401.

### 6-5. 병합 (`POST /api/me/merge`)

병합 배너의 **[합치기]** 가 호출한다. 요청 바디는 **브라우저 저장 문서 그대로**다.

```json
{ "progress": { "completedUnits": [ {"courseId":2,"unitNo":1} ],
                "lastPosition": {"courseId":2,"unitNo":5,"stepKey":"kanji","updatedAt":"2026-08-14T08:00:00"} },
  "bookmarks": { "kanji": [12], "grammar": [7], "vocabulary": [1217] } }
```

```
data: { completedUnitCount, lastPosition, bookmarkCounts: { kanji, grammar, vocabulary, total } }
```

| 대상 | 합치는 규칙 |
|---|---|
| 완료 유닛 | **합집합**(이미 있으면 `completed_at`을 덮어쓰지 않는다) |
| 마지막 위치 | **`updatedAt`이 더 최근인 쪽**. 계정에 없으면 브라우저 값. 같으면 계정 값 유지 |
| 보관함 | **합집합**(같은 항목은 하나) |
| 개수 상한 | 결과가 200을 넘어도 그대로 둔다(회원은 무제한) |

- **전체가 한 트랜잭션**이다 — "진도와 보관함이 함께 합쳐진다(한쪽만 합쳐지지 않는다)"가 인수 조건이다. 프론트가 기존 API를 반복 호출하면 최대 600여 회 요청이 되고 중간 실패 시 **반쯤 합쳐진 상태**가 남는다.
- **멱등**이다(합집합이므로 재시도가 안전하다).
- **존재하지 않는 항목은 조용히 건너뛴다 — 요청 전체를 실패시키지 않는다.** 쓰기 API의 404 규칙과 다른 이유: 병합은 **벌크 화해**라 낡은 id 하나 때문에 34항목이 통째로 날아가면 사용자는 무엇을 잃었는지도 모른다. (배열 원소가 `null`인 것은 다르다 — 형식 오류이므로 400.)
- payload 상한: `completedUnits` 500, 보관함 종류별 200(= 게스트 상한). 초과는 400 `VALIDATION_ERROR` — 게스트가 만들 수 없는 크기이므로 조작된 요청이다.
- `updatedAt`은 **클라이언트 시각**을 신뢰한다. 서버가 알 수 있는 다른 기준이 없고, 위험은 "이어보기 위치가 하나 밀린다"뿐이다. 대신 **형식을 못 박는다** → §7-6.

### 6-6. 비로그인 기록은 서버에 없다 (localStorage)

비로그인도 진도·보관함을 **그대로** 쓰되 기록은 그 브라우저에만 남는다. 저장 위치는 `localStorage["jp.guest.v1"]` 하나다.

**서버 익명 식별자(쿠키)를 쓰지 않은 이유** — 되돌리려 하지 말 것:

1. `/api/progress/**`·`/api/bookmarks/**`를 permitAll로 열어야 해서 **화이트리스트 기본값(명시 안 하면 보호)이 이 네임스페이스에서 사라진다.**
2. rate limit이 없는 상태에서 **비인증 쓰기**는 방문자·크롤러마다 행을 만들고 **정리 배치라는 새 운영 부담**을 낳는다.
3. 사용자에게 한 약속이 "**브라우저 기록을 지우면 사라진다**"인데, 서버 익명 행은 쿠키를 지워도 **도달 불가능한 고아 행**으로 남는다.
4. 비회원에게 영속 식별자를 심는 일은 얻는 것("브라우저 한정 기록")에 비해 정당화 비용이 크다.

계약으로 남는 것:

- **저장 문서의 모양이 서버 응답과 같다** (`progress` = `GET /api/progress`의 `data`, `bookmarks` = `GET /api/bookmarks/ids`의 `data`).
  덕분에 화면은 "게스트냐 회원이냐"를 묻지 않는다 — 분기는 `lib/userData.js` **한 곳**뿐이다.
- **`updatedAt`은 오프셋 없는 로컬 벽시계 문자열**(`2026-08-14T18:00:00`)이다. `toISOString()`(UTC+`Z`)을 저장하면
  서버가 `LocalDateTime`으로 읽을 때 오프셋을 버려 **브라우저 기록이 9시간 과거로 보이고 병합의 "더 최근" 판정이 뒤집힌다.**
- **종류별 200개 상한은 게스트 저장소에만** 있다. 서버가 그 값을 아는 곳은 병합 payload 검증 하나뿐이다.
- **로그인 상태에서는 localStorage에 쓰지 않는다.** 쓰면 로그아웃 직후 남의 기록이 되살아난다.
- 병합은 **자동으로 하지 않고 배너로 묻는다**(공용 PC에서 앞사람 기록이 내 계정에 섞이는 사고 방지).
  [합치기]=합집합 후 브라우저 기록 삭제 / [내 기록 아니에요]=서버 호출 없이 삭제 / 닫기만=아무것도 안 함(다음 로그인에 다시 묻는다).

### 6-7. 자료실 목록의 `ids` · `sort=GIVEN` (공개, 콘텐츠 필터)

`GET /api/library/{kanji|grammar|vocabulary}`에 있다. **비로그인 보관함 목록이 "브라우저가 든 id 집합 + 자료실 뷰"이기 때문**이고,
`ids`는 사용자 상태가 아니라 **콘텐츠 필터**라 공개 경로에 있어도 B-8을 어기지 않는다.

| 파라미터 | 규칙 |
|---|---|
| `ids` | 콤마 구분 숫자. **최대 200**(게스트 상한과 같은 값 + URL 길이). 숫자가 아니거나 초과면 400. **없는 id는 조용히 빠진다**(부분 집합 조회라 404가 아니다) |
| `sort=GIVEN` | `ids`로 준 **순서 그대로**. `ids` 없이 `GIVEN`이면 400 |

- 어휘의 `ids`는 **표제어 대표 id** 기준이다. `totalAll`은 **`ids` 적용 후·검색/필터 미적용** 개수다.
- 회원 보관함 목록은 서버가 id를 들고 있으므로 `/api/bookmarks/{type}`을 쓴다(그쪽에는 상한이 없다).
  **두 경로는 같은 자료실 서비스를 호출한다** — 목록 로직을 복제하면 검색·병합·페이징 규칙이 곧 갈린다.

---

## 7. 학습 **콘텐츠**에 쓰기 API는 없다 (사용자 **상태**에는 있다)

일반 사용자에게 노출되는 콘텐츠 API는 **전부 GET이다** — 일본어 학습 3개 + 자료실 5개, 영어 학습 3개 + 영어 자료실 5개(§8).
그 경로에는 POST/PUT/DELETE가 하나도 없다.
**예외는 편집 모드(§9) 하나뿐이고, 그것은 로컬에서만 빈이 등록된다** — 꺼진 환경에는 경로 자체가 존재하지 않는다.
콘텐츠를 바꾸려면 시드 SQL을 고치고 서버를 다시 띄워야 한다(03_데이터모델.md 참고).
관리자 역할(`ADMIN`)도 코드에 존재하지 않는다 — 역할은 `USER` 하나뿐이고 `@PreAuthorize` 사용처가 0곳이다.

**반면 사용자 상태(진도·보관함)에는 쓰기가 있다** — `/api/progress/**` · `/api/bookmarks/**` · `/api/me/**`,
전부 **인증 필요**다(결정기록 B-8). 콘텐츠(공개 GET)와 사용자 상태(인증 읽기·쓰기)를 **경로로 분리**하는 것이
화이트리스트 시큐리티의 정석이고, 그래서 공개 응답에는 `bookmarked`·`completed` 같은 사용자 상태 필드가 없다.
계약 전문은 **§6**에 있다. 계정 관리(`/api/me/account`·`/profile`·`/password`·`/withdrawal*`)는 **§4-1**이다.

---

## 8. 영어 과정 API (`/api/en/**`) — 전부 GET, 공개

일본어와 **같은 서버·같은 테이블**이다. 갈리는 것은 `course.language`(`JA`/`EN`) 한 컬럼뿐이고,
경로를 나눈 이유는 화면(SPA `/en/**`)과 응답 모양이 한자 대신 **표현(expression)** 을 쓰기 때문이다.
공개 정책도 일본어와 같다(`SecurityConfig`의 `GET /api/en/**` permitAll).

### 8-1. 코스

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/api/en/courses` | 코스 5개(`courseNo` 오름차순). 일본어 `CourseDTO`와 **같은 필드**이고 `levelCode`만 `E1`~`E5`다 |
| GET | `/api/en/courses/{courseId}` | `{ id, courseNo, levelLabel, levelCode, title, targetAudience, goal, notice, description, status, summary, units[] }` |
| GET | `/api/en/courses/{courseId}/units/{unitNo}` | 유닛 학습 데이터 — 아래 |

```
// 상세
summary: { unitCount, grammarCount, expressionCount, vocabCount }   // 한자가 아니라 표현이다
units:   [ { unitNo, title, grammarCount, expressionCount, vocabCount } ]

// 유닛 학습
data: {
  courseId, courseTitle, levelCode, unitNo, title, totalUnits,
  coursePlannedUnits,                      // §2-3-A — E1은 15(완주) · E2는 20(5유닛 공개), 나머지는 null
  prevUnitNo, nextUnitNo, nextCourse,
  grammars: [ ... ],                       // 일본어와 같은 GrammarDTO
  dialog:   { id, title, lines: [ ... ] }, // 일본어와 같은 DialogDTO
  expressions:   [ { id, text, meaningKo, usageNote, ipa, koApprox, examples: [ { id, en, meaningKo } ] } ],
  vocabularies:  [ { id, entryId, word, ipa, koApprox, meaningKo, partOfSpeech } ],
  review: { ... } | null
}
```

- **한자 스텝이 없다.** 그 자리에 `expressions`가 온다(구동사·연어·관용표현을 한 종류로 다룬다).
- 어휘·표현의 발음은 `kana`가 아니라 **`ipa` + `koApprox` 둘 다**다. `kana`는 영어에 쓰지 않는다
  (kana 계약이 "원문에 한자가 있을 때만"이라 검증기가 영어를 거부한다).
- **공유 테이블의 컬럼명 `jp`는 "원문" 자리다** — 영어 예문·회화 대사가 그 필드로 내려간다.
  필드명을 바꾸면 일본어 응답 계약이 함께 바뀌므로 두었다. 프론트는 `jp`를 "원문"으로 읽는다.
- `partOfSpeech`는 **영어 7종**(`NOUN`·`VERB`·`ADJECTIVE`·`ADVERB`·`PREPOSITION`·`CONJUNCTION`·`PHRASE`)이다.
  일본어 7종과 코드 집합이 다르다 — 허용 밖 값은 400.
- 준비중 코스(**2026-09-22부터 E3~E5**)는 일본어와 같다: 상세 200(빈 units), 유닛 404 `COURSE_PREPARING`.
- `coursePlannedUnits`는 **일본어와 완전히 같은 필드·같은 규칙**이다(§2-3-A).
  **2026-09-22 현재 E1은 15/15(완주) · E2는 5/20(열린 데까지의 끝)** 이고, `notice`는 E1이 NULL · E2가 공용 문구다.
  "열린 데까지의 끝"인 유닛 번호는 공개 범위를 넓힐 때마다 옮겨 다니므로(E1은 5 → 10 → 없음, E2는 5 → 10 → 15 → 없음)
  **유닛 번호를 계약에 박지 않는다** — 판정식은 언제나 `totalUnits < coursePlannedUnits`다.
  고정 테스트도 같은 방식으로 `CourseCatalog.ENGLISH`에서 유닛 번호를 받아온다
  (`the_last_unit_is_a_finished_course_because_the_plan_is_met`(E1) ·
  `the_last_open_unit_of_a_partly_published_course_is_not_a_finished_course`(E2)).

### 8-2. 영어 자료실

| 메서드 | 경로 | 파라미터 | 응답 |
|---|---|---|---|
| GET | `/api/en/library/expressions` | `page` `size` `q` `level` `ids` `sort` | `LibraryPageResponse<{ id, text, meaningKo, ipa, koApprox, level }>` |
| GET | `/api/en/library/expressions/{expressionId}` | — | `{ id, text, meaningKo, usageNote, ipa, koApprox, level, examples[], learnedIn }` |
| GET | `/api/en/library/grammar` | `page` `size` `q` `level` `hasRules` `ids` `sort` | 일본어 문법 목록과 **같은 봉투·같은 항목 DTO** |
| GET | `/api/en/library/grammar/{grammarId}` | — | 일본어 문법 상세와 같다 |
| GET | `/api/en/library/vocabulary` | `page` `size` `q` `level` `pos` `ids` `sort` | 일본어 어휘 목록과 같은 봉투(`kana` 자리에 `ipa`·`koApprox`) |

- **영어에는 한자 자료실이 없다** — `/api/en/library/kanji`는 존재하지 않는 주소다(404).
- `level`은 `E1`~`E5`만 허용한다. 일본어 코드(`N5` 등)를 넣으면 400이다(반대도 같다).
- 목록 규칙(`ids` 최대 200, `sort=GIVEN`, 페이징 상한)은 **§3-1·§1-5와 동일**하다. 두 번 적지 않는다.

---

## 9. 편집 모드 API (`/api/editor/**`) — **로컬 전용, 꺼진 환경에는 존재하지 않는다**

콘텐츠를 고치는 유일한 런타임 경로다(§7의 "쓰기 API가 없다"는 **일반 사용자 대상 API** 이야기다).

| 메서드 | 경로 | 내용 |
|---|---|---|
| GET | `/api/editor/status` | `{ enabled: true }`. **프론트의 유일한 판단 근거** — 200이면 켜짐, 404면 꺼짐 |
| PUT | `/api/editor/kanji/{kanjiId}` | `{ meaningKo, onyomi, kunyomi, words: [ { id, word, kana, meaningKo } ] }` |
| PUT | `/api/editor/grammar/{grammarId}` | `{ explanation, examples: [ { id, jp, kana, meaningKo } ], rules: [ ... ] }` |
| PUT | `/api/editor/vocabulary/{vocabularyId}` | `{ meaningKo, kana, partOfSpeech }` |
| PUT | `/api/editor/dialogs/{dialogId}` | `{ title, lines: [ { id, speaker, jp, kana, meaningKo } ] }` |

**게이팅이 계약의 일부다.**

- 꺼진 환경(기본값·운영)에서는 **컨트롤러·서비스 빈이 등록되지 않아** `/api/editor/**`가 전부 **미매핑 404**다.
  403/401로 막지 않는 이유: 그러면 경로의 **존재**를 알려주게 된다. "흔적이 없다"가 코드 구조로 성립해야 한다.
- **로그인을 요구하지 않는다**(기획 §4-7 확정). 켜고 끄는 기준은 역할이 아니라 **실행 환경**이다.
  운영 유입은 `RailwayDeploymentValidator`가 prod + `app.editor.enabled=true` 기동을 **거부**해 막는다.
- **표제는 못 고친다**(`letter`·`name`·`word`는 요청에 있어도 무시). 자식 배열은 **있는 id만 수정**이고,
  활용표(`rules`)만 전체 교체다. 없는 id를 보내면 400.
- 응답은 **저장 후 값**이다 — 화면은 요청값이 아니라 응답값으로 갱신한다.
- **편집은 DB만 바꾼다. 시드 SQL은 자동으로 갱신되지 않는다** — 서버를 다시 띄우면 시드로 되돌아간다.
  확정한 내용은 사람이 시드에 옮겨 적어야 한다(07 §1).

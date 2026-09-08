---
name: railway-deploy
description: 이 프로젝트를 Railway에 배포하는 단계별 절차. "Railway에 배포해줘" 또는 "배포해줘" 요청 시 이 절차를 따른다.
---

# Railway 배포 절차 (실행 문서)

> **이 문서는 "이 순서대로 하면 배포된다"를 적은 실행 문서다.**
> 왜 그렇게 하는지(근거·배경)는 `설계/07_운영_배포.md`에 있다. 여기서는 **무엇을 어떤 순서로 치는지**만 적는다.
> 각 단계에는 **"안 하면 무슨 일이 생기는가"**를 붙였다. 그게 순서를 지키게 만든다.

기준일: 2026-09-08 · 담당: devops

---

## 0. 시작 전 30초 — 지금 어느 경로인가

| 상황 | 어디부터 |
|---|---|
| **아직 GitHub 원격이 없다** (`git remote -v`가 비어 있음 — 2026-09-08 현재 상태) | §1 → §2 → §3 … 전부 |
| Railway 프로젝트를 처음 만든다 | §3부터 |
| 이미 배포된 서비스에 새 버전을 올린다 | §2(게이트) → §5 → §7 |
| 배포했는데 깨졌다 | §8 되돌리기 |

**절대 규칙 3개**

1. **커밋·푸시·배포는 사용자가 명시적으로 요청할 때만 실행한다.** 준비는 알아서 하되 방아쇠는 사용자가 당긴다.
2. **CI 초록 + qa 통과 없이는 배포하지 않는다.** CI 초록은 "테스트가 통과했다"일 뿐 qa 통과가 아니다.
3. **시크릿 값은 로그·커밋·문서에 절대 쓰지 않는다.** 이름만 적고 등록은 사용자가 Railway 대시보드에서 한다.

---

## 1. 최초 1회 — GitHub 원격 연결

현재 이 저장소는 **로컬 git만 있고 원격이 없다.**

```bash
cd c:/Users/gks93/workspace/simple_side/japanese
git remote -v      # 아무것도 안 나오면 원격 없음
git branch         # * master
```

### 1-1. 사용자가 해야 할 일 (에이전트가 대신 못 한다 — GitHub 계정이 필요하다)

1. GitHub에서 **빈 저장소**를 만든다. README·.gitignore·라이선스 **체크하지 않는다**(체크하면 첫 푸시가 non-fast-forward로 거부된다).
   - 저장소는 **private 권장** — `data-users.sql`에 실제 이메일·OAuth 식별자가 들어 있다.
2. 저장소 URL을 devops에게 알려준다.

### 1-2. 그다음 devops가 하는 일 (사용자가 "연결해줘"라고 말한 뒤에)

```bash
cd c:/Users/gks93/workspace/simple_side/japanese
git remote add origin <사용자가 준 URL>
git push -u origin master
```

- **안 하면**: CI(`.github/workflows/ci.yml`)가 **한 번도 돌지 않는다.** 이 워크플로는 작성만 돼 있고 원격이 없어 아직 실행된 적이 없다. 원격에 첫 푸시가 들어가는 순간 처음 돈다.
- 푸시 직후 **Actions 탭에서 `CI` 워크플로가 초록인지 확인**한다. 여기가 빨간불이면 §3 이후 단계로 넘어가지 않는다.
- `.env`는 `.gitignore`·`.dockerignore`에 들어 있어 푸시·이미지에 포함되지 않는다. 푸시 전에 `git status -s`로 `.env`가 안 잡히는지 한 번 눈으로 확인한다.

---

## 2. 배포 게이트 — 하나라도 어기면 배포하지 않는다

### 2-A. 테스트·판정

| # | 조건 | 확인 |
|---:|---|---|
| A1 | 백엔드 테스트 통과 | `./gradlew test` |
| A2 | 프론트 테스트·린트·빌드 통과 | `cd frontend && npm ci && npm test && npm run lint && npm run build` |
| A3 | GitHub Actions `CI` 초록 (원격 연결 후) | Actions 탭 |
| A4 | **qa 판정 통과** | qa 리포트 |

- **안 하면**: `Build` 실패는 곧 배포 이미지 실패다. Dockerfile이 `gradle bootJar`에서 프론트를 다시 빌드하므로 로컬에서 빌드가 깨지면 배포도 깨진다.
- qa 판정이 실패인데 배포 요청이 오면 → **실패 사실을 사용자에게 상기시키고 확인을 받은 뒤에만** 진행한다.

### 2-B. 운영 설정 3조건 (근거: `설계/07 §1-1`)

`src/main/resources/application-prod.yml`을 열어 세 줄을 눈으로 확인한다.

| # | 조건 | 있어야 할 값 | 어기면 |
|---:|---|---|---|
| B1 | `app.editor.enabled` | `false` | 인증 없는 콘텐츠 편집 API가 운영에 열린다 → `RailwayDeploymentValidator`가 **기동 거부** |
| B2 | `spring.h2.console.enabled` | `false` | H2 콘솔은 접속자가 **임의 JDBC URL**을 넣는 화면이다(RCE 경로) → **기동 거부** |
| B3 | `BUCKET_ENDPOINT` / `BUCKET_ACCESS_KEY_ID` / `BUCKET_SECRET_ACCESS_KEY` / `BUCKET_NAME` 환경변수 등록 | 값 있음 | **기동 거부**. 검증이 없었다면 조용히 로컬 디스크로 폴백해 재배포마다 업로드 파일이 사라진다 |

> ⚠️ **B1·B2로 기동이 거부되는 것은 버그가 아니라 안전장치다.**
> `RailwayDeploymentValidator`(`@Profile("prod")`)가 `@PostConstruct`에서 `IllegalStateException`을 던져 앱을 못 뜨게 막는다.
> 로그에 `운영(prod)에서 H2 콘솔(...)을 켤 수 없습니다` 또는 `편집 모드(...)를 켤 수 없습니다`가 보이면
> **검증기를 고치는 게 아니라 설정을 false로 되돌리는 것이 정답이다.**
> 기본 `application.yml`은 로컬용이라 둘 다 `true`다 — `application-prod.yml`이 그걸 덮는 구조이므로 prod 파일의 그 두 줄을 지우면 안 된다.

```bash
# 3조건 빠른 확인 (값이 false로 나와야 한다)
grep -n -A2 "^  h2:" src/main/resources/application-prod.yml
grep -n -A2 "editor:" src/main/resources/application-prod.yml
```

검증기를 지키는 테스트: `RailwayDeploymentValidatorTest`, `H2ConsoleSecurityContractIntegrationTest`, `H2ConsoleEnabledLocalContractIntegrationTest`. A1이 통과했다면 이 셋도 통과한 것이다.

### 2-C. 커밋 상태

```bash
git status -s          # 비어 있어야 한다
git log --oneline -5
```

- 미커밋 변경이 남은 채 배포하면 **배포된 것과 저장소가 달라져** 롤백 기준점이 사라진다.
- 커밋은 사용자 요청이 있을 때만. 메시지는 기존 스타일(`fix:` / `chore:` 접두 + 한국어 요약)을 따른다.

---

## 3. 환경변수 — Railway → 서비스 → **Variables** 탭

`.env`는 **배포하지 않는다**(`.dockerignore`·`.gitignore`로 제외). 값은 전부 Railway Variables에 등록한다.
아래 표는 `.env.example`과 `src/main/resources/application-prod.yml`을 대조한 것이다. **값은 사용자만 안다 — 이 문서·로그·커밋에 값을 쓰지 않는다.**

### 3-1. 필수 — 없으면 기동 실패 (fail-fast)

| 변수 | 무엇 | Railway 조립 예시 | 없으면 |
|---|---|---|---|
| `SPRING_DATASOURCE_URL` | 운영 MySQL 접속 | `jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}` | 기동 실패 (기본값 없음) |
| `SPRING_DATASOURCE_USERNAME` | | `${{MySQL.MYSQLUSER}}` | 기동 실패 |
| `SPRING_DATASOURCE_PASSWORD` | | `${{MySQL.MYSQLPASSWORD}}` | 기동 실패 |
| `JWT_SECRET_KEY` | JWT 서명키(64 hex 이상 랜덤) | — | 기동 실패 |
| `KAKAO_CLIENT_ID` | 카카오 REST 키 | — | 기동 실패 (prod yml에 기본값 없음) |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret | — | **기동 실패.** 로컬 yml은 빈 값을 허용해서 "로컬에선 됐는데"가 나온다 |
| `GOOGLE_CLIENT_ID` | | — | 기동 실패 |
| `GOOGLE_CLIENT_SECRET` | | — | 기동 실패 |
| `BUCKET_ENDPOINT` | S3 호환 버킷 | `${{<버킷서비스명>.BUCKET_ENDPOINT}}` | **기동 거부**(`RailwayDeploymentValidator`) |
| `BUCKET_ACCESS_KEY_ID` | | `${{<버킷서비스명>.BUCKET_ACCESS_KEY_ID}}` | 기동 거부 |
| `BUCKET_SECRET_ACCESS_KEY` | | `${{<버킷서비스명>.BUCKET_SECRET_ACCESS_KEY}}` | 기동 거부 |
| `BUCKET_NAME` | | `${{<버킷서비스명>.BUCKET_NAME}}` | 기동 거부 |

### 3-2. 사실상 필수 — **기본값이 있어서 조용히 깨진다** ⚠️

| 변수 | 값 | 없으면 |
|---|---|---|
| `APP_BASE_URL` | `https://<운영 도메인>` (끝에 `/` 없이) | `application-prod.yml`이 `http://localhost:8080`으로 폴백 → OAuth redirect가 localhost로 나가 **카카오·구글 로그인 전면 실패**. 기동은 정상이라 로그로도 안 드러난다 |

> **fail-fast가 못 잡는 유일한 항목이다.** 배포 전 체크리스트에서 사람이 보증한다.

### 3-3. 등록 불필요

| 변수 | 이유 |
|---|---|
| `PORT` | Railway가 자동 주입 → 앱이 `${PORT:8080}`으로 수신 |
| `SPRING_PROFILES_ACTIVE` | **Dockerfile ENTRYPOINT가 `-Dspring.profiles.active=prod`로 고정**한다. 굳이 등록하지 말 것 |
| `BUCKET_REGION` | 기본 `us-east-1` |
| `ORPHAN_GRACE_HOURS` | 기본 24 |
| `FILE_UPLOAD_DIR` | 버킷 미사용 폴백 경로. 운영은 버킷이 표준 |

### 3-4. 등록 후 확인

```bash
railway variables            # 이름 목록만 눈으로 확인. 값 출력을 로그·대화에 붙여넣지 않는다
```

빠진 것이 없는지는 이름 대조로만 확인한다. **값을 화면에 뿌려 확인하지 않는다.**

### 3-5. OAuth 콘솔 등록값도 함께 바꾼다

앱 환경변수만 맞추면 안 된다.

| 환경 | redirect URI |
|---|---|
| 로컬 | `http://localhost:8083/login/oauth2/code/kakao` (및 `/google`) |
| 운영 | `https://<도메인>/login/oauth2/code/kakao` (및 `/google`) |

- **안 하면**: 로그인 버튼을 누르면 provider가 `redirect_uri_mismatch`로 튕긴다. 앱 로그에는 아무것도 안 남는다.
- 이건 카카오/구글 개발자 콘솔 작업이라 **사용자가 한다.**

---

## 4. 최초 1회 — Railway 프로젝트 구성

서비스 3개를 같은 프로젝트에 만든다.

| 서비스 | 무엇 | 왜 |
|---|---|---|
| 앱 | 이 저장소(Dockerfile 빌드) | 본체 |
| **MySQL** | Railway MySQL 플러그인 | 운영 DB. `${{MySQL.*}}` 참조변수의 출처 |
| **Storage Bucket** | S3 호환 버킷 | 업로드 파일. **Volume을 쓰지 않는다** — 컨테이너 파일시스템은 재배포 시 날아간다 |

절차:

1. Railway → New Project → **Deploy from GitHub repo** → §1에서 만든 저장소 선택 (사용자 계정 권한 필요 → **사용자가 한다**)
2. `+ New` → Database → **Add MySQL**
3. `+ New` → **Storage Bucket** 추가
4. 앱 서비스 → Variables → §3 표대로 등록
5. Settings에서 빌드 방식이 **Dockerfile**인지 확인 (루트 `Dockerfile`을 자동 감지한다. `railway.json`·`nixpacks.toml`은 이 저장소에 없다)
6. Settings → Networking → **Generate Domain** → 그 도메인을 `APP_BASE_URL`에 넣는다 (§3-2)

- **안 하면**: 2를 빠뜨리면 `SPRING_DATASOURCE_*` 참조가 해석되지 않아 기동 실패, 3을 빠뜨리면 `BUCKET_*`이 비어 기동 거부(§2-B3), 6을 빠뜨리면 로그인이 전면 실패한다(§3-2).

---

## 5. 배포 실행

> ⚠️ **여기부터는 사용자가 "배포해줘"라고 말한 뒤에만 실행한다.**

### 5-1. 기본 경로 — GitHub 푸시 (권장)

```bash
cd c:/Users/gks93/workspace/simple_side/japanese
git status -s                 # 비어 있어야 함
git push origin master        # Railway가 자동으로 새 빌드를 시작
```

Railway 대시보드 → 앱 서비스 → **Deployments**에서 빌드 진행을 본다.

### 5-2. 대안 — Railway CLI

```bash
railway whoami                # 로그인 안 돼 있으면 railway login
railway link                  # 프로젝트/서비스 선택 (최초 1회)
railway status                # 어느 프로젝트/서비스에 붙었는지 확인 — 엉뚱한 곳에 올리지 않도록
railway up                    # 로컬 소스로 배포
railway logs                  # 기동 로그
```

- `railway up`은 **로컬 작업본**을 올린다. 저장소와 어긋난 것이 배포될 수 있어 **기본은 5-1**이다.
- CLI 하위 명령은 버전에 따라 다르다. 다르면 `railway --help`로 확인한다.

### 5-3. 빌드가 하는 일 (참고)

```
Stage 1  gradle:8-jdk17 + Node 20
         gradle bootJar -x test
         → frontendInstall(npm ci) → frontendBuild(vite) → copyFrontendBuild → bootJar
Stage 2  eclipse-temurin:17-jre-alpine
         ENTRYPOINT java -jar -Dspring.profiles.active=prod app.jar
         HEALTHCHECK curl /actuator/health
```

`bootJar`가 `copyFrontendBuild`에 의존하므로 **배포 산출물에는 항상 최신 프론트 번들이 들어간다.** 로컬 `dist/`를 커밋할 필요가 없다.
빌드 이미지에서는 테스트를 돌리지 않는다(`-x test`) — 그래서 §2-A의 CI 초록이 유일한 테스트 관문이다.

---

## 6. ⚠️ 운영 시드 수동 적재 — **가장 잘 잊는 단계**

운영 프로파일은 `spring.sql.init.mode: never`다. **콘텐츠 시드가 자동으로 안 들어간다.**

> **적재하지 않으면 사이트는 정상적으로 뜨는데 코스 목록이 텅 빈다.**
> 헬스체크도 200, 로그도 깨끗하다. **화면을 열어보기 전까지 아무도 모른다.**

### 6-1. 언제 하나

**첫 배포로 앱이 한 번 뜬 뒤**에 한다. `ddl-auto: update`가 기동 시 테이블을 만들기 때문에, 그 전에 SQL을 넣으면 `Table doesn't exist`로 실패한다.

### 6-2. 적재 파일과 순서 (15개)

> **단일 기준은 `src/main/resources/application.yml`의 `spring.sql.init.data-locations`다.**
> 코스가 추가되면 그 목록이 먼저 바뀐다 — 배포 때마다 아래와 대조한다.
> (실제로 `설계/07 §1`의 목록이 한때 8개(N5~N2)만 적혀 있어 **입문·N1·영어 6개가 통째로 누락**된 적이 있다. 그 상태로 적재했으면 코스 0·5와 영어 과정이 운영에서 사라진다.)

```
 1  data-courses.sql
 2  data-course-content.sql          3  data-course-units.sql          (N5 · 코스 1)
 4  data-course-n4-content.sql       5  data-course-n4-units.sql
 6  data-course-n3-content.sql       7  data-course-n3-units.sql
 8  data-course-n2-content.sql       9  data-course-n2-units.sql
10  data-course-intro-content.sql   11  data-course-intro-units.sql    (입문 · 코스 0)
12  data-course-n1-content.sql      13  data-course-n1-units.sql       (N1)
14  data-course-en-content.sql      15  data-course-en-units.sql       (영어 과정)
```

- **`*-content.sql`이 반드시 같은 코스의 `*-units.sql`보다 먼저다** — 유닛 매핑이 콘텐츠 행을 참조한다. 뒤집으면 FK/참조 오류로 중간에 멈춘다.
- `data-courses.sql`이 맨 먼저다 — 나머지 파일이 `course` 행을 UPDATE·참조한다.

### 6-3. 적재하지 않는 파일 ⚠️

| 파일 | 운영 적재 | 이유 |
|---|---|---|
| **`data-h2-reset-identity.sql`** | **하지 않는다** | **H2 전용**이다. MySQL은 명시 ID INSERT가 AUTO_INCREMENT를 알아서 올리므로 필요가 없고, H2 문법(`ALTER TABLE ... ALTER COLUMN ... RESTART`)이라 MySQL에서 **문법 오류로 실패**한다 |
| **`data-users.sql`** | **하지 않는다** | 로컬 편의용 테스트 계정(`user4`~`user12` / 비번 `1234`)이다. 운영에 넣으면 ① 4자 비밀번호 계정이 운영에 열리고 ② `{noop}` 접두 해시 2건은 어차피 로그인 불가이며 ③ 고정 ID가 실제 가입자 AUTO_INCREMENT와 충돌한다 |
| `data-user-roles.sql` | 하지 않는다 | 위 users 시드에 딸린 파일이다. users를 안 넣으면 넣을 이유가 없다 |
| `data-community.sql` · `data-comment.sql` · `data-files.sql` | 하지 않는다 | 보일러플레이트 유래 **인형뽑기 게시글**이다. 일본어 학습 사이트와 무관하다 |

> 운영 적재는 사람이 손으로 하므로 "안 넣는다"가 기억에 의존한다.
> **배포 체크리스트에 "커뮤니티·사용자 시드 미적재 확인" 한 줄을 반드시 남긴다.**

### 6-4. 실행 방법

접속정보는 Railway → MySQL 서비스 → Variables/Connect에서 확인한다(공개 프록시 호스트·포트).
**비밀번호는 커맨드라인에 쓰지 않는다** — `-p`만 주고 프롬프트에 입력한다.

Git Bash에서 순서대로 한 번에:

```bash
cd c:/Users/gks93/workspace/simple_side/japanese/src/main/resources

FILES="data-courses.sql \
data-course-content.sql data-course-units.sql \
data-course-n4-content.sql data-course-n4-units.sql \
data-course-n3-content.sql data-course-n3-units.sql \
data-course-n2-content.sql data-course-n2-units.sql \
data-course-intro-content.sql data-course-intro-units.sql \
data-course-n1-content.sql data-course-n1-units.sql \
data-course-en-content.sql data-course-en-units.sql"

for f in $FILES; do
  echo ">>> $f"
  mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p <MYSQLDATABASE> \
        --default-character-set=utf8mb4 < "$f" || { echo "!! 중단: $f"; break; }
done
```

- `--default-character-set=utf8mb4`를 빼면 **일본어·한국어가 깨져서 들어간다.** 되돌리려면 지운 뒤 다시 넣어야 한다.
- 실패하면 `break`로 멈춘다 — **순서가 생명이라 뒤 파일을 이어서 넣으면 안 된다.**
- 파일마다 비밀번호를 다시 묻는 것이 번거로우면 `railway connect MySQL`로 세션을 하나 열고 `source <파일>`을 순서대로 쳐도 된다.
- **재실행은 안전하지 않다.** 시드는 고정 ID INSERT라 두 번째 실행은 `Duplicate entry`로 실패한다. 이건 사고를 막는 쪽이니 그대로 둔다. 다시 넣어야 하면 §8-3.

### 6-5. 적재 직후 확인

```sql
SELECT language, COUNT(*) FROM course GROUP BY language;  -- JA 6 / EN 5 (총 11행)
SELECT id, course_no, title, status FROM course ORDER BY id;
```

숫자보다 확실한 건 §7의 API 확인이다.

> 콘텐츠 시드는 테스트 픽스처가 아니라 **실참조 데이터**다. 시드를 고칠 때마다 운영에도 다시 반영해야 한다.
> 편집 API는 로컬 전용(운영은 빈 등록조차 안 됨)이라 **운영 콘텐츠를 바꾸는 경로는 이 수동 적재가 유일하다.**

---

## 7. 배포 후 확인 (근거: `설계/07 §7`)

`<도메인>`은 `APP_BASE_URL`과 같은 값이다. 위 4개는 **반드시** 확인한다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<도메인>/actuator/health   # 200
curl -s https://<도메인>/actuator/health                                    # {"status":"UP"}
curl -s -o /dev/null -w "%{http_code}\n" https://<도메인>/h2-console        # 401 이어야 한다
curl -s https://<도메인>/api/courses | head -c 300                          # 빈 배열이면 §6 미적재
```

| # | 확인 | 기대 | 어긋나면 |
|---:|---|---|---|
| 1 | `GET /actuator/health` | 200 `{"status":"UP"}` | 기동 실패 → §9 로그 확인 |
| 2 | **`GET /h2-console`** | **401** | **200·302면 즉시 롤백(§8).** 콘솔이 운영에 열린 것이다 |
| 3 | **`GET /api/courses`** | 코스 **6개**, 배열이 비어 있지 않음 | **§6 시드 미적재.** 사이트는 떠 있지만 학습 콘텐츠가 없다 |
| 4 | `GET /api/courses/2` | 유닛 **20개** | 코스 시드는 들어갔는데 units가 빠졌다 → §6-2 순서 확인 |
| 5 | `GET /api/en/courses` | 영어 코스 5개 | en 시드 미적재 |
| 6 | 화면 | 로그아웃 상태로 `/` 접속 → CSS·JS 정상 로드 | 정적 경로 permitAll 누락(`설계/07 §5-2`) |
| 7 | 로그인 | 카카오·구글 각 1회 성공 | `redirect_uri_mismatch` → `APP_BASE_URL`·OAuth 콘솔(§3-5) |
| 8 | 자료실 | `/library/kanji` 목록·검색·필터 동작 | 시드 또는 라우팅 |
| 9 | 파일 | 이미지 업로드 → **재배포 후에도 보이는지** | 버킷이 아니라 로컬 디스크로 폴백됐다(§2-B3) |
| 10 | 권한 | 비로그인으로 글 작성 시도 → 401 | SecurityConfig |
| 11 | Swagger | `GET /swagger-ui.html` → 안 열림 | prod에서 비활성이 정상 |

자동화 테스트가 못 잡는 것(정적 서빙, OAuth 웹 흐름, 실제 버킷 연동)은 **배포마다 1회 수동 확인**한다.

---

## 8. 되돌리기 (롤백)

**배포 전에 되돌리는 법을 알고 시작한다.** 롤백 기준점은 §2-C에서 확인한 "직전 배포 성공 커밋"이다.

### 8-1. 먼저 볼 것 (60초)

```bash
railway logs                    # 또는 대시보드 → Deployments → 실패한 배포 → View Logs
```

| 로그에 보이는 것 | 원인 | 대응 |
|---|---|---|
| `운영(prod)에서 H2 콘솔(...)을 켤 수 없습니다` | §2-B2 위반 | 설정 되돌리고 재배포 (롤백 불필요) |
| `운영(prod)에서 편집 모드(...)를 켤 수 없습니다` | §2-B1 위반 | 동일 |
| `필수 버킷 설정이 누락되었습니다: [BUCKET_...]` | 환경변수 누락 | 변수 등록 후 재배포 |
| `Could not resolve placeholder 'SPRING_DATASOURCE_URL'` 류 | §3-1 누락 | 변수 등록 후 재배포 |
| 빌드 단계에서 실패 | 코드/번들 문제 | **8-2로 롤백**하고 해당 개발자에게 넘긴다 |

### 8-2. 앱 롤백 — 이전 버전 재배포

가장 빠르고 확실한 방법:

1. Railway → 앱 서비스 → **Deployments** → 마지막으로 **성공한 배포** 선택 → **Redeploy** (또는 `⋮` → Rollback)
2. §7의 1~3번을 다시 확인한다.

git으로 되돌려야 한다면 (사용자 요청이 있을 때만):

```bash
git log --oneline -10
git revert <문제 커밋>       # 이력을 남기는 방식. 원격이 붙은 뒤에는 reset --hard 금지
git push origin master       # Railway가 되돌린 상태로 다시 빌드
```

### 8-3. 시드를 잘못 넣었을 때

앱 롤백으로는 **DB가 되돌아가지 않는다.** 데이터는 별도다.

- 순서를 틀려 중간에 멈췄다 → 멈춘 지점 **이후 파일만** 순서대로 이어서 넣는다.
- 문자가 깨져 들어갔다(§6-4의 `utf8mb4` 누락) → 해당 코스 데이터를 지우고 다시 넣는다. 사용자 데이터가 아직 없는 첫 배포 직후라면 **MySQL 서비스를 비우고 §6을 처음부터** 다시 하는 편이 확실하다.
- **사용자 가입·진도 데이터가 쌓인 뒤에는 DB를 비우지 않는다.** 문제 범위만 골라 수정한다.

> DB 마이그레이션 도구(Flyway 등)는 아직 도입돼 있지 않다. 스키마는 `ddl-auto: update`가, 데이터는 이 수동 절차가 담당한다.
> 컬럼 삭제·타입 변경은 `update`가 해주지 않는다 — 그런 변경이 포함된 배포는 senior-dev와 사전 합의한다.

---

## 9. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 사이트는 뜨는데 **코스 목록이 텅 빔** | §6 시드 미적재 | §6 실행. 가장 흔한 사고다 |
| 코스는 보이는데 **특정 코스만 유닛 0개** | `*-units.sql` 누락 또는 순서 역전 | 해당 코스의 content → units 순으로 재적재 |
| 입문(코스 0)·N1·영어만 없다 | 오래된 시드 목록으로 적재 | `application.yml`의 `data-locations`와 §6-2 대조 후 빠진 6개 적재 |
| **기동이 안 되고 즉시 죽는다** | `RailwayDeploymentValidator`의 fail-fast | §8-1 표. **검증기를 끄지 말 것** |
| 로그인 시 `redirect_uri_mismatch` | `APP_BASE_URL` 미등록 또는 OAuth 콘솔 미등록 | §3-2 · §3-5 |
| 로그인 화면까지는 가는데 토큰 발급 실패 | `KAKAO_CLIENT_SECRET` 미등록 | prod는 기본값이 없다. 로컬과 다르다 |
| 업로드한 이미지가 **재배포 후 사라짐** | 버킷이 아닌 로컬 디스크 폴백 | `BUCKET_*` 4개 등록 확인 |
| 일본어·한국어가 `???`로 저장됨 | 시드 적재 시 charset 누락 | `--default-character-set=utf8mb4` (§6-4) |
| `GET /h2-console`이 200/302 | 운영에 콘솔이 열렸다 | **즉시 롤백**(§8-2) 후 §2-B2 |
| CI `backend` 빨강 | 테스트 실패 | Artifacts → `backend-test-results` → `reports/tests/test/index.html` |
| CI `frontend` 빨강 | 테스트/린트/빌드 실패 | 해당 스텝 로그. `Build` 빨강이면 **배포도 깨진다 — 배포 금지** |
| Railway 헬스체크만 실패(앱은 응답) | Dockerfile `HEALTHCHECK`가 `localhost:8080` 고정인데 Railway가 다른 `PORT`를 주입한 경우 | 앱 자체는 `${PORT}`로 정상 리슨한다. Railway 대시보드 헬스체크 경로(`/actuator/health`)로 판정하면 된다. Dockerfile 수정이 필요하면 devops 작업으로 별도 처리 |

**기능 코드에서 원인이 발견되면 devops가 고치지 않는다.** 백엔드는 backend-dev, 프론트는 frontend-dev에게 넘긴다.
devops가 만지는 것은 워크플로·설정·배포 구성뿐이다.

---

## 10. 체크리스트 (배포할 때마다 이것만 복사해서 쓴다)

```
[ ] ./gradlew test 통과
[ ] frontend: npm ci && npm test && npm run lint && npm run build 통과
[ ] GitHub Actions CI 초록
[ ] qa 판정 통과
[ ] application-prod.yml: app.editor.enabled=false
[ ] application-prod.yml: spring.h2.console.enabled=false
[ ] BUCKET_* 4개 등록됨
[ ] APP_BASE_URL = 운영 도메인 (fail-fast가 못 잡는다)
[ ] git status 깨끗 / 롤백 기준 커밋 확인
[ ] (사용자 승인) 배포 실행
[ ] 운영 시드 15개 순서대로 적재  ← 첫 배포·시드 변경 시
[ ] 커뮤니티·사용자 시드 미적재 확인 (data-users / user-roles / community / comment / files / h2-reset-identity)
[ ] GET /actuator/health → 200 UP
[ ] GET /h2-console → 401
[ ] GET /api/courses → 코스 6개 (비어 있지 않음)
[ ] 카카오·구글 로그인 각 1회
[ ] 이미지 업로드 → 재배포 후에도 보임
```

---

## 참고 문서

| 문서 | 무엇 |
|---|---|
| `설계/07_운영_배포.md` | 이 절차의 **근거**. 보안 화이트리스트(§5), 운영에서 꺼진 것(§8), CI 상세(§9) |
| `설계/02_아키텍처.md` | 빌드·실행, 로컬 H2 vs 운영 MySQL |
| `설계/03_데이터모델.md` | 시드 체계·ID 대역 규칙 |
| `.github/workflows/ci.yml` | CI 정의 (lint는 현재 **정식 게이트**다) |
| `Dockerfile` | 빌드·기동 방식 |
| `.env.example` | 환경변수 이름 목록 (값 없음) |

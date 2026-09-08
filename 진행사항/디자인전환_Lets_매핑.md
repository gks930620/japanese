# 디자인 전환 — Halo → Lets 매핑 지시서

> **누가 읽나**: frontend-dev. 이 문서가 작업 지시서다.
> **원칙 문서**: `설계/05_디자인시스템.md`(Lets 개정본) · 킷 원본 `design_kits_lets/클래스-목록.md`
> **범위**: `frontend/` 웹만. 백엔드·API·테스트 계약은 건드리지 않는다.
> 작성: designer / 2026-09-03

---

## 0. 한 장 요약

| | Halo (현행) | Lets (전환 후) |
|---|---|---|
| 성격 | 화려함을 한 곳에 — 그라디언트·유리·그림자 | 밝고 반듯 — 흰 바탕 + 1px 선 + 인디고 하나 |
| 면 경계 | 그림자(`--sh`), 테두리 없음 | **1px `--border`**, 그림자는 hover에만 |
| 강조 | `--grad` 그라디언트 (예산 3~5개) | `--point` 단색 인디고 1색 + 오렌지 `--point-2` 아주 조금 |
| 섹션 구분 | 배경 메시(radial-gradient 3장) | **연보라 면 `--hero-bg`** |
| 버튼 모양 | 알약 999px **예외 없음** | 라운드 `--r`(10px). 알약은 `.k-badge--pill`만 |
| 클래스 | 자체 클래스 (`.panel` `.btn` …) | **킷 계약 `.k-*`** |
| 본문 | 14.5px / 1.65 | 15px(`--t-md`) / 1.65(`--lh`) |
| 반경 | `--radius` 20 / `--radius-sm` 13 | `--r-lg` 16 / `--r` 10 / `--r-sm` 8 |
| 폭 | 1360px | `--content-max` 1200px |

**전환의 뼈대**: 구조 클래스는 전부 `.k-*`로 간다. **도메인 클래스(일본어 조판·퀴즈·자료실·TTS·편집)는 이름을 그대로 두고 내부 값만 Lets 토큰으로 다시 칠한다.**
테스트가 도메인 클래스만 보고 있으므로(§6) 이 분리가 전환 비용을 결정한다.

---

## 1. 작업 순서 (킷 `적용-절차.md` §4 고정)

무작정 전부 바꾸지 말고 아래 순서로 한다. **한 단계 끝날 때마다 `npm test` + 육안 확인.**

| 단계 | 무엇 | 산출 |
|---|---|---|
| **0** | 킷 로드 + 토큰 치환 준비 (§2) | `main.jsx` import 교체, `styles/project-tokens.css` 신설 |
| **1** | 레이아웃 셸 — `Layout.jsx` 하나 (§3-1) | GNB·본문·푸터가 `.k-shell/.k-topnav/.k-main/.k-footer` |
| **2** | 버튼·입력 (§3-2, §3-3) — 빈도 1·2위라 효과가 가장 크다 | `components/ui/` 래퍼 신설 |
| **3** | 카드·표·목록 (§3-4) | `.panel`/`.padded`/`.data-table` 소거 |
| **4** | 상태 표시 — 알림·배지·빈 상태·스켈레톤 (§3-5) | |
| **5** | 도메인 CSS 재도색 (§4) — 색·반경·그림자만 Lets 토큰으로 | `styles.css` 정리 |
| **6** | 청소 (§5) — Halo 파일 삭제 + 하드코딩 제거 | `halo-*.css` 2개 삭제 |
| **7** | 자가 검토 — 킷 `적용-절차.md` §6 체크리스트 | 통과 못 한 항목 보고 |

**절반만 적용된 화면을 여러 개 만들지 않는다.** 단계 1~4는 전역 부품이라 전 화면이 동시에 넘어간다.

---

## 2. 로드 순서와 토큰

### 2-1. `main.jsx` — 이렇게 바뀐다

```
(삭제) ./styles/halo-tokens.css
(삭제) ./styles/halo-components.css
(추가) ../../design_kits_lets/base.css
(추가) ../../design_kits_lets/components.css
(추가) ../../design_kits_lets/tokens.css
(추가) ../../design_kits_lets/extras.css
(추가) ./styles/project-tokens.css      ← 킷 다음. 프로젝트 토큰만
(유지) ./styles.css                      ← 항상 맨 마지막
```

- **`mobile.css`는 로드하지 않는다.** 앱형 셸(앱바·탭바·FAB)을 안 쓴다 — 05 §12 "하단 탭바 금지"가 그대로 유효하다.
- 킷 폴더는 `design_kits_lets/` 그대로 둔다(이름을 바꾸지 않는다 — 킷 규약).
  Vite가 프로젝트 루트 밖 import를 거부하면 **폴더를 옮기지 말고** `vite.config.js`의 `server.fs.allow`로 푼다.
  그게 번거로우면 **`frontend/src/design_kits_lets/`로 폴더째 복사**한다(사본이지 개조가 아니다 — 킷 파일은 한 줄도 고치지 않는다).
- **킷 파일 4개(`base`·`components`·`tokens`·`extras`)는 절대 수정 금지.** 고칠 게 생기면 `project-tokens.css`에서 `:root`로 덮는다.
- `index.html`의 FOUC 방지 인라인 스크립트는 **그대로 둔다** — 킷도 같은 방식(`data-theme` 선적용)을 요구한다.

### 2-2. `styles/project-tokens.css` (신규) — 여기에만 프로젝트 토큰

Halo에서 프로젝트가 추가했던 토큰은 두 개였다. 하나만 살아남는다.

| Halo 확장 토큰 | 처리 |
|---|---|
| `--font-jp` | **살린다.** 킷에 대응이 없다(일본어 자형은 이 제품 고유 문제). 라이트·다크 공통 1벌 |
| `--dim` (확인 대화상자 딤) | **버린다.** 킷의 `--overlay`가 같은 것이다 → `--overlay`로 치환 |

새 토큰이 필요해지면 **컴포넌트에 값을 적지 말고 여기에 `:root` + `:root[data-theme="dark"]` 두 벌로 추가**한다(킷 §11-3).

### 2-3. 토큰 치환표 — `styles.css` 일괄 치환의 근거

| Halo | Lets | 주의 |
|---|---|---|
| `--point` | `--point` | 이름 같음, 값만 인디고로 |
| `--point-dark` | `--point-text` | soft 면 위 글자색 |
| `--point-soft` | `--point-soft` | 이름 같음 |
| `--bg` `--surface` `--text` `--muted` `--muted2` `--border` | 같은 이름 | 값만 바뀐다 |
| `--soft` | `--surface-alt` | 입력 바탕·표 헤더·근거 박스 |
| `--code-bg` | `--surface-alt` | 별도 토큰 불필요 |
| `--dim` | `--overlay` | |
| `--radius`(20px) | `--r-lg`(16px) | 카드·패널 |
| `--radius-sm`(13px) | `--r`(10px) | 입력·타일·작은 박스. 더 작아야 하면 `--r-sm`(8px) |
| `999px` 하드코딩 | `--r-pill` | **버튼·칩에는 더 이상 쓰지 않는다**(§3-2). 배지·진도 막대·아바타만 |
| `--grad` `--grad-hot` | **없음** | → `--point` 단색. hover는 `--point-hover` |
| `--grad-hero` `--sh-hero` | **없음** | → `--hero-bg` / `--hero-fg`, 그림자 없음 |
| `--sh-acc` | **없음** | → 그림자를 지운다. 강조는 색으로만 |
| `--sh` (상시 그림자) | **없음 → `1px solid var(--border)`** | Lets는 평상시 그림자를 안 쓴다 |
| `--sh-lg` (hover) | `--sh-2` | hover에만 |
| `--glass` `--glass-edge` `--glass-chip` | **없음** | 헤더는 `--header-bg`(=surface) + 아래 `--border` 1px |
| `--ok` `--ok-soft` `--ok-text` | 같은 이름 | |
| `--warn` | `--warn` + **`--warn-soft` `--warn-text` 신설** | `color-mix(...)` 표현을 **전부 토큰으로 교체** |
| `--err` | `--err` + **`--err-soft` `--err-text`** | 같음. `.notice.error`·`.btn-danger`·퀴즈 오답 틴트가 여기 걸린다 |
| `#fff` (그라디언트 위 글자) | `--on-point` | 그라디언트가 사라져도 `--point` 면 위 글자에 필요하다 |

> **`color-mix()`를 새로 쓰지 않는다.** Lets는 `-soft`/`-text` 토큰을 이미 제공하므로 계산할 이유가 없다.
> 현행 `styles.css`·`halo-components.css`의 `color-mix` 사용처는 전부 치환 대상이다.

---

## 3. 구조 클래스 매핑 (Halo → `.k-*`)

> 빈도는 designer가 실측한 현행 사용 횟수다. **위에서부터 처리한다.**

### 3-1. 셸 · 레이아웃

| 현행 | 빈도 | Lets | 비고 |
|---|---:|---|---|
| `.app-header` + `.header-container` | | `.k-topnav` | **유리(blur) 제거.** `--header-bg` + 하단 1px `--border`. sticky는 킷이 준다 |
| `.header-logo` `.logo-badge` | | `.k-topnav__logo` | 그라디언트 배지 삭제. 킷이 로고를 강조색으로 칠한다 |
| `.hdr-badge` | | `.k-badge` | ⚠️ **테스트가 `.hdr-badge`를 본다**(§6) — 클래스를 지우려면 senior-dev에게 테스트 수정을 먼저 요청 |
| `.nav-pill` / `.nav-pill.active` | | `.k-topnav nav > a` / `aria-current="page"` | **클래스로 활성을 표시하지 않는다.** extras.css가 먹색 밑줄을 그린다 |
| `.app-body` `.content-area` | | `.k-main` | 폭 1360 → `--content-max` 1200 |
| 푸터 | | `.k-footer` | |
| `.hero` | | `.k-hero` | 3색 그라디언트 → `--hero-bg` 연보라 면. **흰 CTA 규칙 폐기**(§3-2) |
| `.page-header` / `h1` / `p` | 15 | `.k-page-title` + `.k-page-desc` | 아바타와 나란히 두려면 `.k-flex`로 감싼다 |
| `.page-avatar` | | `.k-avatar` | extras.css가 연회색 라운드 스퀘어 + 인디고 글리프로 그린다 |
| `.toolbar` `.toolbar-right` | | `.k-toolbar` + `.k-spacer` | |
| `.section-heading` | | `.k-section > h2` | 킷이 작은 라벨체로 표시한다 |
| `.sidebar` `.side-item` `.side-heading` | | (미사용이면 삭제) | 보일러 잔재. 쓰는 화면이 없으면 옮기지 말고 지운다 |
| `.mobile-nav-panel` | | **킷에 없음 → 도메인 유지** | 불투명 패널 유지, 토큰만 교체 |

### 3-2. 버튼 (빈도 최상위)

| 현행 | 빈도 | Lets |
|---|---:|---|
| `.btn` | 90 | `.k-btn` |
| `.btn.primary` / `.btn-primary` | 25 | `.k-btn--primary` |
| `.btn.ghost` | 27 | `.k-btn--ghost` |
| `.btn-secondary` | | `.k-btn--secondary` |
| `.btn-danger` | | `.k-btn--danger` |
| `.btn.primary.lg` | | `.k-btn--lg` |
| 모바일 `width:100%` 규칙 | | `.k-btn--block` |
| 아이콘만 있는 버튼(`.theme-toggle` 등) | | `.k-btn .k-btn--ghost .k-btn--icon` |
| `:disabled` / `opacity:.45` | | `disabled` 속성 그대로 — **킷이 처리한다. 우리 CSS를 지운다** |

- **알약(999px) 폐기.** Lets 버튼은 `--r`(10px)이다. 05 §2 보조규칙 "버튼·칩·배지는 전부 알약, 예외 없다"가 이 전환으로 사라진다.
- **`.k-btn--primary`는 화면당 1개** — 05 §3-2와 이미 같은 규칙이므로 화면 설계는 안 바뀐다.
- 히어로 위 흰 알약 CTA는 **`.k-btn--primary` 그대로** 둔다. 연보라 면 위에 인디고 버튼은 대비가 충분하다(그라디언트 위 그라디언트 문제가 사라졌다).

### 3-3. 입력 · 폼

| 현행 | 빈도 | Lets |
|---|---:|---|
| `.field` / `.form-group` | 8 | `.k-field` |
| `.field > span` / `.form-label` | | `.k-label` |
| `.input` | | `.k-input` |
| `.area` | | `.k-textarea` |
| `.filter-select` | | `.k-select` (자료실 정렬 셀렉트) |
| `.search-input-wrapper` | | `.k-inputgroup` 또는 `.k-input` 단독 |
| `.field-error` (편집·계정) | | `.k-help .k-help--err` + `aria-invalid="true"` |
| `.form-actions` | | `.k-flex` |
| `.form-label.required::after` | | **도메인 유지** — 킷에 필수 표시가 없다. `.k-label` 위에 `::after`만 얹는다 |

⚠️ **`<select>`·`<input>`·`<textarea>`에 `.k-*`를 빠뜨리면 다크에서 흰 배경이 그대로 남는다**(킷 §12 상시 실수 1위). 전수로 확인한다.

### 3-4. 컨테이너 · 목록 · 표

| 현행 | 빈도 | Lets |
|---|---:|---|
| `.panel` | 48 | `.k-card` |
| `.panel.padded` | 37 | `.k-card` — **`padded`는 삭제**(킷 카드에 패딩이 있다) |
| `.panel-head` | | `.k-card--flush` + `.k-card__head` |
| `.card` `.card-grid` `.card-body` | | `.k-card--hover` + `.k-grid` |
| `.card-icon` | | `.k-avatar` |
| `.table-wrap` / `.data-table` | | `.k-tablewrap` / `.k-table` — **표는 반드시 `.k-tablewrap` 안에** |
| 숫자 열 (`tabular-nums`) | | `.k-num` / `.k-mono` |
| `.kv-row` `.kv-label` `.kv-value` | 11 | **킷에 없음 → 도메인 유지.** 한자 상세 음독/훈독의 좌우 2단은 `.k-row`(rank/main/sub)와 의미가 다르다. 토큰만 교체 |
| `.pagination` `.pagination-btn` | | `.k-pager` + `aria-current="page"` |
| `.count-grid` / `.count-big` | | `.k-stats` / `.k-stat`(+`--point`) · `.k-stat__value` / `__label` |
| `.statusbar` | | `.k-flex` + `.k-badge` 나열 |
| `.confirm-dialog` / `.confirm-panel` | | `.k-modal`(+`.k-modal__head/__body/__foot`) — ⚠️ **`<dialog>`+`showModal()` 유지**(05 §12-1 ⑤). `.k-backdrop` div를 만들지 말고 `dialog::backdrop`에 `--overlay`. `.confirm-dialog` 클래스 이름은 **테스트가 보므로 남긴다** |

### 3-5. 상태 표시

| 현행 | 빈도 | Lets |
|---|---:|---|
| `.notice` | 22 | `.k-alert` |
| `.notice.info` | | `.k-alert` (기본형) |
| `.notice.ok` / `.warn` / `.error` | | `.k-alert--ok` / `--warn` / `--err` |
| `.notice.row` (가로 배치 변형) | | `.k-alert` + 내부 `.k-flex` — **변형 클래스를 없앤다** |
| `.tag` / `.status-badge` / `.lv-badge` | | `.k-badge` (`--point`/`--ok`/`--warn`/`--err`) |
| `.skeleton` | 48 | `.k-skeleton` |
| `.sk-line` `.sk-row` `.sk-card` `.sk-pill` `.sk-avatar` `.sk-auth` `.sk-tile` `.w40` `.w70` | 31 | `.k-skeleton` + **치수 클래스는 도메인 유지** — 킷은 크기를 정해 주지 않는다. `.sk-*`는 `width/height/margin`만 남기고 색·애니메이션은 킷에 맡긴다 |
| `.empty-state` / `.empty-block` | | `.k-empty` |
| `.center-card` (StateCards) | | `.k-card` + 안에 `.k-empty` |
| `.progress-bar` / `.progress-fill` | | `.k-bar` + `<span style="width:n%">` — ⚠️ **테스트가 `.progress-bar`·`.progress-fill`과 인라인 `width`를 본다**(§6). **클래스를 병기**(`k-bar progress-bar`)하거나 senior-dev에게 테스트 수정을 요청 |
| `.list-loading` (갱신 로딩 흐리기) | | **도메인 유지** — 킷에 없다 |

### 3-6. 칩 · 탭

| 현행 | 빈도 | Lets |
|---|---:|---|
| `.chip` / `.chip-row` | | `.k-chip` / `.k-flex` |
| `.chip.on` / `.chip.sel` | | `.k-chip[aria-pressed="true"]` — **클래스로 선택을 표시하지 않는다** |
| `.ref-tabs` (자료실 탭) | | `.k-tabs` |
| 과정 스위처 | | `.k-segment` + `aria-pressed` |

⚠️ **탭의 활성 표시는 `aria-current="page"`다**(`aria-selected` 아님). 05 §11이 정한 대로 자료실 탭은 `role="tablist"`가 아니라 **주소가 바뀌는 링크**다. 킷 `.k-tabs`는 `aria-selected`를 기본으로 스타일하므로, `project-tokens.css`가 아닌 `styles.css`에서 `.k-tabs a[aria-current="page"]`에 **같은 표현**을 한 줄 보정한다. 링크를 버튼으로 바꾸지 않는다.

⚠️ `UnitStudyPage.jsx`가 `querySelector(".chip.on")`으로 스텝 바를 스크롤한다 → `[aria-pressed="true"]`(또는 `[aria-current]`)로 함께 고친다. **놓치면 스텝 바 자동 스크롤이 조용히 죽는다.**

---

## 4. 킷에 대응이 없는 것 — **도메인 클래스로 남기고 토큰으로 재작성**

아래는 **이름을 바꾸지 않는다.** 마크업도 그대로다. 고치는 것은 **CSS 내부의 색·반경·그림자·간격 값**뿐이고, 규칙은 개정된 `설계/05`가 계속 원본이다.

| 묶음 | 클래스 | 재작성 지침 |
|---|---|---|
| **일본어 조판** (05 §6) | `.jp` `.jp-sentence` `.kana-line` `.mean-line` `.latin` | `--font-jp` 유지. 원문 22px → **`--t-xl`(22px)** 로 토큰화, ≤768px 19px는 그대로. 본문이 14.5→15px로 커지므로 **가나/뜻 줄(15/14.5px)을 `--t-md`/`--t-sm`로 다시 잡아 3줄의 크기 차이를 유지**한다 |
| **한자** | `.kanji-card` `.kanji-hero` `.kanji-tile` `.kanji-tile-grid` `.kanji-word` | 타일 배경 `--soft`→`--surface-alt`, 반경 13→`--r`. **타일에 그림자를 넣지 말고 1px `--border`** |
| **회화** | `.dialog-line` `.dialog-line.playing` | playing은 `--point-soft` 불투명 유지 |
| **코스·유닛** | `.course-card` `.unit-row` `.step-bar` `.review-block` `.summary-row` | `.course-card`는 `.k-card--hover` 위에 도메인 규칙만 얹는다. **시작점 코스 1장의 그라디언트 배지 → `.k-badge--pill`(오렌지 `--point-2`)**. 킷이 오렌지를 허용하는 유일한 자리가 "새로 생긴 것/여기부터" 표시다 |
| **진도·보관함** | `.progress-label` `.unit-done-mark` `.unit-here-badge` `.done-toggle` `.bm-star` `.bm-entry` `.bm-undo` `.bm-clear` `.inline-alert` | ★는 텍스트 글리프 유지(SVG 들이지 않는다) |
| **자료실** | `.ref-toolbar` `.filter-group` `.filter-toggle` `.result-bar` `.applied-chip` `.ref-list` `.ref-row` `.where-learn` `.vocab-ref-table` `.vocab-expand` `.sense-item` `.vocab-meta` `.ext-mark` | `.applied-chip`은 `.k-chip` 위 변형으로 축소 가능하면 축소 |
| **퀴즈** (05 §15-1) | `.quiz-card` `.quiz-progress` `.quiz-prompt`(`.glyph`) `.quiz-prompt-sub` `.quiz-choices` `.quiz-choice`(`.correct` `.wrong`) `.quiz-verdict` `.quiz-evidence` `.quiz-result-*` `.quiz-note` `.quiz-entry*` | `.quiz-card` = `.k-card` + 폭 640px. **보기 알약 → `--r`**. 정답 `--ok-soft`/`--ok-text`, 오답 `--err-soft`/`--err-text` — **`color-mix` 계산을 토큰으로 대체**(§2-3). 점수는 `.k-stat` |
| **진단** (05 §15-2) | `.diag-wrap` `.diag-headline` | 근거 표는 `.k-tablewrap`+`.k-table` |
| **음성** (05 §15-3) | `.tts-btn` `.step-caption.row-caption` | 28px `flex:0 0 28px` **고정값 유지** — 3줄 병기 줄 높이를 지키는 값이라 토큰으로 바꾸지 않는다(예외를 여기 명시해 둔다) |
| **편집** (05 §15-4) | `.editor-mode-bar` `.editor-panel*` `.editor-row` `.editor-saved` `.editor-diff` | 띠는 `--warn-soft`/`--warn-text`. `.editor-diff`는 `--surface-alt` + `--font-mono` |
| **영어** (05 §16) | `.expr-list` `.expr-card` `.expr-text` `.expr-pron` `.expr-mean` `.expr-note` `.expr-example` `.vocab-pron` | ⚠️ **테스트가 `.expr-*`를 본다**(§6). 이름 변경 금지 |
| **커뮤니티** | `.comment-*` `.community-*` | ⚠️ `.comment-actions`를 테스트가 본다 |
| **계정** | `.danger-zone` 계열, 가입 검증 목록 | 05 §17 규칙 그대로 |

**새 도메인 클래스를 만들 때 규칙**(킷 §11): `#hex`·`rgb(`·하드코딩 px 색·치수 금지. 필요하면 `project-tokens.css`에 **라이트·다크 두 벌**로 토큰을 늘린다.

---

## 5. 어디까지 감쌀 것인가 (React 래퍼 방침)

킷은 "React라면 클래스를 그대로 쓰지 말고 얇게 감싼다. **감싸되 스타일은 만들지 않는다**"고 했다.
우리 저장소엔 이미 컴포넌트가 많으므로 **층을 두 겹으로 나눈다.**

```
components/ui/          ← 킷 어댑터. .k-* 클래스 조립만. CSS 0줄, style 속성 0개
components/             ← 도메인 컴포넌트. ui/를 조립 + 도메인 클래스
pages/                  ← 도메인 컴포넌트만 쓴다. .k-* 를 직접 쓰지 않는 것이 원칙
```

### 5-1. 감싼다 — `components/ui/` (신규, 12개)

빈도표 상위와 다음 킷 교체 때 다시 손댈 곳이다. **이 12개만 감싸면 교체 비용의 90%가 여기 갇힌다.**

`Button` · `Card`(+`CardHead`/`CardBody`/`CardFoot`) · `Chip` · `Alert` · `Badge` ·
`Field`(+`Label`/`Input`/`Select`/`Textarea`/`Help`) · `Empty` · `Skeleton` · `Bar` · `Stat`(+`Stats`) ·
`Table`(+`TableWrap`) · `Modal`

규칙:
- **파일 안에 CSS·`style={{}}`가 한 줄도 없다.** 있으면 그 순간 킷 교체가 끝난다.
- 변형은 **prop → 클래스 이름 조립**(`variant="primary"` → `k-btn--primary`).
- 활성·선택·비활성은 **클래스가 아니라 속성**(`aria-pressed` / `aria-current` / `aria-selected` / `disabled`)으로 받는다.
- `className` prop을 그대로 이어 붙여 **도메인 클래스를 덧댈 수 있게** 한다(`<Card className="quiz-card">`).

### 5-2. 감싸지 않는다

| 대상 | 이유 |
|---|---|
| 셸(`.k-shell` `.k-topnav` `.k-main` `.k-footer` `.k-hero` `.k-page-title`) | **`Layout.jsx` 한 곳에만 나온다.** 한 번 쓰는 것을 감싸면 층만 는다 |
| 유틸(`.k-flex` `.k-stack` `.k-grid` `.k-spacer` `.k-muted` `.k-dim` `.k-mono` `.k-section` `.k-hr` `.k-sr`) | 이름이 이미 짧다. `className`으로 직접 쓴다 |
| 도메인 컴포넌트(`JpSentence` `GrammarBody` `QuizRunner` `CourseCard` `BookmarkStar` `TtsControls` `ProgressBar` `Pagination` `StateCards` `ConfirmDialog` `LibraryShell` …) | **이미 컴포넌트다.** 새로 감싸지 말고 **내부 구현만 `ui/`로 교체**한다. 공개 prop은 그대로 → 호출부 수정 0 |

### 5-3. 기존 컴포넌트의 내부 교체 (공개 API 불변)

| 컴포넌트 | 내부에서 바뀌는 것 |
|---|---|
| `Layout` | `.k-shell`/`.k-topnav`/`.k-main`/`.k-footer`, 활성 메뉴 `aria-current` |
| `Pagination` | `.pagination-btn` → `.k-pager` |
| `ProgressBar` | `.k-bar` + 도메인 클래스 병기(§6) |
| `StateCards` | `.k-card` + `.k-empty` |
| `ConfirmDialog` | `.k-modal__*` (단 `<dialog>`·`.confirm-dialog` 유지) |
| `CourseCard` | `.k-card--hover` + `.k-badge--pill`(시작점) |
| `QuizRunner` | `.k-card`+`quiz-card`, 보기는 `.k-btn--secondary`가 아니라 도메인 `.quiz-choice` 유지 |

---

## 6. ⚠️ 이름을 지우면 안 되는 클래스 (테스트·코드가 보고 있다)

전수 조사 결과 **구조 클래스(`.btn`·`.panel`·`.chip`·`.notice`·`.skeleton`)에 의존하는 테스트는 0건**이다. 다만 아래는 실제로 셀렉터가 걸려 있다.

| 클래스 | 어디 | 처리 |
|---|---|---|
| `.jp-sentence` `.jp-sentence.latin` `.kana-line` `.tts-btn` | `JpSentence.test.jsx`, `EnUnitStudy.test.jsx` | **유지** (도메인) |
| `.quiz-prompt` `.quiz-choice` | `DiagnosisWiring` `DiagnosisPage.allPassed` `LibraryQuizWiring` `LibraryQuizPage.tail` | **유지** |
| `.expr-card` `.expr-pron` `.expr-note` `.expr-example` | `EnUnitStudy` `EnLibrary` | **유지** |
| `.summary-row` `.bm-star` `.comment-actions` `.confirm-dialog` | `EnUnitStudy` `EnLibrary` `CommunityOwner` `WithdrawPage.zero` | **유지** |
| `.progress-bar` `.progress-fill` | `ProgressBar.test` `CourseCard.test` | **병기**(`k-bar progress-bar`) 또는 senior-dev에 테스트 수정 요청 |
| **`.hdr-badge`** | `AuthUx.test.jsx:95` | ⚠️ **킷 클래스인데 테스트가 본다.** `.k-badge`로 바꾸면 깨진다 → **병기하거나** senior-dev에게 먼저 요청 |
| **`.chip.on`** | `UnitStudyPage.jsx:656` (프로덕션 코드) | `[aria-pressed="true"]`로 **함께 고친다** |

> 테스트를 개발자가 직접 고치지 않는다(CLAUDE.md TDD 규칙 2). 위 3건은 **작업 전에 senior-dev에게 묶어서 요청**한다.

---

## 7. 삭제 · 유지 목록

### 7-1. 삭제

| 대상 | 조건 |
|---|---|
| `frontend/src/styles/halo-tokens.css` (145줄) | **전량 삭제.** 단 `--font-jp`를 `project-tokens.css`로 먼저 옮긴다. `--dim`은 `--overlay`로 치환 후 버린다 |
| `frontend/src/styles/halo-components.css` (289줄) | **전량 삭제.** 대응이 전부 `.k-*`에 있다(§3). `.sidebar`/`.side-item`은 사용처가 없으면 그냥 소멸 |
| `main.jsx`의 halo import 2줄 | §2-1 |
| `styles.css` — 그라디언트·유리 관련 전부 | `.btn-primary/.btn-secondary/.btn-danger` 색 재정의, `.card-*` 윗변 선(`::before` `background: var(--grad)`), `.hero` CTA 예외, `.logo-badge`, GNB 활성 그라디언트, 코스 카드 그라디언트 배지, `background-attachment: fixed` 메시 |
| `styles.css` — 킷과 중복되는 정의 | `.panel.padded` 패딩, `.skeleton` 색·애니메이션, `.empty-state`, `.pagination-btn`, `.form-group/.form-label`, 버튼 `:disabled` opacity |
| `styles.css` — `color-mix(...)` 전부 | §2-3 |
| `styles.css` — `#hex`·`rgb(`·`999px` 하드코딩 | 킷 체크리스트 항목. **단 카카오 브랜드 색은 예외로 남긴다**(브랜드 가이드 고정값, 테마 종속 아님 — 주석으로 사유를 남길 것) |

### 7-2. 유지

- `styles.css`의 **도메인 블록 전부**(§4) — 값만 재도색.
- `--font-jp` 및 일본어 자형 규칙.
- `.tts-btn`의 28px 고정폭(§4 예외 명시).
- `index.html`의 FOUC 인라인 스크립트, `lib/theme.js`.
- Material Icons 로드 — 킷과 무관하고 ★·재생 버튼이 쓴다.

### 7-3. `설계/halo-design-kit/` 폴더

**삭제하지 않고 `설계/_보일러플레이트_잔재/halo-design-kit/`로 옮긴다.**

- 이유: `설계/08_결정기록.md`와 05의 과거 판정들이 Halo 원칙(그라디언트 예산·원칙 ④)을 근거로 삼고 있다. 원문을 지우면 **"왜 그렇게 했나"를 되짚을 수 없다**(08 서문 규칙).
- 옮긴 뒤 `설계/README.md`의 문서 지도에서 `halo-design-kit/` 줄을 지우고, **현행 킷은 저장소 루트 `design_kits_lets/`** 임을 한 줄 적는다.
- **`설계/` 안에 디자인 킷을 두지 않는다** — Lets 킷은 킷 규약대로 루트 `design_kits_lets/`가 단일 출처다. 사본을 `설계/`에 만들면 두 벌이 갈린다.

---

## 8. 위험 목록 (전환 중 깨질 만한 것)

| # | 위험 | 왜 | 확인 방법 |
|---|---|---|---|
| **1** | **다크 모드** | `theme.js`가 항상 `data-theme`을 명시하므로 킷과 호환된다. 문제는 **남은 하드코딩**이다. `color-mix`·`#hex`·`rgba()`가 한 곳이라도 남으면 그 요소만 라이트로 남는다. 특히 `<select>`·`<input>`에 `.k-*`를 안 붙이면 **다크에서 흰 배경 그대로** | 모든 화면을 `data-theme='dark'`로 순회. 입력·셀렉트·표 헤더·근거 박스·편집 diff를 집중 확인 |
| **2** | **일본어 조판** | ① `--font-jp`가 `halo-tokens.css`에 있어 파일 삭제 시 **자형이 한국식으로 무너진다** ② 킷 `base.css`가 `body{font-family:var(--font)}`로 Pretendard를 먼저 찾는데 **웹폰트를 받지 않는 정책**이라 폴백된다 ③ 본문 14.5→15px로 커져 **3줄 병기(22/15/14.5)의 크기 차이가 눌린다** ④ 루비는 원래 안 쓰므로(05 §6 탈락안) 영향 없음 | 이관 먼저. 한자 포함 문장에서 자형·줄 높이 확인. 3줄 급간을 다시 잡는다 |
| **3** | **면 경계가 그림자 → 1px 선으로 바뀐다** | Halo는 `--sh`로 카드를 띄웠다. Lets는 테두리다. **카드 안 카드**(퀴즈 근거 박스·점수 카드·편집 패널·`.kv-row`·표)에서 **선이 겹쳐 2px로 보이거나** 반대로 배경색이 같아 **경계가 사라진다** | 퀴즈 결과 카드, 한자 상세 `.kv-row`, 자료실 표, 편집 패널을 눈으로 확인. 안쪽 면은 `--surface-alt`로 낮춘다 |
| **4** | **편집 모드 바** | `.notice.warn`이 `color-mix` 기반 → `--warn-soft`/`--warn-text`로 치환해야 한다. 또 헤더 유리가 사라져 **띠와 GNB의 층 관계**(sticky/z-index)가 달라 보인다. "GNB보다 위 · sticky 아님"(05 §15-4)이 유지되는지 | 편집 모드 켠 상태로 스크롤. 띠가 따라오지 않고 GNB가 그 아래 sticky인지 |
| **5** | **반응형** | 본문 폭 1360 → 1200px. **한자 타일 6~7열 / ≤1200 5열** 브레이크포인트(05 §10)가 새 폭에서 어긋난다. 킷 버튼 `min-height: var(--touch)`(46px)로 **버튼이 커져 좁은 화면 줄이 밀린다**. 표는 `.k-tablewrap` 없으면 390px에서 가로로 터진다 | 1440/1200/1024/768/480/390px 순회. 자료실·유닛 학습·퀴즈 3화면 필수 |
| **6** | **활성 표시 방식 전환** | `.active`/`.on`/`.sel` 클래스 → `aria-*` 속성. 하나라도 빠지면 **활성 항목이 시각적으로 사라진다**(스타일이 안 걸림). 프로덕션 코드 `querySelector(".chip.on")`도 함께 죽는다 | GNB 메뉴·자료실 탭·필터 칩·스텝 바·페이지네이션·속도 칩 전수 |
| **7** | **`.hdr-badge` / `.progress-bar` 테스트 결합** | §6. 클래스 이름을 지우면 초록이던 테스트가 빨개진다 | 작업 전 senior-dev에 묶어 요청 |
| **8** | **오렌지 남용** | Lets는 `--point-2`(오렌지)를 "새로 생긴 것" 표시에만 아주 조금 쓴다. 이전 그라디언트 자리를 오렌지로 메우면 **킷을 벗어난다** | 화면당 `--point-2` 사용 **0~1개** |

---

## 9. 완료 판정 (킷 `적용-절차.md` §6 + 이 프로젝트)

- [ ] CSS 로드 순서가 `base → components → tokens → extras → project-tokens → styles.css`인가
- [ ] `frontend/src/styles/halo-*.css` 2개가 사라졌는가
- [ ] `styles.css`에 `--grad*` `--sh-acc` `--sh-hero` `--glass*` `--soft` `--radius*` `--dim` `color-mix(` 가 **0회**인가
- [ ] 새 CSS에 `#`, `rgb(`, 하드코딩 색·치수가 없는가 (예외: 카카오 브랜드 색 · `.tts-btn` 28px — 둘 다 주석으로 사유 명시)
- [ ] `components/ui/` 안에 CSS·`style={{}}`가 0줄인가
- [ ] 활성·선택·비활성이 전부 `aria-current`/`aria-selected`/`aria-pressed`/`disabled`인가
- [ ] 모든 `input`/`select`/`textarea`에 `.k-input`/`.k-select`/`.k-textarea`가 붙었는가
- [ ] 모든 `<table>`이 `.k-tablewrap` 안에 있는가
- [ ] 화면당 `.k-btn--primary`가 1개인가
- [ ] 다크(`data-theme='dark'`)에서 전 화면을 돌아봤는가
- [ ] 390px에서 가로 스크롤이 없는가
- [ ] `npm test` 통과 · `npm run build` 성공
- [ ] §6의 유지 클래스가 전부 살아 있는가

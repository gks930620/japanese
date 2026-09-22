import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { JpSentence } from "../components/JpSentence.jsx";
import { withJosa } from "../lib/josa.js";
import { GrammarBody } from "../components/GrammarBody.jsx";
import { QuizRunner } from "../components/QuizRunner.jsx";
import { TtsButton, TtsPlayAllButton, TtsRateChip } from "../components/TtsControls.jsx";
import { EditorLauncher } from "../components/EditorLauncher.jsx";
import { speechTextOf } from "../lib/tts.js";
import { BookmarkStar } from "../components/BookmarkStar.jsx";
import { MergeBanner } from "../components/MergeBanner.jsx";
import { InlineAlert } from "../components/InlineAlert.jsx";
import { ApiErrorCard, CoursePreparingCard, NotFoundCard, PreparingCard } from "../components/StateCards.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useUserData } from "../context/userDataStore.js";
import { isUnitCompleted, resolveStepIndex } from "../lib/progressView.js";
import { buildUnitQuizSet } from "../lib/quiz.js";
import { dismissLoginHint, isLoginHintDismissed } from "../lib/guestStore.js";
import { Alert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip } from "../components/ui/Chip.jsx";
import { Table, TableWrap } from "../components/ui/Table.jsx";
import { btnClass, cardClass } from "../components/ui/kitClass.js";

const STEP_NUMERALS = ["①", "②", "③", "④", "⑤"];
const LOGIN_HINT_AT = 3; // 완료 유닛 3개째의 정리 스텝에서 한 번 (설계/01 §6)

function grammarLabel(index, count) {
  if (count <= 1) return "문법";
  return `문법${STEP_NUMERALS[index] ?? index + 1}`;
}

/**
 * 자료실로 나가는 링크 — 웹·모바일 모두 새 탭 (설계/05 §11).
 * 유닛 학습에는 진도 저장이 없어 되돌아오면 첫 스텝으로 리셋되기 때문이다.
 */
function ExternalLink({ to, label, className, children }) {
  return (
    <a aria-label={`${label} (새 탭에서 열림)`} className={className} href={to} rel="noopener noreferrer" target="_blank">
      {children ?? label}
      <span aria-hidden="true" className="ext-mark">
        ↗
      </span>
    </a>
  );
}

function LoadingSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="k-flex step-bar">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="k-skeleton sk-pill" />
        ))}
      </div>
      <div className={cardClass()}>
        <div className="k-skeleton sk-line w40" />
        <div className="k-skeleton sk-line w70" />
        <div className="k-skeleton sk-line w70" />
        <div className="k-skeleton sk-line w40" />
      </div>
    </section>
  );
}

/* ── 스텝별 콘텐츠 ─────────────────────────────── */

function GrammarStep({ grammar, order, count, bookmark, onEdited, latin = false }) {
  return (
    <div className={cardClass()}>
      <GrammarBody
        caption={`문법 ${order + 1} / ${count}`}
        grammar={grammar}
        latin={latin}
        titleRight={
          latin ? null : (
          <>
            <BookmarkStar
              name={grammar.name}
              on={bookmark.isBookmarked("grammar", grammar.id)}
              onToggle={(next) => bookmark.toggleBookmark("grammar", grammar.id, next)}
            />
            <ExternalLink className="ref-link" label="자료실에서 보기" to={`/library/grammar/${grammar.id}`} />
            <EditorLauncher
              kind="grammar"
              target={grammar}
              title={`문법 고치기 — ${grammar.name}`}
              onSaved={onEdited}
            />
            </>
          )
        }
      />
    </div>
  );
}

function DialogStep({ dialog, onEdited, latin = false }) {
  const speakers = [...new Set(dialog.lines.map((line) => line.speaker))];
  const [playingLine, setPlayingLine] = useState(null);
  return (
    <div className={cardClass()}>
      {/* 영어에는 전체 재생·편집이 없다 — 캡션 줄이 .row-caption이 아니라 단독이다(§3-1) */}
      {latin ? (
        <div className="step-caption">회화</div>
      ) : (
        <div className="step-caption row-caption">
          회화
          <TtsPlayAllButton texts={dialog.lines.map((line) => speechTextOf(line))} onLineChange={setPlayingLine} />
          <EditorLauncher kind="dialog" target={dialog} title={`회화 고치기 — ${dialog.title}`} onSaved={onEdited} />
        </div>
      )}
      <h2 className="step-title">{dialog.title}</h2>
      <div className="dialog-list">
        {dialog.lines.map((line, i) => {
          const sameAsPrev = i > 0 && dialog.lines[i - 1].speaker === line.speaker;
          const speakerIndex = Math.min(speakers.indexOf(line.speaker), 2);
          return (
            <div key={i} className={`dialog-line${playingLine === i ? " playing" : ""}`}>
              {/* 같은 화자 연속이면 배지 생략(들여쓰기 유지) — 설계/05 §8.
                  배지에 CSS가 --font-jp를 직접 박아 두어 영어 화자 이름(Mina·Ben)의 첫 글자까지
                  일본어 자형으로 찍힌다 → latin으로 되돌린다(설계/05 §16-4) */}
              <span
                className={`speaker-badge sp-${speakerIndex}${latin ? " latin" : ""}${sameAsPrev ? " hide" : ""}`}
                title={sameAsPrev ? undefined : line.speaker}
              >
                {sameAsPrev ? "" : Array.from(line.speaker)[0]}
              </span>
              <JpSentence jp={line.jp} kana={line.kana} latin={latin} meaningKo={line.meaningKo} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 표현 스텝 (설계/05 §16-4) — 세로 1열 스택.
 * 한자 카드로 대신하지 않는다: 표현은 가로로 긴 덩어리라 큰 글자 배지 자리가 빈다.
 * 값이 없는 줄(발음·용법·예문)은 **줄째 만들지 않는다**(빈 블록 금지).
 */
function ExpressionStep({ expressions }) {
  return (
    <div className={cardClass()}>
      <div className="step-caption">표현</div>
      <h2 className="step-title">통째로 외워 쓰는 덩어리 {expressions.length}개</h2>
      <div className="expr-list">
        {expressions.map((expression) => {
          const pron = [expression.ipa, expression.koApprox].filter(Boolean).join(" · ");
          return (
            <div key={expression.id} className="expr-card">
              <span className="expr-text">{expression.text}</span>
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
        })}
      </div>
    </div>
  );
}

function KanjiStep({ kanjis, bookmark, onEdited }) {
  return (
    <div className="kanji-grid">
      {kanjis.map((kanji) => (
        <div key={kanji.id} className="kanji-card">
          <div className="kanji-head">
            {/* 큰 글자 자체가 자료실 한자 상세로 나가는 링크 (설계/05 §11, 인수 29) */}
            <ExternalLink className="kanji-glyph-link" label={`${kanji.letter} 자료실에서 보기`} to={`/library/kanji/${kanji.id}`}>
              <span className="kanji-glyph">{kanji.letter}</span>
            </ExternalLink>
            <span className="kanji-meaning">{kanji.meaningKo}</span>
            <BookmarkStar
              name={kanji.letter}
              on={bookmark.isBookmarked("kanji", kanji.id)}
              onToggle={(next) => bookmark.toggleBookmark("kanji", kanji.id, next)}
            />
            <EditorLauncher kind="kanji" target={kanji} title={`한자 고치기 — ${kanji.letter}`} onSaved={onEdited} />
          </div>
          {/* 음독·훈독 중 없는 것은 행 생략 (설계/05 §8) */}
          {kanji.onyomi != null && (
            <div className="kanji-read">
              <span className="label">음독</span>
              <span className="val">{kanji.onyomi}</span>
            </div>
          )}
          {kanji.kunyomi != null && (
            <div className="kanji-read">
              <span className="label">훈독</span>
              <span className="val">{kanji.kunyomi}</span>
            </div>
          )}
          <div className="kanji-words">
            {kanji.words.map((word, i) => (
              <div key={i} className="kanji-word">
                <div className="w">
                  {word.word}
                  <TtsButton label={word.word} text={speechTextOf(word)} />
                </div>
                {word.kana != null && <div className="r">{word.kana}</div>}
                <div className="m">{word.meaningKo}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VocabStep({ vocabularies, bookmark, onEdited, latin = false }) {
  // 열 전체가 비면 열째 감춘다(§7-1) — "─"만 늘어선 열은 정보가 아니라 잡음이다.
  // 일본어는 kana, 영어는 ipa·koApprox가 그 자리다.
  const hasReading = latin
    ? vocabularies.some((vocab) => vocab.ipa != null || vocab.koApprox != null)
    : vocabularies.some((vocab) => vocab.kana != null);
  const readingHeader = latin ? "발음" : "읽기";
  return (
    <>
      {/* 셀 안에는 ↗를 넣지 않는다 — 표는 조용해야 한다 (설계/05 §11) */}
      <p className="table-caption">단어를 누르면 자료실에서 열려요</p>
      <TableWrap>
        <Table className={`vocab-table${latin ? " latin" : ""}`}>
          <thead>
            <tr>
              <th>단어</th>
              {hasReading && <th>{readingHeader}</th>}
              <th>뜻</th>
              {!latin && <th aria-label="듣기" className="bm" />}
              {!latin && <th aria-label="보관함" className="bm" />}
              {!latin && <th aria-label="편집" className="bm" />}
            </tr>
          </thead>
          <tbody>
            {vocabularies.map((vocab) => {
              // ★의 대상 id는 자료실 표제어 대표 id(entryId)다 — 유닛과 자료실이 같은 항목을 가리켜야 한다(설계/04 §6-1)
              const entryId = vocab.entryId ?? vocab.id;
              return (
                <tr key={vocab.id}>
                  <td className="w">
                    {/* 어휘는 상세 화면이 없으므로 검색 상태로 연다 (인수 31) */}
                    <a
                      aria-label={`${vocab.word} 자료실에서 보기 (새 탭에서 열림)`}
                      className="vocab-word-link"
                      href={`${latin ? "/en" : ""}/library/vocabulary?q=${encodeURIComponent(vocab.word)}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {vocab.word}
                    </a>
                  </td>
                  {/* 가나뿐인 단어는 읽기 열 "─" (API 명세 §2). 영어는 IPA·한글 근사 2줄(§3-3) */}
                  {hasReading &&
                    (latin ? (
                      <td className="r">
                        {vocab.ipa == null && vocab.koApprox == null ? (
                          "─"
                        ) : (
                          <span className="vocab-pron">
                            {vocab.ipa}
                            {vocab.koApprox && <span className="ko">{vocab.koApprox}</span>}
                          </span>
                        )}
                      </td>
                    ) : (
                      <td className="r">{vocab.kana ?? "─"}</td>
                    ))}
                  <td>{vocab.meaningKo}</td>
                  {!latin && (
                    <td className="bm">
                      <TtsButton label={vocab.word} text={speechTextOf(vocab)} />
                    </td>
                  )}
                  {!latin && (
                    <td className="bm">
                      <BookmarkStar
                        name={vocab.word}
                        on={bookmark.isBookmarked("vocabulary", entryId)}
                        onToggle={(next) => bookmark.toggleBookmark("vocabulary", entryId, next)}
                      />
                    </td>
                  )}
                  {!latin && (
                    <td className="bm">
                      <EditorLauncher
                        kind="vocabulary"
                        target={vocab}
                        title={`어휘 고치기 — ${vocab.word}(${vocab.kana ?? ""})`}
                        onSaved={onEdited}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableWrap>
    </>
  );
}

/**
 * 부분 공개 코스 판정 (설계/04 §2-3-A · 08 C-29) — **"다음이 없다"는 "끝냈다"가 아니다.**
 * 유닛을 앞에서부터 채워 나가는 코스는 열린 마지막 유닛도 `nextUnitNo: null`이라 두 상태가 겹친다.
 * 가르는 유일한 근거는 응답의 `coursePlannedUnits`다 — 화면이 지어내지 않는다.
 * 언어와 무관한 일반 규칙이다(일본어 코스도 부분 공개할 수 있다).
 * `coursePlannedUnits`가 null이면 계획값 없음 = 지금 있는 유닛이 전부 → 동작이 한 줄도 바뀌지 않는다.
 */
function isMoreUnitsComing(data) {
  return data.coursePlannedUnits != null && data.totalUnits < data.coursePlannedUnits;
}

/** 지금 열린 데까지의 끝 — 완주 축하가 서던 자리에 중립 안내가 선다(설계/05 §8 "끝은 두 종류다") */
function isOpenEnd(data) {
  return data.nextUnitNo == null && isMoreUnitsComing(data);
}

/** 정리 스텝 — 요약 → 복습 → 완료 토글 → 완주 축하 / 열린 끝 안내 → (비로그인) 로그인 유도 (설계/05 §8) */
function SummaryStep({ data, completed, onToggleCompleted, toggleError, loginHint, onDismissHint, latin = false, loginFrom = "/" }) {
  // 마지막 유닛 → 코스 완료 분기 (인수 18). 단, 계획 유닛이 아직 다 열리지 않았으면 완주가 아니다(§2-3-A)
  const completedCourse = data.nextUnitNo == null && !isMoreUnitsComing(data);
  const openEnd = isOpenEnd(data); // 둘은 동시에 뜨지 않는다
  const nextCourse = data.nextCourse ?? null;

  return (
    <div className={cardClass()}>
      <div className="step-caption">정리</div>
      <h2 className="step-title">이번 유닛에서 배운 것</h2>
      <div className="summary-rows">
        <div className="summary-row">
          <span className="summary-label">문법</span>
          <div className="k-flex chip-row">
            {data.grammars.map((grammar) => (
              <span key={grammar.id} className={`k-chip chip-static ${latin ? "latin" : "jp"}`}>
                {grammar.name}
              </span>
            ))}
          </div>
        </div>
        {/* 표현은 길어서 칩으로 깔면 줄이 넘친다 — 개수만 적는다(§3-4) */}
        {latin && data.expressions?.length > 0 && (
          <div className="summary-row">
            <span className="summary-label">표현</span>
            <span>{data.expressions.length}개</span>
          </div>
        )}
        {!latin && data.kanjis.length > 0 && (
          <div className="summary-row">
            <span className="summary-label">한자</span>
            <span className="summary-kanji">{data.kanjis.map((kanji) => kanji.letter).join(" · ")}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="summary-label">어휘</span>
          <span>{data.vocabularies.length}개</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">회화</span>
          <span>{data.dialog.title}</span>
        </div>
      </div>

      {/* 복습 블록 — 설계/04 §2-3: 5의 배수 유닛에서만 값, 그 외 null (설계/05 §7 규격) */}
      {data.review != null && (
        <div className="review-block">
          <div className="review-caption">지금까지 배운 것</div>
          <div className="review-range">
            유닛 {data.review.fromUnitNo}~{data.review.toUnitNo} 문법
          </div>
          <div className="k-flex chip-row">
            {data.review.grammarNames.map((name, i) => (
              <span key={i} className={`k-chip chip-static ${latin ? "latin" : "jp"}`}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 완료 토글 — primary가 아니다(이 화면의 primary는 [다음 유닛]). 확인 없이 즉시 토글된다 */}
      <div className="k-flex done-toggle">
        <span className={`done-toggle-text ${completed ? "on" : "off"}`}>
          {completed ? "✓ 이 유닛을 마쳤어요" : "이 유닛은 완료로 표시되지 않았어요"}
        </span>
        <Button variant="secondary" onClick={() => onToggleCompleted(!completed)}>
          {completed ? "완료 취소" : "완료로 표시하기"}
        </Button>
      </div>
      {toggleError && (
        <p className="done-toggle-error" role="status">
          저장하지 못했어요. 잠시 후 다시 눌러 주세요.
        </p>
      )}

      {/* 완주 축하는 이 유닛이 아니라 코스에 대한 말이라 완료 토글보다 아래에 둔다 */}
      {completedCourse && (
        <Alert tone="ok">
          🎉 {data.courseTitle} 코스를 끝까지 봤어요!{" "}
          {nextCourse == null && "준비된 모든 코스를 완주했어요."}
          {/* 영어는 레벨 괄호 없이 코스명만 — 코스명이 곧 단계 이름이다(§3-4) */}
          {nextCourse?.status === "AVAILABLE" &&
            `다음 코스 ${withJosa(courseLabelOf(nextCourse, latin), "로/으로")} 바로 이어갈 수 있어요.`}
          {/* 앞 문장은 글자 그대로 유지한다 — EnUnitStudy·UnitStudyPage 테스트가 정규식으로 고정한다.
              실망("아직 없어요")이 아니라 **지금 할 수 있는 것**을 주는 것이 규칙이라(05 §12) 한 문장만 덧붙인다. */}
          {nextCourse?.status === "PREPARING" &&
            `다음 코스 ${withJosa(courseLabelOf(nextCourse, latin), "은/는")} 지금 준비하고 있어요. ` +
              "그동안은 자료실에서 지금까지 배운 것을 다시 볼 수 있어요."}
        </Alert>
      )}

      {/* 열린 데까지의 끝 — 축하가 서던 자리에 중립 톤으로 선다(tone 없음). 코스 상세의 notice와 같은 말이어야 한다 */}
      {openEnd && (
        // 코스 상세의 notice와 **같은 동사·같은 시제**("채우는 중이에요")를 일부러 재사용한다.
        // 이 결함의 본체가 "두 화면이 다른 말을 한다"였으므로, 새 문구를 지어내면 모순이 형태만 바꿔 살아남는다.
        // "배운 것"이라고만 쓰는 이유: 이 계약은 언어 중립이라 같은 문장이 일본어 코스에도 쓰인다 —
        // "표현과 어휘"라고 쓰면 일본어(한자·문법)에서 거짓이 된다. (기획 §5-5 · 06 §11-12 ④)
        <Alert className="more-units-coming">
          여기까지가 지금 열려 있는 마지막 유닛이에요. 다음 유닛은 앞 유닛부터 순서대로 채우는 중이에요 — 그동안은
          자료실에서 지금까지 배운 것을 다시 볼 수 있어요.
        </Alert>
      )}

      {/* 비로그인 로그인 유도 띠 — 완료 3개째의 정리 스텝에서 한 번만, 패널 맨 아래 (§4-2) */}
      {loginHint != null && (
        <Alert className="row-alert">
          <span>
            지금까지 {loginHint}개 유닛을 마쳤어요. 로그인하면 다른 기기에서도 이어서 볼 수 있어요.
          </span>
          <span className="k-flex notice-actions">
            <Link className={btnClass({ variant: "secondary", size: "sm" })} state={{ from: loginFrom }} to="/login">
              로그인
            </Link>
            <Button size="sm" variant="ghost" onClick={onDismissHint}>
              나중에
            </Button>
          </span>
        </Alert>
      )}
    </div>
  );
}

/** 문장에 넣을 코스 표기 — 영어는 코스명만, 일본어는 레벨 괄호까지(조사는 withJosa가 고른다) */
function courseLabelOf(course, latin) {
  return latin ? course.title : `${course.title}(${course.levelLabel})`;
}

/** 진행 방향 버튼 — 정리 스텝 unit-nav·확인 문제 카드가 같은 분기를 쓴다(다음 유닛 / 코스 완료) */
function AdvanceLink({ data, className, pathBase = "/courses", latin = false }) {
  if (data.nextUnitNo != null) {
    return (
      <Link className={className} to={`${pathBase}/${data.courseId}/units/${data.nextUnitNo}`}>
        다음 유닛 ›
      </Link>
    );
  }
  // 열린 데까지의 끝이면 **다음 코스보다 먼저** 판정한다 — 부분 공개 코스에서 다음 코스로 내보내면
  // "이 코스는 끝났다"고 말하는 것과 같다. 참인 행선지는 그 코스의 유닛 목록뿐이다(설계/05 §8)
  if (isOpenEnd(data)) {
    return (
      // 열린 끝에서 유일하게 참인 행선지는 **그 코스 안**이다 — 다음 코스로 내보내면 이 코스가
      // 끝났다고 말하는 셈이라 위 안내와 어긋난다(기획 §5-5).
      <Link className={className} to={`${pathBase}/${data.courseId}`}>
        유닛 목록으로 ›
      </Link>
    );
  }
  if (data.nextCourse?.status === "AVAILABLE") {
    return (
      <Link className={className} to={`${pathBase}/${data.nextCourse.id}`}>
        다음 코스: {data.nextCourse.title}
        {!latin && `(${data.nextCourse.levelLabel})`} 시작하기 ›
      </Link>
    );
  }
  return (
    <Link className={className} to={pathBase}>
      코스 목록으로 ›
    </Link>
  );
}

/** 유닛 확인 문제 스텝 (설계/05 §15-1) — 시작 → 문제 → 결과. 상태는 부모(UnitStudy)가 든다(Q22) */
function QuizStep({ data, quizSet, started, onStart, onRestart, onNext, visible }) {
  if (quizSet.questions.length === 0) {
    // 재료 극단 부족 — 결핍을 사과하지 않는다(05 §12)
    return visible ? (
      <div className={cardClass({ className: "quiz-card" })}>
        <div className="step-caption">확인 문제</div>
        <p>이 유닛에서는 아직 문제를 만들 수 없어요</p>
        <div className="k-flex quiz-result-actions">
          <Button variant="primary" onClick={onNext}>
            다음 ›
          </Button>
        </div>
      </div>
    ) : null;
  }

  if (!started) {
    return visible ? (
      <div className={cardClass({ className: "quiz-card" })}>
        <div className="step-caption">확인 문제</div>
        <h2 className="step-title">
          이번 유닛에서 배운 문법 {data.grammars.length}개
          {(data.kanjis?.length ?? 0) > 0 ? ` · 한자 ${data.kanjis.length}자` : ""}
          {(data.expressions?.length ?? 0) > 0 ? ` · 표현 ${data.expressions.length}개` : ""} · 어휘{" "}
          {data.vocabularies.length}개에서 {quizSet.questions.length}문제
        </h2>
        <div className="k-flex quiz-result-actions">
          <Button variant="primary" onClick={onStart}>
            문제 풀기
          </Button>
          {/* 문제를 풀기 싫은 사용자를 가두지 않는다 — 기존 진행 버튼이 카드 안으로 이사한 것 */}
          <Button variant="ghost" onClick={onNext}>
            다음 ›
          </Button>
        </div>
      </div>
    ) : null;
  }

  // 시작한 뒤에는 항상 마운트 유지 — 다른 스텝에 다녀와도 진행이 그대로다(Q22)
  return (
    <div hidden={!visible}>
      <QuizRunner
        key={onRestart.nonce}
        footerActions={<Button variant="primary" onClick={onNext}>
            다음 ›
          </Button>}
        labelChoices
        newTabLinks
        questions={quizSet.questions}
        onRestart={onRestart}
      />
    </div>
  );
}

/* ── 유닛 학습 화면 (설계/05 §7 + §8) ── */

export function UnitStudyPage({ lang = "ja" }) {
  const { courseId, unitNo } = useParams();
  // 유닛(주소)이 바뀌면 key로 리마운트 → 스텝 복원·완료 전송이 유닛마다 한 번씩만 일어난다
  return <UnitStudy key={`${lang}/${courseId}/${unitNo}`} courseId={courseId} lang={lang} unitNo={unitNo} />;
}

/**
 * 영어 과정은 같은 화면의 한 자리를 갈아 끼운다(설계/05 §16):
 * 한자 스텝 → 표현 스텝, 확인 문제·음성·편집·★ 없음, 자형은 본문 폰트(latin).
 * 스텝 진행·진도 저장·완료 전송은 과정과 무관하게 같은 코드를 쓴다.
 */
function UnitStudy({ courseId, unitNo, lang = "ja" }) {
  const en = lang === "en";
  const pathBase = en ? "/en/courses" : "/courses";
  const apiBase = en ? "/api/en/courses" : "/api/courses";
  const libraryBase = en ? "/en/library" : "/library";
  const { data, loading, error, reload } = useApiQuery(`${apiBase}/${courseId}/units/${unitNo}`);
  const userData = useUserData();
  const { progress, isAuthenticated, ready } = userData;
  const [userStep, setUserStep] = useState(null); // null = 아직 사용자가 스텝을 고르지 않음
  const [toggleError, setToggleError] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const stepBarRef = useRef(null);
  const completionSent = useRef(false);
  const observedKey = useRef(null); // 처음 관찰한 스텝(복원 진입)은 "도달"이 아니다

  const steps = useMemo(() => {
    if (!data) return [];
    const grammarSteps = data.grammars.map((grammar, i) => ({
      key: `grammar-${i}`,
      label: grammarLabel(i, data.grammars.length),
      type: "grammar",
      grammar,
      order: i,
    }));
    // 입문 코스는 한자가 0자다 — 칩도 빈 카드도 만들지 않는다(없는 것을 사과하지 않는다, 설계/06 §6).
    // 영어는 그 자리가 표현이고, 표현 0개도 같은 규칙으로 스텝을 만들지 않는다(영어 §3 상태별 UI).
    const middleSteps = en
      ? (data.expressions?.length ?? 0) > 0
        ? [{ key: "expression", label: "표현", type: "expression" }]
        : []
      : (data.kanjis?.length ?? 0) > 0
        ? [{ key: "kanji", label: "한자", type: "kanji" }]
        : [];
    // 영어에는 확인 문제가 없다(설계/05 §16-1 · 설계/06 §11-9 · 08 C-14):
    // 지금 켜면 일본어 조판·ja 음성·빈 근거 상자를 영어 학습자에게 제품으로 보여주게 된다
    const quizSteps = en ? [] : [{ key: "quiz", label: "확인 문제", type: "quiz" }];
    return [
      ...grammarSteps,
      { key: "dialog", label: "회화", type: "dialog" },
      ...middleSteps,
      { key: "vocab", label: "어휘", type: "vocab" },
      // 확인 문제는 정리 **앞** — [다음 ›]만 눌러도 만난다. 정리는 언제나 마지막 스텝이고 [다음 유닛]은 거기에만(2026-09 결정 D-3 · 설계/09 §2-1)
      ...quizSteps,
      { key: "summary", label: "정리", type: "summary" },
    ];
  }, [data, en]);


  const completed = data ? isUnitCompleted(progress.completedUnits, data.courseId, data.unitNo) : false;

  // 저장된 스텝 복원 — 없는 키(콘텐츠 개편)면 0이 되어 첫 스텝으로 열린다(설계/04 §6-2).
  // **완료한 유닛은 복원하지 않고 1번 스텝으로 연다**(AC-P-10) — 마지막 위치가 summary인 채로
  // 복원하면 다시 열 때마다 정리 스텝만 뜨고, 두 안내 띠(이어보기·완료)도 겹친다(설계/05 §8).
  // 사용자가 스텝을 한 번이라도 누르면(userStep != null) 진도가 늦게 도착해도 덮어쓰지 않는다.
  const restoredIndex = useMemo(() => {
    const last = progress.lastPosition;
    if (!data || !last || completed) return 0;
    if (last.courseId !== data.courseId || last.unitNo !== data.unitNo) return 0;
    return resolveStepIndex(steps.map((step) => step.key), last.stepKey);
  }, [completed, data, progress.lastPosition, steps]);

  const current = steps.length > 0 ? Math.min(userStep ?? restoredIndex, steps.length - 1) : 0;
  const currentKey = steps[current]?.key;

  // 편집 저장 결과 — 응답이 진실이다(A9). 유닛 응답을 다시 받지 않고 그 항목만 갈아끼운다
  const [edits, setEdits] = useState({});
  const applyEdit = (kind) => (saved) =>
    setEdits((prev) => ({ ...prev, [`${kind}-${saved.id}`]: saved }));
  const withEdit = (kind, item) => {
    const saved = edits[`${kind}-${item.id}`];
    return saved ? { ...item, ...saved } : item;
  };

  // 오답 풀 — 유닛 문법은 2~3개뿐이라 유닛 안에서는 보기 4개를 못 채운다(설계/09 §1-3).
  // **정답과 같은 레벨에서 먼저 채운다**(감사 높음 2): 레벨 필터 없이 첫 페이지를 가져오면
  // 학습 순서 정렬이라 낮은 레벨만 담기고, N1 유닛의 보기가 레벨만 봐도 풀린다.
  // 같은 레벨로 보기 4개를 못 채울 때에 한해 필터를 풀어 넓힌다(조용히 낮은 레벨로 채우지 않는다).
  // 레벨은 유닛 응답의 levelCode다 — 코스 목록을 따로 부르지 않는다(호출 한 번 계약).
  //
  // 조회는 공용 훅(캐시)에 맡긴다 — 확인 문제 스텝을 **처음 열 때** 주소가 생기고, 그 뒤로는 유지한다.
  // 스텝을 옮겼다고 주소를 거두면 풀이 사라져 풀던 문항이 새로 만들어진다.
  const [quizOpened, setQuizOpened] = useState(false);
  useEffect(() => {
    if (!en && currentKey === "quiz") setQuizOpened(true);
  }, [en, currentKey]);

  const poolLevel = data?.levelCode ?? null;
  const poolBase = en ? "/api/en/library/grammar" : "/api/library/grammar";
  const { data: sameLevelPage } = useApiQuery(
    quizOpened ? `${poolBase}?${poolLevel ? `level=${encodeURIComponent(poolLevel)}&` : ""}size=100` : null,
  );
  const sameLevelPool = sameLevelPage?.content ?? [];
  // 유닛 재료에서 정답 자신을 뺀 나머지 + 풀 ≥ 3이어야 보기 4개가 된다
  const poolNeeded = Math.max(0, 3 - Math.max(0, (data?.grammars?.length ?? 0) - 1));
  const { data: widerPage } = useApiQuery(
    sameLevelPage && poolLevel && sameLevelPool.length < poolNeeded ? `${poolBase}?size=100` : null,
  );
  // 풀을 못 받아도(에러) 유닛 재료만으로 만들 수 있는 문제는 낸다 — 빈 풀은 조용한 실패다
  const seenInPool = new Set(sameLevelPool.map((item) => item.id));
  const grammarPool = [...sameLevelPool, ...(widerPage?.content ?? []).filter((item) => !seenInPool.has(item.id))];
  // 재검증으로 같은 내용이 다시 와도 문항을 새로 만들지 않는다 — 구성이 바뀔 때만 다시 만든다
  const grammarPoolKey = grammarPool.map((item) => item.id).join(",");

  // 확인 문제 재료 — 문항의 자료실 링크는 유형에서 파생한다(결과 화면 Q17)
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizNonce, setQuizNonce] = useState(0);
  const quizSet = useMemo(() => {
    if (!data || en) return { questions: [] }; // 영어 유닛에는 확인 문제가 없다(08 C-14)
    const set = buildUnitQuizSet(
      {
        grammars: data.grammars,
        kanjis: data.kanjis ?? [],
        // 영어 유닛은 한자 자리에 표현이 온다 — 없는 재료의 계획은 자연히 건너뛴다(lib/quiz.js)
        expressions: data.expressions ?? [],
        vocabularies: data.vocabularies,
      },
      { rng: Math.random, distractorPool: { grammars: grammarPool ?? [] } },
    );
    return {
      questions: set.questions.map((q) => ({
        ...q,
        libraryHref: q.type.startsWith("KANJI_")
          ? `/library/kanji/${q.evidence.id}`
          : q.type.startsWith("EXPRESSION_")
            ? `/en/library/expressions/${q.evidence.id}`
            : q.type.startsWith("GRAMMAR_")
              ? `${libraryBase}/grammar/${q.evidence.id}`
              : `${libraryBase}/vocabulary?q=${encodeURIComponent(q.evidence.word)}`,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, quizNonce, grammarPoolKey, libraryBase, en]);
  const restartQuiz = useMemo(() => {
    const fn = () => setQuizNonce((n) => n + 1);
    fn.nonce = quizNonce;
    return fn;
  }, [quizNonce]);

  // 스텝 전환 시 스크롤 리셋 + 모바일 스텝 바에서 현재 칩이 보이게
  useEffect(() => {
    window.scrollTo({ top: 0 });
    stepBarRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  // 마지막 위치 자동 저장 — 실패해도 아무것도 알리지 않는다(AC-P-25·26).
  // 진도가 도착하기(ready) 전에는 저장하지 않는다: 복원 결정 전에 쓰면 저장된 위치를
  // 1번 스텝으로 덮어써 이어보기가 사라진다.
  useEffect(() => {
    if (!data || !currentKey || !ready) return;
    userData.saveLastPosition(data.courseId, data.unitNo, currentKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.courseId, data?.unitNo, currentKey, ready]);

  // 완료 저장 — 정리 스텝에 **도달하는 전환** 시점 1회.
  // 복원으로 정리 스텝이 열린 것은 "도달"이 아니다(AC-P-04·05) — 그것까지 완료로 치면
  // [완료 취소]한 유닛이 다시 열 때마다 되살아난다. 그래서 **처음 관찰한 스텝은 전환으로 세지 않는다.**
  useEffect(() => {
    if (!data || !currentKey || !ready) return;
    const previousKey = observedKey.current;
    observedKey.current = currentKey;
    if (previousKey === null) return;
    if (currentKey !== "summary" || completionSent.current) return;
    completionSent.current = true;
    if (!isUnitCompleted(progress.completedUnits, data.courseId, data.unitNo)) {
      userData.setUnitCompleted(data.courseId, data.unitNo, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, data?.courseId, data?.unitNo, ready]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    // 준비중 코스의 유닛 = 404 + COURSE_PREPARING → 준비중 안내 (API 명세 §3-3)
    if (error.errorCode === "COURSE_PREPARING") {
      return en ? (
        <PreparingCard listLabel="영어 코스 목록으로" listTo="/en/courses" openTo={null} />
      ) : (
        <CoursePreparingCard courseId={courseId} />
      );
    }
    // 400 = 비숫자 주소(/courses/2/units/xyz) — 재시도로 회복 불가, "없는 주소"로 취급 (코드리뷰 반영)
    if (error.status === 404 || error.status === 400) {
      return en ? (
        <NotFoundCard label="유닛 목록으로" to={`/en/courses/${courseId}`} />
      ) : (
        <NotFoundCard />
      );
    }
    return <ApiErrorCard onRetry={reload} />;
  }

  const step = steps[current];
  const isSummary = step.type === "summary";
  const isQuiz = step.type === "quiz";
  const showResumeBand = userStep === null && restoredIndex > 0 && !completed;
  const showDoneBand = userStep === null && completed;
  const doneCount = progress.completedUnits.length;
  const showLoginHint =
    !isAuthenticated && isSummary && !hintDismissed && !isLoginHintDismissed() && doneCount === LOGIN_HINT_AT;

  const handleToggleCompleted = async (next) => {
    setToggleError(false);
    const result = await userData.setUnitCompleted(data.courseId, data.unitNo, next);
    if (!result.ok) setToggleError(true);
  };

  return (
    <section>
      <MergeBanner />
      <InlineAlert />

      <div className="k-flex unit-topbar">
        <Link className={btnClass({ variant: "ghost", size: "sm" })} to={`${pathBase}/${data.courseId}`}>
          ‹ 유닛 목록
        </Link>
        <span className="unit-topbar-title">
          유닛 {data.unitNo} · {data.title}
        </span>
        {/* 영어에는 속도 토글이 없다 — 음성 자체가 없다(§0-2) */}
        {!en && <TtsRateChip />}
      </div>

      {/* 진입 안내 줄 — 한 번에 하나만 뜬다 (§2-4) */}
      {showResumeBand && (
        <Alert className="row-alert">
          <span>
            보던 곳부터 이어서 보고 있어요 ({current + 1}/{steps.length})
          </span>
          <span className="k-flex notice-actions">
            <Button size="sm" variant="ghost" onClick={() => setUserStep(0)}>
              처음부터 보기
            </Button>
          </span>
        </Alert>
      )}
      {showDoneBand && (
        <Alert className="row-alert" tone="ok">
          <span>이 유닛은 마쳤어요</span>
          <span className="k-flex notice-actions">
            <Button size="sm" variant="ghost" onClick={() => handleToggleCompleted(false)}>
              완료 취소
            </Button>
          </span>
        </Alert>
      )}

      {/* 스텝 진행 표시줄 — 모든 칩 클릭 가능 (인수 16). 현재 스텝은 aria-pressed 로만 표시한다 */}
      <div className="k-flex step-bar" ref={stepBarRef}>
        {steps.map((s, i) => (
          <Chip key={s.key} on={i === current} onClick={() => setUserStep(i)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {step.type === "grammar" && (
        <GrammarStep
          bookmark={userData}
          count={data.grammars.length}
          grammar={withEdit("grammar", step.grammar)}
          latin={en}
          order={step.order}
          onEdited={applyEdit("grammar")}
        />
      )}
      {step.type === "dialog" && (
        <DialogStep dialog={withEdit("dialog", data.dialog)} latin={en} onEdited={applyEdit("dialog")} />
      )}
      {step.type === "expression" && <ExpressionStep expressions={data.expressions} />}
      {step.type === "kanji" && (
        <KanjiStep
          bookmark={userData}
          kanjis={data.kanjis.map((k) => withEdit("kanji", k))}
          onEdited={applyEdit("kanji")}
        />
      )}
      {step.type === "vocab" && (
        <VocabStep
          bookmark={userData}
          latin={en}
          vocabularies={data.vocabularies.map((v) => withEdit("vocabulary", v))}
          onEdited={applyEdit("vocabulary")}
        />
      )}
      {data && quizSet && (
        <QuizStep onNext={() => setUserStep(steps.length - 1)}
          data={data}
          quizSet={quizSet}
          started={quizStarted}
          visible={step.type === "quiz"}
          onRestart={restartQuiz}
          onStart={() => setQuizStarted(true)}
        />
      )}
      {step.type === "summary" && (
        <SummaryStep
          completed={completed}
          data={data}
          latin={en}
          loginFrom={`${pathBase}/${data.courseId}/units/${data.unitNo}`}
          loginHint={showLoginHint ? doneCount : null}
          toggleError={toggleError}
          onDismissHint={() => {
            dismissLoginHint();
            setHintDismissed(true);
          }}
          onToggleCompleted={handleToggleCompleted}
        />
      )}

      <div className="k-flex unit-nav">
        <Button disabled={current === 0} variant="secondary" onClick={() => setUserStep(Math.max(0, current - 1))}>
          ‹ 이전
        </Button>
        <span className="unit-nav-pos">
          스텝 {current + 1} / {steps.length}
        </span>
        {!isSummary && !isQuiz && (
          <Button variant="primary" onClick={() => setUserStep(Math.min(steps.length - 1, current + 1))}>
            다음 ›
          </Button>
        )}
        {/* 코스 완료 — nextCourse 분기 (설계/04 §2-3): AVAILABLE이면 다음 코스 상세로, 그 외는 코스 목록으로 */}
        {isSummary && <AdvanceLink className={btnClass({ variant: "primary" })} data={data} latin={en} pathBase={pathBase} />}
      </div>
    </section>
  );
}

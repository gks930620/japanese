import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { callPublicApi } from "../lib/http.js";
import { parseLibraryParams, buildLibraryApiUrl, buildLibrarySearch } from "../lib/libraryQuery.js";
import { partOfSpeechLabel } from "../constants/partOfSpeech.js";
import { buildLibraryQuizSet } from "../lib/quiz.js";
import { toQuizVocabularies } from "../lib/quizMaterial.js";
import { QuizRunner } from "../components/QuizRunner.jsx";
import { ApiErrorCard, NotFoundCard } from "../components/StateCards.jsx";
import { RefTopbar } from "../components/library/LibraryShell.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip } from "../components/ui/Chip.jsx";
import { btnClass, cardClass } from "../components/ui/kitClass.js";

const TYPE_LABEL = { kanji: "한자", grammar: "문법", vocabulary: "어휘" };
/** 자료실 유형 — 목록 라우트가 열거하는 3종 그대로. 그 밖은 주소만 봐도 없는 것이다 */
const TYPES = Object.keys(TYPE_LABEL);
const TYPE_UNIT = { kanji: "자", grammar: "개", vocabulary: "개" };
// 출제 재료를 한 번에 가져오는 양 — 자료실 API의 size 상한이 100이다(설계/04 §3-1).
const RANGE_SIZE = 100;

/**
 * 뽑아도 되는 창의 개수 — 마지막 창이 4건 미만이면 그 창은 후보에서 뺀다(설계/09 §2-3 — A-H3).
 * 창 크기는 RANGE_SIZE 고정이라 마지막 창의 크기는 집계에서 바로 계산된다.
 */
function pickablePages(page) {
  const total = page.totalPages ?? 1;
  const lastWindow = (page.totalElements ?? 0) - (total - 1) * RANGE_SIZE;
  return lastWindow >= 4 ? total : Math.max(1, total - 1);
}

function libraryHrefOf(type, question) {
  if (type === "kanji") return `/library/kanji/${question.evidence.id}`;
  if (type === "grammar") return `/library/grammar/${question.evidence.id}`;
  return `/library/vocabulary?q=${encodeURIComponent(question.evidence.word)}`;
}

/**
 * 자료실 퀴즈 (설계/09 §2-2·§2-3) — 시작 → 문제 → 결과가 한 주소의 상태 전환.
 * 출제 범위 = 들어온 쿼리스트링(q·level·pos)이고 유형은 탭(type)이 정한다.
 */
export function LibraryQuizPage() {
  const { type } = useParams();
  const { search } = useLocation();
  const params = useMemo(() => parseLibraryParams(search), [search]);
  const backSearch = buildLibrarySearch(params);
  const backTo = `/library/${type}${backSearch}`;

  // 되돌릴 수 없는 실패에 [다시 시도]를 두지 않는다(08 C-12 ④) — 없는 유형은 통신 실패가 아니다
  const unknownType = !TYPES.includes(type);
  const [page, setPage] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [count, setCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (unknownType) return undefined; // 서버를 부르지 않는다
    let cancelled = false;
    // 어휘 병합 규칙까지 자료실 목록 API가 이미 처리한다 — 같은 데이터로 출제한다
    callPublicApi(buildLibraryApiUrl(`/api/library/${type}`, { ...params, page: 1 }, RANGE_SIZE))
      .then(async (body) => {
        if (cancelled) return;
        const first = body?.data ?? null;
        // 조건에 맞는 항목이 한 창보다 많으면 무작위 창에서 뽑는다 —
        // 늘 앞쪽 100개만 쓰면 문장이 말하는 모집단(전체)과 실제 출제 범위가 어긋난다(QA 중간 4).
        // 다만 **꼬리 창은 뽑지 않는다**(A-H3): 102건이면 마지막 창이 2건이라 그 창을 뽑는 순간
        // 보기 4개를 못 만들어 "문제를 낼 수 없어요"가 뜬다 — 범위는 충분한데 운으로 갈린다.
        if (first && first.totalPages > 1) {
          const pick = Math.floor(Math.random() * pickablePages(first));
          if (pick > 0) {
            const other = await callPublicApi(
              buildLibraryApiUrl(`/api/library/${type}`, { ...params, page: pick + 1 }, RANGE_SIZE),
            );
            // 창이 그래도 4개 미만이면(집계와 실제가 어긋난 경우) 첫 창으로 물러선다
            if (!cancelled && (other?.data?.content?.length ?? 0) >= 4) {
              setPage({ ...other.data, totalElements: first.totalElements });
              setLoadError(false);
              return;
            }
          }
        }
        setPage(first);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, search, attempt, unknownType]);

  const quizSet = useMemo(() => {
    if (!page || !started) return { questions: [] };
    const items = type === "vocabulary" ? toQuizVocabularies(page.content ?? []) : (page.content ?? []);
    const set = buildLibraryQuizSet({ type, items, count, rng: Math.random });
    return {
      questions: set.questions.map((q) => ({ ...q, libraryHref: libraryHrefOf(type, q) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, started, count, type, nonce]);

  const typeLabel = TYPE_LABEL[type] ?? type;
  const caption = `자료실 · ${typeLabel} 퀴즈`;

  const rangeSentence = () => {
    const bits = [];
    if (params.levels.length) bits.push(params.levels.join("·"));
    if (params.pos.length) bits.push(params.pos.map(partOfSpeechLabel).join("·"));
    if (params.q) bits.push(`'${params.q}'`);
    const prefix = bits.length ? `${bits.join(" · ")} ` : "";
    return `${prefix}${typeLabel} ${page.totalElements}${TYPE_UNIT[type]} 중에서 출제합니다`;
  };

  if (unknownType) {
    return (
      <section>
        <NotFoundCard
          description="자료실 퀴즈는 한자·문법·어휘에서만 열려요"
          label="자료실로"
          to="/library/kanji"
        />
      </section>
    );
  }

  return (
    <section>
      <RefTopbar backTo={backTo} caption={caption} />

      {loadError && <ApiErrorCard onRetry={() => setAttempt((n) => n + 1)} />}

      {!loadError && !page && (
        <div aria-hidden="true" className={cardClass()}>
          <div className="k-skeleton sk-line w40" />
          <div className="k-skeleton sk-line w70" />
          <div className="k-skeleton sk-line w40" />
        </div>
      )}

      {/* "낼 수 없어요"는 **범위 자체가 4개 미만**일 때만 — 창의 길이로 판정하지 않는다(A-H3) */}
      {page && (page.totalElements ?? 0) < 4 && (
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">{caption}</div>
          <p>이 조건으로는 문제를 낼 수 없어요(4개 이상 필요)</p>
          <div className="k-flex quiz-result-actions">
            <Link className={btnClass({ variant: "primary" })} to={backTo}>
              자료실로 돌아가기
            </Link>
          </div>
        </div>
      )}

      {page && (page.content?.length ?? 0) >= 4 && !started && (
        <div className={cardClass({ className: "quiz-card" })}>
          <div className="step-caption">{caption}</div>
          <h2 className="step-title">{rangeSentence()}</h2>
          {/* 문항 수 선택 — 자료실 진입만 (Q20). 선택 상태는 aria-pressed 로만 표시한다 */}
          <div className="k-flex chip-row">
            <Chip on={count === 10} onClick={() => setCount(10)}>
              10문제
            </Chip>
            <Chip on={count === 20} onClick={() => setCount(20)}>
              20문제
            </Chip>
          </div>
          <div className="k-flex quiz-result-actions">
            <Button variant="primary" onClick={() => setStarted(true)}>
              문제 풀기
            </Button>
          </div>
        </div>
      )}

      {page && started && quizSet.questions.length > 0 && (
        <QuizRunner
          key={nonce}
          footerActions={
            <Link className={btnClass({ variant: "primary" })} to={backTo}>
              자료실로 돌아가기
            </Link>
          }
          labelChoices
          newTabLinks
          questions={quizSet.questions}
          onRestart={() => setNonce((n) => n + 1)}
        />
      )}
    </section>
  );
}

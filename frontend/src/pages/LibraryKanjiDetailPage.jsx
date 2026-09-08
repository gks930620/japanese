import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ApiErrorCard, NotFoundCard } from "../components/StateCards.jsx";
import { LevelBadge, RefTopbar, WhereLearn } from "../components/library/LibraryShell.jsx";
import { ItemStar } from "../components/library/ListItems.jsx";
import { TtsButton, TtsRateChip } from "../components/TtsControls.jsx";
import { EditorLauncher } from "../components/EditorLauncher.jsx";
import { speechTextOf } from "../lib/tts.js";
import { useApiQuery } from "../hooks/useApiQuery.js";

function LoadingSkeleton() {
  return (
    <div aria-hidden="true" className="panel padded">
      <div className="skeleton sk-hero" />
      <div className="skeleton sk-line w40" />
      <div className="skeleton sk-line w70" />
      <div className="skeleton sk-line w70" />
    </div>
  );
}

// 한자 상세 (설계/05 §7)
export function LibraryKanjiDetailPage() {
  const { kanjiId } = useParams();
  const { search } = useLocation();
  const { data: fetched, loading, error, reload } = useApiQuery(`/api/library/kanji/${kanjiId}`);
  // 편집 저장 결과가 있으면 그것이 화면의 진실이다(A9)
  const [edited, setEdited] = useState(null);
  const data = edited && fetched && edited.id === fetched.id ? edited : fetched;
  const backTo = `/library/kanji${search}`;

  return (
    <section>
      <RefTopbar backTo={backTo} caption="자료실 · 한자" />
      <TtsRateChip />

      {loading && <LoadingSkeleton />}

      {error && (error.status === 404 || error.status === 400) && (
        <NotFoundCard
          description="주소가 바뀌었거나 없는 한자·문법이에요"
          label="자료실로"
          title="찾을 수 없는 항목이에요"
          to="/library/kanji"
        />
      )}
      {error && error.status !== 404 && error.status !== 400 && <ApiErrorCard onRetry={reload} />}

      {data && (
        <>
          <div className="panel padded kanji-detail">
            <div className="kanji-detail-head">
              <span aria-hidden="true" className="kanji-hero">
                {data.letter}
              </span>
              <div className="kanji-detail-title">
                <h1>{data.meaningKo}</h1>
                <LevelBadge level={data.level} />
                <ItemStar id={data.id} name={data.letter} type="kanji" />
                <EditorLauncher
                  kind="kanji"
                  target={data}
                  title={`한자 고치기 — ${data.letter}`}
                  onSaved={(saved) => setEdited({ ...data, ...saved })}
                />
              </div>
            </div>

            {/* 읽기 — kv-row 나열. 향후 획수·부수가 붙어도 행 추가로 끝난다 (§0-2 미결 6) */}
            <div className="kanji-detail-reads">
              {data.onyomi != null && (
                <div className="kv-row">
                  <span className="kv-label">음독</span>
                  <span className="kv-value jp">{data.onyomi}</span>
                </div>
              )}
              {data.kunyomi != null && (
                <div className="kv-row">
                  <span className="kv-label">훈독</span>
                  <span className="kv-value jp">{data.kunyomi}</span>
                </div>
              )}
            </div>

            {data.words?.length > 0 && (
              <div className="kanji-detail-words">
                <div className="step-caption">예시 단어</div>
                <div className="kanji-words">
                  {data.words.map((word, i) => (
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
            )}
          </div>

          <WhereLearn entries={[data.learnedIn]} />
        </>
      )}
    </section>
  );
}

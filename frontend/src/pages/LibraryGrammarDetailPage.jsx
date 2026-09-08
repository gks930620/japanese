import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { GrammarBody } from "../components/GrammarBody.jsx";
import { ApiErrorCard, NotFoundCard } from "../components/StateCards.jsx";
import { LevelBadge, RefTopbar, WhereLearn } from "../components/library/LibraryShell.jsx";
import { ItemStar } from "../components/library/ListItems.jsx";
import { TtsRateChip } from "../components/TtsControls.jsx";
import { EditorLauncher } from "../components/EditorLauncher.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { cardClass } from "../components/ui/kitClass.js";

function LoadingSkeleton() {
  return (
    <div aria-hidden="true" className={cardClass()}>
      <div className="k-skeleton sk-line w40" />
      <div className="k-skeleton sk-line w70" />
      <div className="k-skeleton sk-line w70" />
      <div className="k-skeleton sk-row" />
    </div>
  );
}

// 문법 상세 (설계/05 §7-1) — 본문은 유닛 학습과 같은 GrammarBody를 쓴다
export function LibraryGrammarDetailPage({ lang = "ja" }) {
  const en = lang === "en";
  const base = en ? "/en/library/grammar" : "/library/grammar";
  const { grammarId } = useParams();
  const { search } = useLocation();
  const {
    data: fetched,
    loading,
    error,
    reload,
  } = useApiQuery(`${en ? "/api/en" : "/api"}/library/grammar/${grammarId}`);
  const [edited, setEdited] = useState(null);
  const data = edited && fetched && edited.id === fetched.id ? edited : fetched;

  return (
    <section>
      <RefTopbar backTo={`${base}${search}`} caption={en ? "영어 자료실 · 문법" : "자료실 · 문법"} />
      {/* 영어에는 음성이 없다(§0-2) */}
      {!en && <TtsRateChip />}

      {loading && <LoadingSkeleton />}

      {error && (error.status === 404 || error.status === 400) && (
        <NotFoundCard
          description={en ? "주소가 바뀌었거나 없는 문법이에요" : "주소가 바뀌었거나 없는 한자·문법이에요"}
          label="자료실로"
          title="찾을 수 없는 항목이에요"
          to={base}
        />
      )}
      {error && error.status !== 404 && error.status !== 400 && <ApiErrorCard onRetry={reload} />}

      {data && (
        <>
          <div className={cardClass()}>
            <GrammarBody
              grammar={data}
              latin={en}
              titleRight={
                <>
                  {!en && <ItemStar id={data.id} name={data.name} type="grammar" />}
                  {!en && (
                    <EditorLauncher
                      kind="grammar"
                      target={data}
                      title={`문법 고치기 — ${data.name}`}
                      onSaved={(saved) => setEdited({ ...data, ...saved })}
                    />
                  )}
                  {data.rules?.length > 0 && <span className="k-badge">활용표</span>}
                  <LevelBadge level={data.level} />
                </>
              }
            />
          </div>
          <WhereLearn entries={[data.learnedIn]} lang={lang} />
        </>
      )}
    </section>
  );
}

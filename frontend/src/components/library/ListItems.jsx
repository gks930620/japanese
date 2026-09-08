import { useState } from "react";
import { levelText } from "../../lib/libraryQuery.js";
import { Link } from "react-router-dom";
import { BookmarkStar } from "../BookmarkStar.jsx";
import { TtsButton } from "../TtsControls.jsx";
import { EditorLauncher } from "../EditorLauncher.jsx";
import { speechTextOf } from "../../lib/tts.js";
import { LevelBadge } from "./LibraryShell.jsx";
import { useUserData } from "../../context/userDataStore.js";
import { partOfSpeechLabel } from "../../constants/partOfSpeech.js";
import { toggleValue } from "../../lib/libraryQuery.js";

/**
 * 자료실 목록의 항목 렌더러 — **자료실과 보관함이 공유한다**(설계/05 §7-1).
 * 응답 DTO가 같으므로(설계/04 §6-4) 목록 컴포넌트를 두 벌 만들지 않는다.
 */

/** ★ — 기본 동작은 담기/빼기 토글. 보관함은 onToggle로 되돌리기 자리표시자를 끼워 넣는다 */
export function ItemStar({ type, id, name, onToggle }) {
  const { isBookmarked, toggleBookmark } = useUserData();
  const on = isBookmarked(type, id);
  return (
    <BookmarkStar
      name={name}
      on={on}
      onToggle={(next) => (onToggle ? onToggle(next, { id, name }) : toggleBookmark(type, id, next))}
    />
  );
}

export function KanjiTile({ kanji, to, onStar }) {
  return (
    <Link className="kanji-tile" to={to}>
      <LevelBadge level={kanji.level} />
      <ItemStar id={kanji.id} name={kanji.letter} onToggle={onStar} type="kanji" />
      <span className="tile-glyph">{kanji.letter}</span>
      <span className="tile-meaning">{kanji.meaningKo}</span>
      {/* 음독·훈독은 각각 없으면 그 줄 생략 (설계/05 §8) */}
      {kanji.onyomi != null && <span className="tile-on">{kanji.onyomi}</span>}
      {kanji.kunyomi != null && <span className="tile-kun">{kanji.kunyomi}</span>}
    </Link>
  );
}

/** 표현 목록 행 (설계/05 §16-3) — 별·음성이 없다(영어 범위 밖) */
export function ExpressionRow({ expression, to }) {
  const pron = [expression.ipa, expression.koApprox].filter(Boolean).join(" · ");
  return (
    <Link className="ref-row" to={to}>
      <span className="ref-row-main">
        <span className="ref-row-name">{expression.text}</span>
        {pron && <span className="expr-pron">{pron}</span>}
        <span className="ref-row-sub">{expression.meaningKo}</span>
      </span>
      <LevelBadge level={expression.level} />
      <span aria-hidden="true" className="unit-chevron">
        ›
      </span>
    </Link>
  );
}

export function GrammarRow({ grammar, to, onStar, latin = false }) {
  return (
    <Link className="ref-row" to={to}>
      <span className="ref-row-main">
        <span className={`ref-row-name ${latin ? "latin" : "jp"}`}>{grammar.name}</span>
        <span className="ref-row-sub">{grammar.nameKo}</span>
      </span>
      {!latin && <ItemStar id={grammar.id} name={grammar.name} onToggle={onStar} type="grammar" />}
      {grammar.hasRules && <span className="tag">활용표</span>}
      <LevelBadge level={grammar.level} />
      <span aria-hidden="true" className="unit-chevron">
        ›
      </span>
    </Link>
  );
}

/** 목록 줄의 뜻 — 서버가 뜻 기준으로 이미 합쳐 준다(설계/04 §3-7). 프론트에서 dedupe하지 않는다 */
function meaningSummary(senses) {
  const meanings = senses.map((sense) => sense.meaningKo);
  return meanings.length > 2 ? `${meanings.slice(0, 2).join(" · ")} …` : meanings.join(" · ");
}

const VOCAB_COLUMNS = 8; // 영어는 음성·보관함 열이 없어 6열이지만, colSpan은 넉넉해도 무해하다

function VocabRow({ item, expanded, onToggle, onStar, renderRow, onEdited, latin = false }) {
  const posLabel = partOfSpeechLabel(item.partOfSpeech);
  if (renderRow) return renderRow(item);

  return (
    <>
      <tr
        aria-expanded={expanded}
        aria-label={`${item.word} 자세히 보기`}
        className={`vocab-row${expanded ? " open" : ""}`}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <td className="w">{item.word}</td>
        {/* 읽는 법이 없는 단어(전부 가나)는 ─ (인수 20). 영어는 IPA·한글 근사 2줄(§3-3) */}
        {latin ? (
          <td className="r">
            {item.ipa == null && item.koApprox == null ? (
              "─"
            ) : (
              <span className="vocab-pron">
                {item.ipa}
                {item.koApprox && <span className="ko">{item.koApprox}</span>}
              </span>
            )}
          </td>
        ) : (
          <td className="r">{item.kana ?? "─"}</td>
        )}
        <td className="m">
          {meaningSummary(item.senses)}
          {/* 모바일에서 숨긴 품사·레벨 열을 여기서 되살린다 (정보는 사라지지 않는다) */}
          <span className="vocab-meta">
            {posLabel} · {item.levels.map(levelText).join(" ")}
          </span>
        </td>
        <td className="pos">{posLabel}</td>
        <td className="lv">
          {/* levels는 항상 학습 순서 — 필터에 따라 배지 순서가 흔들리지 않는다 (설계/04 §3-7) */}
          {item.levels.map((level) => (
            <LevelBadge key={level} level={level} />
          ))}
        </td>
        {!latin && (
          <td className="bm">
            <TtsButton label={item.word} text={speechTextOf(item)} />
          </td>
        )}
        {!latin && (
          <td className="bm">
            <ItemStar id={item.id} name={item.word} onToggle={onStar} type="vocabulary" />
          </td>
        )}
        <td aria-hidden="true" className="chev">
          {expanded ? "⌃" : "⌄"}
        </td>
      </tr>
      {expanded && (
        <tr className="vocab-expand">
          <td colSpan={VOCAB_COLUMNS}>
            {item.senses.map((sense, i) => (
              <div key={sense.vocabularyIds?.join("-") ?? `${sense.meaningKo}-${i}`} className="sense-item">
                {/* 뜻이 1개면 목록 줄에 이미 보이는 뜻을 반복하지 않는다 */}
                {item.senses.length > 1 && <div className="sense-meaning">{sense.meaningKo}</div>}
                {/* 한 뜻이 여러 곳에서 나오면 출처를 전부 나열한다 (설계/04 §3-7 learnedIn[]) */}
                {/* vocabularyIds와 learnedIn은 같은 소스·같은 순서다(설계/04 §3-7) — 줄 인덱스로 짝짓는다 */}
                {sense.learnedIn.map((learned, li) => {
                  // 그 줄의 원본 어휘 id를 모르면 편집 버튼을 아예 그리지 않는다 —
                  // 표제어 id로 폴백하면 다른 대역의 행을 고칠 수 있다(QA 낮음 5)
                  const editableId = sense.vocabularyIds?.[li] ?? null;
                  return (
                    <div key={`${learned.courseId}-${learned.unitNo}`} className="sense-source">
                      <span>
                        {learned.courseTitle}
                        {!latin && `(${learned.level})`} 코스 · 유닛 {learned.unitNo} {learned.unitTitle}
                      </span>
                      <Link
                        className="btn"
                        to={`${latin ? "/en" : ""}/courses/${learned.courseId}/units/${learned.unitNo}`}
                      >
                        배우기 ›
                      </Link>
                      {!latin && editableId != null && (
                        <EditorLauncher
                          kind="vocabulary"
                          target={{
                            id: editableId,
                            meaningKo: sense.meaningKo,
                            kana: item.kana,
                            partOfSpeech: item.partOfSpeech,
                          }}
                          title={`어휘 고치기 — ${item.word}(${item.kana ?? ""}) · ${learned.courseTitle}(${learned.level}) 유닛 ${learned.unitNo}`}
                          onSaved={onEdited}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * 어휘 표 + 행 확장 아코디언.
 * 펼침은 주소에 넣지 않는 순간 상태이므로 목록(listKey)이 바뀌면 전부 접는다(설계/05 §9).
 */
export function VocabTable({ items, listKey, onStar, renderRow, onEdited, latin = false }) {
  const [opened, setOpened] = useState({ listKey, ids: [] });
  const openIds = opened.listKey === listKey ? opened.ids : [];

  return (
    <table className={`data-table vocab-ref-table${latin ? " latin" : ""}`}>
      <thead>
        <tr>
          <th>단어</th>
          {/* 영어는 읽기 자리가 발음(IPA·한글 근사)이다 — 열을 늘리지 않는다(§3-3) */}
          <th>{latin ? "발음" : "읽기"}</th>
          <th>뜻</th>
          <th className="pos">품사</th>
          <th className="lv">{latin ? "코스" : "레벨"}</th>
          {!latin && <th aria-label="듣기" className="bm" />}
          {!latin && <th aria-label="보관함" className="bm" />}
          <th aria-label="펼치기" />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <VocabRow
            key={item.id}
            expanded={openIds.includes(item.id)}
            item={item}
            latin={latin}
            renderRow={renderRow}
            onEdited={onEdited}
            onStar={onStar}
            onToggle={() => setOpened({ listKey, ids: toggleValue(openIds, item.id) })}
          />
        ))}
      </tbody>
    </table>
  );
}

import { JpSentence } from "./JpSentence.jsx";
import { Alert } from "./ui/Alert.jsx";
import { Table, TableWrap } from "./ui/Table.jsx";

/**
 * 문법 본문 — 유닛 학습의 문법 스텝과 자료실 문법 상세가 **같은 컴포넌트를 쓴다** (설계/05 §7-1).
 * 두 벌로 두면 계약이 바뀔 때 한쪽만 갱신되어 "같은 콘텐츠"가 깨진다.
 *
 * @param {object} grammar 설계/04 §2-3 / §3-6 형태 (name·nameKo·explanation·examples·rules)
 * @param {string} [caption] 제목 위 캡션 (유닛: "문법 1 / 2")
 * @param {import('react').ReactNode} [titleRight] 제목 우측 슬롯 (유닛: 자료실 링크 / 상세: 태그·레벨 배지)
 * @param {boolean} [latin] 영어 과정 — 자형을 본문 폰트로 되돌린다(설계/05 §16-4)
 */
export function GrammarBody({ grammar, caption, titleRight, latin = false }) {
  return (
    <>
      {caption && <div className="step-caption">{caption}</div>}
      <div className="grammar-title-row">
        <h2 className={`step-title ${latin ? "latin" : "jp"}`}>{grammar.name}</h2>
        {titleRight && <div className="grammar-title-right">{titleRight}</div>}
      </div>
      <p className="step-subtitle">{grammar.nameKo}</p>

      {grammar.examples?.length > 0 && (
        <div className="jp-sentence-list">
          {grammar.examples.map((example, i) => (
            <JpSentence key={i} jp={example.jp} kana={example.kana} latin={latin} meaningKo={example.meaningKo} />
          ))}
        </div>
      )}

      {/* 활용 규칙표 — 계약상 항상 배열, 비었으면 블록 통째로 렌더하지 않는다 (인수 19).
          위치는 유닛·자료실 공통으로 예문과 설명 사이 (설계/04 §3-6) */}
      {grammar.rules?.length > 0 && (
        <TableWrap className="rules-table-wrap">
          <Table className="rules-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>규칙</th>
                <th>예</th>
              </tr>
            </thead>
            <tbody>
              {grammar.rules.map((rule, i) => (
                <tr key={i}>
                  <td className="g">{rule.groupLabel}</td>
                  {/* 자형은 고정값 "jp"로 적지 않는다 — 영어 문법도 규칙표를 갖는다(설계/05 §16-4) */}
                  <td className={`p ${latin ? "latin" : "jp"}`}>{rule.pattern}</td>
                  <td className="e">
                    <span className={latin ? "latin" : "jp"}>{rule.exampleBefore}</span>
                    <span aria-hidden="true" className="arrow">
                      {" → "}
                    </span>
                    <span className={latin ? "latin" : "jp"}>{rule.exampleAfter}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* 포인트 설명 — 예문보다 작게 (따라하기식) */}
      <Alert className="grammar-point">✎ {grammar.explanation}</Alert>
    </>
  );
}

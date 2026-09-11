package com.test.test.library.dto;

import com.test.test.library.repository.GrammarRow;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 문법 자료실 목록 항목 (설계 §4-B-3 · 설계/04 §3-5)
 * hasRules = 활용 규칙표(grammar_rule) 보유 여부 — 프론트의 "활용표 있는 것만" 배지·필터 표시 근거.
 *
 * <p><b>examples는 언제나 배열이다</b>(설계/08 B-5) — 예문이 없으면 {@code []}이고 null이 아니다.
 * 스위치 파라미터({@code withExamples} 류)를 두지 않는 이유도 같다: 응답 shape이 요청에 따라 갈리면
 * 프론트가 "요청하지 않아서 빈 것"과 "예문이 없어서 빈 것"을 구분해야 해 분기가 두 겹이 된다.</p>
 *
 * <p>항목의 모양은 상세({@link GrammarDetailDTO.ExampleDTO})를 <b>그대로 재사용</b>한다 — 같은 사실을
 * 두 벌로 만들지 않는다(설계/08 C-7). 목록의 예문은 상세의 예문과 같은 데이터다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrammarListItemDTO {

    private Long id;
    private String name;
    private String nameKo;
    private String level;
    private boolean hasRules;
    /** 진단의 문장·빈칸 문항 재료(설계/08 B-12) — 한 화면의 재료는 호출 한 번으로 온다(B-7) */
    private List<GrammarDetailDTO.ExampleDTO> examples;

    public static GrammarListItemDTO from(GrammarRow row, boolean hasRules,
                                          List<GrammarDetailDTO.ExampleDTO> examples) {
        return GrammarListItemDTO.builder()
                .id(row.getId())
                .name(row.getName())
                .nameKo(row.getNameKo())
                .level(row.getLevelCode())
                .hasRules(hasRules)
                .examples(examples == null ? List.of() : examples)
                .build();
    }
}

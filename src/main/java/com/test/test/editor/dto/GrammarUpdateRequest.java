package com.test.test.editor.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * 문법 수정 요청 (설계/04 §9) — 표제 {@code name}·{@code nameKo}는 요청에 있어도 무시된다.
 * 예문은 <b>수정만</b>(id 일치), 활용표는 <b>전체 교체</b>(행 추가·삭제 허용 — 판정 ④).
 */
@Getter
@Setter
public class GrammarUpdateRequest {

    @NotBlank(message = "설명은 필수입니다")
    @Size(max = 500, message = "설명은 500자 이하여야 합니다")
    private String explanation;

    @NotNull(message = "예문 목록은 필수입니다")
    @Valid
    private List<ExampleRow> examples;

    @NotNull(message = "활용표는 필수입니다(비우려면 빈 배열)")
    @Size(max = 20, message = "활용표는 20행 이하여야 합니다")
    @Valid
    private List<RuleRow> rules;

    @Getter
    @Setter
    public static class ExampleRow {

        @NotNull(message = "예문 id는 필수입니다")
        private Long id;

        @NotBlank(message = "예문 원문은 필수입니다")
        @Size(max = 300, message = "예문 원문은 300자 이하여야 합니다")
        private String jp;

        @Size(max = 300, message = "kana는 300자 이하여야 합니다")
        private String kana;

        @NotBlank(message = "예문 뜻은 필수입니다")
        @Size(max = 300, message = "예문 뜻은 300자 이하여야 합니다")
        private String meaningKo;
    }

    /** 활용표 한 행 — id가 없다: 전체 교체라 기존 행과의 대응이 필요 없다(sortOrder = 배열 순서) */
    @Getter
    @Setter
    public static class RuleRow {

        @NotBlank(message = "그룹 라벨은 필수입니다")
        @Size(max = 50, message = "그룹 라벨은 50자 이하여야 합니다")
        private String groupLabel;

        @NotBlank(message = "패턴은 필수입니다")
        @Size(max = 100, message = "패턴은 100자 이하여야 합니다")
        private String pattern;

        @NotBlank(message = "변환 전 예는 필수입니다")
        @Size(max = 50, message = "변환 전 예는 50자 이하여야 합니다")
        private String exampleBefore;

        @NotBlank(message = "변환 후 예는 필수입니다")
        @Size(max = 50, message = "변환 후 예는 50자 이하여야 합니다")
        private String exampleAfter;
    }
}

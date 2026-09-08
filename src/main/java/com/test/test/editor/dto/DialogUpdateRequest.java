package com.test.test.editor.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** 회화 수정 요청 (설계/04 §9) — 대사는 <b>수정만</b>(id 일치 필수) */
@Getter
@Setter
public class DialogUpdateRequest {

    @NotBlank(message = "장면 제목은 필수입니다")
    @Size(max = 100, message = "장면 제목은 100자 이하여야 합니다")
    private String title;

    @NotNull(message = "대사 목록은 필수입니다")
    @Valid
    private List<LineRow> lines;

    @Getter
    @Setter
    public static class LineRow {

        @NotNull(message = "대사 id는 필수입니다")
        private Long id;

        @NotBlank(message = "화자는 필수입니다")
        @Size(max = 30, message = "화자는 30자 이하여야 합니다")
        private String speaker;

        @NotBlank(message = "대사 원문은 필수입니다")
        @Size(max = 300, message = "대사 원문은 300자 이하여야 합니다")
        private String jp;

        @Size(max = 300, message = "kana는 300자 이하여야 합니다")
        private String kana;

        @NotBlank(message = "대사 뜻은 필수입니다")
        @Size(max = 300, message = "대사 뜻은 300자 이하여야 합니다")
        private String meaningKo;
    }
}

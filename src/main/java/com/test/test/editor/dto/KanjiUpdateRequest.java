package com.test.test.editor.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * 한자 수정 요청 (설계/04 §9) — 표제 {@code letter}는 요청에 있어도 무시된다(DTO에 필드가 없다).
 * onyomi·kunyomi는 개별로는 선택이지만 둘 다 비면 400 — 그 판정은 서비스가 한다(조건부 필수는 @Valid로 표현되지 않는다).
 */
@Getter
@Setter
public class KanjiUpdateRequest {

    @NotBlank(message = "훈음(뜻)은 필수입니다")
    @Size(max = 50, message = "훈음은 50자 이하여야 합니다")
    private String meaningKo;

    @Size(max = 50, message = "음독은 50자 이하여야 합니다")
    private String onyomi;

    @Size(max = 50, message = "훈독은 50자 이하여야 합니다")
    private String kunyomi;

    @NotNull(message = "예시 단어 목록은 필수입니다")
    @Valid
    private List<WordRow> words;

    /** 예시 단어 한 행 — <b>수정만</b>(id 일치 필수, 설계/04 §9) */
    @Getter
    @Setter
    public static class WordRow {

        @NotNull(message = "예시 단어 id는 필수입니다")
        private Long id;

        @NotBlank(message = "단어는 필수입니다")
        @Size(max = 50, message = "단어는 50자 이하여야 합니다")
        private String word;

        @Size(max = 50, message = "kana는 50자 이하여야 합니다")
        private String kana;

        @NotBlank(message = "단어 뜻은 필수입니다")
        @Size(max = 100, message = "단어 뜻은 100자 이하여야 합니다")
        private String meaningKo;
    }
}

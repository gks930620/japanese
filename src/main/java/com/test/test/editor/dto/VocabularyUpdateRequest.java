package com.test.test.editor.dto;

import com.test.test.course.content.PartOfSpeech;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * 어휘 수정 요청 (설계/04 §9) — 표제 {@code word}는 요청에 있어도 무시된다.
 * partOfSpeech는 enum 바인딩이라 7종 밖 값은 역직렬화에서 걸린다(INVALID_JSON — 프론트는 select라 도달하지 않는다).
 */
@Getter
@Setter
public class VocabularyUpdateRequest {

    @NotBlank(message = "뜻은 필수입니다")
    @Size(max = 100, message = "뜻은 100자 이하여야 합니다")
    private String meaningKo;

    @Size(max = 50, message = "kana는 50자 이하여야 합니다")
    private String kana;

    @NotNull(message = "품사는 필수입니다")
    private PartOfSpeech partOfSpeech;
}

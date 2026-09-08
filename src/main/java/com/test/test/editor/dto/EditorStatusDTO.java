package com.test.test.editor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 편집 모드 상태 (설계/04 §9) — 프론트의 <b>유일한</b> 판단 근거.
 * 꺼진 환경에서는 이 엔드포인트 자체가 없어 404가 난다(빈 미등록) — 그래서 값은 항상 true다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorStatusDTO {

    private Boolean enabled;

    public static EditorStatusDTO enabled() {
        return EditorStatusDTO.builder().enabled(true).build();
    }
}

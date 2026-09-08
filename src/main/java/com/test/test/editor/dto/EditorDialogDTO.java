package com.test.test.editor.dto;

import com.test.test.course.content.DialogEntity;
import com.test.test.course.content.DialogLineEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 회화 수정 응답 (설계/04 §9) — 저장 후 값 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorDialogDTO {

    private Long id;
    private String title;
    private List<LineDTO> lines;

    public static EditorDialogDTO from(DialogEntity dialog) {
        return EditorDialogDTO.builder()
                .id(dialog.getId())
                .title(dialog.getTitle())
                .lines(dialog.getLines().stream().map(LineDTO::from).toList())
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineDTO {

        private Long id;
        private String speaker;
        private String jp;
        private String kana;
        private String meaningKo;

        public static LineDTO from(DialogLineEntity line) {
            return LineDTO.builder()
                    .id(line.getId())
                    .speaker(line.getSpeaker())
                    .jp(line.getJp())
                    .kana(line.getKana())
                    .meaningKo(line.getMeaningKo())
                    .build();
        }
    }
}

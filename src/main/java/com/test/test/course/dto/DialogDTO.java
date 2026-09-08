package com.test.test.course.dto;

import com.test.test.course.content.DialogEntity;
import com.test.test.course.content.DialogLineEntity;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유닛 학습의 회화 DTO (설계 §3-3 dialog) — lines 2개 이상, 화자 2명 이상.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DialogDTO {

    private Long id;
    private String title;
    private List<LineDTO> lines;

    public static DialogDTO from(DialogEntity entity) {
        return DialogDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .lines(entity.getLines().stream().map(LineDTO::from).toList())
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineDTO {
        // 편집 패널이 PUT /api/editor/dialogs의 lines[].id를 이 값으로 조립한다(설계/04 §9)
        private Long id;
        private String speaker;
        private String jp;
        private String kana;
        private String meaningKo;

        public static LineDTO from(DialogLineEntity entity) {
            return LineDTO.builder()
                    .id(entity.getId())
                    .speaker(entity.getSpeaker())
                    .jp(entity.getJp())
                    .kana(entity.getKana())
                    .meaningKo(entity.getMeaningKo())
                    .build();
        }
    }
}

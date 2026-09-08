package com.test.test.progress.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 내 진도 전체 (설계/04 §6-3) — 화면 다섯 곳이 이 한 번의 호출로 그린다(결정기록 B-7).
 *
 * <p>배열은 절대 null이 아니고 {@code lastPosition}은 없으면 null로 <b>항상</b> 내려간다(B-5).
 * 게스트의 localStorage 문서와 필드가 같아, 화면은 회원·게스트를 구분하지 않는다(설계/04 §6-6).</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressDTO {

    private List<CompletedUnitDTO> completedUnits;
    private LastPositionDTO lastPosition;

    public static ProgressDTO of(List<CompletedUnitDTO> completedUnits, LastPositionDTO lastPosition) {
        return ProgressDTO.builder()
                .completedUnits(completedUnits)
                .lastPosition(lastPosition)
                .build();
    }
}

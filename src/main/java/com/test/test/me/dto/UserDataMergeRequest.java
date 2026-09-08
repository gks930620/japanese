package com.test.test.me.dto;

import com.test.test.progress.dto.LastPositionSaveRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 브라우저 기록 병합 요청 (설계/04 §6-5) — <b>localStorage 문서 그대로</b>다(설계/04 §6-6과 필드가 같다).
 *
 * <p>상한은 게스트 저장소 기준(완료 유닛 500 · 보관함 종류별 200)이다.
 * 게스트가 그 이상을 만들 수 없으므로 초과 payload는 조작된 요청으로 보고 400이다(설계/04 §6-6).
 * 그 상한을 넘는 <b>결과</b>는 막지 않는다 — 회원 보관함은 무제한이다.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserDataMergeRequest {

    @Valid
    private ProgressPayload progress;

    @Valid
    private BookmarksPayload bookmarks;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProgressPayload {

        @Valid
        @Size(max = 500, message = "completedUnits는 최대 500개까지 보낼 수 있습니다.")
        private List<@NotNull(message = "completedUnits에 빈 값을 담을 수 없습니다.") CompletedUnitPayload> completedUnits;

        @Valid
        private LastPositionPayload lastPosition;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletedUnitPayload {

        @NotNull(message = "courseId는 필수입니다.")
        private Long courseId;

        @NotNull(message = "unitNo는 필수입니다.")
        private Integer unitNo;
    }

    /**
     * 브라우저의 마지막 위치. {@code updatedAt}은 <b>클라이언트 시각</b>이다 —
     * 서버가 알 수 있는 다른 기준이 없고, 시계가 어긋나도 위험은 "이어보기 위치가 하나 밀린다"뿐이다(설계/04 §6-5).
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LastPositionPayload {

        @NotNull(message = "courseId는 필수입니다.")
        private Long courseId;

        @NotNull(message = "unitNo는 필수입니다.")
        private Integer unitNo;

        @NotBlank(message = "stepKey는 필수입니다.")
        @Size(max = 40, message = "stepKey는 40자 이하여야 합니다.")
        @Pattern(regexp = LastPositionSaveRequest.STEP_KEY_PATTERN, message = "stepKey 형식이 올바르지 않습니다.")
        private String stepKey;

        @NotNull(message = "updatedAt은 필수입니다.")
        private LocalDateTime updatedAt;
    }

    /**
     * 배열 <b>원소</b>의 null까지 막는다 — 손상된 localStorage 문서가 그대로 올라오는 경로다(설계/04 §6-6).
     * 원소가 null이면 병합 중에 터져 500이 되는데, 이것은 요청을 고쳐야 하는 클라이언트 잘못이므로
     * 400 {@code VALIDATION_ERROR}가 맞다(설계/04 §1-2).
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookmarksPayload {

        @Size(max = 200, message = "kanji 보관함은 최대 200개까지 보낼 수 있습니다.")
        private List<@NotNull(message = "kanji 보관함에 빈 값을 담을 수 없습니다.") Long> kanji;

        @Size(max = 200, message = "grammar 보관함은 최대 200개까지 보낼 수 있습니다.")
        private List<@NotNull(message = "grammar 보관함에 빈 값을 담을 수 없습니다.") Long> grammar;

        @Size(max = 200, message = "vocabulary 보관함은 최대 200개까지 보낼 수 있습니다.")
        private List<@NotNull(message = "vocabulary 보관함에 빈 값을 담을 수 없습니다.") Long> vocabulary;
    }
}

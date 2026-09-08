package com.test.test.me;

import com.test.test.bookmark.BookmarkService;
import com.test.test.bookmark.BookmarkType;
import com.test.test.course.CourseUnitCatalog;
import com.test.test.course.ExistingUnits;
import com.test.test.me.dto.UserDataMergeRequest;
import com.test.test.me.dto.UserDataMergeResultDTO;
import com.test.test.progress.ProgressService;
import com.test.test.progress.dto.ProgressDTO;
import com.test.test.progress.repository.UserLastPositionRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 브라우저 기록 → 계정 병합 (설계/04 §6-5)
 *
 * <p><b>전체가 한 트랜잭션</b>이다 — AC-X-03이 "진도와 보관함이 함께 합쳐진다(한쪽만 합쳐지지 않는다)"를
 * 요구한다. 프론트가 기존 API를 반복 호출하면 최대 600여 회의 요청이 되고, 중간 실패 시
 * <b>반쯤 합쳐진 상태</b>가 남는다.</p>
 *
 * <p>합치는 규칙: 완료 유닛 = 합집합(이미 있으면 completed_at을 덮어쓰지 않는다) /
 * 마지막 위치 = updatedAt이 더 최근인 쪽(같으면 계정 값 유지) / 보관함 = 합집합.
 * <b>존재하지 않는 항목은 조용히 건너뛴다</b> — 요청 전체를 실패시키지 않는다(벌크 화해).
 * 합집합이므로 같은 payload를 두 번 보내도 결과가 같다(멱등 — 재시도가 안전해야 한다).</p>
 */
@Service
@RequiredArgsConstructor
public class UserDataMergeService {

    private final ProgressService progressService;
    private final BookmarkService bookmarkService;
    private final CourseUnitCatalog courseUnitCatalog;
    private final UserLastPositionRepository userLastPositionRepository;

    // READ_COMMITTED 명시: 이 메서드는 트랜잭션을 열자마자 existingUnits()로 평범한 읽기를 먼저 한다.
    // 운영 MySQL 기본값(REPEATABLE READ)에서는 그 순간 스냅샷이 고정돼, 뒤에서 markCompleted가 사용자 행을
    // 잠가도 먼저 커밋된 행을 못 보고 다시 삽입한다 — 이 경로에서만 잠금이 무력화된다(설계 §03 §4-1 · 결정기록 B-11).
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public UserDataMergeResultDTO merge(Long userId, UserDataMergeRequest request) {
        LocalDateTime now = LocalDateTime.now();
        ExistingUnits existingUnits = courseUnitCatalog.existingUnits();

        mergeProgress(userId, request.getProgress(), existingUnits, now);
        mergeBookmarks(userId, request.getBookmarks(), now);

        // 응답은 병합 후 상태 — 읽기 시점 필터를 거친 값이라 사라진 항목은 여기에도 없다
        ProgressDTO progress = progressService.getProgress(userId);
        return UserDataMergeResultDTO.of(progress.getCompletedUnits().size(), progress.getLastPosition(),
                bookmarkService.getCounts(userId));
    }

    private void mergeProgress(Long userId, UserDataMergeRequest.ProgressPayload progress,
                               ExistingUnits existingUnits, LocalDateTime now) {
        if (progress == null) {
            return;
        }

        for (UserDataMergeRequest.CompletedUnitPayload unit : nullSafe(progress.getCompletedUnits())) {
            if (existingUnits.contains(unit.getCourseId(), unit.getUnitNo())) {
                progressService.markCompleted(userId, unit.getCourseId(), unit.getUnitNo(), now);
            }
        }

        UserDataMergeRequest.LastPositionPayload browserPosition = progress.getLastPosition();
        if (browserPosition == null
                || !existingUnits.contains(browserPosition.getCourseId(), browserPosition.getUnitNo())) {
            return;
        }
        boolean browserIsNewer = userLastPositionRepository.findByUserId(userId)
                .map(current -> current.isOlderThan(browserPosition.getUpdatedAt()))
                .orElse(true);
        if (browserIsNewer) {
            progressService.upsertLastPosition(userId, browserPosition.getCourseId(), browserPosition.getUnitNo(),
                    browserPosition.getStepKey(), browserPosition.getUpdatedAt());
        }
    }

    private void mergeBookmarks(Long userId, UserDataMergeRequest.BookmarksPayload bookmarks, LocalDateTime now) {
        if (bookmarks == null) {
            return;
        }
        bookmarkService.addAll(userId, BookmarkType.KANJI, bookmarks.getKanji(), now);
        bookmarkService.addAll(userId, BookmarkType.GRAMMAR, bookmarks.getGrammar(), now);
        bookmarkService.addAll(userId, BookmarkType.VOCABULARY, bookmarks.getVocabulary(), now);
    }

    private <T> List<T> nullSafe(List<T> values) {
        return values == null ? List.of() : values;
    }
}

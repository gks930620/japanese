package com.test.test.bookmark;

import com.test.test.bookmark.dto.BookmarkClearDTO;
import com.test.test.bookmark.dto.BookmarkCountsDTO;
import com.test.test.bookmark.dto.BookmarkIdsDTO;
import com.test.test.bookmark.dto.BookmarkToggleDTO;
import com.test.test.bookmark.repository.UserBookmarkRepository;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.CourseLanguage;
import com.test.test.jwt.repository.UserRepository;
import com.test.test.library.LibraryGrammarService;
import com.test.test.library.LibraryKanjiService;
import com.test.test.library.LibrarySort;
import com.test.test.library.LibraryVocabularyService;
import com.test.test.library.VocabularySort;
import com.test.test.library.dto.LibraryPageResponse;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 보관함 (설계/04 §6-4)
 *
 * <p>두 가지를 <b>재사용</b>한다 — 규칙이 두 벌이 되면 곧 갈리기 때문이다(C-7·A-4).
 * ① 어휘 대표 id 정규화는 자료실의 병합 규칙(LibraryVocabularyService)을 그대로 쓴다,
 * ② 목록은 자료실 서비스에 ids 필터를 넣고 그것을 호출한다 — 검색·병합·페이징 로직을 복제하지 않는다.</p>
 *
 * <p>회원에게 <b>개수 상한은 없다</b>(설계/04 §6-6 — 200은 게스트 저장소 전용이다).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookmarkService {

    private final UserBookmarkRepository userBookmarkRepository;
    private final UserRepository userRepository;
    private final LibraryKanjiService libraryKanjiService;
    private final LibraryGrammarService libraryGrammarService;
    private final LibraryVocabularyService libraryVocabularyService;

    /** 종류별 개수 — 지금 존재하는 항목만 센다(설계/03 §4-1 · 04 §6-4) */
    public BookmarkCountsDTO getCounts(Long userId) {
        Map<BookmarkType, List<Long>> existing = existingIdsByType(userId);
        return BookmarkCountsDTO.of(
                existing.get(BookmarkType.KANJI).size(),
                existing.get(BookmarkType.GRAMMAR).size(),
                existing.get(BookmarkType.VOCABULARY).size());
    }

    /** ★ 표시용 id 집합 (설계/04 §6-4) — 최근 담은 순 */
    public BookmarkIdsDTO getIds(Long userId) {
        Map<BookmarkType, List<Long>> existing = existingIdsByType(userId);
        return BookmarkIdsDTO.of(
                existing.get(BookmarkType.KANJI),
                existing.get(BookmarkType.GRAMMAR),
                existing.get(BookmarkType.VOCABULARY));
    }

    /**
     * 보관함 목록 — 자료실 목록과 <b>같은 봉투·같은 항목 DTO</b>다(화면이 자료실 컴포넌트를 재사용한다).
     * pos·hasRules 필터는 지원하지 않는다(AC-B-14) — 보내면 조용히 무시된다.
     */
    public LibraryPageResponse<?> getList(Long userId, BookmarkType type, Integer page, Integer size, String q,
                                          String level, String sort) {
        BookmarkSort sortBy = BookmarkSort.from(sort);
        List<Long> ids = storedIds(userId, type);

        return switch (type) {
            case KANJI -> libraryKanjiService.getKanjiListByIds(ids, librarySort(sortBy), page, size, q, level);
            case GRAMMAR -> libraryGrammarService.getGrammarListByIds(ids, librarySort(sortBy), page, size, q, level);
            case VOCABULARY -> libraryVocabularyService.getVocabularyListByEntryIds(
                    ids, vocabularySort(sortBy), page, size, q, level);
        };
    }

    /**
     * 담기/빼기 — <b>동시 요청에서까지</b> 멱등이다(설계/04 §6-4). 없는 대상은 404.
     *
     * <p>★ 연타가 가장 자연스러운 조작이라 두 요청이 겹친다. 겹칠 때 500을 주면 화면이 별을 되돌려
     * 서버 상태와 어긋나므로, {@link #add}가 사용자 행을 잠가 같은 사용자의 쓰기를 줄 세운다.
     * 격리 수준을 READ_COMMITTED로 못 박는 이유는 {@code ProgressService#setUnitCompleted}와 같다 —
     * 운영 MySQL 기본값에서는 잠금을 얻고 다시 조회해도 먼저 들어간 행이 보이지 않는다.</p>
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookmarkToggleDTO setBookmark(Long userId, BookmarkType type, Long targetId, boolean bookmarked) {
        Long normalizedId = requireExistingTarget(type, targetId);

        if (bookmarked) {
            add(userId, type, normalizedId, LocalDateTime.now());
        } else {
            // 엔티티를 읽어 지우지 않고 벌크 삭제 — 동시에 두 번 빼도 "이미 사라진 행"이라 실패하면 안 된다
            userBookmarkRepository.deleteBookmark(userId, type, normalizedId);
        }
        return BookmarkToggleDTO.of(type, normalizedId, bookmarked, getCounts(userId));
    }

    /** 그 종류만 비운다 — 다른 종류는 그대로다(AC-B-21) */
    @Transactional
    public BookmarkClearDTO clear(Long userId, BookmarkType type) {
        long removed = userBookmarkRepository.deleteByUserIdAndTargetType(userId, type);
        return BookmarkClearDTO.of(type, removed, getCounts(userId));
    }

    /**
     * 브라우저 기록 병합용 합집합 (설계/04 §6-5) — <b>존재하지 않는 항목은 조용히 건너뛴다.</b>
     *
     * <p>쓰기 API가 404를 주는 것과 다른 이유: 병합은 벌크 화해(reconciliation)라
     * 낡은 id 하나 때문에 34항목이 통째로 날아가면 사용자는 무엇을 잃었는지도 모른다.</p>
     */
    @Transactional
    public void addAll(Long userId, BookmarkType type, List<Long> targetIds, LocalDateTime createdAt) {
        if (targetIds == null || targetIds.isEmpty()) {
            return;
        }
        for (Long targetId : normalizeExisting(type, targetIds)) {
            add(userId, type, targetId, createdAt);
        }
    }

    /**
     * 이미 있으면 아무것도 하지 않는다 — UNIQUE(user, type, target)가 뒷받침하는 멱등 담기.
     *
     * <p>먼저 <b>사용자 행을 잠근다</b>: 같은 사용자의 두 요청이 동시에 "없음"을 보고 둘 다 삽입하면
     * 한쪽이 UNIQUE에 걸려 500이 된다. 잠근 뒤에 조회하므로 먼저 들어간 행이 반드시 보인다.</p>
     */
    private void add(Long userId, BookmarkType type, Long targetId, LocalDateTime createdAt) {
        userRepository.lockForUserDataWrite(userId);

        if (userBookmarkRepository.findByUserIdAndTargetTypeAndTargetId(userId, type, targetId).isPresent()) {
            return;
        }
        userBookmarkRepository.save(UserBookmarkEntity.builder()
                .user(userRepository.getReferenceById(userId))
                .targetType(type)
                .targetId(targetId)
                .createdAt(createdAt)
                .build());
    }

    /** 쓰기 시점 검증 + 정규화 — 어휘는 표제어 대표 id로 바뀐다(설계/03 §4-1) */
    private Long requireExistingTarget(BookmarkType type, Long targetId) {
        if (type == BookmarkType.VOCABULARY) {
            return libraryVocabularyService.resolveEntryId(targetId);
        }
        if (filterExisting(type, List.of(targetId)).isEmpty()) {
            throw EntityNotFoundException.of(type == BookmarkType.KANJI ? "한자" : "문법", targetId);
        }
        return targetId;
    }

    /** 병합용 벌크 정규화 — 사라진 항목은 결과에서 빠지고, 중복은 입력 순서 기준으로 하나가 된다 */
    private List<Long> normalizeExisting(BookmarkType type, List<Long> targetIds) {
        if (type == BookmarkType.VOCABULARY) {
            Map<Long, Long> entryIdByVocabularyId = libraryVocabularyService.resolveEntryIds(targetIds, CourseLanguage.JA);
            return List.copyOf(new LinkedHashSet<>(targetIds.stream()
                    .map(entryIdByVocabularyId::get)
                    .filter(Objects::nonNull)
                    .toList()));
        }
        Set<Long> existing = Set.copyOf(filterExisting(type, targetIds));
        return List.copyOf(new LinkedHashSet<>(targetIds.stream().filter(existing::contains).toList()));
    }

    /** 담아 둔 id — 최근 담은 순(설계/04 §6-4). 목록은 자료실의 ids 필터가 존재 여부를 함께 걸러 준다 */
    private List<Long> storedIds(Long userId, BookmarkType type) {
        return userBookmarkRepository.findByUserIdAndTargetTypeOrderByCreatedAtDescIdDesc(userId, type).stream()
                .map(UserBookmarkEntity::getTargetId)
                .toList();
    }

    /** 종류별 "지금 존재하는" id 목록 — 최근 담은 순을 유지한다 */
    private Map<BookmarkType, List<Long>> existingIdsByType(Long userId) {
        Map<BookmarkType, List<Long>> storedByType = new EnumMap<>(BookmarkType.class);
        for (BookmarkType type : BookmarkType.values()) {
            storedByType.put(type, new ArrayList<>());
        }
        userBookmarkRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId)
                .forEach(bookmark -> storedByType.get(bookmark.getTargetType()).add(bookmark.getTargetId()));

        Map<BookmarkType, List<Long>> existingByType = new EnumMap<>(BookmarkType.class);
        for (BookmarkType type : BookmarkType.values()) {
            List<Long> stored = storedByType.get(type);
            Set<Long> existing = Set.copyOf(filterExisting(type, stored));
            existingByType.put(type, stored.stream().filter(existing::contains).toList());
        }
        return existingByType;
    }

    /** 읽기 시점 필터의 위임 — 존재 판정의 근거는 자료실 한 곳이다(설계/03 §4-1) */
    private List<Long> filterExisting(BookmarkType type, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return switch (type) {
            case KANJI -> libraryKanjiService.filterExistingIds(ids);
            case GRAMMAR -> libraryGrammarService.filterExistingIds(ids);
            case VOCABULARY -> libraryVocabularyService.filterExistingEntryIds(ids);
        };
    }

    /** 최근 담은 순 = 서버가 넘겨준 id 순서 그대로(GIVEN) — 자료실 정렬 계약으로 옮긴다 */
    private LibrarySort librarySort(BookmarkSort sort) {
        return sort == BookmarkSort.LEARNING ? LibrarySort.LEARNING : LibrarySort.GIVEN;
    }

    private VocabularySort vocabularySort(BookmarkSort sort) {
        return sort == BookmarkSort.LEARNING ? VocabularySort.LEARNING : VocabularySort.GIVEN;
    }
}

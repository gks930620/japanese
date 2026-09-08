package com.test.test.library;

import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseLevelCatalog;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.KanjiEntity;
import com.test.test.library.dto.KanjiDetailDTO;
import com.test.test.library.dto.KanjiListItemDTO;
import com.test.test.library.dto.LibraryPageResponse;
import com.test.test.library.repository.KanjiRow;
import com.test.test.library.repository.LibraryKanjiQueryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 한자 자료실 (설계 §4-B-1·§4-B-2) — 읽기 전용, <b>일본어 전용</b>이다.
 *
 * <p>영어 과정에는 한자 탭이 없다(설계/04 §8-2 — 표현이 그 자리다). 그래서 언어를 파라미터로 받지 않고
 * {@code CourseLanguage.JA}로 고정한다 — 열려 있지 않은 축을 만들지 않는다.</p>
 *
 * <p>{@code ids} 필터(설계/04 §6-7)가 여기 있는 덕분에 <b>보관함 목록은 목록 로직을 복제하지 않는다</b> —
 * 회원 보관함은 {@code getKanjiListByIds}를, 게스트 보관함은 같은 경로의 공개 API를 호출한다(설계/04 §6-4).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryKanjiService {

    /** 기본 페이지 크기 (설계 §4-B 공통 파라미터 — 한자 60) */
    public static final int DEFAULT_PAGE_SIZE = 60;

    private final LibraryKanjiQueryRepository libraryKanjiQueryRepository;
    private final CourseLevelCatalog courseLevelCatalog;

    /** 공개 API 경로 — 파라미터 문자열을 검증·파싱해 아래 목록 조회로 넘긴다 */
    public LibraryPageResponse<KanjiListItemDTO> getKanjiList(Integer page, Integer size, String q, String level,
                                                              String ids, String sort) {
        List<Long> idFilter = LibraryIds.parse(ids);
        LibrarySort sortBy = LibrarySort.from(sort);
        LibrarySort.requireIdsForGivenOrder(sortBy, idFilter);

        return getKanjiList(idFilter, sortBy, page, size, q, level, CourseLanguage.JA);
    }

    /**
     * 보관함 경로 — id 집합은 이미 서버가 들고 있다(개수 상한 없음: 회원은 무제한 — 설계/04 §6-4).
     *
     * @param ids null이면 필터 미적용, 빈 목록이면 "담은 것이 없음"(빈 페이지)
     */
    public LibraryPageResponse<KanjiListItemDTO> getKanjiListByIds(List<Long> ids, LibrarySort sort, Integer page,
                                                                   Integer size, String q, String level) {
        return getKanjiList(ids, sort, page, size, q, level, CourseLanguage.JA);
    }

    /** 지금 존재하는(유닛에 매핑된) id만 남긴다 — 보관함 개수·★ 집합의 읽기 필터(설계/03 §4-1) */
    public List<Long> filterExistingIds(List<Long> ids) {
        return libraryKanjiQueryRepository.findExistingIds(ids);
    }

    public KanjiDetailDTO getKanjiDetail(Long kanjiId) {
        KanjiEntity kanji = libraryKanjiQueryRepository.findKanji(kanjiId)
                .orElseThrow(() -> EntityNotFoundException.of("한자", kanjiId));
        CourseUnitEntity unit = libraryKanjiQueryRepository.findLearnedInUnit(kanjiId)
                .orElseThrow(() -> EntityNotFoundException.of("한자를 배우는 유닛", kanjiId));

        return KanjiDetailDTO.from(kanji, unit);
    }

    private LibraryPageResponse<KanjiListItemDTO> getKanjiList(List<Long> ids, LibrarySort sort, Integer page,
                                                               Integer size, String q, String level,
                                                               CourseLanguage language) {
        List<String> levelCodes = courseLevelCatalog.parseLevelCodes(level, language);
        int pageSize = LibraryPaging.resolveSize(size, DEFAULT_PAGE_SIZE);

        if (ids == null) {
            // 종전 경로 — 필터·정렬을 DB가 하고 페이지만 잘라 온다
            long totalElements = libraryKanjiQueryRepository.count(levelCodes, language, q, null);
            int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);
            List<KanjiListItemDTO> content = libraryKanjiQueryRepository
                    .findPage(levelCodes, language, q, (long) pageNumber * pageSize, pageSize).stream()
                    .map(KanjiListItemDTO::from)
                    .toList();
            return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements,
                    libraryKanjiQueryRepository.countAll(language));
        }

        if (ids.isEmpty()) {
            return LibraryPageResponse.of(List.of(), 0, pageSize, 0L, 0L);
        }

        List<KanjiRow> matched = libraryKanjiQueryRepository.findAllByIds(levelCodes, language, q, ids);
        if (sort == LibrarySort.GIVEN) {
            matched = LibraryIds.sortByGivenOrder(matched, ids, KanjiRow::getId);
        }

        long totalElements = matched.size();
        // totalAll = ids 적용 후·검색/필터 미적용 개수 ("담은 34자 중 12자" — 설계/04 §6-4·§6-7)
        long totalAll = libraryKanjiQueryRepository.count(List.of(), language, null, ids);
        int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);

        List<KanjiListItemDTO> content = LibraryPaging.slice(matched, pageNumber, pageSize).stream()
                .map(KanjiListItemDTO::from)
                .toList();
        return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements, totalAll);
    }
}

package com.test.test.library;

import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseLevelCatalog;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.GrammarPointEntity;
import com.test.test.library.dto.GrammarDetailDTO;
import com.test.test.library.dto.GrammarListItemDTO;
import com.test.test.library.dto.LibraryPageResponse;
import com.test.test.library.repository.GrammarRow;
import com.test.test.library.repository.LibraryGrammarQueryRepository;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 문법 자료실 (설계 §4-B-3·§4-B-4) — 읽기 전용.
 *
 * <p>영어 자료실({@code /api/en/library/grammar})이 <b>이 서비스를 그대로 재사용</b>한다 — 언어는 파라미터다(설계/04 §8).</p>
 * 보관함 목록은 {@code getGrammarListByIds}를 호출한다 — 목록 로직을 복제하지 않는다(설계/04 §6-4).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryGrammarService {

    /** 기본 페이지 크기 (설계 §4-B 공통 파라미터 — 문법 20) */
    public static final int DEFAULT_PAGE_SIZE = 20;

    private final LibraryGrammarQueryRepository libraryGrammarQueryRepository;
    private final CourseLevelCatalog courseLevelCatalog;

    /** 공개 API 경로 — 파라미터 문자열을 검증·파싱해 목록 조회로 넘긴다 */
    public LibraryPageResponse<GrammarListItemDTO> getGrammarList(Integer page, Integer size, String q, String level,
                                                                  Boolean hasRules, String ids, String sort,
                                                                  CourseLanguage language) {
        List<Long> idFilter = LibraryIds.parse(ids);
        LibrarySort sortBy = LibrarySort.from(sort);
        LibrarySort.requireIdsForGivenOrder(sortBy, idFilter);

        return getGrammarList(idFilter, sortBy, page, size, q, level, hasRules, language);
    }

    /**
     * 보관함 경로 — {@code hasRules} 필터는 지원하지 않는다(설계/04 §6-4 · AC-B-14).
     *
     * @param ids null이면 필터 미적용, 빈 목록이면 "담은 것이 없음"(빈 페이지)
     */
    public LibraryPageResponse<GrammarListItemDTO> getGrammarListByIds(List<Long> ids, LibrarySort sort, Integer page,
                                                                       Integer size, String q, String level) {
        return getGrammarList(ids, sort, page, size, q, level, null, CourseLanguage.JA);
    }

    /** 지금 존재하는(유닛에 매핑된) id만 남긴다 (설계/03 §4-1) */
    public List<Long> filterExistingIds(List<Long> ids) {
        return libraryGrammarQueryRepository.findExistingIds(ids);
    }

    public GrammarDetailDTO getGrammarDetail(Long grammarId, CourseLanguage language) {
        GrammarPointEntity grammar = libraryGrammarQueryRepository.findGrammar(grammarId)
                .orElseThrow(() -> EntityNotFoundException.of("문법", grammarId));
        // 다른 과정의 문법 id는 없는 것으로 취급한다(설계/04 §8-2) — 배우는 유닛이 그 언어에 없으면 404다
        CourseUnitEntity unit = libraryGrammarQueryRepository.findLearnedInUnit(grammarId, language)
                .orElseThrow(() -> EntityNotFoundException.of("문법을 배우는 유닛", grammarId));

        return GrammarDetailDTO.from(grammar, unit);
    }

    private LibraryPageResponse<GrammarListItemDTO> getGrammarList(List<Long> ids, LibrarySort sort, Integer page,
                                                                   Integer size, String q, String level,
                                                                   Boolean hasRules, CourseLanguage language) {
        List<String> levelCodes = courseLevelCatalog.parseLevelCodes(level, language);

        // 규칙표 보유 문법 id는 필터(hasRules=true)와 응답 필드에 함께 쓰므로 요청당 1회만 조회한다.
        Set<Long> grammarIdsWithRules = libraryGrammarQueryRepository.findGrammarIdsWithRules();
        // false는 지원하지 않는다 — true가 아니면 필터 미적용 (설계 §4-B-3)
        Set<Long> onlyGrammarIds = Boolean.TRUE.equals(hasRules) ? grammarIdsWithRules : null;

        int pageSize = LibraryPaging.resolveSize(size, DEFAULT_PAGE_SIZE);

        if (ids == null) {
            long totalElements = libraryGrammarQueryRepository.count(levelCodes, language, q, onlyGrammarIds, null);
            int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);
            List<GrammarListItemDTO> content = libraryGrammarQueryRepository
                    .findPage(levelCodes, language, q, onlyGrammarIds, (long) pageNumber * pageSize, pageSize)
                    .stream()
                    .map(row -> GrammarListItemDTO.from(row, grammarIdsWithRules.contains(row.getId())))
                    .toList();
            return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements,
                    libraryGrammarQueryRepository.countAll(language));
        }

        if (ids.isEmpty()) {
            return LibraryPageResponse.of(List.of(), 0, pageSize, 0L, 0L);
        }

        List<GrammarRow> matched =
                libraryGrammarQueryRepository.findAllByIds(levelCodes, language, q, onlyGrammarIds, ids);
        if (sort == LibrarySort.GIVEN) {
            matched = LibraryIds.sortByGivenOrder(matched, ids, GrammarRow::getId);
        }

        long totalElements = matched.size();
        long totalAll = libraryGrammarQueryRepository.count(List.of(), language, null, null, ids);
        int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);

        List<GrammarListItemDTO> content = LibraryPaging.slice(matched, pageNumber, pageSize).stream()
                .map(row -> GrammarListItemDTO.from(row, grammarIdsWithRules.contains(row.getId())))
                .toList();
        return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements, totalAll);
    }
}

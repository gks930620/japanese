package com.test.test.library;

import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseLevelCatalog;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.ExpressionEntity;
import com.test.test.library.dto.ExpressionDetailDTO;
import com.test.test.library.dto.ExpressionListItemDTO;
import com.test.test.library.dto.LibraryPageResponse;
import com.test.test.library.repository.ExpressionRow;
import com.test.test.library.repository.LibraryExpressionQueryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 영어 표현 자료실 (설계/04 §8-2 — 영어 자료실 3탭 중 첫 탭) — 읽기 전용.
 *
 * <p>문법·어휘 탭은 <b>일본어 서비스를 그대로 재사용</b>하지만(언어가 파라미터다) 표현은 일본어에 대응물이 없어
 * 서비스가 새로 생긴다. 그래도 구조는 {@link LibraryGrammarService}를 그대로 따른다 —
 * 페이지 보정·{@code ids}·{@code sort}·레벨 검증이 자료실 3탭에서 같은 규칙이어야 하기 때문이다.</p>
 *
 * <p>레벨 파라미터 검증은 {@link CourseLevelCatalog}에 맡긴다 — 영어 자료실에 {@code N5}를 주면 거기서 400이 난다
 * (설계/03 §1·§3 "한쪽 값으로 다른 쪽을 조회할 수 없다").</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryExpressionService {

    /** 기본 페이지 크기 — 문법 자료실과 같은 20. 표현은 한 줄이 길어 한자(50)처럼 촘촘히 두지 않는다 */
    public static final int DEFAULT_PAGE_SIZE = 20;

    private final LibraryExpressionQueryRepository libraryExpressionQueryRepository;
    private final CourseLevelCatalog courseLevelCatalog;

    /** 공개 API 경로 — 파라미터 문자열을 검증·파싱해 목록 조회로 넘긴다 */
    public LibraryPageResponse<ExpressionListItemDTO> getExpressionList(Integer page, Integer size, String q,
                                                                        String level, String ids, String sort,
                                                                        CourseLanguage language) {
        List<Long> idFilter = LibraryIds.parse(ids);
        LibrarySort sortBy = LibrarySort.from(sort);
        LibrarySort.requireIdsForGivenOrder(sortBy, idFilter);

        List<String> levelCodes = courseLevelCatalog.parseLevelCodes(level, language);
        int pageSize = LibraryPaging.resolveSize(size, DEFAULT_PAGE_SIZE);

        if (idFilter == null) {
            long totalElements = libraryExpressionQueryRepository.count(levelCodes, language, q, null);
            int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);
            List<ExpressionListItemDTO> content = libraryExpressionQueryRepository
                    .findPage(levelCodes, language, q, (long) pageNumber * pageSize, pageSize)
                    .stream()
                    .map(ExpressionListItemDTO::from)
                    .toList();
            return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements,
                    libraryExpressionQueryRepository.countAll(language));
        }

        List<ExpressionRow> matched =
                libraryExpressionQueryRepository.findAllByIds(levelCodes, language, q, idFilter);
        if (sortBy == LibrarySort.GIVEN) {
            matched = LibraryIds.sortByGivenOrder(matched, idFilter, ExpressionRow::getId);
        }

        long totalElements = matched.size();
        long totalAll = libraryExpressionQueryRepository.count(List.of(), language, null, idFilter);
        int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);

        List<ExpressionListItemDTO> content = LibraryPaging.slice(matched, pageNumber, pageSize).stream()
                .map(ExpressionListItemDTO::from)
                .toList();
        return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements, totalAll);
    }

    public ExpressionDetailDTO getExpressionDetail(Long expressionId, CourseLanguage language) {
        ExpressionEntity expression = libraryExpressionQueryRepository.findExpression(expressionId)
                .orElseThrow(() -> EntityNotFoundException.of("표현", expressionId));
        // 다른 과정의 표현 id는 없는 것으로 취급한다(설계/04 §8-2) — 배우는 유닛이 그 언어에 없으면 404다
        CourseUnitEntity unit = libraryExpressionQueryRepository.findLearnedInUnit(expressionId, language)
                .orElseThrow(() -> EntityNotFoundException.of("표현을 배우는 유닛", expressionId));

        return ExpressionDetailDTO.from(expression, unit);
    }
}

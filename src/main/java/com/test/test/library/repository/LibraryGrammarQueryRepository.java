package com.test.test.library.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.QCourseEntity;
import com.test.test.course.QCourseUnitEntity;
import com.test.test.course.content.GrammarExampleEntity;
import com.test.test.course.content.GrammarPointEntity;
import com.test.test.course.content.QGrammarExampleEntity;
import com.test.test.course.content.QGrammarPointEntity;
import com.test.test.course.content.QGrammarRuleEntity;
import com.test.test.course.mapping.QUnitGrammarEntity;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 문법 자료실 조회 전용 리포지토리 (설계 §4-B-3·§4-B-4, 성능 §4-B-7)
 * 문법↔유닛 매핑은 1:1이라 조인이 행을 늘리지 않는다.
 *
 * <p>{@code onlyGrammarIds}는 {@code hasRules} 필터, {@code ids}는 설계/04 §6-7의 부분 집합 필터다 —
 * 성격이 달라 두 조건을 따로 받는다(둘 다 걸리면 교집합).</p>
 */
@Repository
@RequiredArgsConstructor
public class LibraryGrammarQueryRepository {

    private static final QGrammarPointEntity GRAMMAR = QGrammarPointEntity.grammarPointEntity;
    private static final QGrammarRuleEntity GRAMMAR_RULE = QGrammarRuleEntity.grammarRuleEntity;
    private static final QGrammarExampleEntity GRAMMAR_EXAMPLE = QGrammarExampleEntity.grammarExampleEntity;
    private static final QUnitGrammarEntity UNIT_GRAMMAR = QUnitGrammarEntity.unitGrammarEntity;
    private static final QCourseUnitEntity UNIT = QCourseUnitEntity.courseUnitEntity;
    private static final QCourseEntity COURSE = QCourseEntity.courseEntity;

    private final JPAQueryFactory queryFactory;

    /**
     * 활용 규칙표를 가진 문법 id 집합 — 요청당 1회(25건 규모)만 조회해
     * hasRules 필터와 응답 필드에 함께 쓴다.
     */
    public Set<Long> findGrammarIdsWithRules() {
        return new LinkedHashSet<>(queryFactory
                .select(GRAMMAR_RULE.grammarPoint.id)
                .distinct()
                .from(GRAMMAR_RULE)
                .fetch());
    }

    /**
     * 문법 id 묶음 → 예문 (설계/04 §3-5) — <b>페이지 전체를 한 번에</b> 읽는다.
     *
     * <p>문법마다 상세를 부르면 N1 한 레벨이 69번의 왕복이 된다(설계/08 B-12가 없앤 것이 그것이다).
     * 정렬은 상세와 같은 {@code sortOrder ASC}라 같은 문법의 예문 순서가 두 화면에서 어긋나지 않는다.</p>
     *
     * @return 예문이 있는 문법만 담긴 맵 — 없는 문법은 키 자체가 없다(호출부가 빈 배열로 채운다)
     */
    public Map<Long, List<GrammarExampleEntity>> findExamplesByGrammarIds(Collection<Long> grammarIds) {
        if (grammarIds == null || grammarIds.isEmpty()) {
            return Map.of();
        }
        List<GrammarExampleEntity> examples = queryFactory
                .selectFrom(GRAMMAR_EXAMPLE)
                .where(GRAMMAR_EXAMPLE.grammarPoint.id.in(grammarIds))
                .orderBy(GRAMMAR_EXAMPLE.grammarPoint.id.asc(), GRAMMAR_EXAMPLE.sortOrder.asc())
                .fetch();

        Map<Long, List<GrammarExampleEntity>> byGrammarId = new LinkedHashMap<>();
        for (GrammarExampleEntity example : examples) {
            byGrammarId.computeIfAbsent(example.getGrammarPoint().getId(), unused -> new ArrayList<>()).add(example);
        }
        return byGrammarId;
    }

    public long countAll(CourseLanguage language) {
        return count(List.of(), language, null, null, null);
    }

    public long count(List<String> levelCodes, CourseLanguage language, String keyword, Set<Long> onlyGrammarIds,
                      Collection<Long> ids) {
        Long total = queryFactory
                .select(GRAMMAR.count())
                .from(UNIT_GRAMMAR)
                .join(UNIT_GRAMMAR.grammarPoint, GRAMMAR)
                .join(UNIT_GRAMMAR.unit, UNIT)
                .join(UNIT.course, COURSE)
                .where(levelCondition(levelCodes), languageCondition(language), searchCondition(keyword),
                        idCondition(onlyGrammarIds), idCondition(ids))
                .fetchOne();
        return total == null ? 0L : total;
    }

    public List<GrammarRow> findPage(List<String> levelCodes, CourseLanguage language, String keyword,
                                     Set<Long> onlyGrammarIds, long offset, int limit) {
        return baseQuery(levelCodes, language, keyword, onlyGrammarIds, null)
                .offset(offset)
                .limit(limit)
                .fetch();
    }

    /** {@code ids}로 좁힌 결과 전량 (학습 순서) — GIVEN 정렬·슬라이스는 서비스에서 한다 */
    public List<GrammarRow> findAllByIds(List<String> levelCodes, CourseLanguage language, String keyword,
                                         Set<Long> onlyGrammarIds, Collection<Long> ids) {
        return baseQuery(levelCodes, language, keyword, onlyGrammarIds, ids).fetch();
    }

    /** 지금 존재하는(유닛에 매핑된) id만 추린다 (설계/03 §4-1) */
    public List<Long> findExistingIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return queryFactory
                .select(GRAMMAR.id)
                .distinct()
                .from(UNIT_GRAMMAR)
                .join(UNIT_GRAMMAR.grammarPoint, GRAMMAR)
                .join(UNIT_GRAMMAR.unit, UNIT)
                .join(UNIT.course, COURSE)
                // 존재 판정 = 목록 조건(설계/08 C-21). 보관함 목록은 일본어 문법만 보여주므로 존재 판정도 일본어만 —
                // 영어 문법(9xxx)을 200으로 받아 개수에만 남는 "유령 북마크"를 막는다(2026-09 점검 H1). 어휘는 이미 JA 고정이다.
                .where(GRAMMAR.id.in(ids), COURSE.language.eq(CourseLanguage.JA.code()))
                .fetch();
    }

    public Optional<GrammarPointEntity> findGrammar(Long grammarId) {
        return Optional.ofNullable(queryFactory
                .selectFrom(GRAMMAR)
                .where(GRAMMAR.id.eq(grammarId))
                .fetchOne());
    }

    /** 이 문법을 배우는 유닛 (역링크 learnedIn + level의 근거) — 다른 과정의 문법이면 비어 있다(설계/04 §8-2) */
    public Optional<CourseUnitEntity> findLearnedInUnit(Long grammarId, CourseLanguage language) {
        return Optional.ofNullable(queryFactory
                .select(UNIT)
                .from(UNIT_GRAMMAR)
                .join(UNIT_GRAMMAR.unit, UNIT)
                .join(UNIT.course, COURSE).fetchJoin()
                .where(UNIT_GRAMMAR.grammarPoint.id.eq(grammarId), languageCondition(language))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc())
                .fetchFirst());
    }

    private JPAQuery<GrammarRow> baseQuery(List<String> levelCodes, CourseLanguage language, String keyword,
                                           Set<Long> onlyGrammarIds, Collection<Long> ids) {
        return queryFactory
                .select(Projections.constructor(GrammarRow.class,
                        GRAMMAR.id, GRAMMAR.name, GRAMMAR.nameKo, COURSE.levelCode))
                .from(UNIT_GRAMMAR)
                .join(UNIT_GRAMMAR.grammarPoint, GRAMMAR)
                .join(UNIT_GRAMMAR.unit, UNIT)
                .join(UNIT.course, COURSE)
                .where(levelCondition(levelCodes), languageCondition(language), searchCondition(keyword),
                        idCondition(onlyGrammarIds), idCondition(ids))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc(), UNIT_GRAMMAR.sortOrder.asc());
    }

    private BooleanExpression levelCondition(List<String> levelCodes) {
        return levelCodes == null || levelCodes.isEmpty() ? null : COURSE.levelCode.in(levelCodes);
    }

    /** 과정 언어 — 일본어 자료실에 영어 문법이 섞이지 않는다(설계/03 §3) */
    private BooleanExpression languageCondition(CourseLanguage language) {
        return COURSE.language.eq(language.code());
    }

    /** id 집합 조건 — null이면 미적용(hasRules 미적용 / ids 미적용) */
    private BooleanExpression idCondition(Collection<Long> ids) {
        return ids == null || ids.isEmpty() ? null : GRAMMAR.id.in(ids);
    }

    /** 일본어 명칭·한국어 부제 부분일치 (설계 §4-B-3 — 물결표를 뺀 'てから'도 자연 매칭) */
    private BooleanExpression searchCondition(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String trimmed = keyword.trim();
        return GRAMMAR.name.containsIgnoreCase(trimmed)
                .or(GRAMMAR.nameKo.containsIgnoreCase(trimmed));
    }
}

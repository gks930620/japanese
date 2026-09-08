package com.test.test.library.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.QCourseEntity;
import com.test.test.course.QCourseUnitEntity;
import com.test.test.course.content.ExpressionEntity;
import com.test.test.course.content.QExpressionEntity;
import com.test.test.course.mapping.QUnitExpressionEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 영어 표현 자료실 조회 전용 리포지토리 (설계/04 §8-2) — {@link LibraryGrammarQueryRepository}와 같은 형태다.
 *
 * <p>표현↔유닛 매핑은 코스 안에서 1:1이라 조인이 행을 늘리지 않는다(문법 자료실과 같은 전제).</p>
 *
 * <p>⚠️ <b>미해결로 남겨 둔 것</b>: 표현은 한자와 달리 <b>코스 간 중복이 허용</b>된다(설계/06 §11-5).
 * 코스 2가 열려 같은 표현이 두 코스에 매핑되면 이 쿼리는 <b>코스마다 한 행</b>을 낸다(레벨 배지가 다르므로
 * 완전한 중복은 아니다). 어휘처럼 병합할 것인지 문법처럼 나눌 것인지는 계약에 없다 —
 * 영어 코스 2 착수 전에 senior-dev가 정해야 한다. 지금(맛보기 1코스)은 발생하지 않는다.</p>
 */
@Repository
@RequiredArgsConstructor
public class LibraryExpressionQueryRepository {

    private static final QExpressionEntity EXPRESSION = QExpressionEntity.expressionEntity;
    private static final QUnitExpressionEntity UNIT_EXPRESSION = QUnitExpressionEntity.unitExpressionEntity;
    private static final QCourseUnitEntity UNIT = QCourseUnitEntity.courseUnitEntity;
    private static final QCourseEntity COURSE = QCourseEntity.courseEntity;

    private final JPAQueryFactory queryFactory;

    public long countAll(CourseLanguage language) {
        return count(List.of(), language, null, null);
    }

    public long count(List<String> levelCodes, CourseLanguage language, String keyword, Collection<Long> ids) {
        Long total = queryFactory
                .select(EXPRESSION.count())
                .from(UNIT_EXPRESSION)
                .join(UNIT_EXPRESSION.expression, EXPRESSION)
                .join(UNIT_EXPRESSION.unit, UNIT)
                .join(UNIT.course, COURSE)
                .where(levelCondition(levelCodes), languageCondition(language), searchCondition(keyword),
                        idCondition(ids))
                .fetchOne();
        return total == null ? 0L : total;
    }

    public List<ExpressionRow> findPage(List<String> levelCodes, CourseLanguage language, String keyword,
                                        long offset, int limit) {
        return baseQuery(levelCodes, language, keyword, null)
                .offset(offset)
                .limit(limit)
                .fetch();
    }

    /** {@code ids}로 좁힌 결과 전량 (학습 순서) — GIVEN 정렬·슬라이스는 서비스에서 한다 */
    public List<ExpressionRow> findAllByIds(List<String> levelCodes, CourseLanguage language, String keyword,
                                            Collection<Long> ids) {
        return baseQuery(levelCodes, language, keyword, ids).fetch();
    }

    public Optional<ExpressionEntity> findExpression(Long expressionId) {
        return Optional.ofNullable(queryFactory
                .selectFrom(EXPRESSION)
                .where(EXPRESSION.id.eq(expressionId))
                .fetchOne());
    }

    /** 이 표현을 배우는 <b>가장 이른</b> 유닛 (역링크 learnedIn + level의 근거) — 다른 과정이면 비어 있다(설계/04 §8-2) */
    public Optional<CourseUnitEntity> findLearnedInUnit(Long expressionId, CourseLanguage language) {
        return Optional.ofNullable(queryFactory
                .select(UNIT)
                .from(UNIT_EXPRESSION)
                .join(UNIT_EXPRESSION.unit, UNIT)
                .join(UNIT.course, COURSE).fetchJoin()
                .where(UNIT_EXPRESSION.expression.id.eq(expressionId), languageCondition(language))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc())
                .fetchFirst());
    }

    private JPAQuery<ExpressionRow> baseQuery(List<String> levelCodes, CourseLanguage language, String keyword,
                                              Collection<Long> ids) {
        return queryFactory
                .select(Projections.constructor(ExpressionRow.class,
                        EXPRESSION.id, EXPRESSION.text, EXPRESSION.meaningKo,
                        EXPRESSION.ipa, EXPRESSION.koApprox, COURSE.levelCode))
                .from(UNIT_EXPRESSION)
                .join(UNIT_EXPRESSION.expression, EXPRESSION)
                .join(UNIT_EXPRESSION.unit, UNIT)
                .join(UNIT.course, COURSE)
                .where(levelCondition(levelCodes), languageCondition(language), searchCondition(keyword),
                        idCondition(ids))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc(), UNIT_EXPRESSION.sortOrder.asc());
    }

    private BooleanExpression levelCondition(List<String> levelCodes) {
        return levelCodes == null || levelCodes.isEmpty() ? null : COURSE.levelCode.in(levelCodes);
    }

    /** 과정 언어 — 표현은 지금 영어에만 있지만 조건을 생략하지 않는다(생략은 곧 "언젠가 섞인다") */
    private BooleanExpression languageCondition(CourseLanguage language) {
        return COURSE.language.eq(language.code());
    }

    private BooleanExpression idCondition(Collection<Long> ids) {
        return ids == null || ids.isEmpty() ? null : EXPRESSION.id.in(ids);
    }

    /** 표현 원문·한국어 뜻 부분일치 */
    private BooleanExpression searchCondition(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String trimmed = keyword.trim();
        return EXPRESSION.text.containsIgnoreCase(trimmed)
                .or(EXPRESSION.meaningKo.containsIgnoreCase(trimmed));
    }
}

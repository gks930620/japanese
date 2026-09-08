package com.test.test.library.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.QCourseEntity;
import com.test.test.course.QCourseUnitEntity;
import com.test.test.course.content.KanjiEntity;
import com.test.test.course.content.QKanjiEntity;
import com.test.test.course.mapping.QUnitKanjiEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 한자 자료실 조회 전용 리포지토리 (설계 §4-B-1·§4-B-2, 성능 §4-B-7)
 *
 * <p>레벨 코드(course.level_code)·학습 순서는 매번 조인으로 읽는다 — 콘텐츠 테이블에 복제하지 않는다.
 * 목록은 엔티티가 아니라 {@link KanjiRow}로 직접 프로젝션해 N+1을 구조적으로 없앤다.
 * 한자↔유닛 매핑은 1:1이라 조인이 행을 늘리지 않는다.</p>
 *
 * <p>{@code ids}(설계/04 §6-7)는 "그 id의 항목만" 보는 부분 집합 필터다. 없는 id는 조용히 빠진다 —
 * 보관함(회원·게스트 공통)의 목록이 이 필터 위에 만들어진다.</p>
 */
@Repository
@RequiredArgsConstructor
public class LibraryKanjiQueryRepository {

    private static final QKanjiEntity KANJI = QKanjiEntity.kanjiEntity;
    private static final QUnitKanjiEntity UNIT_KANJI = QUnitKanjiEntity.unitKanjiEntity;
    private static final QCourseUnitEntity UNIT = QCourseUnitEntity.courseUnitEntity;
    private static final QCourseEntity COURSE = QCourseEntity.courseEntity;

    private final JPAQueryFactory queryFactory;

    /** 필터·검색을 걸지 않은 전체 개수 (화면 "1,000자 중 350자"의 앞 숫자) */
    public long countAll(CourseLanguage language) {
        return count(List.of(), language, null, null);
    }

    public long count(List<String> levelCodes, CourseLanguage language, String keyword, Collection<Long> ids) {
        Long total = queryFactory
                .select(KANJI.count())
                .from(UNIT_KANJI)
                .join(UNIT_KANJI.kanji, KANJI)
                .join(UNIT_KANJI.unit, UNIT)
                .join(UNIT.course, COURSE)
                .where(levelCondition(levelCodes), languageCondition(language),
                        searchCondition(keyword), idCondition(ids))
                .fetchOne();
        return total == null ? 0L : total;
    }

    public List<KanjiRow> findPage(List<String> levelCodes, CourseLanguage language, String keyword,
                                   long offset, int limit) {
        return baseQuery(levelCodes, language, keyword, null)
                .offset(offset)
                .limit(limit)
                .fetch();
    }

    /**
     * {@code ids}로 좁힌 결과 전량 (학습 순서). 페이징을 DB에서 하지 않는 이유:
     * {@code sort=GIVEN}이 "준 순서 그대로"라 DB 정렬로 표현할 수 없고, 대상 집합이 보관함 크기로 한정된다.
     */
    public List<KanjiRow> findAllByIds(List<String> levelCodes, CourseLanguage language, String keyword,
                                       Collection<Long> ids) {
        return baseQuery(levelCodes, language, keyword, ids).fetch();
    }

    /** 지금 존재하는(유닛에 매핑된) id만 추린다 — 보관함 개수·★ 집합의 읽기 시점 필터(설계/03 §4-1) */
    public List<Long> findExistingIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return queryFactory
                .select(KANJI.id)
                .distinct()
                .from(UNIT_KANJI)
                .join(UNIT_KANJI.kanji, KANJI)
                .where(KANJI.id.in(ids))
                .fetch();
    }

    public Optional<KanjiEntity> findKanji(Long kanjiId) {
        return Optional.ofNullable(queryFactory
                .selectFrom(KANJI)
                .where(KANJI.id.eq(kanjiId))
                .fetchOne());
    }

    /** 이 한자를 배우는 유닛 (역링크 learnedIn + level 계산의 근거) */
    public Optional<CourseUnitEntity> findLearnedInUnit(Long kanjiId) {
        return Optional.ofNullable(queryFactory
                .select(UNIT)
                .from(UNIT_KANJI)
                .join(UNIT_KANJI.unit, UNIT)
                .join(UNIT.course, COURSE).fetchJoin()
                .where(UNIT_KANJI.kanji.id.eq(kanjiId))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc())
                .fetchFirst());
    }

    private com.querydsl.jpa.impl.JPAQuery<KanjiRow> baseQuery(List<String> levelCodes, CourseLanguage language,
                                                               String keyword, Collection<Long> ids) {
        return queryFactory
                .select(Projections.constructor(KanjiRow.class,
                        KANJI.id, KANJI.letter, KANJI.meaningKo, KANJI.onyomi, KANJI.kunyomi, COURSE.levelCode))
                .from(UNIT_KANJI)
                .join(UNIT_KANJI.kanji, KANJI)
                .join(UNIT_KANJI.unit, UNIT)
                .join(UNIT.course, COURSE)
                .where(levelCondition(levelCodes), languageCondition(language),
                        searchCondition(keyword), idCondition(ids))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc(), UNIT_KANJI.sortOrder.asc());
    }

    private BooleanExpression levelCondition(List<String> levelCodes) {
        return levelCodes == null || levelCodes.isEmpty() ? null : COURSE.levelCode.in(levelCodes);
    }

    /** 과정 언어 — 일본어 자료실에 영어 콘텐츠가 섞이지 않는다(설계/03 §3 — 분리는 조회 조건 하나로 끝난다) */
    private BooleanExpression languageCondition(CourseLanguage language) {
        return COURSE.language.eq(language.code());
    }

    /** ids 필터 — null이면 미적용. 빈 목록은 서비스가 먼저 걸러 여기까지 오지 않는다 */
    private BooleanExpression idCondition(Collection<Long> ids) {
        return ids == null || ids.isEmpty() ? null : KANJI.id.in(ids);
    }

    /** 글자·훈음(한국어)·음독·훈독 부분일치 (설계 §4-B-1). 값이 없는 컬럼은 자연히 매칭되지 않는다. */
    private BooleanExpression searchCondition(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String trimmed = keyword.trim();
        return KANJI.letter.containsIgnoreCase(trimmed)
                .or(KANJI.meaningKo.containsIgnoreCase(trimmed))
                .or(KANJI.onyomi.containsIgnoreCase(trimmed))
                .or(KANJI.kunyomi.containsIgnoreCase(trimmed));
    }
}

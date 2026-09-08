package com.test.test.library.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.test.test.course.CourseLanguage;
import com.test.test.course.QCourseEntity;
import com.test.test.course.QCourseUnitEntity;
import com.test.test.course.content.QVocabularyEntity;
import com.test.test.course.mapping.QUnitVocabularyEntity;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 어휘 자료실 조회 전용 리포지토리 (설계 §4-B-5, 성능 §4-B-7)
 *
 * <p>어휘는 "표기+읽기" 병합이 페이징·총 개수의 전제라, 필터를 DB에서 걸어 잘라내면
 * 병합 대상 행(다른 레벨의 같은 단어)이 빠져 levels·senses가 어긋난다.
 * 그래서 전량(1,415행)을 학습 순서대로 한 번에 읽고 병합·필터·정렬·슬라이스를 서비스에서 한다.</p>
 */
@Repository
@RequiredArgsConstructor
public class LibraryVocabularyQueryRepository {

    private static final QVocabularyEntity VOCABULARY = QVocabularyEntity.vocabularyEntity;
    private static final QUnitVocabularyEntity UNIT_VOCABULARY = QUnitVocabularyEntity.unitVocabularyEntity;
    private static final QCourseUnitEntity UNIT = QCourseUnitEntity.courseUnitEntity;
    private static final QCourseEntity COURSE = QCourseEntity.courseEntity;

    private final JPAQueryFactory queryFactory;

    /** 학습 순서(코스 → 유닛 → 유닛 내 순서)로 정렬된 그 언어의 전체 행 */
    public List<VocabularyRow> findAllRowsInLearningOrder(CourseLanguage language) {
        return baseQuery(language).fetch();
    }

    /**
     * 주어진 어휘 id들이 속한 <b>병합 그룹의 모든 행</b>을 학습 순서로 (설계/03 §4-1 대표 id 정규화의 재료).
     *
     * <p>같은 표기를 가진 행을 서브쿼리로 함께 끌어와 <b>한 번의 쿼리</b>로 끝낸다 —
     * 유닛 학습의 {@code entryId}(설계/04 §6-1)를 어휘당 1쿼리로 채우면 N+1이 된다.</p>
     */
    public List<VocabularyRow> findGroupRowsByVocabularyIds(Collection<Long> vocabularyIds,
                                                           CourseLanguage language) {
        if (vocabularyIds == null || vocabularyIds.isEmpty()) {
            return List.of();
        }
        QVocabularyEntity member = new QVocabularyEntity("memberVocabulary");
        return baseQuery(language)
                .where(VOCABULARY.word.in(JPAExpressions
                        .select(member.word)
                        .from(member)
                        .where(member.id.in(vocabularyIds))))
                .fetch();
    }

    private com.querydsl.jpa.impl.JPAQuery<VocabularyRow> baseQuery(CourseLanguage language) {
        return queryFactory
                .select(Projections.constructor(VocabularyRow.class,
                        VOCABULARY.id, VOCABULARY.word, VOCABULARY.kana,
                        VOCABULARY.ipa, VOCABULARY.koApprox, VOCABULARY.partOfSpeech,
                        VOCABULARY.meaningKo,
                        COURSE.id, COURSE.title, COURSE.levelCode, UNIT.unitNo, UNIT.title))
                .from(UNIT_VOCABULARY)
                .join(UNIT_VOCABULARY.vocabulary, VOCABULARY)
                .join(UNIT_VOCABULARY.unit, UNIT)
                .join(UNIT.course, COURSE)
                // 과정 언어로 먼저 가른다 — 병합 그룹에 다른 과정의 행이 섞이면 levels·senses가 어긋난다(설계/03 §3)
                .where(COURSE.language.eq(language.code()))
                .orderBy(COURSE.courseNo.asc(), UNIT.unitNo.asc(), UNIT_VOCABULARY.sortOrder.asc());
    }
}

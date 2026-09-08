package com.test.test.english;

import com.test.test.course.CourseEntity;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseService;
import com.test.test.course.CourseUnitEntity;
import com.test.test.course.UnitStudyBase;
import com.test.test.course.dto.CourseDTO;
import com.test.test.course.dto.ExpressionDTO;
import com.test.test.course.mapping.UnitExpressionEntity;
import com.test.test.course.repository.CourseUnitRepository;
import com.test.test.course.repository.UnitContentCount;
import com.test.test.course.repository.UnitExpressionRepository;
import com.test.test.course.repository.UnitGrammarRepository;
import com.test.test.course.repository.UnitVocabularyRepository;
import com.test.test.english.dto.EnCourseDetailDTO;
import com.test.test.english.dto.EnUnitStudyDTO;
import com.test.test.english.dto.EnUnitSummaryDTO;
import com.test.test.english.dto.EnVocabularyDTO;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 영어 과정 코스 학습 서비스 (설계/04 §8·§8-1)
 *
 * <p><b>일본어 서비스를 복제하지 않는다</b>(설계/04 §8) — 코스 목록과 유닛 학습의 공통부는
 * {@link CourseService}가 그대로 계산하고({@code getCourseList(EN)} · {@code loadUnitStudyBase(..., EN)}),
 * 이 서비스는 <b>영어에서만 다른 것</b>만 채운다: 3번째 자리의 표현, 어휘의 ipa·koApprox 표기.</p>
 *
 * <p>언어는 요청 파라미터가 아니라 여기 고정된 상수다 — 경로가 곧 언어이기 때문이고(판정 J-7),
 * 그래서 "파라미터를 빠뜨려 조용히 일본어가 나가는" 사고가 구조적으로 불가능하다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnCourseService {

    private static final CourseLanguage LANGUAGE = CourseLanguage.EN;

    private final CourseService courseService;
    private final CourseUnitRepository courseUnitRepository;
    private final UnitGrammarRepository unitGrammarRepository;
    private final UnitExpressionRepository unitExpressionRepository;
    private final UnitVocabularyRepository unitVocabularyRepository;

    /** 영어 코스 목록 — 일본어 목록에 영어가 섞이지 않고, 그 반대도 마찬가지다(설계/04 §8) */
    public List<CourseDTO> getCourseList() {
        return courseService.getCourseList(LANGUAGE);
    }

    /**
     * 영어 코스 상세 — 한자 집계 자리가 표현 집계다. 준비중 코스도 200(빈 units·0 summary)이고
     * 프론트가 status로 분기한다(일본어와 같은 규칙).
     */
    public EnCourseDetailDTO getCourseDetail(Long courseId) {
        CourseEntity course = courseService.findCourse(courseId, LANGUAGE);

        List<CourseUnitEntity> units = courseUnitRepository.findByCourseIdOrderByUnitNoAsc(courseId);
        Map<Long, Long> grammarCounts = toCountMap(unitGrammarRepository.countByCourseIdGroupByUnit(courseId));
        Map<Long, Long> expressionCounts = toCountMap(unitExpressionRepository.countByCourseIdGroupByUnit(courseId));
        Map<Long, Long> vocabCounts = toCountMap(unitVocabularyRepository.countByCourseIdGroupByUnit(courseId));

        List<EnUnitSummaryDTO> unitSummaries = units.stream()
                .map(unit -> EnUnitSummaryDTO.from(unit,
                        grammarCounts.getOrDefault(unit.getId(), 0L),
                        expressionCounts.getOrDefault(unit.getId(), 0L),
                        vocabCounts.getOrDefault(unit.getId(), 0L)))
                .toList();

        EnCourseDetailDTO.SummaryDTO summary = EnCourseDetailDTO.SummaryDTO.builder()
                .unitCount(units.size())
                .grammarCount(sum(grammarCounts))
                .expressionCount(sum(expressionCounts))
                .vocabCount(sum(vocabCounts))
                .build();

        return EnCourseDetailDTO.from(course, summary, unitSummaries);
    }

    /**
     * 영어 유닛 학습 (설계/04 §8-1) — 문법·회화·이동 정보·복습은 일본어와 같은 계산을 쓰고
     * {@code expressions[]}와 어휘 표기만 여기서 만든다.
     */
    public EnUnitStudyDTO getUnitStudy(Long courseId, Integer unitNo) {
        UnitStudyBase base = courseService.loadUnitStudyBase(courseId, unitNo, LANGUAGE);

        List<ExpressionDTO> expressions =
                unitExpressionRepository.findWithExpressionByUnitId(base.getUnit().getId()).stream()
                        .map(UnitExpressionEntity::getExpression)
                        .map(ExpressionDTO::from)
                        .toList();

        List<EnVocabularyDTO> vocabularies = base.getVocabularies().stream()
                .map(vocabulary -> EnVocabularyDTO.from(vocabulary, base.entryIdOf(vocabulary)))
                .toList();

        return EnUnitStudyDTO.from(base.getCourse(), base.getUnit(), base.getTotalUnits(), base.getNextCourse(),
                base.getGrammars(), base.getDialog(), expressions, vocabularies, base.getReview());
    }

    private Map<Long, Long> toCountMap(List<UnitContentCount> counts) {
        return counts.stream()
                .collect(Collectors.toMap(UnitContentCount::getUnitId, UnitContentCount::getCnt));
    }

    private long sum(Map<Long, Long> counts) {
        return counts.values().stream().mapToLong(Long::longValue).sum();
    }
}

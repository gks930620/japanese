package com.test.test.course;

import com.test.test.course.content.VocabularyEntity;
import com.test.test.course.dto.DialogDTO;
import com.test.test.course.dto.GrammarDTO;
import com.test.test.course.dto.NextCourseDTO;
import com.test.test.course.dto.UnitReviewDTO;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 유닛 학습의 <b>언어 공통 부분</b> (설계/04 §8-1) — 응답 DTO가 아니라 서비스 사이의 전달 묶음이다.
 *
 * <p>일본어와 영어 유닛은 3번째 자리(한자/표현)만 다르고 나머지는 같다. 그 "나머지"를 여기 모아
 * 유닛 학습 서비스를 두 벌로 복제하지 않는다(설계/04 §8 — 복제하면 규칙이 곧 갈린다).</p>
 *
 * <p>어휘는 DTO가 아니라 <b>엔티티 + entryId 맵</b>으로 넘긴다 — 일본어는 kana를, 영어는 ipa·koApprox를
 * 싣기 때문에 표현 형태가 갈린다(계약 J-8 — 영어에 kana를 재사용하지 않는다).</p>
 */
@Getter
@Builder
@AllArgsConstructor
public class UnitStudyBase {

    private final CourseEntity course;
    private final CourseUnitEntity unit;
    private final int totalUnits;
    private final NextCourseDTO nextCourse;
    private final List<GrammarDTO> grammars;
    private final DialogDTO dialog;
    private final List<VocabularyEntity> vocabularies;
    private final Map<Long, Long> entryIds;
    private final UnitReviewDTO review;

    /** 어휘의 자료실 표제어 대표 id (설계/04 §6-1) — 병합 결과가 없으면 자기 id가 곧 대표다 */
    public Long entryIdOf(VocabularyEntity vocabulary) {
        return entryIds.getOrDefault(vocabulary.getId(), vocabulary.getId());
    }
}

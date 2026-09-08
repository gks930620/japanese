package com.test.test.library.repository;

import com.test.test.course.content.PartOfSpeech;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 어휘 조회 프로젝션 — 병합 전 원본 1행(= 뜻 1개) (설계 §4-B-5, 성능 §4-B-7)
 *
 * <p>병합·가나순 정렬은 DB GROUP BY로 가타카나→히라가나 정규화가 불가해 서비스에서 처리한다.
 * 그래서 여기서는 조인 결과를 평평한 행으로 한 번에 받아 둔다(어휘당 추가 쿼리 없음).</p>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyRow {

    private Long id;
    private String word;
    private String kana;
    /** 영어 발음 — 국제음성기호. 일본어 행은 null이다(계약 J-8) */
    private String ipa;
    /** 영어 발음 — 한글 근사. ipa와 항상 짝이다(08 F-18 "둘 다 표기") */
    private String koApprox;
    private PartOfSpeech partOfSpeech;
    private String meaningKo;
    private Long courseId;
    private String courseTitle;
    private String levelCode;
    private Integer unitNo;
    private String unitTitle;
}

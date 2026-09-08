package com.test.test.course;

import com.test.test.common.exception.BusinessRuleException;
import java.util.Locale;

/**
 * 과정 언어 (설계/03 §3 — {@code course.language})
 *
 * <p>코스·유닛·콘텐츠 테이블을 복제하지 않고 <b>조회 조건 하나로</b> 과정을 가른다.
 * 경로가 언어를 정하므로({@code /api/courses} = JA, {@code /api/en/**} = EN — 설계/04 §8 J-7)
 * 이 값은 요청 파라미터가 아니라 컨트롤러가 고정해 서비스에 넘긴다.</p>
 */
public enum CourseLanguage {

    JA,
    EN;

    /** 시드가 넣은 문자열({@code 'JA'}·{@code 'EN'})을 값으로 되돌린다 — 없는 값은 데이터 오류다 */
    public static CourseLanguage of(String raw) {
        if (raw == null) {
            throw new BusinessRuleException("과정 언어가 비어 있습니다.");
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("지원하지 않는 과정 언어입니다: " + raw);
        }
    }

    /** DB에 저장된 표기 — 컬럼이 VARCHAR(2)라 enum 이름과 같은 값이다 */
    public String code() {
        return name();
    }
}

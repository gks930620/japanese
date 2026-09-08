package com.test.test.course;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 코스 (설계 §1 course — 시드 전용, 런타임 쓰기 없음)
 */
@Entity
@Table(name = "course",
        // course_no는 언어 안에서만 유일하다 — 일본어 1(N5)과 영어 1(E1)이 공존한다(설계/03 §3).
        uniqueConstraints = @UniqueConstraint(name = "uk_course_language_no", columnNames = {"language", "course_no"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CourseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_no", nullable = false)
    private Integer courseNo;

    /**
     * ★ 필터에 쓰는 <b>코드</b>(INTRO·N5~N1·E1~E5) — 표시 문구(levelLabel)와 DB에서부터 가른다(설계/03 §1·§3).
     * courseNo 파생을 폐기한 이유: 언어가 둘이 되는 순간 파생이 언어에 종속된다
     * (일본어 courseNo 1 = N5, 영어 courseNo 1 = E1). 입문은 라벨이 "문자"라 문자열로 코드를 만들 수도 없다.
     */
    @Column(name = "level_code", nullable = false, length = 10)
    private String levelCode;

    /** 표시 문구 — 화면이 그대로 쓴다. 영어 과정은 코스명이 단계 이름이라 화면에서 쓰지 않는다(설계/06 §11-2) */
    @Column(name = "level_label", nullable = false, length = 30)
    private String levelLabel;

    /**
     * 과정 언어 — {@code JA}(일본어) | {@code EN}(영어). <b>DEFAULT 'JA'</b>라 기존 시드·기존 쿼리가 한 줄도 안 바뀐다(설계/03 §3).
     * 언어 분리는 조회 조건 하나로 끝난다 — 코스·유닛·콘텐츠 테이블을 복제하지 않는다.
     */
    @Column(nullable = false, length = 2, columnDefinition = "varchar(2) default 'JA'")
    private String language;

    @Column(nullable = false, length = 50)
    private String title;

    @Column(name = "target_audience", nullable = false, length = 100)
    private String targetAudience;

    @Column(nullable = false, length = 150)
    private String goal;

    @Column(length = 200)
    private String notice;

    @Column(length = 300)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CourseStatus status;

    // ===== 도메인 메서드 =====

    public boolean isPreparing() {
        return this.status == CourseStatus.PREPARING;
    }

    /** 영어 과정인가 — 언어별 분기(허용 레벨 코드·자료실 탭)가 이 판정 하나를 쓴다 */
    public boolean isEnglish() {
        return "EN".equalsIgnoreCase(language);
    }
}

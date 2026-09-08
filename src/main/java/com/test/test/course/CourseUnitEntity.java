package com.test.test.course;

import com.test.test.course.content.DialogEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 코스 유닛 (설계 §1 course_unit — N5에 20행)
 * unit_no는 코스 안 순번(1~20)으로 URL의 {unitNo}에 대응한다.
 */
@Entity
@Table(name = "course_unit",
        uniqueConstraints = @UniqueConstraint(name = "uk_course_unit_no", columnNames = {"course_id", "unit_no"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CourseUnitEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity course;

    @Column(name = "unit_no", nullable = false)
    private Integer unitNo;

    @Column(nullable = false, length = 100)
    private String title;

    // 유닛당 회화 1편 (설계 원칙 — dialog 자체는 독립 테이블이라 재사용 가능)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dialog_id", nullable = false)
    private DialogEntity dialog;
}

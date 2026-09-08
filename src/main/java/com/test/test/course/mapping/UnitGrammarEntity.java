package com.test.test.course.mapping;

import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.GrammarPointEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유닛-문법 매핑 (설계 §1 unit_grammar — 유닛의 "플레이리스트")
 * sort_order = 유닛 안 문법 스텝 순서.
 */
@Entity
@Table(name = "unit_grammar",
        uniqueConstraints = @UniqueConstraint(name = "uk_unit_grammar", columnNames = {"unit_id", "grammar_point_id"}),
        // 자료실 역방향 조회(콘텐츠 → 유닛)가 매 요청 발생한다 (설계 §4-B-7)
        indexes = @Index(name = "idx_unit_grammar_grammar_point_id", columnList = "grammar_point_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UnitGrammarEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private CourseUnitEntity unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grammar_point_id", nullable = false)
    private GrammarPointEntity grammarPoint;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}

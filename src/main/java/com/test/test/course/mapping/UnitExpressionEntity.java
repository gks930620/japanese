package com.test.test.course.mapping;

import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.ExpressionEntity;
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
 * 유닛-표현 매핑 (설계/03 §3 {@code unit_expression}) — 매핑 3종({@code unit_grammar}·{@code unit_kanji}·
 * {@code unit_vocabulary})과 같은 형태다. sort_order = 표현 카드 순서.
 *
 * <p>UNIQUE (unit_id, expression_id)가 <b>코스 내부 중복 금지</b>의 1차 방어다(설계/03 §3) —
 * 유닛을 넘는 중복은 시드 규칙·테스트가 잡는다.</p>
 */
@Entity
@Table(name = "unit_expression",
        uniqueConstraints = @UniqueConstraint(name = "uk_unit_expression",
                columnNames = {"unit_id", "expression_id"}),
        // 자료실 역방향 조회(콘텐츠 → 유닛)가 매 요청 발생한다 (설계 §4-B-7)
        indexes = @Index(name = "idx_unit_expression_expression_id", columnList = "expression_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UnitExpressionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private CourseUnitEntity unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expression_id", nullable = false)
    private ExpressionEntity expression;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}

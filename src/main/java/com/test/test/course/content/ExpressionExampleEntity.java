package com.test.test.course.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 영어 표현 예문 (설계/03 §3 {@code expression_example}) — 표현당 1~2행.
 * 문법 예문(grammar_example)과 같은 형태이며, 필드 이름만 {@code jp} → {@code en}이다.
 */
@Entity
@Table(name = "expression_example")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExpressionExampleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expression_id", nullable = false)
    private ExpressionEntity expression;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(nullable = false, length = 300)
    private String en;

    @Column(name = "meaning_ko", nullable = false, length = 300)
    private String meaningKo;
}

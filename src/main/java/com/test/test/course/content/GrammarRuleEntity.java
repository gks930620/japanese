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
 * 활용 규칙표 행 (설계 §1 grammar_rule, §7-7에서 추가)
 * 활용 계열 문법(て형·ない형·형용사 과거형 등)에만 선택적으로 붙는다.
 * 한 행 = 한 변환 (그룹 라벨 + 패턴 + 변환 예 1쌍). 규칙표가 없는 문법(대부분)은 행이 없다.
 */
@Entity
@Table(name = "grammar_rule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GrammarRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grammar_point_id", nullable = false)
    private GrammarPointEntity grammarPoint;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "group_label", nullable = false, length = 50)
    private String groupLabel;

    @Column(nullable = false, length = 100)
    private String pattern;

    @Column(name = "example_before", nullable = false, length = 50)
    private String exampleBefore;

    @Column(name = "example_after", nullable = false, length = 50)
    private String exampleAfter;

    /** 활용표 전체 교체용 생성 팩토리 (계약 판정 ④) — sortOrder는 요청 배열의 순서다 */
    public static GrammarRuleEntity of(GrammarPointEntity grammarPoint, int sortOrder, String groupLabel,
                                       String pattern, String exampleBefore, String exampleAfter) {
        GrammarRuleEntity rule = new GrammarRuleEntity();
        rule.grammarPoint = grammarPoint;
        rule.sortOrder = sortOrder;
        rule.groupLabel = groupLabel;
        rule.pattern = pattern;
        rule.exampleBefore = exampleBefore;
        rule.exampleAfter = exampleAfter;
        return rule;
    }
}

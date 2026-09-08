package com.test.test.course.mapping;

import com.test.test.course.CourseUnitEntity;
import com.test.test.course.content.KanjiEntity;
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
 * 유닛-한자 매핑 (설계 §1 unit_kanji) — sort_order = 한자 카드 순서.
 */
@Entity
@Table(name = "unit_kanji",
        uniqueConstraints = @UniqueConstraint(name = "uk_unit_kanji", columnNames = {"unit_id", "kanji_id"}),
        // 자료실 역방향 조회(콘텐츠 → 유닛)가 매 요청 발생한다 (설계 §4-B-7)
        indexes = @Index(name = "idx_unit_kanji_kanji_id", columnList = "kanji_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UnitKanjiEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private CourseUnitEntity unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    private KanjiEntity kanji;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}

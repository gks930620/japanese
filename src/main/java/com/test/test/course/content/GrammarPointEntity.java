package com.test.test.course.content;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 문법 항목 (설계 §1 grammar_point — 독립 콘텐츠, 자료실 문법 사전이 재사용)
 */
@Entity
@Table(name = "grammar_point")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GrammarPointEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_ko", nullable = false, length = 100)
    private String nameKo;

    @Column(nullable = false, length = 500)
    private String explanation;

    @OneToMany(mappedBy = "grammarPoint", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<GrammarExampleEntity> examples = new ArrayList<>();

    // 활용 규칙표 (§7-7) — 활용 계열 문법만 행이 있고, 대부분은 빈 컬렉션
    @OneToMany(mappedBy = "grammarPoint", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<GrammarRuleEntity> rules = new ArrayList<>();

    // ── 편집 모드 도메인 메서드 (설계/04 §9) ─────────────────────────────────

    /** 설명 수정 — 표제(name·nameKo)는 시드 소관이라 받지 않는다 */
    public void updateExplanation(String explanation) {
        this.explanation = explanation;
    }

    /**
     * 활용표 <b>전체 교체</b> (계약 판정 ④) — "행이 하나 빠졌다"가 활용표의 보고된 오류 형태라
     * 예문과 달리 행 추가·삭제를 허용한다. orphanRemoval이 기존 행을 지우고 배열 순서가 sortOrder가 된다.
     */
    public void replaceRules(java.util.List<GrammarRuleEntity> newRules) {
        this.rules.clear();
        this.rules.addAll(newRules);
    }
}

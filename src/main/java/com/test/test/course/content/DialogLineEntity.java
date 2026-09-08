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
 * 회화 대사 (설계 §1 dialog_line)
 * kana는 원문(jp)이 전부 가나면 NULL (설계 §2 표기 규칙).
 */
@Entity
@Table(name = "dialog_line")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DialogLineEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dialog_id", nullable = false)
    private DialogEntity dialog;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(nullable = false, length = 30)
    private String speaker;

    @Column(nullable = false, length = 300)
    private String jp;

    @Column(length = 300)
    private String kana;

    @Column(name = "meaning_ko", nullable = false, length = 300)
    private String meaningKo;

    /** 편집 모드 수정 (설계/04 §9) — 대사는 수정만, 행 추가·삭제 없음(id 일치는 서비스가 검증) */
    public void update(String speaker, String jp, String kana, String meaningKo) {
        this.speaker = speaker;
        this.jp = jp;
        this.kana = kana;
        this.meaningKo = meaningKo;
    }
}

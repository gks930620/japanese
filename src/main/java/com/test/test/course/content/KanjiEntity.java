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
 * 한자 (설계 §1 kanji — 100자, 자료실 한자 사전이 재사용)
 * character는 SQL 예약어라 컬럼명은 letter (설계 §1).
 * onyomi·kunyomi 중 최소 1개는 값이 있어야 한다 (앱 검증 — DB 제약 아님).
 */
@Entity
@Table(name = "kanji")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KanjiEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 4)
    private String letter;

    @Column(name = "meaning_ko", nullable = false, length = 50)
    private String meaningKo;

    @Column(length = 50)
    private String onyomi;

    @Column(length = 50)
    private String kunyomi;

    @OneToMany(mappedBy = "kanji", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<KanjiWordEntity> words = new ArrayList<>();

    // ── 편집 모드 도메인 메서드 (설계/04 §9) ─────────────────────────────────
    // setter를 열지 않는 이유: 무엇이 고쳐질 수 있는가(훈음·읽기)와 없는가(letter)가 메서드 서명으로 드러난다.

    /** 훈음·읽기 수정 — 표제(letter)는 시드 소관이라 받지 않는다. 빈 읽기는 null로 저장한다(시드와 같은 규칙) */
    public void updateReadings(String meaningKo, String onyomi, String kunyomi) {
        this.meaningKo = meaningKo;
        this.onyomi = onyomi;
        this.kunyomi = kunyomi;
    }
}

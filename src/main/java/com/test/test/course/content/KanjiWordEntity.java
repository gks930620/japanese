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
 * 한자 예시 단어 (설계 §1 kanji_word — 글자당 1~2행)
 */
@Entity
@Table(name = "kanji_word")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KanjiWordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    private KanjiEntity kanji;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(nullable = false, length = 50)
    private String word;

    @Column(length = 50)
    private String kana;

    @Column(name = "meaning_ko", nullable = false, length = 100)
    private String meaningKo;

    /** 편집 모드 수정 (설계/04 §9) — 행 추가·삭제는 없다(id 일치는 서비스가 검증한다) */
    public void update(String word, String kana, String meaningKo) {
        this.word = word;
        this.kana = kana;
        this.meaningKo = meaningKo;
    }
}

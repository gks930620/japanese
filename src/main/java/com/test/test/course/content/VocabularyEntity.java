package com.test.test.course.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 어휘 (설계 §1 vocabulary — 자료실 어휘 사전이 재사용)
 * kana는 단어(word)가 전부 가나면 NULL — 화면은 "─" 표기 (설계 §2).
 * partOfSpeech(§7-12)는 DB NULL 허용(기존 행 마이그레이션 안전)이되 시드는 전량 채운다 — API 응답은 항상 non-null.
 */
@Entity
@Table(name = "vocabulary")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VocabularyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String word;

    @Column(length = 50)
    private String kana;

    @Column(name = "meaning_ko", nullable = false, length = 100)
    private String meaningKo;

    @Enumerated(EnumType.STRING)
    @Column(name = "part_of_speech", length = 20)
    private PartOfSpeech partOfSpeech;

    /**
     * 영어 발음 — 국제음성기호 (계약 J-8). 일본어 행은 전량 NULL이다.
     * <p>kana를 재사용하지 않는 이유: kana 계약은 "원문에 한자가 있을 때만"이고 {@link com.test.test.editor.KanaContract}가
     * 그것을 강제한다 — 영어에 kana를 채우면 그 검증기가 영어를 거부한다.</p>
     */
    @Column(length = 100)
    private String ipa;

    /** 영어 발음 — 한글 근사 표기. IPA와 <b>둘 다</b> 표기한다(08 F-18 확정) */
    @Column(name = "ko_approx", length = 100)
    private String koApprox;

    /** 편집 모드 수정 (설계/04 §9) — 표제(word)는 시드 소관이라 받지 않는다 */
    public void update(String meaningKo, String kana, PartOfSpeech partOfSpeech) {
        this.meaningKo = meaningKo;
        this.kana = kana;
        this.partOfSpeech = partOfSpeech;
    }
}

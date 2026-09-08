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
 * 영어 표현 (설계/03 §3 판정 J-6 — 유닛의 <b>한자 자리</b>에 들어간다)
 *
 * <p>표현 = 단어보다 크고 문장보다 작은, 통째로 외워 쓰는 덩어리(구동사·연어·관용표현을 한 종류로 다룬다 — 설계/06 §11-5).</p>
 *
 * <p><b>{@code text}에 UNIQUE를 걸지 않는다</b>(설계/03 §3) — {@code kanji.letter} UNIQUE와 정반대다.
 * 한자는 상용한자 2,136자라는 <b>닫힌 집합</b>이라 중복이 곧 오류지만, 표현은 <b>열린 집합</b>이고
 * 같은 표현이 상위 코스에서 다른 뉘앙스로 다시 나오는 것이 정상이다(설계/06 §11-5).
 * 코스 <b>내부</b> 중복만 금지이며 그것은 시드 규칙이다.</p>
 *
 * <p>발음은 {@code kana}를 재사용하지 않는다(판정 J-8) — kana 계약("원문에 한자가 있을 때만")을
 * {@link com.test.test.editor.KanaContract}가 강제하고 있어 영어를 넣으면 그 검증기가 거부한다.
 * 대신 {@code ipa}(국제음성기호)와 {@code koApprox}(한글 근사) <b>둘 다</b> 싣는다(08 F-18 확정).</p>
 */
@Entity
@Table(name = "expression")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExpressionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 표현 원문 — 예: {@code get up}, {@code take a shower} */
    @Column(nullable = false, length = 100)
    private String text;

    @Column(name = "meaning_ko", nullable = false, length = 200)
    private String meaningKo;

    /** 언제·어떻게 쓰는가 한두 문장 — 없으면 null(화면이 문단을 만들지 않는다) */
    @Column(name = "usage_note", length = 300)
    private String usageNote;

    /** 국제음성기호 */
    @Column(length = 100)
    private String ipa;

    /** 한글 근사 표기 — IPA를 못 읽는 학습자를 위한 것이라 IPA와 <b>함께</b> 존재한다 */
    @Column(name = "ko_approx", length = 100)
    private String koApprox;

    @OneToMany(mappedBy = "expression", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ExpressionExampleEntity> examples = new ArrayList<>();
}

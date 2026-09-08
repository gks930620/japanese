package com.test.test.course.content;

import com.test.test.common.exception.BusinessRuleException;
import com.test.test.course.CourseLanguage;
import java.util.Locale;
import java.util.Set;

/**
 * 어휘 품사 (설계/06 §8 — 일본어 7종 / 설계/06 §11-6 — 영어 7종)
 * 자료실 어휘 사전의 필터 값이자 유닛 학습 어휘의 표시 근거.
 * 한국어 라벨은 서버가 내려주지 않는다 — 표시 문구는 프론트 상수로 매핑한다.
 *
 * <p><b>컬럼은 공유하되 허용 집합이 언어별로 다르다</b>(설계/06 §11-6). {@code I_ADJECTIVE}·{@code NA_ADJECTIVE}는
 * 영어에 존재하지 않고, {@code ADJECTIVE}·{@code PREPOSITION}·{@code PHRASE}는 일본어에 존재하지 않는다.
 * 값을 하나의 enum에 모아 두고 <b>검증만 언어별로</b> 하는 이유: 어휘 테이블이 하나라 컬럼도 하나이고,
 * enum을 둘로 쪼개면 {@code vocabulary.part_of_speech} 하나를 두 타입으로 읽어야 한다.</p>
 *
 * <p>일본어 7종 (설계 §7-12)</p>
 * - NOUN: 명사(대명사·수사·조수사 포함) 建物, トイレ, 一つ
 * - VERB: 동사(사전형/ます형 어느 쪽으로 등재하든) 行く, 食べる, する
 * - I_ADJECTIVE: い형용사 高い, いい
 * - NA_ADJECTIVE: な형용사 静か, 便利
 * - ADVERB: 부사 とても, もう, ゆっくり
 * - CONJUNCTION: 접속사 でも, それから, しかし
 * - EXPRESSION: 인사·정형 표현·구(句) 등 위 6종에 안 들어가는 것 こんにちは
 *
 * <p>영어 7종 (설계/06 §11-6)</p>
 * - NOUN / VERB / ADJECTIVE / ADVERB / PREPOSITION / CONJUNCTION / PHRASE
 *
 * 판단 규칙: 애매하면 EXPRESSION(영어는 PHRASE)으로 몰지 말고 어간의 품사를 우선한다(お祝い = NOUN).
 * 문장 단위로 등재된 정형구만 EXPRESSION/PHRASE.
 */
public enum PartOfSpeech {
    NOUN,
    VERB,
    I_ADJECTIVE,
    NA_ADJECTIVE,
    ADVERB,
    CONJUNCTION,
    EXPRESSION,
    // ── 영어 전용 (설계/06 §11-6) ───────────────────────────────────────────
    ADJECTIVE,
    PREPOSITION,
    PHRASE;

    private static final Set<PartOfSpeech> JAPANESE =
            Set.of(NOUN, VERB, I_ADJECTIVE, NA_ADJECTIVE, ADVERB, CONJUNCTION, EXPRESSION);

    private static final Set<PartOfSpeech> ENGLISH =
            Set.of(NOUN, VERB, ADJECTIVE, ADVERB, PREPOSITION, CONJUNCTION, PHRASE);

    /** 그 과정에서 쓸 수 있는 품사 — 자료실 {@code pos} 파라미터 검증의 단일 출처 */
    public static Set<PartOfSpeech> allowedFor(CourseLanguage language) {
        return language == CourseLanguage.EN ? ENGLISH : JAPANESE;
    }

    /** 그 과정의 허용 목록을 사람이 읽는 순서로 — 오류 메시지가 "무엇을 쓸 수 있는지"를 말해 준다 */
    public static String allowedCodesFor(CourseLanguage language) {
        return language == CourseLanguage.EN
                ? "NOUN·VERB·ADJECTIVE·ADVERB·PREPOSITION·CONJUNCTION·PHRASE"
                : "NOUN·VERB·I_ADJECTIVE·NA_ADJECTIVE·ADVERB·CONJUNCTION·EXPRESSION";
    }

    /**
     * 파라미터 문자열 1개를 그 과정의 품사로 변환한다. 없는 코드도, <b>다른 과정의 코드도</b> 여기서 걸린다
     * (설계/06 §11-6 — 섞이면 400).
     */
    public static PartOfSpeech of(String code, CourseLanguage language) {
        PartOfSpeech parsed;
        try {
            parsed = valueOf(code.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            parsed = null;
        }
        if (parsed == null || !allowedFor(language).contains(parsed)) {
            throw new BusinessRuleException(
                    "지원하지 않는 품사입니다: " + code + " (" + allowedCodesFor(language) + " 중 하나)");
        }
        return parsed;
    }
}

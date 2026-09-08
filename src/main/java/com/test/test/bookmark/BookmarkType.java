package com.test.test.bookmark;

import com.test.test.common.exception.EntityNotFoundException;

/**
 * 보관함 담기 1단위의 종류 (설계/03 §4-1)
 *
 * <p>경로는 소문자(자료실 경로와 맞춘다), 응답 바디는 대문자 enum 코드다
 * (status·partOfSpeech와 같은 관례 — 설계/04 §6-4).</p>
 *
 * <ul>
 *   <li>{@code KANJI} — kanji.id (letter UNIQUE라 글자 하나 = 행 하나)</li>
 *   <li>{@code GRAMMAR} — grammar_point.id</li>
 *   <li>{@code VOCABULARY} — <b>표제어 대표 id</b>(자료실 어휘 목록 행의 id)</li>
 * </ul>
 */
public enum BookmarkType {

    KANJI("kanji"),
    GRAMMAR("grammar"),
    VOCABULARY("vocabulary");

    private final String path;

    BookmarkType(String path) {
        this.path = path;
    }

    public String getPath() {
        return path;
    }

    /**
     * 경로 조각을 종류로 바꾼다. 모르는 값은 <b>404</b>다 —
     * {@code /api/bookmarks/hiragana}는 "틀린 필터 값"이 아니라 존재하지 않는 주소이기 때문이다
     * (결정기록 B-1. 400은 level·sort 같은 필터 값의 몫 — B-2).
     *
     * <p><b>대소문자를 보정하지 않는다.</b> 설계/04 §6-4의 {@code {type}}은 소문자이고, 대문자를 함께 받아 주면
     * 같은 자원에 URL이 둘 생겨 자료실 경로 규칙과도 갈린다. {@code /api/bookmarks/KANJI}는 404다.</p>
     */
    public static BookmarkType fromPath(String path) {
        for (BookmarkType type : values()) {
            if (type.path.equals(path)) {
                return type;
            }
        }
        throw EntityNotFoundException.of("보관함 종류", path);
    }
}

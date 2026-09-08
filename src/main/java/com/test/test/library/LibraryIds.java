package com.test.test.library;

import com.test.test.common.exception.BusinessRuleException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 자료실 목록의 {@code ids} 파라미터 (설계/04 §6-7)
 *
 * <p>비로그인 보관함 목록이 "브라우저가 들고 있는 id 집합 + 자료실 뷰"이기 때문에 공개 경로에 둔다.
 * {@code ids}는 사용자 상태가 아니라 <b>콘텐츠 필터</b>라 결정기록 B-8을 어기지 않는다.</p>
 *
 * <ul>
 *   <li>빈 값 → {@code null}(필터 미적용)</li>
 *   <li>숫자가 아니면 400 — 조용히 무시하면 "필터가 걸린 줄 알고 전체를 보는" 사고가 난다(B-2)</li>
 *   <li>최대 200개 — 게스트 상한과 같은 값이고 URL 길이 한계 안에 든다.
 *       회원은 서버가 id를 들고 있으므로 {@code /api/bookmarks/{type}}을 쓴다(그쪽에는 상한이 없다)</li>
 * </ul>
 */
public final class LibraryIds {

    /** 게스트 보관함 상한과 같은 값 (설계/04 §6-6) */
    public static final int MAX_IDS = 200;

    private LibraryIds() {
    }

    public static List<Long> parse(String rawIds) {
        if (rawIds == null || rawIds.isBlank()) {
            return null;
        }

        String[] tokens = rawIds.split(",");
        List<Long> ids = new ArrayList<>(tokens.length);
        for (String token : tokens) {
            String trimmed = token.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            ids.add(toId(trimmed));
        }

        if (ids.size() > MAX_IDS) {
            throw new BusinessRuleException("ids는 최대 " + MAX_IDS + "개까지 지정할 수 있습니다: " + ids.size() + "개");
        }
        return ids.isEmpty() ? null : ids;
    }

    /**
     * {@code sort=GIVEN} — 준 순서 그대로 정렬한다. 목록에 없는 id는 자연히 빠지고,
     * ids에 없는 행(있을 수 없지만 방어)은 뒤로 보낸다.
     */
    public static <T> List<T> sortByGivenOrder(List<T> rows, List<Long> ids,
                                               java.util.function.Function<T, Long> idOf) {
        Map<Long, Integer> positionById = new HashMap<>();
        for (int index = 0; index < ids.size(); index++) {
            positionById.putIfAbsent(ids.get(index), index);
        }
        return rows.stream()
                .sorted(Comparator.comparingInt(row -> positionById.getOrDefault(idOf.apply(row), Integer.MAX_VALUE)))
                .toList();
    }

    private static Long toId(String token) {
        try {
            return Long.valueOf(token);
        } catch (NumberFormatException e) {
            throw new BusinessRuleException("ids는 숫자 목록이어야 합니다: " + token);
        }
    }
}

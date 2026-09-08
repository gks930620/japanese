package com.test.test.library;

import com.test.test.common.exception.BusinessRuleException;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.CourseLanguage;
import com.test.test.course.CourseLevelCatalog;
import com.test.test.course.content.PartOfSpeech;
import com.test.test.library.dto.LibraryPageResponse;
import com.test.test.library.dto.VocabularyEntryDTO;
import com.test.test.library.repository.LibraryVocabularyQueryRepository;
import com.test.test.library.repository.VocabularyRow;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 어휘 자료실 (설계 §4-B-5) — 읽기 전용.
 *
 * <p>병합·정렬·슬라이스를 서비스에서 하는 이유(§7-13 ①·§4-B-7):
 * ① 페이징이 병합의 함수라 DB에서 먼저 자르면 같은 단어가 페이지 경계에 갈린다,
 * ② 총 개수가 병합 후 값이어야 한다, ③ 가타카나→히라가나 정규화가 DB GROUP BY로 불가하다.
 * 1,415행 규모라 전량 로드가 안전하다.</p>
 *
 * <p><b>병합 규칙의 단일 출처</b>이기도 하다(설계/03 §4-1 · 08 A-4): 보관함의 어휘 대표 id 정규화와
 * 유닛 학습의 entryId(설계/04 §6-1)가 모두 여기의 resolveEntryIds를 쓴다 — 규칙을 두 번 구현하지 않는다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryVocabularyService {

    /** 기본 페이지 크기 (설계 §4-B 공통 파라미터 — 어휘 50) */
    public static final int DEFAULT_PAGE_SIZE = 50;

    private static final int KATAKANA_FIRST = 0x30A1;
    private static final int KATAKANA_LAST = 0x30F6;
    private static final int KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

    private final LibraryVocabularyQueryRepository libraryVocabularyQueryRepository;
    private final CourseLevelCatalog courseLevelCatalog;

    /** 공개 API 경로 — 파라미터 문자열을 검증·파싱해 목록 조회로 넘긴다 */
    public LibraryPageResponse<VocabularyEntryDTO> getVocabularyList(Integer page, Integer size, String q,
                                                                     String level, String pos, String ids,
                                                                     String sort, CourseLanguage language) {
        List<Long> idFilter = LibraryIds.parse(ids);
        VocabularySort sortBy = VocabularySort.from(sort);
        if (sortBy == VocabularySort.GIVEN && (idFilter == null || idFilter.isEmpty())) {
            throw new BusinessRuleException("sort=GIVEN은 ids와 함께 사용해야 합니다.");
        }

        return getVocabularyList(idFilter, sortBy, page, size, q, level, pos, language);
    }

    /**
     * 보관함 경로 — pos(품사) 필터는 지원하지 않는다(설계/04 §6-4 · AC-B-14).
     *
     * @param entryIds 표제어 대표 id. null이면 필터 미적용, 빈 목록이면 "담은 것이 없음"
     */
    public LibraryPageResponse<VocabularyEntryDTO> getVocabularyListByEntryIds(List<Long> entryIds,
                                                                               VocabularySort sort, Integer page,
                                                                               Integer size, String q, String level) {
        return getVocabularyList(entryIds, sort, page, size, q, level, null, CourseLanguage.JA);
    }

    /**
     * 어휘 id → <b>표제어 대표 id</b> 매핑 (설계/03 §4-1) — 자료실 목록 1행의 id와 같은 값.
     * 그룹의 모든 행을 한 번의 쿼리로 끌어오므로 어휘 수만큼 쿼리가 늘지 않는다(N+1 금지 — 설계/03 §9).
     */
    public Map<Long, Long> resolveEntryIds(Collection<Long> vocabularyIds, CourseLanguage language) {
        Map<Long, Long> entryIdByVocabularyId = new HashMap<>();
        for (List<VocabularyRow> group : mergeByWordAndKana(
                libraryVocabularyQueryRepository.findGroupRowsByVocabularyIds(vocabularyIds, language))) {
            Long entryId = group.get(0).getId();
            group.forEach(row -> entryIdByVocabularyId.put(row.getId(), entryId));
        }
        return entryIdByVocabularyId;
    }

    /**
     * 담기 1단위로 정규화한다 — 어떤 member id를 받아도 표제어 대표 id를 돌려준다(설계/03 §4-1).
     * 자료실에 없는 어휘(유닛에 매핑되지 않은 행 포함)는 404.
     */
    public Long resolveEntryId(Long vocabularyId) {
        Long entryId = resolveEntryIds(List.of(vocabularyId), CourseLanguage.JA).get(vocabularyId);
        if (entryId == null) {
            throw EntityNotFoundException.of("어휘", vocabularyId);
        }
        return entryId;
    }

    /** 지금 존재하는 <b>표제어</b> id만 남긴다 — 대표가 아니게 된 id도 함께 빠진다(설계/03 §4-1) */
    public List<Long> filterExistingEntryIds(List<Long> entryIds) {
        if (entryIds == null || entryIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> entryIdByVocabularyId = resolveEntryIds(entryIds, CourseLanguage.JA);
        return entryIds.stream()
                .filter(id -> id.equals(entryIdByVocabularyId.get(id)))
                .toList();
    }

    private LibraryPageResponse<VocabularyEntryDTO> getVocabularyList(List<Long> entryIds, VocabularySort sort,
                                                                      Integer page, Integer size, String q,
                                                                      String level, String pos,
                                                                      CourseLanguage language) {
        List<String> levelCodes = courseLevelCatalog.parseLevelCodes(level, language);
        Set<PartOfSpeech> partsOfSpeech = parsePartsOfSpeech(pos, language);
        String keyword = normalizeKeyword(q);
        int pageSize = LibraryPaging.resolveSize(size, DEFAULT_PAGE_SIZE);

        if (entryIds != null && entryIds.isEmpty()) {
            return LibraryPageResponse.of(List.of(), 0, pageSize, 0L, 0L);
        }

        List<List<VocabularyRow>> allGroups = mergeByWordAndKana(
                libraryVocabularyQueryRepository.findAllRowsInLearningOrder(language));
        if (entryIds != null) {
            // ids는 표제어 대표 id 기준이다(설계/04 §6-7). 없는 id는 조용히 빠진다 — 부분 집합 조회이므로 404가 아니다
            Set<Long> idFilter = Set.copyOf(entryIds);
            allGroups = allGroups.stream()
                    .filter(group -> idFilter.contains(group.get(0).getId()))
                    .toList();
        }

        List<List<VocabularyRow>> matched = allGroups.stream()
                .filter(group -> matchesKeyword(group, keyword))
                .filter(group -> matchesLevel(group, levelCodes))
                .filter(group -> matchesPartOfSpeech(group, partsOfSpeech))
                .toList();
        if (sort == VocabularySort.KANA) {
            matched = matched.stream()
                    .sorted(Comparator.comparing(group -> kanaSortKey(group.get(0))))
                    .toList();
        } else if (sort == VocabularySort.GIVEN) {
            matched = LibraryIds.sortByGivenOrder(matched, entryIds, group -> group.get(0).getId());
        }

        long totalElements = matched.size();
        int pageNumber = LibraryPaging.resolvePage(page, totalElements, pageSize);

        List<VocabularyEntryDTO> content = LibraryPaging.slice(matched, pageNumber, pageSize).stream()
                .map(group -> VocabularyEntryDTO.of(group, senseGroups(group, levelCodes)))
                .toList();

        // totalAll = (ids 적용 후) 검색·필터 미적용 개수 (설계/04 §6-4·§6-7)
        return LibraryPageResponse.of(content, pageNumber, pageSize, totalElements, allGroups.size());
    }

    /**
     * 표기 + 읽기가 둘 다 같을 때만 한 행으로 병합한다 (설계 §4-B-5 — 읽기가 다르면 별개 행).
     * 병합 키는 두 값의 쌍이라 문자열을 이어붙일 때 생기는 경계 모호성이 없고, 읽기 null도 그대로 키가 된다.
     * 입력이 학습 순서라 각 그룹의 행 순서도 학습 순서로 유지된다 — 그래서 첫 행이 표제어 대표다.
     */
    private List<List<VocabularyRow>> mergeByWordAndKana(List<VocabularyRow> rows) {
        Map<List<String>, List<VocabularyRow>> groups = new LinkedHashMap<>();
        for (VocabularyRow row : rows) {
            List<String> mergeKey = Arrays.asList(row.getWord(), row.getKana());
            groups.computeIfAbsent(mergeKey, unused -> new ArrayList<>()).add(row);
        }
        return List.copyOf(groups.values());
    }

    /**
     * senses 구성 — 뜻으로 합치고 정렬한다 (설계 §4-B-5 · §7-14 ③ · §7-17 ①)
     *
     * <p>① 같은 뜻(공백 제거 후 완전 일치)은 한 sense로 합친다 — 같은 단어를 여러 코스에서 배워도
     * 화면에 뜻이 반복되지 않고 출처만 배열로 쌓인다.
     * ② 뜻의 순서는 그 뜻을 배우는 가장 이른 학습 순서. 입력이 학습 순서라 첫 등장 순서가 곧 그 값이다.
     * ③ 레벨 필터가 있으면 그 레벨에서 배우는 뜻이 앞으로 온다(그 안에서는 다시 학습 순서).</p>
     *
     * @return 뜻별 행 묶음 — 묶음 안의 행 순서는 항상 학습 순서(learnedIn 순서가 된다)
     */
    private List<List<VocabularyRow>> senseGroups(List<VocabularyRow> group, List<String> levelCodes) {
        Map<String, List<VocabularyRow>> byMeaning = new LinkedHashMap<>();
        for (VocabularyRow row : group) {
            byMeaning.computeIfAbsent(row.getMeaningKo().trim(), unused -> new ArrayList<>()).add(row);
        }
        List<List<VocabularyRow>> senses = List.copyOf(byMeaning.values());
        if (levelCodes.isEmpty()) {
            return senses;
        }
        List<List<VocabularyRow>> ordered = new ArrayList<>(senses.size());
        ordered.addAll(senses.stream().filter(sense -> isLearnedIn(sense, levelCodes)).toList());
        ordered.addAll(senses.stream().filter(sense -> !isLearnedIn(sense, levelCodes)).toList());
        return ordered;
    }

    private boolean isLearnedIn(List<VocabularyRow> sense, List<String> levelCodes) {
        return sense.stream().anyMatch(row -> levelCodes.contains(row.getLevelCode()));
    }

    /** 검색 대상: 표기·읽기(행 단위) + 뜻(sense 단위) — 어느 하나라도 맞으면 그 행이 남는다 */
    private boolean matchesKeyword(List<VocabularyRow> group, String keyword) {
        if (keyword == null) {
            return true;
        }
        VocabularyRow representative = group.get(0);
        return containsKeyword(representative.getWord(), keyword)
                || containsKeyword(representative.getKana(), keyword)
                || group.stream().anyMatch(row -> containsKeyword(row.getMeaningKo(), keyword));
    }

    /** 레벨 필터는 그룹 안 어느 sense라도 맞으면 통과 — 다른 레벨 배지는 그대로 남는다(기획 확정) */
    private boolean matchesLevel(List<VocabularyRow> group, List<String> levelCodes) {
        return levelCodes.isEmpty() || group.stream().anyMatch(row -> levelCodes.contains(row.getLevelCode()));
    }

    /** 품사는 sense가 아니라 행 대표값으로 건다 (§7-14 ②) */
    private boolean matchesPartOfSpeech(List<VocabularyRow> group, Set<PartOfSpeech> partsOfSpeech) {
        return partsOfSpeech.isEmpty() || partsOfSpeech.contains(group.get(0).getPartOfSpeech());
    }

    private boolean containsKeyword(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private String normalizeKeyword(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        return q.trim().toLowerCase(Locale.ROOT);
    }

    /** 가나순 정렬 키 — 읽기가 없으면 표기로, 가타카나는 히라가나 자리로 옮겨 비교한다(인수 23) */
    private String kanaSortKey(VocabularyRow row) {
        String raw = row.getKana() == null ? row.getWord() : row.getKana();
        StringBuilder normalized = new StringBuilder(raw.length());
        raw.codePoints().forEach(codePoint -> normalized.appendCodePoint(
                codePoint >= KATAKANA_FIRST && codePoint <= KATAKANA_LAST
                        ? codePoint - KATAKANA_TO_HIRAGANA_OFFSET
                        : codePoint));
        return normalized.toString();
    }

    /**
     * pos=VERB,NOUN 파싱 — 허용 밖 값은 400 (§7-13 ④).
     *
     * <p>허용 집합은 <b>과정 언어별로 다르다</b>(설계/06 §11-6): 일본어 자료실에 {@code ADJECTIVE}를,
     * 영어 자료실에 {@code I_ADJECTIVE}를 주면 여기서 걸린다. 판정 자체는 {@link PartOfSpeech}가 갖는다 —
     * 품사 지식이 서비스로 새어 나오면 언어가 늘 때마다 여기가 붇는다.</p>
     */
    private Set<PartOfSpeech> parsePartsOfSpeech(String pos, CourseLanguage language) {
        if (pos == null || pos.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(pos.split(","))
                .map(String::trim)
                .filter(code -> !code.isEmpty())
                .map(code -> PartOfSpeech.of(code, language))
                .collect(Collectors.toUnmodifiableSet());
    }
}

package com.test.test.editor;

import com.test.test.common.exception.BusinessRuleException;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.course.content.DialogEntity;
import com.test.test.course.content.DialogLineEntity;
import com.test.test.course.content.GrammarExampleEntity;
import com.test.test.course.content.GrammarPointEntity;
import com.test.test.course.content.GrammarRuleEntity;
import com.test.test.course.content.KanjiEntity;
import com.test.test.course.content.KanjiWordEntity;
import com.test.test.course.content.VocabularyEntity;
import com.test.test.editor.dto.DialogUpdateRequest;
import com.test.test.editor.dto.EditorDialogDTO;
import com.test.test.editor.dto.EditorGrammarDTO;
import com.test.test.editor.dto.EditorKanjiDTO;
import com.test.test.editor.dto.EditorVocabularyDTO;
import com.test.test.editor.dto.GrammarUpdateRequest;
import com.test.test.editor.dto.KanjiUpdateRequest;
import com.test.test.editor.dto.VocabularyUpdateRequest;
import com.test.test.editor.repository.EditorDialogRepository;
import com.test.test.editor.repository.EditorGrammarRepository;
import com.test.test.editor.repository.EditorKanjiRepository;
import com.test.test.editor.repository.EditorVocabularyRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 편집 (설계/04 §9) — 로컬 편집 모드에서만 컨트롤러가 등록되므로 이 서비스는 그때만 불린다.
 *
 * <p>규칙 요약: 표제(letter·name·word)는 무시(DTO에 필드가 없다) / 자식 배열은 <b>있는 id만 수정</b>
 * (활용표만 전체 교체 — 판정 ④) / kana 계약은 {@link KanaContract} 한 곳 / 응답 = 저장 후 값.</p>
 *
 * <p>컨트롤러와 <b>같은 조건으로 등록</b>된다 — 꺼진 환경에는 콘텐츠를 바꿀 수 있는 빈이 아예 없다.
 * 도달 경로가 없더라도 "꺼진 환경에는 편집이 존재하지 않는다"를 코드 구조로 말하는 것이 이 설계의 핵심이다.</p>
 *
 * <p>사용자 행 잠금을 쓰지 않는다 — 이 데이터는 사용자 소유가 아니고(B-11의 대상 밖),
 * 로컬 1인 사용 전제라 경합이 없다(설계/04 §9). PUT 1건 = 트랜잭션 1개.</p>
 */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.editor.enabled", havingValue = "true")
public class EditorService {

    private final EditorKanjiRepository kanjiRepository;
    private final EditorGrammarRepository grammarRepository;
    private final EditorVocabularyRepository vocabularyRepository;
    private final EditorDialogRepository dialogRepository;

    @Transactional
    public EditorKanjiDTO updateKanji(Long kanjiId, KanjiUpdateRequest request) {
        KanjiEntity kanji = kanjiRepository.findById(kanjiId)
                .orElseThrow(() -> EntityNotFoundException.of("한자", kanjiId));

        String onyomi = KanaContract.normalize(request.getOnyomi());
        String kunyomi = KanaContract.normalize(request.getKunyomi());
        if (onyomi == null && kunyomi == null) {
            // 조건부 필수는 @Valid로 표현되지 않아 여기서 판정한다(설계/04 §9 — A7)
            throw new BusinessRuleException("음독과 훈독 중 최소 하나는 있어야 합니다.");
        }

        Map<Long, KanjiUpdateRequest.WordRow> rows = requireExistingIds(request.getWords(),
                KanjiUpdateRequest.WordRow::getId, kanji.getWords(), KanjiWordEntity::getId, "예시 단어");
        for (KanjiWordEntity word : kanji.getWords()) {
            KanjiUpdateRequest.WordRow row = rows.get(word.getId());
            if (row != null) {
                word.update(row.getWord(), KanaContract.validate(row.getWord(), row.getKana()), row.getMeaningKo());
            }
        }

        kanji.updateReadings(request.getMeaningKo(), onyomi, kunyomi);
        return EditorKanjiDTO.from(kanji);
    }

    @Transactional
    public EditorGrammarDTO updateGrammar(Long grammarId, GrammarUpdateRequest request) {
        GrammarPointEntity grammar = grammarRepository.findById(grammarId)
                .orElseThrow(() -> EntityNotFoundException.of("문법", grammarId));

        Map<Long, GrammarUpdateRequest.ExampleRow> rows = requireExistingIds(request.getExamples(),
                GrammarUpdateRequest.ExampleRow::getId, grammar.getExamples(), GrammarExampleEntity::getId, "예문");
        for (GrammarExampleEntity example : grammar.getExamples()) {
            GrammarUpdateRequest.ExampleRow row = rows.get(example.getId());
            if (row != null) {
                example.update(row.getJp(), KanaContract.validate(row.getJp(), row.getKana()), row.getMeaningKo());
            }
        }

        // 활용표만 전체 교체 — "행이 하나 빠졌다"가 보고된 오류 형태라 추가·삭제를 허용한다(판정 ④)
        List<GrammarRuleEntity> newRules = new ArrayList<>();
        for (int i = 0; i < request.getRules().size(); i++) {
            GrammarUpdateRequest.RuleRow row = request.getRules().get(i);
            newRules.add(GrammarRuleEntity.of(grammar, i, row.getGroupLabel(), row.getPattern(),
                    row.getExampleBefore(), row.getExampleAfter()));
        }
        grammar.replaceRules(newRules);

        grammar.updateExplanation(request.getExplanation());
        return EditorGrammarDTO.from(grammar);
    }

    @Transactional
    public EditorVocabularyDTO updateVocabulary(Long vocabularyId, VocabularyUpdateRequest request) {
        VocabularyEntity vocabulary = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> EntityNotFoundException.of("어휘", vocabularyId));

        // 표제(word)는 요청에 없다 — kana 계약의 원문은 언제나 현재 저장된 word다
        String kana = KanaContract.validate(vocabulary.getWord(), request.getKana());
        vocabulary.update(request.getMeaningKo(), kana, request.getPartOfSpeech());
        return EditorVocabularyDTO.from(vocabulary);
    }

    @Transactional
    public EditorDialogDTO updateDialog(Long dialogId, DialogUpdateRequest request) {
        DialogEntity dialog = dialogRepository.findById(dialogId)
                .orElseThrow(() -> EntityNotFoundException.of("회화", dialogId));

        Map<Long, DialogUpdateRequest.LineRow> rows = requireExistingIds(request.getLines(),
                DialogUpdateRequest.LineRow::getId, dialog.getLines(), DialogLineEntity::getId, "대사");
        for (DialogLineEntity line : dialog.getLines()) {
            DialogUpdateRequest.LineRow row = rows.get(line.getId());
            if (row != null) {
                line.update(row.getSpeaker(), row.getJp(), KanaContract.validate(row.getJp(), row.getKana()),
                        row.getMeaningKo());
            }
        }

        dialog.rename(request.getTitle());
        return EditorDialogDTO.from(dialog);
    }

    /**
     * 자식 배열 규칙 (설계/04 §9 "수정만") — 요청의 모든 id가 <b>그 부모의 현재 자식</b>이어야 한다.
     * 모르는 id(= 추가 시도)나 남의 자식 id가 섞이면 400. 요청에 없는 자식은 <b>그대로 둔다</b> —
     * 행 삭제를 표현할 방법 자체가 없다("추가·삭제 금지"가 이 한 곳으로 강제된다).
     */
    private <R, E> Map<Long, R> requireExistingIds(List<R> rows, Function<R, Long> rowId,
                                                   List<E> children, Function<E, Long> childId, String label) {
        Map<Long, R> byId = new HashMap<>();
        for (R row : rows) {
            if (byId.put(rowId.apply(row), row) != null) {
                throw new BusinessRuleException(label + " id가 중복됐습니다.");
            }
        }
        Set<Long> currentIds = children.stream().map(childId).collect(Collectors.toSet());
        if (!currentIds.containsAll(byId.keySet())) {
            throw new BusinessRuleException(label + "은(는) 수정만 할 수 있습니다 — 추가·삭제는 할 수 없습니다.");
        }
        return byId;
    }
}

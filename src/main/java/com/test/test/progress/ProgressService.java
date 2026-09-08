package com.test.test.progress;

import com.test.test.course.CourseUnitCatalog;
import com.test.test.course.ExistingUnits;
import com.test.test.jwt.repository.UserRepository;
import com.test.test.progress.dto.CompletedUnitDTO;
import com.test.test.progress.dto.LastPositionDTO;
import com.test.test.progress.dto.LastPositionSaveRequest;
import com.test.test.progress.dto.ProgressClearDTO;
import com.test.test.progress.dto.ProgressDTO;
import com.test.test.progress.dto.UnitCompletionDTO;
import com.test.test.progress.repository.UserLastPositionRepository;
import com.test.test.progress.repository.UserUnitCompletionRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 진도 (설계/04 §6-3) — 완료 유닛 · 마지막 위치.
 *
 * <p>완료는 서버가 추론하지 않는다(설계/08 B-10). 프론트가 정리 스텝 도달 시 명시적으로 보내는 값만 저장한다.
 * 코스별 완료 수·다음 유닛·배지 판정 같은 계산은 응답을 받은 화면이 한다 — 게스트도 같은 계산을
 * localStorage 문서로 하기 때문에 계산을 서버에 두면 두 벌이 된다(설계/04 §6-3).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgressService {

    private final UserUnitCompletionRepository userUnitCompletionRepository;
    private final UserLastPositionRepository userLastPositionRepository;
    private final CourseUnitCatalog courseUnitCatalog;
    private final UserRepository userRepository;

    /** 내 진도 전체 — 지금 존재하는 유닛만 내려간다(설계/03 §4-1) */
    public ProgressDTO getProgress(Long userId) {
        ExistingUnits existingUnits = courseUnitCatalog.existingUnits();

        List<CompletedUnitDTO> completedUnits =
                userUnitCompletionRepository.findByUserIdOrderByCourseIdAscUnitNoAsc(userId).stream()
                        .filter(entity -> existingUnits.contains(entity.getCourseId(), entity.getUnitNo()))
                        .map(CompletedUnitDTO::from)
                        .toList();

        LastPositionDTO lastPosition = userLastPositionRepository.findByUserId(userId)
                .filter(entity -> existingUnits.contains(entity.getCourseId(), entity.getUnitNo()))
                .map(LastPositionDTO::from)
                .orElse(null);

        return ProgressDTO.of(completedUnits, lastPosition);
    }

    /**
     * 마지막 위치 저장 — 사용자당 1행 upsert (설계/04 §6-3).
     * 스텝 이동마다 자동 저장돼 요청이 겹치기 쉬우므로 {@link #setUnitCompleted}와 같은 방식으로 줄을 세운다.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LastPositionDTO saveLastPosition(Long userId, LastPositionSaveRequest request) {
        courseUnitCatalog.requireExistingUnit(request.getCourseId(), request.getUnitNo());

        UserLastPositionEntity lastPosition = upsertLastPosition(userId, request.getCourseId(), request.getUnitNo(),
                request.getStepKey(), LocalDateTime.now());
        return LastPositionDTO.from(lastPosition);
    }

    /**
     * 완료 켜기/끄기 — 켜기도 끄기도 <b>동시 요청에서까지</b> 멱등이다(설계/04 §6-3).
     *
     * <p>완료 토글의 가장 자연스러운 조작이 <b>더블클릭</b>이다. 두 요청이 겹치면 "조회 후 없으면 삽입"이
     * 깨져 한쪽이 UNIQUE에 걸리는데, 여기서 500을 주면 화면은 실패로 받아 표시를 되돌린다 —
     * <b>서버엔 담겼는데 화면엔 안 담긴</b> 불일치가 남는다. 그래서 {@link #markCompleted}가 사용자 행을
     * 잠가 같은 사용자의 쓰기를 줄 세운다.</p>
     *
     * <p>격리 수준을 <b>READ_COMMITTED로 못 박는다</b>: 운영 MySQL 기본값(REPEATABLE READ)에서는 잠금을
     * 얻은 뒤 다시 조회해도 트랜잭션 시작 시점 스냅샷을 봐서 "먼저 들어간 행"을 못 보고 다시 삽입하게 된다.
     * 줄을 세운 의미가 사라지는 자리라 DB 기본값에 맡기지 않는다(H2는 이미 READ_COMMITTED다).</p>
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public UnitCompletionDTO setUnitCompleted(Long userId, Long courseId, Integer unitNo, boolean completed) {
        courseUnitCatalog.requireExistingUnit(courseId, unitNo);

        if (completed) {
            markCompleted(userId, courseId, unitNo, LocalDateTime.now());
        } else {
            // 엔티티를 읽어 지우지 않고 벌크 삭제 — 동시에 두 번 꺼도 "이미 사라진 행"이라 실패하면 안 된다
            userUnitCompletionRepository.deleteCompletion(userId, courseId, unitNo);
        }
        return UnitCompletionDTO.of(courseId, unitNo, completed);
    }

    /** 학습 기록 초기화 — 보관함은 그대로 둔다(AC-P-30). 기록이 없어도 200(멱등) */
    @Transactional
    public ProgressClearDTO clearProgress(Long userId) {
        long deletedUnitCount = userUnitCompletionRepository.deleteByUserId(userId);
        userLastPositionRepository.deleteByUserId(userId);
        return ProgressClearDTO.of(deletedUnitCount);
    }

    /**
     * 완료 1건을 켠다 — 이미 있으면 아무것도 하지 않는다(합집합·멱등).
     * 토글(§4-4)과 병합(§6-1)이 같은 규칙을 쓰도록 여기 한 곳에 둔다.
     *
     * <p>먼저 <b>사용자 행을 잠근다</b> — 같은 사용자의 두 요청이 동시에 "없음"을 보고 둘 다 삽입해
     * UNIQUE에 걸리는 것을 막는다. 잠근 뒤에 조회하므로 먼저 들어간 행이 반드시 보인다.
     * 병합에서 호출되면 <b>병합 트랜잭션에 합류</b>한다 — 진도와 보관함이 한쪽만 합쳐지지 않는다(AC-X-03).</p>
     */
    @Transactional
    public void markCompleted(Long userId, Long courseId, Integer unitNo, LocalDateTime completedAt) {
        userRepository.lockForUserDataWrite(userId);

        if (userUnitCompletionRepository.findByUserIdAndCourseIdAndUnitNo(userId, courseId, unitNo).isPresent()) {
            return;
        }
        userUnitCompletionRepository.save(UserUnitCompletionEntity.builder()
                .user(userRepository.getReferenceById(userId))
                .courseId(courseId)
                .unitNo(unitNo)
                .completedAt(completedAt)
                .build());
    }

    /**
     * 마지막 위치 upsert — 사용자당 1행(UNIQUE(user_id))이라 새로 만들거나 덮어쓴다.
     * 완료 켜기와 같은 이유로 <b>사용자 행을 먼저 잠근다</b> — 첫 저장이 겹치면 둘 다 삽입해 UNIQUE에 걸린다.
     */
    @Transactional
    public UserLastPositionEntity upsertLastPosition(Long userId, Long courseId, Integer unitNo, String stepKey,
                                                     LocalDateTime updatedAt) {
        userRepository.lockForUserDataWrite(userId);

        return userLastPositionRepository.findByUserId(userId)
                .map(entity -> {
                    entity.moveTo(courseId, unitNo, stepKey, updatedAt);
                    return entity;
                })
                .orElseGet(() -> userLastPositionRepository.save(UserLastPositionEntity.builder()
                        .user(userRepository.getReferenceById(userId))
                        .courseId(courseId)
                        .unitNo(unitNo)
                        .stepKey(stepKey)
                        .updatedAt(updatedAt)
                        .build()));
    }
}

package com.test.test.progress.repository;

import com.test.test.progress.UserUnitCompletionEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserUnitCompletionRepository extends JpaRepository<UserUnitCompletionEntity, Long> {

    // 응답 정렬은 courseId → unitNo 오름차순이 계약이다 (설계/04 §6-3 — 결정적 응답)
    List<UserUnitCompletionEntity> findByUserIdOrderByCourseIdAscUnitNoAsc(Long userId);

    Optional<UserUnitCompletionEntity> findByUserIdAndCourseIdAndUnitNo(Long userId, Long courseId, Integer unitNo);

    long deleteByUserId(Long userId);

    /**
     * 완료 1건 삭제 — 엔티티를 읽어 지우는 대신 벌크 삭제를 쓴다.
     * 같은 유닛을 동시에 두 번 꺼도 "이미 사라진 행"을 지웠다는 이유로 실패하면 안 된다(설계/04 §6-3 멱등).
     */
    @Modifying
    @Query("delete from UserUnitCompletionEntity c "
            + "where c.user.id = :userId and c.courseId = :courseId and c.unitNo = :unitNo")
    int deleteCompletion(@Param("userId") Long userId, @Param("courseId") Long courseId,
                         @Param("unitNo") Integer unitNo);
}

package com.test.test.bookmark.repository;

import com.test.test.bookmark.BookmarkType;
import com.test.test.bookmark.UserBookmarkEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserBookmarkRepository extends JpaRepository<UserBookmarkEntity, Long> {

    // 최근 담은 순 — 두 번째 키(id)까지 정하는 것이 계약이다 (설계/04 §6-4)
    List<UserBookmarkEntity> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    List<UserBookmarkEntity> findByUserIdAndTargetTypeOrderByCreatedAtDescIdDesc(Long userId, BookmarkType targetType);

    Optional<UserBookmarkEntity> findByUserIdAndTargetTypeAndTargetId(Long userId, BookmarkType targetType,
                                                                      Long targetId);

    long deleteByUserIdAndTargetType(Long userId, BookmarkType targetType);

    /**
     * 보관함 1행 삭제 — 벌크 삭제인 이유는 {@code deleteCompletion}과 같다:
     * 같은 항목을 동시에 두 번 빼도 실패하지 않아야 한다(설계/04 §6-4 멱등).
     */
    @Modifying
    @Query("delete from UserBookmarkEntity b "
            + "where b.user.id = :userId and b.targetType = :targetType and b.targetId = :targetId")
    int deleteBookmark(@Param("userId") Long userId, @Param("targetType") BookmarkType targetType,
                       @Param("targetId") Long targetId);

    /**
     * 탈퇴 시 보관함 전량 삭제 (설계/04 §4-1 ③) — 엔티티를 읽어 지우지 않는 <b>벌크 삭제</b>다.
     * 조건은 언제나 {@code user_id = 토큰에서 꺼낸 값} 하나뿐이라, 남의 데이터를 지우는 경로가 존재하지 않는다.
     */
    @Modifying
    @Query("delete from UserBookmarkEntity b where b.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}

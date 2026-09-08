package com.test.test.community.repository;

import com.test.test.community.CommunityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommunityRepository extends JpaRepository<CommunityEntity, Long>, CommunityRepositoryCustom {

    /**
     * 삭제되지 않은 게시글 조회 (수정/삭제 시 사용)
     */
    Optional<CommunityEntity> findByIdAndIsDeletedFalse(Long id);

    /**
     * 삭제되지 않은 게시글 존재 여부 (엔티티 로드 없이 가벼운 존재 확인용)
     */
    boolean existsByIdAndIsDeletedFalse(Long id);

    /**
     * 탈퇴 안내 화면의 "남는 것" 숫자 (설계/04 §4-1) — 삭제되지 않은 내 글만 센다.
     */
    long countByUserIdAndIsDeletedFalse(Long userId);

    /**
     * 조회수 원자적 증가. 인메모리 read-modify-write(`viewCount++`)는 동시 조회 시 증가가 유실되므로
     * DB에서 원자적으로 +1 한다. (clearAutomatically로 벌크 UPDATE 후 영속성 컨텍스트 정리)
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE CommunityEntity c SET c.viewCount = c.viewCount + 1 WHERE c.id = :id")
    void incrementViewCount(@Param("id") Long id);

    /**
     * 상세 조회 전용 — <b>작성자를 함께 가져온다</b>(fetch join).
     *
     * <p>상세는 조회수 증가({@code incrementViewCount})가 {@code clearAutomatically = true}로
     * 영속성 컨텍스트를 비우는 경로다. 그때 작성자가 <b>초기화되지 않은 프록시</b>면 그대로 detach돼,
     * 뒤이어 DTO가 닉네임을 읽는 순간 LazyInitializationException(500)이 난다.
     * {@code open-in-view}를 켜서 덮는 대신 <b>조회 시점에 필요한 값을 가져오는</b> 쪽으로 고친다.</p>
     */
    @Query("select c from CommunityEntity c join fetch c.user where c.id = :id and c.isDeleted = false")
    Optional<CommunityEntity> findDetailById(@Param("id") Long id);
}

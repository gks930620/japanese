package com.test.test.progress.repository;

import com.test.test.progress.UserLastPositionEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserLastPositionRepository extends JpaRepository<UserLastPositionEntity, Long> {

    Optional<UserLastPositionEntity> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}

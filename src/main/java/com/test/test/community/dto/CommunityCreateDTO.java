package com.test.test.community.dto;

import com.test.test.community.CommunityEntity;
import com.test.test.jwt.entity.UserEntity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityCreateDTO {

    @NotBlank(message = "제목은 필수입니다")
    @Size(max = 200, message = "제목은 200자 이하여야 합니다")
    private String title;

    // 본문 상한 15,000자 — 취향이 아니라 컬럼에서 역산한 값이다(설계/04 §5 · 08 C-27).
    // community.content는 TEXT(MySQL 65,535바이트)라 15,000자는 전부 4바이트 문자여도 60,000바이트로 한계 안이다.
    // 상한이 없으면 70,000자 글이 로컬 H2에서는 201이고 운영 MySQL에서는 저장 오류(500)다 —
    // 애플리케이션이 400으로 거절하는 것이 DB가 500으로 터지는 것보다 낫다.
    @NotBlank(message = "내용은 필수입니다")
    @Size(max = 15000, message = "내용은 15000자 이하여야 합니다")
    private String content;

    /**
     * DTO -> Entity 변환
     */
    public CommunityEntity toEntity(UserEntity user) {
        return CommunityEntity.builder()
                .user(user)
                .title(this.title)
                .content(this.content)
                .viewCount(0)
                .isDeleted(false)
                .build();
    }
}


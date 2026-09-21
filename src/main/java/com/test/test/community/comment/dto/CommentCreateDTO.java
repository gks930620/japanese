package com.test.test.community.comment.dto;

import com.test.test.community.CommunityEntity;
import com.test.test.community.comment.CommentEntity;
import com.test.test.jwt.entity.UserEntity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentCreateDTO {

    // 댓글 상한 2,000자 — 게시글 본문과 같은 TEXT 컬럼·같은 근거다(설계/04 §5 · 08 C-27)
    @NotBlank(message = "댓글 내용은 필수입니다")
    @Size(max = 2000, message = "댓글은 2000자 이하여야 합니다")
    private String content;

    public CommentEntity toEntity(CommunityEntity community, UserEntity user) {
        return CommentEntity.builder()
                .community(community)
                .user(user)
                .content(this.content)
                .build();
    }
}

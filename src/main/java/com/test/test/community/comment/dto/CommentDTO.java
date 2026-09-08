package com.test.test.community.comment.dto;

import com.test.test.community.comment.CommentEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDTO {

    private Long id;
    private Long communityId;
    private String content;

    // 작성자 정보
    private Long userId;
    // username(로그인 아이디)은 내려주지 않는다 — 판정 2026-08-25 C-1.
    // 이 응답은 비로그인 GET으로 나가므로, 실으면 자격증명의 절반이 목록으로 공개된다.
    // 표시는 nickname, 작성자 판정은 userId로 한다(08 F-11이 이미 "id 기준"이라고 적어 둔 규칙이다).
    // 서버 인가는 그대로다 — isWrittenBy는 토큰 주체로 판정하므로 응답만 줄어든다.
    private String nickname;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Entity -> DTO 변환
     */
    public static CommentDTO from(CommentEntity entity) {
        return CommentDTO.builder()
                .id(entity.getId())
                .communityId(entity.getCommunity().getId())
                .content(entity.getContent())
                .userId(entity.getUser().getId())
                .nickname(entity.getUser().getNickname())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}


package com.test.test.community.dto;

import com.test.test.community.CommunityEntity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityDTO {
    private Long id;
    private Long userId;
    // username(로그인 아이디)은 내려주지 않는다 — 판정 2026-08-25 C-1.
    // 이 응답은 비로그인 GET으로 나가므로, 실으면 자격증명의 절반이 목록으로 공개된다.
    // 표시는 nickname, 작성자 판정은 userId로 한다(08 F-11이 이미 "id 기준"이라고 적어 둔 규칙이다).
    // 서버 인가는 그대로다 — isWrittenBy는 토큰 주체로 판정하므로 응답만 줄어든다.
    private String nickname;
    private String title;
    private String content;
    private Integer viewCount;
    private Long commentCount;            // 댓글 수
    private List<String> imageUrls;       // 이미지 URL 리스트
    private List<FileInfoDTO> attachments; // 첨부파일 정보 리스트
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommunityDTO from(CommunityEntity entity) {
        return from(entity, List.of(), List.of());
    }

    public static CommunityDTO from(CommunityEntity entity, List<String> imageUrls, List<FileInfoDTO> attachments) {
        if (entity == null) {
            return null;
        }
        return CommunityDTO.builder()
                .id(entity.getId())
                .userId(entity.getUser().getId())
                .nickname(entity.getUser().getNickname())
                .title(entity.getTitle())
                .content(entity.getContent())
                .viewCount(entity.getViewCount())
                .commentCount(0L)  // 기본값, 실제 값은 Repository에서 설정
                .imageUrls(imageUrls)
                .attachments(attachments)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * 첨부파일 정보 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FileInfoDTO {
        private Long fileId;
        private String originalFileName;
        private Long fileSize;
        private String downloadUrl;
    }
}


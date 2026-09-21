package com.test.test.community.dto;

import com.test.test.community.CommunityEntity;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 게시글 <b>목록</b> 한 행 (설계/04 §5, 2026-09-21 qa 결함 G) — <b>본문({@code content})을 싣지 않는다.</b>
 *
 * <p><b>목록과 상세는 다른 응답이다.</b> 화면은 목록에서 본문을 쓰지 않는데({@code CommunityListPage.jsx}는
 * 제목·닉네임·조회수·댓글수·작성일만 그린다) 15,000자 글 10건이면 한 페이지가 수백 KB가 된다.
 * 같은 DTO를 쓰느라 목록이 상세만큼 무거워질 이유가 없다 — 상세({@link CommunityDTO})는 본문이 본체이므로 그대로 싣는다.</p>
 *
 * <p>{@code CommunityDTO}에 {@code @JsonInclude(NON_NULL)}을 거는 방식은 쓰지 않았다 — 본문만이 아니라
 * 값이 없는 다른 필드까지 응답에서 사라져, 프론트가 "없는 필드"와 "null인 필드"를 구분하게 된다(설계/04 §1-3).</p>
 *
 * <p>{@code username}(로그인 아이디)은 여기에도 없다 — 이 응답은 비로그인 GET으로 나간다(판정 2026-08-25 C-1).
 * 표시는 {@code nickname}, 작성자 판정은 {@code userId}로 한다.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityListItemDTO {

    private Long id;
    private Long userId;
    private String nickname;
    private String title;
    private Integer viewCount;
    private Long commentCount;             // 실제 값은 Repository가 집계해 채운다
    private List<String> imageUrls;
    private List<CommunityDTO.FileInfoDTO> attachments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommunityListItemDTO from(CommunityEntity entity) {
        if (entity == null) {
            return null;
        }
        return CommunityListItemDTO.builder()
                .id(entity.getId())
                .userId(entity.getUser().getId())
                .nickname(entity.getUser().getNickname())
                .title(entity.getTitle())
                .viewCount(entity.getViewCount())
                .commentCount(0L)
                .imageUrls(List.of())
                .attachments(List.of())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

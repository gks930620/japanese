package com.test.test.community.comment;

import com.test.test.common.dto.ApiResponse;
import com.test.test.common.dto.PageResponse;
import com.test.test.common.paging.ClientSort;
import com.test.test.community.comment.dto.CommentCreateDTO;
import com.test.test.community.comment.dto.CommentDTO;
import com.test.test.community.comment.dto.CommentUpdateDTO;
import com.test.test.jwt.model.CustomUserAccount;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * 댓글 목록 — 정렬은 서버가 정한다(설계/04 §1-5 · 08 C-26).
     *
     * <p>클라이언트가 보낸 {@code sort}는 <b>읽지 않는다.</b> {@code @PageableDefault}에도 정렬을 두지 않는다 —
     * 순서의 단일 출처는 리포지토리 {@code @Query}의 {@code ORDER BY}(최신순)다. 두 곳에 두면 갈린다.</p>
     */
    @GetMapping("/communities/{communityId}/comments")
    public ResponseEntity<ApiResponse<PageResponse<CommentDTO>>> getComments(
            @PathVariable Long communityId,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<CommentDTO> comments =
                commentService.getCommentsByCommunityId(communityId, ClientSort.ignore(pageable));
        return ResponseEntity.ok(ApiResponse.success("Comments fetched", PageResponse.from(comments)));
    }

    @PostMapping("/communities/{communityId}/comments")
    public ResponseEntity<ApiResponse<CommentDTO>> createComment(
            @PathVariable Long communityId,
            @Valid @RequestBody CommentCreateDTO createDTO,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        CommentDTO comment = commentService.createComment(communityId, createDTO, userAccount.getUsername());
        return ResponseEntity.created(URI.create("/api/comments/" + comment.getId()))
                .body(ApiResponse.success("Comment created", comment));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<CommentDTO>> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentUpdateDTO updateDTO,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        CommentDTO comment = commentService.updateComment(commentId, updateDTO, userAccount.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Comment updated", comment));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserAccount userAccount) {
        commentService.deleteComment(commentId, userAccount.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Comment deleted"));
    }
}

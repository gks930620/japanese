package com.test.test.community.comment.dto;

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
public class CommentUpdateDTO {

    // 작성과 같은 상한이다 — 한쪽만 걸면 "쓸 때는 막히고 고칠 때는 통과"가 된다(설계/04 §5 · 08 C-27)
    @NotBlank(message = "댓글 내용은 필수입니다")
    @Size(max = 2000, message = "댓글은 2000자 이하여야 합니다")
    private String content;
}


package com.test.test.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityUpdateDTO {

    @NotBlank(message = "제목은 필수입니다")
    @Size(max = 200, message = "제목은 200자 이하여야 합니다")
    private String title;

    // 작성과 같은 상한이다 — 한쪽만 걸면 "쓸 때는 막히고 고칠 때는 통과"가 된다(설계/04 §5 · 08 C-27)
    @NotBlank(message = "내용은 필수입니다")
    @Size(max = 15000, message = "내용은 15000자 이하여야 합니다")
    private String content;
}


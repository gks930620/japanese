package com.test.test.me;

import com.test.test.common.dto.ApiResponse;
import com.test.test.jwt.model.CustomUserAccount;
import com.test.test.me.dto.UserDataMergeRequest;
import com.test.test.me.dto.UserDataMergeResultDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 내 계정 데이터 API (설계/04 §6-5) — 인증 필요.
 * 지금은 병합 하나뿐이다: 병합 배너의 [합치기]가 호출한다.
 */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UserDataMergeService userDataMergeService;

    @PostMapping("/merge")
    public ResponseEntity<ApiResponse<UserDataMergeResultDTO>> merge(
            @Valid @RequestBody UserDataMergeRequest request,
            @AuthenticationPrincipal CustomUserAccount userAccount) {

        UserDataMergeResultDTO result = userDataMergeService.merge(userAccount.getUserDTO().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("User data merged", result));
    }
}

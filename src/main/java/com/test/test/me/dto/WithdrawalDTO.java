package com.test.test.me.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 탈퇴 결과 (설계/04 §4-1) — 성공하면 서버가 쿠키까지 만료시켜 "자동 로그아웃"을 끝낸다(AC-A-36) */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalDTO {

    private Boolean withdrawn;

    public static WithdrawalDTO withdrawn() {
        return WithdrawalDTO.builder().withdrawn(true).build();
    }
}

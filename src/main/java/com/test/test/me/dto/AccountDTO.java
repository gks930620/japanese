package com.test.test.me.dto;

import com.test.test.jwt.entity.UserEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계정 정보 + <b>이 계정이 무엇을 할 수 있는가</b> (설계/04 §4-1).
 *
 * <p>social이 있는데 emailEditable·passwordChangeable을 또 주는 이유: 세 스택이 각자 provider 문자열을
 * 해석하면 규칙이 세 벌이 되고, <b>서버가 실제로 강제하는 규칙</b>(§2-3의 403)과 화면의 판단이 갈릴 수 있다.
 * 숨기는 것과 막는 것이 같은 출처에서 나와야 한다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountDTO {

    /** 수정 불가 — 작성자 소유권의 기준값이다(AC-A-11). 화면은 읽기 전용으로 그린다 */
    private String username;
    private String nickname;
    /** 소셜 제공자가 이메일을 안 준 경우 빈 문자열일 수 있다(현행 데이터) — 화면이 "정보 없음"으로 그린다 */
    private String email;
    /** "LOCAL" | "kakao" | "google" — DB 현행 값 그대로(대소문자 포함) */
    private String provider;
    private Boolean social;
    private Boolean emailEditable;
    private Boolean passwordChangeable;

    public static AccountDTO from(UserEntity user) {
        boolean social = user.isSocial();
        return AccountDTO.builder()
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .provider(user.getProvider())
                .social(social)
                .emailEditable(!social)
                .passwordChangeable(!social)
                .build();
    }
}

package com.test.test.jwt.model;

import com.test.test.jwt.entity.UserEntity;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;

    private String provider;  // Oauth2Provider 이름.
    private String username;

    private String password;

    private String email;
    private String nickname;

    /** JWT `tv` 클레임의 원본(설계/03 §4) — 필터가 매 요청 이 값과 토큰을 대조해 옛 토큰을 죽인다 */
    @Builder.Default
    private Long tokenVersion = 0L;

    @Builder.Default
    private List<String> roles=new ArrayList<>();

    public static UserDTO from(UserEntity userEntity) {
        return UserDTO.builder()
            .id(userEntity.getId())
            .provider(userEntity.getProvider())
            .username(userEntity.getUsername())
            .password(userEntity.getPassword())
            .email(userEntity.getEmail())
            .nickname(userEntity.getNickname())
            .tokenVersion(userEntity.getTokenVersion() != null ? userEntity.getTokenVersion() : 0L)
            .roles(userEntity.getRoles() != null ? userEntity.getRoles() : new ArrayList<>())
            .build();
    }

    public UserEntity toEntity() {
        return UserEntity.builder()
            .id(this.id)
            .provider(this.provider)
            .username(this.username)
            .password(this.password)
            .email(this.email)
            .nickname(this.nickname)
            .tokenVersion(this.tokenVersion)
            .roles(this.roles)
            .build();
    }
}

package com.test.test.jwt.model;

import com.test.test.common.util.IdentityNormalizer;
import com.test.test.jwt.entity.UserEntity;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * 회원가입 요청.
 *
 * <p><b>아이디·이메일은 바인딩(setter)에서 소문자로 정규화한다</b>(설계/04 §4 · 08 C-24).
 * 여기서 한 번 정규화하면 <b>중복 검사도 저장도 같은 값</b>을 본다 — 서비스에서 따로 정규화하면
 * "검사한 값과 저장한 값이 다른" 틈이 생긴다({@code ProfileUpdateRequest}의 trim과 같은 이유다).
 * 대소문자만 바뀐 값은 같은 계정이므로 {@code USER4}로 가입하면 {@code user4}와 충돌해 409다.</p>
 */
@Setter
@Getter
public class JoinDTO {

    @NotBlank(message = "아이디는 필수입니다")
    @Size(min = 4, max = 20, message = "아이디는 4~20자여야 합니다")
    private String username;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 4, max = 100, message = "비밀번호는 4자 이상이어야 합니다")
    private String password;

    @Email(message = "이메일 형식이 올바르지 않습니다")
    private String email;

    @NotBlank(message = "닉네임은 필수입니다")
    @Size(min = 2, max = 20, message = "닉네임은 2~20자여야 합니다")
    private String nickname;

    /** 아이디는 대소문자를 구분하지 않는 식별자다 — 정규화한 값이 곧 저장값이다(08 C-24) */
    public void setUsername(String username) {
        this.username = IdentityNormalizer.normalize(username);
    }

    /** 이메일도 같다. 선택 값이라 {@code null}은 그대로 둔다 */
    public void setEmail(String email) {
        this.email = IdentityNormalizer.normalize(email);
    }

    /**
     * 회원가입 요청 → UserEntity 변환.
     * 비밀번호 인코딩은 서비스 책임이므로 인코딩된 값을 인자로 받는다.
     */
    public UserEntity toEntity(String encodedPassword) {
        UserEntity user = UserEntity.builder()
                .username(username)
                .password(encodedPassword)
                .email(email)
                .nickname(nickname)
                .provider("LOCAL")
                .build();
        user.getRoles().add("USER");
        return user;
    }
}
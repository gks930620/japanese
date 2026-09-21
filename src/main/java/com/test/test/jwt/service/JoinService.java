package com.test.test.jwt.service;

import com.test.test.common.exception.DuplicateResourceException;
import com.test.test.jwt.entity.UserEntity;
import com.test.test.jwt.model.JoinDTO;
import com.test.test.jwt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JoinService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 회원가입.
     *
     * <p>아이디·이메일은 {@code JoinDTO}가 바인딩에서 이미 소문자로 정규화했다(설계/04 §4 · 08 C-24) —
     * 그래서 <b>중복 검사가 보는 값과 저장되는 값이 같다.</b> {@code USER4}는 {@code user4}와 같은 계정이므로 409다.</p>
     */
    @Transactional
    public void joinProcess(JoinDTO joinDTO) {
        // 중복 체크: 이미 존재하면 예외 발생
        if (userRepository.existsByUsername(joinDTO.getUsername())) {
            throw new DuplicateResourceException("이미 사용 중인 아이디입니다: " + joinDTO.getUsername());
        }

        // 이메일 중복 체크 (선택)
        // 이메일 중복은 로컬 계정끼리만 본다(설계/04 §4-1) — 소셜 계정의 이메일은 제공자가 준 값이고,
        // 탈퇴 계정은 이메일이 null이 되므로 "탈퇴한 이메일은 다시 쓸 수 있다"가 자동으로 성립한다.
        if (joinDTO.getEmail() != null
                && userRepository.existsByEmailAndProvider(joinDTO.getEmail(), "LOCAL")) {
            throw new DuplicateResourceException("이미 사용 중인 이메일입니다: " + joinDTO.getEmail());
        }

        UserEntity user = joinDTO.toEntity(passwordEncoder.encode(joinDTO.getPassword()));
        userRepository.save(user);
    }
}
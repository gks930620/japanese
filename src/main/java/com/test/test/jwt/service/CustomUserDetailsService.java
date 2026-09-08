package com.test.test.jwt.service;

import com.test.test.jwt.entity.UserEntity;
import com.test.test.jwt.model.CustomUserAccount;
import com.test.test.jwt.model.UserDTO;
import com.test.test.jwt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity userEntity = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username));

        // 탈퇴 계정 차단은 여기 한 곳이다(설계/04 §4-1) — 로그인과 모든 HTTP 요청이 이 서비스를 지나므로
        // 컨트롤러마다 "탈퇴자 차단"을 흩뿌리지 않아도 새 API까지 자동으로 막힌다.
        if (Boolean.FALSE.equals(userEntity.getIsActive())) {
            throw new UsernameNotFoundException("탈퇴한 계정입니다: " + username);
        }

        UserDTO userDTO = UserDTO.from(userEntity);
        return new CustomUserAccount(userDTO);
    }
}
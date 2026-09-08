package com.test.test.me;

import com.test.test.bookmark.BookmarkService;
import com.test.test.bookmark.repository.UserBookmarkRepository;
import com.test.test.common.exception.AccountRuleException;
import com.test.test.common.exception.DuplicateResourceException;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.community.comment.repository.CommentRepository;
import com.test.test.community.repository.CommunityRepository;
import com.test.test.jwt.JwtUtil;
import com.test.test.jwt.entity.RefreshEntity;
import com.test.test.jwt.entity.UserEntity;
import com.test.test.jwt.repository.RefreshRepository;
import com.test.test.jwt.repository.UserRepository;
import com.test.test.me.dto.AccountDTO;
import com.test.test.me.dto.PasswordChangeDTO;
import com.test.test.me.dto.PasswordChangeRequest;
import com.test.test.me.dto.ProfileUpdateRequest;
import com.test.test.me.dto.WithdrawalDTO;
import com.test.test.me.dto.WithdrawalPreviewDTO;
import com.test.test.me.dto.WithdrawalRequest;
import com.test.test.progress.ProgressService;
import com.test.test.progress.repository.UserLastPositionRepository;
import com.test.test.progress.repository.UserUnitCompletionRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 계정 관리 (설계/04 §4-1) — 조회 · 회원정보 수정 · 비밀번호 변경 · 탈퇴.
 *
 * <p><b>사용자는 언제나 토큰에서 온다.</b> 이 서비스의 어떤 메서드도 "대상 사용자"를 인자로 받는 요청 값이 없다 —
 * userId는 컨트롤러가 Principal에서 꺼내 넘긴 값이다(컨벤션 §4-1). 되돌릴 수 없는 탈퇴에서 특히 중요하다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountService {

    /** 소셜 계정의 탈퇴 확인 문구 — 서버가 검증하는 상수다(설계/04 §4-1). 응답에는 싣지 않는다 */
    private static final String WITHDRAWAL_CONFIRM_TEXT = "탈퇴합니다";

    private final UserRepository userRepository;
    private final RefreshRepository refreshRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ProgressService progressService;
    private final BookmarkService bookmarkService;
    private final UserUnitCompletionRepository userUnitCompletionRepository;
    private final UserLastPositionRepository userLastPositionRepository;
    private final UserBookmarkRepository userBookmarkRepository;
    private final CommunityRepository communityRepository;
    private final CommentRepository commentRepository;

    /** 계정 화면 4개가 공유하는 정보 (설계/04 §4-1) */
    public AccountDTO getAccount(Long userId) {
        return AccountDTO.from(requireUser(userId));
    }

    /**
     * 회원정보 수정 (설계/04 §4-1) — 응답이 진실이다. 화면은 요청값이 아니라 응답값으로 상태를 갱신한다.
     *
     * <p>이메일 중복 검사는 <b>값이 바뀔 때만</b>, <b>로컬 계정끼리만</b> 한다(가입과 같은 조건 — 설계/04 §4-1).
     * 소셜 계정의 이메일은 제공자가 준 값이라 소유권 주장 대상이 아니다. 시드에 중복 이메일이 실재하므로(id 2·3)
     * 무조건 검사하면 "아무것도 안 고치고 저장했는데 409"가 나 설계/04 §4-1("그냥 성공 처리")과 어긋난다.
     * 닉네임 중복은 막지 않는다 — 현행 가입 정책과 같다(미결 §9-3).</p>
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AccountDTO updateProfile(Long userId, ProfileUpdateRequest request) {
        userRepository.lockForUserDataWrite(userId);
        UserEntity user = requireUser(userId);

        // trim은 바인딩에서 끝났다(ProfileUpdateRequest) — 여기서 다시 하면 검증과 저장이 다른 값을 보게 된다
        String email = request.getEmail();
        if (!user.isSocial() && !email.equals(user.getEmail())
                && userRepository.existsByEmailAndProviderIgnoreCaseAndIdNot(email, "LOCAL", userId)) {
            throw new DuplicateResourceException("이미 사용 중인 이메일입니다: " + email);
        }

        // 소셜 계정은 이메일 값을 무시한다(읽기 전용 칸이 현재 값을 그대로 되돌려 보내기 때문) — 판단은 엔티티가 한다
        user.changeProfile(request.getNickname(), email);
        return AccountDTO.from(user);
    }

    /**
     * 비밀번호 변경 (설계/04 §4-1) — 검사 순서를 못 박는다: <b>소셜 → 형식(@Valid) → 확인 불일치 → 현재 비밀번호 → 현재와 동일</b>.
     *
     * <p>현재 비밀번호를 가장 늦게 보는 이유: 앞의 셋은 입력만 보고 판정되는데, 여기서 먼저 틀리면 화면이
     * "현재 비밀번호 칸 비우기"를 해버려 사용자는 정작 자기가 오타 낸 새 비밀번호를 보지 못한다.</p>
     *
     * <p>성공하면 token_version이 올라 <b>다른 기기의 access 토큰이 즉시 죽고</b>(AC-A-28) refresh도 전량 삭제된다.
     * 대신 지금 이 기기에는 새 토큰 쌍을 발급해 돌려준다(AC-A-27).</p>
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PasswordChangeDTO changePassword(Long userId, PasswordChangeRequest request) {
        userRepository.lockForUserDataWrite(userId);
        UserEntity user = requireUser(userId);

        if (user.isSocial()) {
            throw AccountRuleException.passwordNotSupported();
        }
        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw AccountRuleException.newPasswordConfirmMismatch();
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw AccountRuleException.passwordMismatch();
        }
        if (request.getNewPassword().equals(request.getCurrentPassword())) {
            throw AccountRuleException.newPasswordSameAsCurrent();
        }

        user.changePassword(passwordEncoder.encode(request.getNewPassword()));
        refreshRepository.deleteByUserId(userId);

        return PasswordChangeDTO.withTokens(issueAccessToken(user), issueRefreshToken(user));
    }

    /** 탈퇴 화면이 보여줄 실제 숫자 (설계/04 §4-1) — 하드코딩 없이 전부 집계에서 온다 */
    public WithdrawalPreviewDTO getWithdrawalPreview(Long userId) {
        UserEntity user = requireUser(userId);
        return WithdrawalPreviewDTO.of(
                progressService.getProgress(userId).getCompletedUnits().size(),
                bookmarkService.getCounts(userId),
                communityRepository.countByUserIdAndIsDeletedFalse(userId),
                commentRepository.countByUserIdAndIsDeletedFalse(userId),
                user.isSocial());
    }

    /**
     * 회원 탈퇴 (설계/04 §4-1) — <b>되돌릴 수 없다.</b> 순서를 지킨다:
     * ① 사용자 행 잠금 → ② 본인 확인 → ③ 벌크 삭제 → ④ refresh 전량 삭제 → ⑤ users 행 익명화.
     *
     * <p>②를 ③보다 <b>먼저</b> 두는 이유: 확인 실패가 롤백에 기대지 않게 하기 위해서다 —
     * 롤백은 안전망이지 순서의 대체물이 아니다. ③은 전부 {@code where user_id = :userId} 벌크 삭제이고
     * userId는 토큰에서 온 값이라, <b>남의 데이터를 지우는 경로가 존재하지 않는다.</b></p>
     *
     * <p>users 행을 지우지 않는 이유: community·comment가 {@code user_id NOT NULL FK}라
     * 행을 지우면 글·댓글이 함께 사라지거나 FK 위반으로 실패한다. 기획은 "남긴다"가 확정이다.</p>
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WithdrawalDTO withdraw(Long userId, WithdrawalRequest request) {
        userRepository.lockForUserDataWrite(userId);
        UserEntity user = requireUser(userId);

        verifyOwner(user, request);

        userUnitCompletionRepository.deleteByUserId(userId);
        userLastPositionRepository.deleteByUserId(userId);
        userBookmarkRepository.deleteByUserId(userId);
        refreshRepository.deleteByUserId(userId);

        user.withdraw(anonymizedUsername(user), passwordEncoder.encode(UUID.randomUUID().toString()),
                LocalDateTime.now());
        return WithdrawalDTO.withdrawn();
    }

    /** 본인 확인 — 로컬은 비밀번호, 소셜은 확인 문구다(설계/04 §4-1). 값이 없으면 불일치와 같게 다룬다 */
    private void verifyOwner(UserEntity user, WithdrawalRequest request) {
        if (user.isSocial()) {
            String confirmText = request.getConfirmText() == null ? "" : request.getConfirmText().trim();
            if (!WITHDRAWAL_CONFIRM_TEXT.equals(confirmText)) {
                throw AccountRuleException.confirmTextMismatch();
            }
            return;
        }
        String password = request.getPassword();
        if (password == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw AccountRuleException.passwordMismatch();
        }
    }

    /**
     * 소셜 계정의 provider 식별자 연결을 끊는다 (설계/04 §4-1).
     *
     * <p>소셜 로그인은 {@code provider + 제공자 식별자}를 username으로 삼아 <b>기존 행을 찾아 재사용</b>한다.
     * 그대로 두면 같은 계정으로 다시 로그인하는 순간 탈퇴한 계정이 <b>그대로 되살아난다</b>.
     * 이 형식은 가입으로 만들 수 없다(가입 username은 4~20자인데 이 값은 20자를 넘는다) → 선점·충돌 불가.</p>
     *
     * <p>로컬은 null을 돌려준다 — username이 남아 있어야 같은 아이디의 재가입이 계속 막힌다(AC-A-40).</p>
     */
    private String anonymizedUsername(UserEntity user) {
        return user.isSocial() ? "withdrawn:" + user.getId() + ":" + UUID.randomUUID() : null;
    }

    private String issueAccessToken(UserEntity user) {
        return jwtUtil.createAccessToken(user.getUsername(), user.getTokenVersion());
    }

    private String issueRefreshToken(UserEntity user) {
        String refreshToken = jwtUtil.createRefreshToken(user.getUsername());
        RefreshEntity entity = new RefreshEntity();
        entity.setUserEntity(user);
        entity.setToken(refreshToken);
        refreshRepository.save(entity);
        return refreshToken;
    }

    private UserEntity requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> EntityNotFoundException.of("사용자", userId));
    }
}

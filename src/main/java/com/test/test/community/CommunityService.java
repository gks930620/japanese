package com.test.test.community;

import com.test.test.common.paging.PageClamp;
import com.test.test.common.exception.AccessDeniedException;
import com.test.test.common.exception.EntityNotFoundException;
import com.test.test.community.dto.CommunityCreateDTO;
import com.test.test.community.dto.CommunityDTO;
import com.test.test.community.dto.CommunityListItemDTO;
import com.test.test.community.dto.CommunityUpdateDTO;
import com.test.test.community.comment.repository.CommentRepository;
import com.test.test.community.repository.CommunityRepository;
import com.test.test.file.entity.RefType;
import com.test.test.file.service.FileService;
import com.test.test.jwt.entity.UserEntity;
import com.test.test.jwt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final FileService fileService;

    /**
     * 게시글 작성
     */
    @Transactional
    public Long createCommunity(CommunityCreateDTO createDTO, String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> EntityNotFoundException.of("사용자", username));
        CommunityEntity community = createDTO.toEntity(user);
        CommunityEntity savedCommunity = communityRepository.save(community);

        // 저장 직후 본문 이미지 reconcile (§5-3-1 ①): 본문에 쓰인 임시 이미지를 글ID로 연결
        fileService.reconcileBodyImages(savedCommunity.getId(), createDTO.getContent());

        return savedCommunity.getId();
    }

    /**
     * 게시글 목록 조회 / 검색 (페이징) — <b>본문을 싣지 않는 목록 전용 DTO</b>로 돌려준다(설계/04 §5 · 08 C-27).
     * 화면이 목록에서 본문을 쓰지 않는데 긴 글 10건이면 한 페이지가 수백 KB가 된다. 상세는 본문이 본체라 그대로다.
     */
    public Page<CommunityListItemDTO> getCommunityList(String searchType, String keyword, Pageable pageable) {
        // Repository에서 직접 DTO로 조회 (카운트 쿼리 최적화 포함)
        // 범위 밖 page는 0페이지로 보정 — 공통 규칙의 단일 출처는 PageClamp(설계/04 §1-5 · 2026-09 판정 H2)
        return PageClamp.query(pageable, p -> communityRepository.searchCommunity(searchType, keyword, p));
    }

    /**
     * 게시글 상세 조회 (조회수 증가)
     * 파일 정보는 클라이언트에서 별도 API로 조회 (/api/files?refId={id}&refType=COMMUNITY)
     */
    @Transactional
    public CommunityDTO getCommunityDetail(Long communityId) {
        // 작성자를 fetch join으로 함께 읽는다 — 아래 incrementViewCount가 영속성 컨텍스트를 비우므로
        // 여기서 초기화해 두지 않으면 detach된 프록시를 DTO가 읽다가 500이 난다(QA 리포트).
        CommunityEntity community = communityRepository.findDetailById(communityId)
            .orElseThrow(() -> EntityNotFoundException.of("게시글", communityId));

        // 조회수는 DB에서 원자적으로 +1 (동시 조회 시 lost update 방지)
        communityRepository.incrementViewCount(communityId);

        // 목록 조회와 달리 상세 경로는 Repository의 댓글수 세팅을 거치지 않으므로 여기서 실제 값을 채운다.
        // (미세팅 시 DTO 기본값 0이 그대로 노출되던 버그)
        long commentCount = commentRepository.countByCommunityIdAndIsDeletedFalse(communityId);

        CommunityDTO dto = CommunityDTO.from(community, List.of(), List.of());
        dto.setViewCount(community.getViewCount() + 1); // 방금 증가분을 응답에 반영(엔티티는 증가 전 값 보유)
        dto.setCommentCount(commentCount);
        return dto;
    }

    /**
     * 게시글 수정
     */
    @Transactional
    public void updateCommunity(Long communityId, CommunityUpdateDTO updateDTO, String username) {
        CommunityEntity community = communityRepository.findByIdAndIsDeletedFalse(communityId)
                .orElseThrow(() -> EntityNotFoundException.of("게시글", communityId));

        if (!community.isWrittenBy(username)) {
            throw AccessDeniedException.forUpdate("게시글");
        }

        community.update(updateDTO.getTitle(), updateDTO.getContent());

        // 수정 직후 본문 이미지 reconcile (§5-3-1 ①): 새로 추가된 이미지 연결 + 빠진 이미지 연결 해제
        fileService.reconcileBodyImages(communityId, updateDTO.getContent());
    }

    /**
     * 게시글 삭제 (게시글 Soft Delete + 연결 파일 Hard Delete — §5-3-1 ②)
     */
    @Transactional
    public void deleteCommunity(Long communityId, String username) {
        CommunityEntity community = communityRepository.findByIdAndIsDeletedFalse(communityId)
            .orElseThrow(() -> EntityNotFoundException.of("게시글", communityId));

        if (!community.isWrittenBy(username)) {
            throw AccessDeniedException.forDelete("게시글");
        }

        // 글에 연결된 파일(본문 IMAGES + 첨부 ATTACHMENT) 메타행 hard delete + 바이트는 커밋 후 삭제(§1)
        fileService.deleteFilesByRef(communityId, RefType.COMMUNITY);

        // 글 자체는 기존대로 soft delete
        community.softDelete();
    }

}

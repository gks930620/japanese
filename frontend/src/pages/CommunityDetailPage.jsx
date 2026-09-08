import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination.jsx";
import { useAuth } from "../context/authStore.js";
import { callApi, callPublicApi } from "../lib/http.js";
import { formatDateTime, formatFileSize, getErrorMessage } from "../lib/format.js";
import { btnClass, emptyClass } from "../components/ui/kitClass.js";

export function CommunityDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const communityId = searchParams.get("id");
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentPageInfo, setCommentPageInfo] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [commentInput, setCommentInput] = useState("");
  const [commentSending, setCommentSending] = useState(false); // 연타 방어(B-M7)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 없는 글(404)과 통신 실패를 가른다 — 404에 "다시 시도"를 두면 고쳐질 리 없는 실패를 권하는 것이다(08 C-12 ④ · 판정 D-5 ③)
  const [notFound, setNotFound] = useState(false);

  const isMine = useMemo(() => {
    if (!post || !user) return false;
    // 표시는 nickname, 소유자 판정은 userId다(서버가 username을 응답에서 제거 — 감사 C-1)
    return post.userId === user.id;
  }, [post, user]);

  const loadPost = async () => {
    if (!communityId) {
      setError("잘못된 접근입니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [postResult, filesResult] = await Promise.all([
        callPublicApi(`/api/communities/${communityId}`),
        callPublicApi(`/api/files?refId=${communityId}&refType=COMMUNITY&usage=ATTACHMENT`),
      ]);

      setPost(postResult.data);
      setAttachments(filesResult.data ?? []);
    } catch (e) {
      if (e?.status === 404 || e?.status === 400) setNotFound(true);
      setError(getErrorMessage(e, "게시글을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (page = 0) => {
    if (!communityId) return;
    try {
      const result = await callPublicApi(`/api/communities/${communityId}/comments?page=${page}&size=10`);
      setComments(result.data?.content ?? []);
      setCommentPageInfo({
        page: result.data?.page ?? 0,
        totalPages: result.data?.totalPages ?? 0,
        totalElements: result.data?.totalElements ?? 0,
      });
    } catch (e) {
      setComments([]);
      setCommentPageInfo({ page: 0, totalPages: 0, totalElements: 0 });
      setError(getErrorMessage(e, "댓글을 불러오지 못했습니다."));
    }
  };

  useEffect(() => {
    loadPost();
    loadComments();
  }, [communityId]);

  const onSubmitComment = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/community/detail?id=${communityId}` } });
      return;
    }
    if (!commentInput.trim()) {
      alert("댓글 내용을 입력하세요.");
      return;
    }

    if (commentSending) return; // 응답 전 연타 방어(B-M7)
    setCommentSending(true);
    try {
      await callApi(`/api/communities/${communityId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      setCommentInput("");
      loadComments(0);
    } catch (e) {
      alert(getErrorMessage(e, "댓글 작성에 실패했습니다."));
    } finally {
      setCommentSending(false);
    }
  };

  const onEditComment = async (commentId, current) => {
    const next = window.prompt("댓글 수정", current);
    if (next === null) return;
    if (!next.trim()) {
      alert("댓글 내용을 입력하세요.");
      return;
    }

    try {
      await callApi(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next.trim() }),
      });
      loadComments(commentPageInfo.page);
    } catch (e) {
      alert(getErrorMessage(e, "댓글 수정에 실패했습니다."));
    }
  };

  const onDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await callApi(`/api/comments/${commentId}`, { method: "DELETE" });
      loadComments(commentPageInfo.page);
    } catch (e) {
      alert(getErrorMessage(e, "댓글 삭제에 실패했습니다."));
    }
  };

  const onDeletePost = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;

    try {
      // 백엔드가 글 삭제 시 연결 파일(본문 IMAGES + 첨부 ATTACHMENT)을 트랜잭션으로 함께 삭제한다.
      // 프론트에서 파일을 개별 삭제하지 않는다.
      await callApi(`/api/communities/${communityId}`, { method: "DELETE" });
      navigate("/community");
    } catch (e) {
      alert(getErrorMessage(e, "게시글 삭제에 실패했습니다."));
    }
  };

  const sanitizedContent = useMemo(() => {
    if (!post?.content) return "";
    return DOMPurify.sanitize(post.content);
  }, [post]);

  if (loading) {
    return (
      <div className={emptyClass()}>
        <div>로딩 중...</div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className={emptyClass()}>
        <span className="material-icons">error</span>
        <h3>{notFound ? "찾을 수 없는 글이에요" : "게시글을 불러오지 못했습니다"}</h3>
        <p className="error-text">{notFound ? "주소가 바뀌었거나 지워진 글이에요" : error}</p>
        {/* 되돌릴 수 없는 실패에도 나갈 길은 준다(08 C-12 ④ — B-L9) */}
        <Link className={btnClass({ variant: "primary" })} to="/community">
          커뮤니티 목록으로
        </Link>
      </div>
    );
  }

  return (
    <section>
      <article className="post-detail">
        <div className="post-detail-header">
          <h1 className="post-detail-title">{post?.title}</h1>
          <div className="post-detail-meta">
            <span className="post-meta-item">
              <span className="material-icons">person</span>
              <span>{post?.nickname}</span>
            </span>
            <span className="post-meta-item">
              <span className="material-icons">schedule</span>
              <span>{formatDateTime(post?.createdAt)}</span>
            </span>
          </div>
        </div>

        <div className="post-detail-stats">
          <span className="post-stat">
            <span className="material-icons">visibility</span>
            <span>{post?.viewCount ?? 0}</span>
          </span>
        </div>

        <div className="post-detail-content" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />

        {attachments.length > 0 && (
          <div className="post-attachments">
            <div className="post-attachments-inner">
              <h4>첨부파일</h4>
              {attachments.map((file) => (
                <div className="attachment-item" key={file.fileId}>
                  <span className="material-icons">attach_file</span>
                  <a href={file.downloadUrl}>{file.originalFileName}</a>
                  <span className="attachment-size">({formatFileSize(file.fileSize)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="post-nav-actions">
          <Link className={btnClass({ variant: "secondary" })} to="/community">
            <span className="material-icons">list</span>
            목록
          </Link>
          <div className="post-edit-actions">
            {isMine && (
              <>
                <Link className={btnClass({ variant: "primary" })} to={`/community/edit?id=${communityId}`}>
                  <span className="material-icons">edit</span>
                  수정
                </Link>
                <button className={btnClass({ variant: "danger" })} type="button" onClick={onDeletePost}>
                  <span className="material-icons">delete</span>
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
      </article>

      <section className="comments-section">
        <div className="comments-header">
          <span className="material-icons">comment</span>
          <span>
            댓글 <span>{commentPageInfo.totalElements}</span>
          </span>
        </div>

        {isAuthenticated && (
          <div className="comment-write">
            <textarea
              className="k-textarea comment-textarea"
              placeholder="댓글을 입력하세요..."
              rows={3}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
            />
            <div className="comment-write-actions">
              <button
                className={btnClass({ variant: "primary" })}
                disabled={commentSending}
                type="button"
                onClick={onSubmitComment}
              >
                <span className="material-icons">send</span>
                댓글 작성
              </button>
            </div>
          </div>
        )}

        {!isAuthenticated && <p className="muted-text">로그인 후 댓글 작성이 가능합니다.</p>}

        <div className="comment-list">
          {comments.length === 0 && <p className="comment-empty">첫 댓글을 작성해보세요!</p>}
          {comments.map((comment) => {
            const mine = user?.id === comment.userId;
            return (
              <article key={comment.id} className="comment-item">
                <div className="comment-header">
                  <div className="comment-author">
                    <span className="material-icons">account_circle</span>
                    <span>{comment.nickname}</span>
                  </div>
                  <span className="comment-date">{formatDateTime(comment.createdAt)}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
                {mine && (
                  <div className="comment-actions">
                    <button
                      className="comment-action-btn"
                      type="button"
                      onClick={() => onEditComment(comment.id, comment.content)}
                    >
                      <span className="material-icons">edit</span>
                      수정
                    </button>
                    <button className="comment-action-btn" type="button" onClick={() => onDeleteComment(comment.id)}>
                      <span className="material-icons">delete</span>
                      삭제
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <Pagination
          page={commentPageInfo.page}
          totalPages={commentPageInfo.totalPages}
          onChange={(nextPage) => loadComments(nextPage)}
        />
      </section>
    </section>
  );
}

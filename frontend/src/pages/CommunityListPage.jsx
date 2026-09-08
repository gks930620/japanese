import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination.jsx";
import { useAuth } from "../context/authStore.js";
import { callPublicApi } from "../lib/http.js";
import { formatRelativeTime, getErrorMessage } from "../lib/format.js";
import { btnClass, emptyClass, selectClass } from "../components/ui/kitClass.js";

/**
 * 커뮤니티 목록.
 *
 * 검색 조건(`searchType`·`keyword`)은 **주소에서 온다** — 탈퇴 화면의 [내가 쓴 글 찾기]가
 * "내 닉네임으로 검색된 상태"로 이 화면을 열기 때문이다(AC-A-41).
 * 자료실·보관함이 이미 쓰는 규칙과 같다: 주소가 목록 상태의 단일 출처.
 */
export function CommunityListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchType = searchParams.get("searchType") === "nickname" ? "nickname" : "title";
  const urlKeyword = searchParams.get("keyword") ?? "";
  // 페이지도 검색 조건과 같은 규칙이다 — 주소가 단일 출처여야 새로고침·뒤로가기·링크 공유가 그 페이지를 복원한다(판정 L7 · 설계/02 §4)
  const urlPage = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);

  // 입력 중인 값만 화면 상태로 둔다(제출 시 주소에 반영)
  const [searchType, setSearchType] = useState(urlSearchType);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [pageData, setPageData] = useState({
    content: [],
    page: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = async (page, currentSearchType = urlSearchType, currentKeyword = urlKeyword) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: "10",
        sort: "createdAt,desc",
      });

      if (currentKeyword.trim()) {
        params.set("searchType", currentSearchType);
        params.set("keyword", currentKeyword.trim());
      }

      const result = await callPublicApi(`/api/communities?${params.toString()}`);
      setPageData(result.data);
    } catch (e) {
      setError(getErrorMessage(e, "커뮤니티 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  // 주소의 검색 조건이 바뀌면(링크로 들어온 경우 포함) 그 조건으로 다시 조회한다
  useEffect(() => {
    loadPosts(urlPage, urlSearchType, urlKeyword);
    setSearchType(urlSearchType);
    setKeyword(urlKeyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchType, urlKeyword, urlPage]);

  const onSearch = () => {
    const next = new URLSearchParams();
    if (keyword.trim()) {
      next.set("searchType", searchType);
      next.set("keyword", keyword.trim());
    }
    setSearchParams(next);
  };

  /** 조건을 지우는 길 — 검색 0건 화면에서 막다른 길을 만들지 않는다(판정 D-5) */
  const resetSearch = () => {
    setKeyword("");
    setSearchParams(new URLSearchParams());
  };

  return (
    <section>
      <div className="k-flex page-header">
        <h1>
          <span className="material-icons">forum</span>
          커뮤니티
        </h1>
        {isAuthenticated && (
          <div>
            <Link className={btnClass({ variant: "primary" })} to="/community/write">
              <span className="material-icons">edit</span>
              글쓰기
            </Link>
          </div>
        )}
      </div>

      <div className="search-filter-section">
        <select className={selectClass()} value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="title">제목</option>
          <option value="nickname">작성자</option>
        </select>
        <div className="search-input-wrapper">
          <span className="material-icons">search</span>
          <input
            className="k-input"
            placeholder="검색어를 입력하세요..."
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
        </div>
        <button className={btnClass({ variant: "primary" })} type="button" onClick={onSearch}>
          <span className="material-icons">search</span>
          검색
        </button>
      </div>

      {loading && (
        <div className={emptyClass()}>
          <div>로딩 중...</div>
        </div>
      )}
      {!loading && error && (
        <div className={emptyClass()}>
          <span className="material-icons">error</span>
          <h3>목록을 불러오지 못했습니다</h3>
          <p className="error-text">{error}</p>
        </div>
      )}
      {/* "없음"의 말투는 자료실과 같다(2026-09 판정 D-5 · 08 C-12):
          조건 때문이면 **조건을 되읽고 지우는 길**을 주고, 정말 비었으면 **할 수 있는 사람에게만** 다음 행동을 준다. */}
      {!loading && !error && pageData.content?.length === 0 && (
        <div className={emptyClass()}>
          <span className="material-icons">article</span>
          {urlKeyword ? (
            <>
              <h3>검색 결과가 없어요</h3>
              <p>
                &lsquo;{urlKeyword}&rsquo;(으)로 찾은 글이 없어요
              </p>
              <button className={btnClass({ variant: "secondary" })} type="button" onClick={resetSearch}>
                검색 조건 초기화
              </button>
            </>
          ) : (
            <>
              <h3>아직 글이 없어요</h3>
              {/* 비로그인에게 글쓰기를 권하지 않는다 — 그 사람에게는 [글쓰기] 버튼이 없다 */}
              {isAuthenticated && <p>첫 번째 게시글을 작성해보세요!</p>}
            </>
          )}
        </div>
      )}

      {!loading && !error && pageData.content?.length > 0 && (
        <>
          <div className="post-list">
            {pageData.content.map((post) => (
              <div key={post.id} className="post-item" onClick={() => navigate(`/community/detail?id=${post.id}`)}>
                <div className="post-header">
                  <div>
                    <div className="post-title">{post.title}</div>
                    <div className="post-meta">
                      <span className="post-meta-item">
                        <span className="material-icons">person</span>
                        <span>{post.nickname}</span>
                      </span>
                      <span className="post-meta-item">
                        <span className="material-icons">schedule</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="post-stats">
                  <span className="post-stat">
                    <span className="material-icons">visibility</span>
                    <span>{post.viewCount ?? 0}</span>
                  </span>
                  <span className="post-stat">
                    <span className="material-icons">comment</span>
                    <span>{post.commentCount ?? 0}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={pageData.page ?? 0}
            totalPages={pageData.totalPages ?? 0}
            onChange={(nextPage) => {
              // 조회를 직접 부르지 않고 주소를 바꾼다 — 위 effect가 그 주소로 조회한다(단일 출처)
              const next = new URLSearchParams(searchParams);
              next.set("page", String(nextPage));
              setSearchParams(next);
            }}
          />
        </>
      )}
    </section>
  );
}

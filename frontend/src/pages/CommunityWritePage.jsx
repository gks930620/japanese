import { useState } from "react";
import { errorText } from "../lib/errorText.js";
import { useNavigate } from "react-router-dom";
import { callApi, uploadFiles } from "../lib/http.js";
import { invalidateQueries } from "../hooks/useApiQuery.js";
import { formatFileSize, getErrorMessage } from "../lib/format.js";
import { btnClass, fieldClass, inputClass, labelClass, textareaClass } from "../components/ui/kitClass.js";

export function CommunityWritePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  const addBodyImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    try {
      const uploaded = await uploadFiles([file], 0, "IMAGES");
      const imageUrl = uploaded[0];
      if (imageUrl) {
        setContent((prev) => `${prev}\n<p><img src="${imageUrl}" alt="" /></p>`);
      }
    } catch (e) {
      alert(errorText(e, "본문 이미지 업로드에 실패했습니다."));
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("제목을 입력하세요.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      const createResult = await callApi("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });
      const communityId = createResult.data;

      // 첨부는 **본문 저장 뒤의 별개 단계**다(B-M6): 여기서 실패해도 글은 이미 저장됐다.
      // 그것을 "작성 실패"라고 말하면 사용자가 다시 눌러 같은 글을 하나 더 만든다(서버에 중복 방지가 없다).
      if (attachments.length) {
        try {
          await uploadFiles(attachments, communityId, "ATTACHMENT");
        } catch (uploadError) {
          alert(
            `글은 저장됐어요. 첨부파일만 올리지 못했어요 — ${errorText(uploadError, "잠시 후 글 수정에서 다시 올려 주세요.")}`,
          );
        }
      }

      // 방금 쓴 글이 목록에 보여야 한다 — 캐시된 옛 목록을 버린다
      invalidateQueries("/api/communities");
      navigate(`/community/detail?id=${communityId}`);
    } catch (e) {
      alert(getErrorMessage(e, "게시글 작성에 실패했습니다."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="k-flex page-header">
        <h1>
          <span className="material-icons">edit</span>
          게시글 작성
        </h1>
      </div>

      <form className="write-form" onSubmit={onSubmit}>
        <div className={fieldClass()}>
          <label className={labelClass("required")} htmlFor="write-title">
            제목
          </label>
          <input
            id="write-title"
            className={inputClass()}
            maxLength={200}
            required
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={fieldClass()}>
          <label className={labelClass("required")} htmlFor="write-content">
            내용
          </label>
          <textarea
            id="write-content"
            className={textareaClass()}
            required
            rows={14}
            placeholder="내용을 입력하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="form-help">본문에 이미지를 삽입하려면 아래 버튼을 사용하세요.</div>
        </div>

        <div className={fieldClass()}>
          <button className={btnClass({ variant: "secondary" })} type="button" onClick={() => document.getElementById("body-image-upload")?.click()}>
            <span className="material-icons">image</span>
            본문 이미지 업로드
          </button>
        </div>

        <div className={fieldClass()}>
          <label className={labelClass()}>첨부파일 (선택)</label>
          <div className="file-upload-area" onClick={() => document.getElementById("attach-file-upload")?.click()}>
            <span className="material-icons">attach_file</span>
            <p>클릭하여 파일을 첨부하세요</p>
            <p className="file-upload-hint">모든 파일 형식 가능 (이미지, PDF, 문서 등)</p>
          </div>
          <input
            id="attach-file-upload"
            className="file-input"
            multiple
            type="file"
            onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
          />
        </div>

        {attachments.length > 0 && (
          <div className="uploaded-files">
            {attachments.map((file) => (
              <div className="uploaded-file" key={`${file.name}-${file.lastModified}`}>
                <div className="uploaded-file-info">
                  <span className="material-icons">insert_drive_file</span>
                  <span>
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 숨은 입력 — 버튼이 id로 눌러 연다. 첨부 입력보다 뒤에 둔다(첨부가 이 폼의 주 입력이다) */}
          <input className="file-input" id="body-image-upload" type="file" accept="image/*" onChange={addBodyImage} />

        <div className="form-actions">
          <button className={btnClass({ variant: "secondary" })} type="button" onClick={() => navigate("/community")}>
            <span className="material-icons">close</span>
            취소
          </button>
          <button className={btnClass({ variant: "primary" })} disabled={loading} type="submit">
            <span className="material-icons">check</span>
            {loading ? "저장 중..." : "등록"}
          </button>
        </div>
      </form>
    </section>
  );
}

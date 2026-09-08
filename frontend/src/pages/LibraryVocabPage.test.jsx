import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiSuccess, stubFetch } from "../test/helpers.jsx";
import { libraryPage, renderLibrary, vocabItem } from "../test/libraryHelpers.jsx";
import { LibraryVocabPage } from "./LibraryVocabPage.jsx";

function render(page, route = "/library/vocabulary") {
  const fetchMock = stubFetch(() => apiSuccess(page));
  renderLibrary(<LibraryVocabPage />, { path: "/library/vocabulary", route });
  return fetchMock;
}

function rowOf(word) {
  return screen.getByRole("button", { name: `${word} 자세히 보기` });
}

describe("LibraryVocabPage — 표 (설계/05 §7)", () => {
  it("단어·읽기·뜻·품사·레벨 배지를 보여준다 (인수 20·21·25)", async () => {
    render(libraryPage([vocabItem()]));

    const row = await screen.findByRole("button", { name: "応援 자세히 보기" });
    expect(within(row).getByText("おうえん")).toBeInTheDocument();
    // 병합된 뜻은 가운뎃점으로 연결 (서버가 준 senses 순서 그대로)
    expect(within(row).getByText("응원 · 지원")).toBeInTheDocument();
    expect(within(row).getByText("명사")).toBeInTheDocument();
    expect(within(row).getByText("N4")).toBeInTheDocument();
    expect(within(row).getByText("N2")).toBeInTheDocument();
  });

  it("읽기가 없는 단어는 읽기 열에 ─ (인수 20)", async () => {
    render(libraryPage([vocabItem({ id: 5, word: "トイレ", kana: null, levels: ["N5"], senses: [
      {
        meaningKo: "화장실",
        vocabularyIds: [5],
        learnedIn: [{ courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 3, unitTitle: "여기는 어디예요?" }],
      },
    ] })]));

    const row = await screen.findByRole("button", { name: "トイレ 자세히 보기" });
    expect(within(row).getByText("─")).toBeInTheDocument();
  });

  it("뜻이 3개 이상이면 목록 줄은 앞 2개 + …", async () => {
    const senses = ["하나", "둘", "셋"].map((meaningKo, i) => ({
      meaningKo,
      vocabularyIds: [100 + i],
      learnedIn: [{ courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 1, unitTitle: "유닛" }],
    }));
    render(libraryPage([vocabItem({ senses, levels: ["N5"] })]));

    const row = await screen.findByRole("button", { name: "応援 자세히 보기" });
    expect(within(row).getByText("하나 · 둘 …")).toBeInTheDocument();
  });
});

describe("LibraryVocabPage — 아코디언 (설계/05 §11)", () => {
  it("행을 누르면 펼쳐지고 뜻별 출처와 '배우기'가 나온다 (인수 26·28)", async () => {
    const user = userEvent.setup();
    render(libraryPage([vocabItem()]));

    const row = await screen.findByRole("button", { name: "応援 자세히 보기" });
    expect(row).toHaveAttribute("aria-expanded", "false");

    await user.click(row);

    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/초급\(N4\) 코스 · 유닛 14 명령형과 금지형/)).toBeInTheDocument();
    expect(screen.getByText(/중급\(N3\) 코스 · 유닛 25 N3 총정리/)).toBeInTheDocument();
    expect(screen.getByText(/중상급\(N2\) 코스 · 유닛 2 하지 않을 수 없다/)).toBeInTheDocument();
    const learnLinks = screen.getAllByRole("link", { name: /배우기/ });
    expect(learnLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/courses/3/units/14",
      "/courses/4/units/25",
      "/courses/5/units/2",
    ]);
  });

  it("같은 뜻은 제목 한 번 + 출처 여러 줄로 나온다 (QA Major — 뜻 반복 금지)", async () => {
    const user = userEvent.setup();
    render(libraryPage([vocabItem()]));

    await user.click(await screen.findByRole("button", { name: "応援 자세히 보기" }));

    // 서버가 뜻 기준으로 합쳐 주므로 "응원"은 펼침에서도 한 번만 제목으로 나온다
    expect(screen.getAllByText("응원")).toHaveLength(1);
    expect(screen.getAllByText("지원")).toHaveLength(1);
    // 그 대신 "응원"의 출처가 N4·N3 두 줄
    expect(screen.getAllByRole("link", { name: /배우기/ })).toHaveLength(3);
  });

  it("여러 줄을 동시에 펼칠 수 있다 (사전은 비교하며 본다)", async () => {
    const user = userEvent.setup();
    render(libraryPage([vocabItem(), vocabItem({ id: 900, word: "建物", kana: "たてもの", levels: ["N5"], senses: [
      {
        meaningKo: "건물",
        vocabularyIds: [900],
        learnedIn: [{ courseId: 2, courseTitle: "왕초보", level: "N5", unitNo: 3, unitTitle: "여기는 어디예요?" }],
      },
    ] })]));

    await user.click(await screen.findByRole("button", { name: "応援 자세히 보기" }));
    await user.click(rowOf("建物"));

    expect(rowOf("応援")).toHaveAttribute("aria-expanded", "true");
    expect(rowOf("建物")).toHaveAttribute("aria-expanded", "true");
  });

  it("필터가 바뀌면 펼침이 모두 접힌다 (다른 목록이므로)", async () => {
    const user = userEvent.setup();
    render(libraryPage([vocabItem()]));

    await user.click(await screen.findByRole("button", { name: "応援 자세히 보기" }));
    expect(rowOf("応援")).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "N5" }));

    await waitFor(() => expect(rowOf("応援")).toHaveAttribute("aria-expanded", "false"));
  });
});

describe("LibraryVocabPage — 필터·정렬 (인수 22·23)", () => {
  it("품사 칩은 계약 코드로 주소에 담긴다 (라벨은 프론트 상수)", async () => {
    const user = userEvent.setup();
    render(libraryPage([vocabItem()]));
    await screen.findByRole("button", { name: "応援 자세히 보기" });

    await user.click(screen.getByRole("button", { name: "동사" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?pos=VERB"));
  });

  it("정렬 셀렉트로 가나순을 고르면 sort=KANA가 붙고 결과 줄 표기가 바뀐다", async () => {
    const user = userEvent.setup();
    const fetchMock = render(libraryPage([vocabItem()]));
    await screen.findByRole("button", { name: "応援 자세히 보기" });

    await user.selectOptions(screen.getByLabelText("정렬"), "KANA");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?sort=KANA"));
    await waitFor(() =>
      expect(fetchMock.mock.calls.at(-1)[0]).toBe("/api/library/vocabulary?page=0&size=50&sort=KANA"),
    );
    expect(await screen.findByText(/· 가나순/)).toBeInTheDocument();
  });
});

import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { CoursesPage } from "./pages/CoursesPage.jsx";
import { CourseDetailPage } from "./pages/CourseDetailPage.jsx";
import { UnitStudyPage } from "./pages/UnitStudyPage.jsx";
import { LibraryKanjiPage } from "./pages/LibraryKanjiPage.jsx";
import { LibraryKanjiDetailPage } from "./pages/LibraryKanjiDetailPage.jsx";
import { LibraryGrammarPage } from "./pages/LibraryGrammarPage.jsx";
import { LibraryGrammarDetailPage } from "./pages/LibraryGrammarDetailPage.jsx";
import { LibraryVocabPage } from "./pages/LibraryVocabPage.jsx";
import { BookmarksPage } from "./pages/BookmarksPage.jsx";
import { DiagnosisPage } from "./pages/DiagnosisPage.jsx";
import { LibraryQuizPage } from "./pages/LibraryQuizPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { MyPage } from "./pages/MyPage.jsx";
import { ProfileEditPage } from "./pages/ProfileEditPage.jsx";
import { PasswordChangePage } from "./pages/PasswordChangePage.jsx";
import { WithdrawPage } from "./pages/WithdrawPage.jsx";
import { CommunityListPage } from "./pages/CommunityListPage.jsx";
import { CommunityDetailPage } from "./pages/CommunityDetailPage.jsx";
import { CommunityWritePage } from "./pages/CommunityWritePage.jsx";
import { CommunityEditPage } from "./pages/CommunityEditPage.jsx";
import { EnCoursesPage } from "./pages/EnCoursesPage.jsx";
import { EnLibraryExpressionsPage } from "./pages/EnLibraryExpressionsPage.jsx";
import { EnExpressionDetailPage } from "./pages/EnExpressionDetailPage.jsx";
import { EnStartPage } from "./pages/EnStartPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        {/* 코스 학습 — 전부 비로그인 접근 가능 (기획: 비로그인 열람) */}
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/courses/:courseId/units/:unitNo" element={<UnitStudyPage />} />
        {/* 자료실 — 비로그인 동일 (인수 2·37). /library는 기본 탭인 한자로 */}
        <Route path="/library" element={<Navigate to="/library/kanji" replace />} />
        {/* ⚠️ 퀴즈 라우트는 **상세 라우트보다 앞**에 있어야 한다 (2026-09 판정 D-1 · 08 C-20).
            React Router는 점수가 같으면 선언 순서가 이긴다 — "/library/kanji/:kanjiId"(정적2+동적1)와
            "/library/:type/quiz"(정적2+동적1)는 동점이라, 상세가 먼저 오면 "quiz"가 id로 먹혀
            한자·문법 퀴즈가 통째로 404가 된다(어휘만 상세 라우트가 없어 우연히 살아 있었다).
            숫자 id 상세는 "quiz"와 겹치지 않으므로 퀴즈를 앞세워도 상세를 잃지 않는다. */}
        <Route path="/library/:type/quiz" element={<LibraryQuizPage />} />
        <Route path="/library/kanji" element={<LibraryKanjiPage />} />
        <Route path="/library/kanji/:kanjiId" element={<LibraryKanjiDetailPage />} />
        <Route path="/library/grammar" element={<LibraryGrammarPage />} />
        <Route path="/library/grammar/:grammarId" element={<LibraryGrammarDetailPage />} />
        <Route path="/library/vocabulary" element={<LibraryVocabPage />} />
        {/* 실력 진단 — GNB 메뉴 아님, 배너 2곳에서만 진입(설계/05 §15-2) */}
        <Route path="/diagnosis" element={<DiagnosisPage />} />

        {/* 영어 과정 (설계/05 §16) — /en 단독 홈은 만들지 않는다. 자가진단은 서버 없이 코스 목록으로 계산한다 */}
        <Route path="/en" element={<Navigate to="/en/courses" replace />} />
        <Route path="/en/courses" element={<EnCoursesPage />} />
        <Route path="/en/courses/:courseId" element={<CourseDetailPage lang="en" />} />
        <Route path="/en/courses/:courseId/units/:unitNo" element={<UnitStudyPage lang="en" />} />
        <Route path="/en/start" element={<EnStartPage />} />
        {/* 영어 자료실 3탭 — 기본 탭은 표현 (설계/05 §16-3) */}
        <Route path="/en/library" element={<Navigate to="/en/library/expressions" replace />} />
        <Route path="/en/library/expressions" element={<EnLibraryExpressionsPage />} />
        <Route path="/en/library/expressions/:expressionId" element={<EnExpressionDetailPage />} />
        <Route path="/en/library/grammar" element={<LibraryGrammarPage lang="en" />} />
        <Route path="/en/library/grammar/:grammarId" element={<LibraryGrammarDetailPage lang="en" />} />
        <Route path="/en/library/vocabulary" element={<LibraryVocabPage lang="en" />} />
        {/* 보관함 — 비로그인도 보는 화면(설계/04 §6-4). 탭은 ?tab= 쿼리 */}
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mypage/edit"
          element={
            <ProtectedRoute>
              <ProfileEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mypage/password"
          element={
            <ProtectedRoute>
              <PasswordChangePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mypage/withdraw"
          element={
            <ProtectedRoute>
              <WithdrawPage />
            </ProtectedRoute>
          }
        />
        <Route path="/community" element={<CommunityListPage />} />
        <Route path="/community/detail" element={<CommunityDetailPage />} />
        <Route
          path="/community/write"
          element={
            <ProtectedRoute>
              <CommunityWritePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/community/edit"
          element={
            <ProtectedRoute>
              <CommunityEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="/community/list" element={<Navigate to="/community" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;

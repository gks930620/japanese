import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UserDataProvider } from "./context/UserDataContext.jsx";
import { EditorModeProvider } from "./components/EditorMode.jsx";
// CSS 로드 순서 고정: 토큰 → 컴포넌트 → 화면별 스타일 (HALO 가이드 §3-1)
import "./styles/halo-tokens.css";
import "./styles/halo-components.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserDataProvider>
          <EditorModeProvider>
            <App />
          </EditorModeProvider>
        </UserDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

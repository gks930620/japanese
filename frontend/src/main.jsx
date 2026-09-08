import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UserDataProvider } from "./context/UserDataContext.jsx";
import { EditorModeProvider } from "./components/EditorMode.jsx";
// CSS 로드 순서 고정 (Lets 킷 클래스-목록 §0 + 진행사항/디자인전환_Lets_매핑 §2-1)
//   base → components → tokens → extras → project-tokens → styles.css
// mobile.css 는 로드하지 않는다 — 앱형 셸(앱바·탭바·FAB)을 쓰지 않는다(설계/05 §12).
import "../../design_kits_lets/base.css";
import "../../design_kits_lets/components.css";
import "../../design_kits_lets/tokens.css";
import "../../design_kits_lets/extras.css";
import "./styles/project-tokens.css";
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

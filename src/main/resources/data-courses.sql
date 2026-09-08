-- 코스 시드 (설계 §4 고정 ID 계약 — 테스트·프론트 라우팅이 의존)
-- 2026-08-06 코스 확장(설계 §7-8): N4(3)·N3(4)·N2(5) AVAILABLE 전환 + 카드 문구를 확장 기획서 확정 문구로 교체.
-- 준비중은 입문(1)·N1(6)만. AVAILABLE 코스의 description은 각 코스 시드 파일(data-course-n*-content.sql)에서 UPDATE로 채운다.
-- ⚠️ 이 파일은 공용(senior-dev 관리) — 코스별 backend-dev는 이 파일을 수정하지 않는다 (병렬 작업 충돌 방지).
-- 2026-08-21 4단계(설계/03 §1·§3): level_code(필터 코드)·language(과정 언어) 열 추가. 일본어는 전부 'JA'.
INSERT INTO course (id, course_no, level_code, language, level_label, title, target_audience, goal, notice, description, status) VALUES
(1, 0, 'INTRO', 'JA', '문자', '입문', '일본어를 처음 접하는 분', '히라가나·가타카나를 읽고 첫 인사를 할 수 있어요', NULL, NULL, 'PREPARING'),
(2, 1, 'N5', 'JA', 'JLPT N5', '왕초보', '히라가나부터 시작하는 왕초보', '일상 기초 문장을 읽고 말할 수 있어요', '모든 문장에 읽는 법이 함께 있어, 히라가나가 서툴러도 시작할 수 있어요', '히라가나만 겨우 읽어도 괜찮아요. 20개 유닛을 따라가면 일상 기초 문장을 읽고, 묻고, 답할 수 있게 됩니다.', 'AVAILABLE'),
(3, 2, 'N4', 'JA', 'JLPT N4', '초급', 'N5 과정을 마쳤거나, です·ます체와 て형까지 아는 학습자', '반말(보통형)·가능형·의지형·수수표현까지 익혀 친구와 일상 대화를 주고받을 수 있다. JLPT N4 문법 범위 완주', NULL, NULL, 'AVAILABLE'),
(4, 3, 'N3', 'JA', 'JLPT N3', '중급', 'N4 수준의 문법(보통형·가능형·조건 입문)을 아는 학습자', '수동·사역과 경어 입문까지 익혀 상대와 상황에 맞는 말투를 고를 수 있다. JLPT N3 문법 범위 완주', NULL, NULL, 'AVAILABLE'),
(5, 4, 'N2', 'JA', 'JLPT N2', '중상급', 'N3 합격 수준 학습자, JLPT N2 수험 준비생', 'N2 핵심 문형과 실전 경어·문어체 입문까지 — 비즈니스·격식 상황에서 통하는 일본어. JLPT N2 시험 대비', NULL, NULL, 'AVAILABLE'),
(6, 5, 'N1', 'JA', 'JLPT N1', '고급', '고급 표현을 목표로 하는 학습자', '전문적인 글과 방송을 이해하고 유창하게 말해요', NULL, NULL, 'PREPARING');

-- ═══════════════════════════════════════════════════════════════════
-- 영어 코스 2(E2 「일상 말하기」) 콘텐츠 시드 — 문법·예문·회화·표현·어휘
-- 담당: backend-dev(영어) / 계약: 작업자(AI)_문서/04_API계약.md §8 · 작업자(AI)_문서/06_콘텐츠_제작규칙.md §11
-- 커리큘럼: 작업자(AI)_문서/기획_영어_E2커리큘럼.md  (§3 유닛 표 · §8 인계만 읽어도 유닛을 쓸 수 있게 적혀 있다)
--
-- ★ 왜 E1과 파일을 갈랐나 (senior-dev 판정 2026-09-22 — 기획 §8-4 5)
--   ① **코스마다 파일 쌍 하나**가 이 저장소의 원래 관행이다(N5·N4·N3·N2·입문·N1 전부 그렇다 — 작업자(AI)_문서/03 §7-1).
--      영어가 한 쌍을 같이 쓴 것은 열린 코스가 E1 하나뿐이던 시절의 사정이지 규칙이 아니었다.
--   ② **E1은 15/15로 완성돼 더 이상 자라지 않는다.** 끝난 파일을 E2 작업 때마다 여는 것은 사고의 기회만 는다.
--   ③ 합치면 한 파일이 2,500줄을 넘어 **사람도 도구도 한 번에 못 읽는다.** 그러면 "유닛을 쓰기 전에 시드를 훑는다"는
--      중복 장부 절차(기획 §4-3)가 **E1 15유닛까지 끌고 다니는 일**이 된다. 갈라 두면 E2 장부는 이 파일 하나다.
--
-- ⚠️ 이 파일에 **코스 행(course)을 쓰지 않는다.** 코스 102를 여는 UPDATE(status·planned_unit_count·notice·description)는
--    `data-course-en-content.sql`에 있다 — 코스 행을 고치는 문장은 한 곳에 모은다(그 파일 머리 주석 참고).
--
-- ── ID 대역 (기획 §8-2 배정표 · 작업자(AI)_문서/06 §11-10 · 작업자(AI)_문서/03 §7-2) ─────────────────
--   영어 전체 대역은 9000~9999이고, E1 실사용 위에 E2를 얹었다. **테이블마다 id 공간이 따로**다.
--     grammar_point      9100 + (n-1)*5     유닛 1: 9100~9104   … 유닛 20: 9195~9199
--     grammar_example    9300 + (n-1)*15    유닛 1: 9300~9314   … 유닛 20: 9585~9599
--     dialog             9100 + n           유닛 1: 9101        … 유닛 20: 9120
--     dialog_line        9200 + (n-1)*20    유닛 1: 9200~9219   … 유닛 20: 9580~9599
--     expression         9400 + (n-1)*10    유닛 1: 9400~9409   … 유닛 20: 9590~9599
--     expression_example 표현 id와 같은 수 (표현당 예문 1개 원칙)
--     vocabulary         9300 + (n-1)*20    유닛 1: 9300~9319   … 유닛 20: 9680~9699
--   ⚠️ 블록을 넘겨 옆 유닛 번호를 빌려 쓰지 않는다. 표현당 예문을 2개 이상 쓰고 싶으면 senior-dev에게 대역을 묻는다.
--   ⚠️ E3는 이 대역에 들어가지 않는다(어휘 기준 9699까지 찬다) — 착수 전 새 대역 배정이 선행이다(기획 §8-2).
--
-- ── 영어 콘텐츠의 절대 규칙 (어기면 테스트가 빌드에서 잡는다) ──────────────────
--   1) kana 전량 NULL — 발음은 ipa(슬래시로 감쌈) + ko_approx **둘 다** (§11-3)
--   2) 한자 테이블에 행을 만들지 않는다 — 한자 자리는 expression이다 (§11-4)
--   3) part_of_speech는 영어 7종만: NOUN·VERB·ADJECTIVE·ADVERB·PREPOSITION·CONJUNCTION·PHRASE (§11-6)
--   4) 표현·어휘 표제어는 **코스 2 안에서** 중복 금지 (E1과 겹치는 것은 허용 — 기획 §4)
--   5) grammar_example.jp · dialog_line.jp는 이름이 jp지만 **원문 자리**다 — 영어 문장이 들어간다 (§11-3)
--   6) 회화는 화자 2명 이상 · 4~12줄(E2 하한 4, 권장 6~8) (§11-7 · §11-12 ②)
--   7) SQL 작은따옴표는 두 번: didn''t · I''ll · I''ve — E2는 축약이 많아 이 치환이 E1의 두 배로 나온다(기획 §8-3 22)
--
-- ⚠️ 시간 경계(기획 §3-4): 유닛 1~10에 will·be going to·have p.p.를 쓰지 않는다. 유닛 11~15에는 반대로 **써야** 한다.
--
-- ── 유닛 1~5(덩어리 ① 지나간 일을 말한다) 작성 기록 — 2026-09-23 backend-dev ──
--   * 유닛당 실제 사용: 문법 3 · 문법당 예문 3 · 회화 1편(6~7줄) · 표현 7 · 표현 예문 7 · 어휘 16 · 한자 0.
--     블록 여유: 문법 5칸 중 3 · 문법 예문 15칸 중 9 · 대사 20칸 중 6~7 · 표현 10칸 중 7 · 어휘 20칸 중 16.
--   * **표를 다시 그리지 않았다**(기획 §8-3 21). 학교의 표 → E2가 주는 판정 기준 한 줄:
--       -ed 철자 규칙표   → "과거형은 주어를 보지 않는다"        (유닛 1 문법 2)
--       불규칙 3단 변화표 → "세 번째 칸은 유닛 16까지 필요 없다" (유닛 2 문법 3) · "알파벳이 아니라 소리로 묶는다"(문법 1)
--       의문·부정 규칙표  → "과거 표시는 한 문장에 한 번뿐"      (유닛 3 문법 1·2)
--       ago/for/before표  → "무엇을 재는 말인가"                 (유닛 5 문법 3)
--   * **시간 경계를 장면 설계로 지켰다**(기획 §3-4 ③·④). 유닛 1~5의 회화 다섯 편 어디에서도 두 사람이
--     앞일을 새로 정하지 않는다 — 다섯 장면이 전부 **이미 지나간 일을 맞춰 보는 자리**(주말 보고 · 자리를 비운 사이 ·
--     엇갈린 통화 · 다녀온 출장 · 예전 동네)다. 그래서 will·be going to를 우회할 일 자체가 생기지 않았다.
--   * `was/were` 뒤에는 명사·형용사·장소구만 놓았다(§8-3 25) — 수동태로 읽힐 과거분사를 두지 않았다.
--     같은 이유로 `was closed`·`was crowded` 후보를 버리고 `closed down`(유닛 5 표현)·`was full`로 바꿨다.
--   * 비교급(`-er than`)·관계절·`when`/`while`/`if` 절·`could`를 쓰지 않았다(§2-1 · §2-2 · AC-17).
--   * E1과 겹친 표제어는 두 개뿐이고 둘 다 기획 §4-1이 허용 근거로 든 바로 그 자리다 —
--     `leave`(E1 떠나다 → E2 남기다, left 불규칙이 유닛 2의 주제) · `close`(E1 형용사 가까운 → E2 동사 닫다).
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 1 「지나간 일은 동사 한 곳에만 표시한다」 — was/were · -ed · 언제인지 함께 말한다
-- 문법 9100~9102 / 예문 9300~9308 / 회화 9101(대사 9200~9205) / 표현 9400~9406 / 어휘 9300~9315
-- 장면: 월요일 아침, 주말에 뭘 했는지 주고받는다 — 지나간 일을 보고하는 자리이지 앞일을 정하는 자리가 아니다(기획 §3-4 ④).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9100, 'be동사의 과거 (was / were)', '고를 것이 셋에서 둘로 줄어든다', '학교에서는 am·is는 was로, are는 were로 바뀐다는 변환표를 칸마다 외웠습니다. 실제로 기억할 것은 표가 아니라 한 줄입니다 — 현재형은 am·is·are 셋 중에 골랐지만 과거는 둘뿐입니다. you·we·they면 were, 나머지는 전부 was입니다: I was busy. / They were late. 고를 것이 하나 줄어드는 자리라 과거가 현재보다 오히려 쉬워집니다. 부정도 E1에서 배운 그대로 뒤에 not만 붙여 wasn''t·weren''t가 됩니다.'),
(9101, '일반동사의 과거 -ed', '주어를 보지 않는다', '학교에서는 -ed를 붙이는 철자 규칙(y를 ied로, 자음 겹치기)을 표로 외웠습니다. 철자보다 먼저 알 것이 따로 있습니다 — 과거형은 주어를 보지 않습니다. 현재형은 he·she·it일 때만 -s를 붙여야 해서 말하기 전에 주어를 확인했지만, 과거는 누가 주어든 worked 하나입니다: I worked, she worked, they worked. 고를 일이 아예 없어집니다. 철자는 쓰다가 막히면 그때 확인해도 늦지 않습니다.'),
(9102, '언제 일인지 함께 말한다 (yesterday / last night / two days ago)', '과거 문장은 시간을 달고 다닌다', '학교에서는 시간 표현을 단어 목록으로 따로 외웠습니다. 실제로는 목록이 아니라 문장의 일부입니다 — 과거형을 쓰는 순간 듣는 사람은 "언제?"를 먼저 궁금해하기 때문에, 시간을 말해 주지 않으면 말이 붕 뜹니다. 자리는 문장 끝입니다: I called him last night. E1에서 세운 "장소 먼저, 시간 나중"이 과거에서도 그대로 갑니다: I met her at the station yesterday.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9300, 9100, 1, 'I was at home all weekend.', NULL, '주말 내내 집에 있었어요.'),
(9301, 9100, 2, 'The movie was really long.', NULL, '그 영화는 정말 길었어요.'),
(9302, 9100, 3, 'They were late for the game.', NULL, '그 사람들은 경기에 늦었어요.'),
(9303, 9101, 1, 'I watched a movie last night.', NULL, '어젯밤에 영화를 한 편 봤어요.'),
(9304, 9101, 2, 'She watched the same show.', NULL, '그녀도 같은 프로그램을 봤어요.'),
(9305, 9101, 3, 'We walked around the park for an hour.', NULL, '우리는 한 시간 동안 공원을 걸었어요.'),
(9306, 9102, 1, 'I called him last night.', NULL, '어젯밤에 그에게 전화했어요.'),
(9307, 9102, 2, 'We met at the station yesterday.', NULL, '어제 역에서 만났어요.'),
(9308, 9102, 3, 'She started the new job two days ago.', NULL, '그녀는 이틀 전에 새 일을 시작했어요.');

INSERT INTO dialog (id, title) VALUES
(9101, '월요일 아침, 주말 이야기');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9200, 9101, 1, 'Mina', 'Good morning, Ben. How was your weekend?', NULL, '좋은 아침이에요, 벤. 주말 어땠어요?'),
(9201, 9101, 2, 'Ben', 'It was quiet. I watched a movie last night.', NULL, '조용했어요. 어젯밤에 영화를 한 편 봤어요.'),
(9202, 9101, 3, 'Mina', 'Nice. I visited my sister over the weekend.', NULL, '좋네요. 저는 주말 사이에 언니를 보러 갔어요.'),
(9203, 9101, 4, 'Ben', 'That''s far. Was the train full?', NULL, '멀잖아요. 기차에 사람 많았어요?'),
(9204, 9101, 5, 'Mina', 'It wasn''t too bad. But I was tired all day yesterday.', NULL, '그렇게 심하진 않았어요. 그래도 어제는 하루 종일 피곤했어요.'),
(9205, 9101, 6, 'Ben', 'Same here. I washed the car the other day, and my arms are still sore.', NULL, '저도요. 며칠 전에 세차를 했는데 아직 팔이 뻐근해요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9400, 'the other day', '며칠 전에', '날짜를 꼭 집지 않고 "요 며칠 사이"를 가리킵니다. 며칠에서 몇 주 전까지 덮고, 언제나 과거형과 함께 옵니다. 다른 날이라는 뜻이 아닙니다.', '/ði ˈʌðər deɪ/', '디 아더 데이'),
(9401, 'a while ago', '조금 전에 · 얼마 전에', '몇 분 전일 수도, 몇 달 전일 수도 있어 앞뒤 상황이 길이를 정합니다. 훨씬 먼 과거는 같은 자리에 a long time ago를 씁니다.', '/ə waɪl əˈɡoʊ/', '어 와일 어고우'),
(9402, 'all day', '하루 종일', '전치사 없이 그대로 문장 끝에 붙습니다 — for all day가 아닙니다. 이어진 길이를 말하는 덩어리라 도착·시작처럼 한 번에 끝나는 일에는 쓰지 않습니다.', '/ɔːl deɪ/', '올- 데이'),
(9403, 'over the weekend', '주말 사이에', '주말 이틀 어딘가를 가리키므로 요일을 정하지 않습니다. on the weekend가 "주말에"로 넓다면 이쪽은 "그 주말 동안"에 가깝습니다.', '/ˈoʊvər ðə ˈwiːkend/', '오우버 더 위-켄드'),
(9404, 'at that time', '그때는', '이야기 속의 한 시점을 다시 가리킵니다. 지금을 가리키는 at the moment(E1)와 앉는 자리가 같고 시점만 다릅니다.', '/æt ðæt taɪm/', '앳 댓 타임'),
(9405, 'last night', '어젯밤에', 'yesterday night이라고 하지 않습니다. 앞에 on·in을 붙이지 않고 문장 끝에 그대로 놓습니다: I called you last night.', '/læst naɪt/', '라스트 나이트'),
(9406, 'catch a movie', '영화를 한 편 보다', '극장에 가서 가볍게 한 편 본다는 말입니다. 집에서 보는 것은 watch a movie이고, catch에는 시간에 맞춰 잡는다는 느낌이 남아 있습니다.', '/kætʃ ə ˈmuːvi/', '캐치 어 무-비');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9400, 9400, 1, 'I saw Mina at the bank the other day.', '며칠 전에 은행에서 미나를 봤어요.'),
(9401, 9401, 1, 'He left the office a while ago.', '그는 조금 전에 사무실에서 나갔어요.'),
(9402, 9402, 1, 'I was at home all day yesterday.', '어제는 하루 종일 집에 있었어요.'),
(9403, 9403, 1, 'I visited my sister over the weekend.', '주말 사이에 언니를 보러 갔어요.'),
(9404, 9404, 1, 'At that time I lived near the station.', '그때는 역 근처에 살았어요.'),
(9405, 9405, 1, 'I called you last night.', '어젯밤에 전화했어요.'),
(9406, 9406, 1, 'We caught a movie after dinner.', '저녁을 먹고 영화를 한 편 봤어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9300, 'dinner', NULL, '저녁 식사', 'NOUN', '/ˈdɪnər/', '디너'),
(9301, 'game', NULL, '경기 · 게임', 'NOUN', '/ɡeɪm/', '게임'),
(9302, 'show', NULL, '(방송) 프로그램 · 공연', 'NOUN', '/ʃoʊ/', '쇼우'),
(9303, 'nap', NULL, '낮잠', 'NOUN', '/næp/', '냅'),
(9304, 'rest', NULL, '휴식', 'NOUN', '/rest/', '레스트'),
(9305, 'sleep', NULL, '자다', 'VERB', '/sliːp/', '슬리-프'),
(9306, 'visit', NULL, '찾아가다 · 보러 가다', 'VERB', '/ˈvɪzɪt/', '비지트'),
(9307, 'watch', NULL, '(영화·경기를) 보다', 'VERB', '/wɑːtʃ/', '와-치'),
(9308, 'wash', NULL, '씻다 · 빨다', 'VERB', '/wɑːʃ/', '와-시'),
(9309, 'boring', NULL, '지루한', 'ADJECTIVE', '/ˈbɔːrɪŋ/', '보-링'),
(9310, 'great', NULL, '아주 좋은', 'ADJECTIVE', '/ɡreɪt/', '그레이트'),
(9311, 'terrible', NULL, '형편없는 · 끔찍한', 'ADJECTIVE', '/ˈterəbl/', '테러블'),
(9312, 'last', NULL, '지난 · 바로 전의', 'ADJECTIVE', '/læst/', '라스트'),
(9313, 'yesterday', NULL, '어제', 'ADVERB', '/ˈjestərdeɪ/', '예스터데이'),
(9314, 'sore', NULL, '(근육이) 뻐근한', 'ADJECTIVE', '/sɔːr/', '소-'),
(9315, 'ago', NULL, '~ 전에', 'ADVERB', '/əˈɡoʊ/', '어고우');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 2 「외울 것은 세 칸이 아니라 한 칸이다」 — 불규칙 과거 · 모양이 안 바뀌는 동사 · 세 번째 칸은 아직
-- 문법 9105~9107 / 예문 9315~9323 / 회화 9102(대사 9220~9225) / 표현 9410~9416 / 어휘 9320~9335
-- ⚠️ 문법 9107이 "세 번째 칸은 유닛 16까지 필요 없다"고 미뤄 둔다 — **유닛 16 문법 1이 그 약속을 회수한다**(기획 §3-3).
--    두 자리 중 한쪽만 고치지 말 것. 그래서 이 유닛의 예문·회화에는 과거분사가 한 번도 나오지 않는다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9105, '자주 쓰는 불규칙 과거 (went / saw / took / got)', '목록이 아니라 소리 묶음으로 익힌다', '학교에서는 불규칙 동사표를 알파벳 순서로 백 개씩 외웠습니다. 실제로 말할 때 쓰는 것은 스무 개 남짓이고, 그마저 소리로 묶입니다 — i가 a로 바뀌는 무리(sit → sat, give → gave), -ought·-aught로 끝나는 무리(buy → bought, think → thought, teach → taught). 알파벳 순서로 외우면 이 묶음이 안 보여서 하나하나가 따로 외울 것이 됩니다. 소리가 닮은 것끼리 서넛씩 묶어 두면 남는 것이 훨씬 많습니다.'),
(9106, '모양이 안 바뀌는 동사 (put / cut / let / read)', '안 바뀐 것이지 빠뜨린 것이 아니다', '학교에서는 표의 칸이 같아서 "예외"라고 적고 넘어갔습니다. 실제로 이 동사들은 현재와 과거의 글자가 같습니다 — I put it there yesterday.를 써 놓고 과거형을 빠뜨렸나 싶어 putted를 만들지 않으면 됩니다. yesterday가 이미 과거를 말해 주고 있습니다. read만 글자는 그대로인데 소리가 /riːd/에서 /red/로 바뀝니다 — 눈으로는 같고 입에서만 갈리는 자리입니다.'),
(9107, '과거분사 칸은 아직 필요 없다', '세 칸을 한꺼번에 외우지 않는다', '학교에서는 원형·과거·과거분사 세 칸을 한 줄로 묶어 외웠습니다. 그런데 세 번째 칸을 실제로 쓰는 자리는 이 코스 유닛 16에 가서야 나옵니다. 쓸 자리를 모르는 채 외우면 남는 것이 없습니다 — 지금은 두 번째 칸만 가져가세요. go-went, see-saw, take-took, get-got까지면 지난 일을 말하는 데 모자라지 않습니다. 세 번째 칸은 필요해질 때 다시 꺼내 오면 됩니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9315, 9105, 1, 'She went home early yesterday.', NULL, '그녀는 어제 일찍 집에 갔어요.'),
(9316, 9105, 2, 'I bought a new bag last week.', NULL, '지난주에 새 가방을 샀어요.'),
(9317, 9105, 3, 'He took the last bus.', NULL, '그는 막차를 탔어요.'),
(9318, 9106, 1, 'I put the box on your desk yesterday.', NULL, '어제 상자를 당신 책상 위에 뒀어요.'),
(9319, 9106, 2, 'She cut the paper in half this morning.', NULL, '그녀가 오늘 아침에 종이를 반으로 잘랐어요.'),
(9320, 9106, 3, 'He read the message an hour ago.', NULL, '그는 한 시간 전에 그 메시지를 읽었어요.'),
(9321, 9107, 1, 'I saw Ben at the bank yesterday.', NULL, '어제 은행에서 벤을 봤어요.'),
(9322, 9107, 2, 'We got the news this morning.', NULL, '오늘 아침에 그 소식을 들었어요.'),
(9323, 9107, 3, 'They left the office at six.', NULL, '그들은 6시에 사무실을 나갔어요.');

INSERT INTO dialog (id, title) VALUES
(9102, '자리를 비운 사이에 있었던 일');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9220, 9102, 1, 'Mina', 'You missed a lot yesterday, Ben.', NULL, '벤, 어제 많은 걸 놓쳤어요.'),
(9221, 9102, 2, 'Ben', 'Really? What happened?', NULL, '정말요? 무슨 일 있었어요?'),
(9222, 9102, 3, 'Mina', 'Guess what? The new manager came in the morning and said hello to everyone.', NULL, '있잖아요, 새 팀장님이 아침에 오셔서 모두에게 인사했어요.'),
(9223, 9102, 4, 'Ben', 'Oh no. And I took the day off.', NULL, '이런. 하필 저는 그날 휴가를 냈어요.'),
(9224, 9102, 5, 'Mina', 'He left a note on your desk. I put it in your drawer.', NULL, '그분이 당신 책상에 쪽지를 남기셨어요. 제가 서랍에 넣어 뒀어요.'),
(9225, 9102, 6, 'Ben', 'Thanks. I read the team message this morning, and it said nothing about him.', NULL, '고마워요. 오늘 아침에 팀 메시지를 읽었는데 그분 이야기는 없었어요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9410, 'guess what', '있잖아요 · 그거 알아요?', '새 소식을 꺼내기 전에 상대의 주의를 끄는 한 마디입니다. 정말 맞혀 보라는 뜻이 아니라서 듣는 쪽은 What?이라고만 받으면 됩니다.', '/ɡes wʌt/', '게스 왓'),
(9411, 'by mistake', '실수로', '일부러가 아니었다는 뜻을 문장 끝에 얹습니다. mistake 앞에 a를 넣지 않는 굳은 자리이고, 반대편에 on purpose가 있습니다.', '/baɪ mɪˈsteɪk/', '바이 미스테이크'),
(9412, 'on purpose', '일부러', 'by mistake의 반대편입니다. 나쁜 뜻이 붙기 쉬워서 상대를 두고 쓸 때는 조심합니다 — 사실만 말할 때는 I didn''t do it on purpose. 쪽이 흔합니다.', '/ɑːn ˈpɜːrpəs/', '온 퍼-퍼스'),
(9413, 'out of nowhere', '난데없이', '예고 없이 갑자기 나타나거나 벌어졌다는 뜻입니다. 어디에서 왔는지를 묻는 말이 아니라 준비할 틈이 없었다는 쪽에 무게가 있습니다.', '/aʊt əv ˈnoʊwer/', '아웃 어브 노우웨어'),
(9414, 'drop off', '맡기고 가다 · 내려 주다', '사람이나 물건을 잠깐 두고 간다는 그림입니다. 사람에게 쓰면 차로 내려 준다는 뜻(E1의 give a ride와 짝)이고, 떨어뜨렸다는 말이 아닙니다.', '/drɑːp ɔːf/', '드랍- 오-프'),
(9415, 'fill in for', '~의 자리를 대신 맡다', '누가 빠진 자리를 잠깐 메운다는 뜻이라 뒤에는 사람이 옵니다. 서류를 채우는 fill out(E1)과 모양이 닮았지만 뒤에 오는 것이 달라 갈립니다.', '/fɪl ɪn fɔːr/', '필 인 포-'),
(9416, 'pass along', '(말·물건을) 전해 주다', '들은 소식이나 받은 물건을 다음 사람에게 그대로 넘긴다는 뜻입니다. pass on도 같은 자리에 쓰고, 말에도 물건에도 씁니다.', '/pæs əˈlɔːŋ/', '패스 어롱-');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9410, 9410, 1, 'Guess what? The manager came yesterday.', '있잖아요, 어제 팀장님이 오셨어요.'),
(9411, 9411, 1, 'I deleted the file by mistake.', '실수로 그 파일을 지웠어요.'),
(9412, 9412, 1, 'He left the door open on purpose.', '그는 일부러 문을 열어 뒀어요.'),
(9413, 9413, 1, 'A visitor came out of nowhere this morning.', '오늘 아침에 난데없이 손님이 왔어요.'),
(9414, 9414, 1, 'She dropped off a package at the front desk.', '그녀가 안내데스크에 소포를 맡기고 갔어요.'),
(9415, 9415, 1, 'Mina filled in for me yesterday.', '어제 미나가 제 자리를 대신 맡아 줬어요.'),
(9416, 9416, 1, 'I passed along your message to the team.', '당신 메시지를 팀에 전했어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9320, 'news', NULL, '소식 · 뉴스', 'NOUN', '/nuːz/', '누-즈'),
(9321, 'event', NULL, '행사 · 벌어진 일', 'NOUN', '/ɪˈvent/', '이벤트'),
(9322, 'delivery', NULL, '배달 · 배송', 'NOUN', '/dɪˈlɪvəri/', '딜리버리'),
(9323, 'message', NULL, '메시지 · 전할 말', 'NOUN', '/ˈmesɪdʒ/', '메시지'),
(9324, 'note', NULL, '쪽지 · 메모', 'NOUN', '/noʊt/', '노우트'),
(9325, 'story', NULL, '이야기 · 사연', 'NOUN', '/ˈstɔːri/', '스토-리'),
(9326, 'announcement', NULL, '공지 · 알림', 'NOUN', '/əˈnaʊnsmənt/', '어나운스먼트'),
(9327, 'happen', NULL, '일어나다 · 생기다', 'VERB', '/ˈhæpən/', '해펀'),
(9328, 'tell', NULL, '말해 주다 · 전하다', 'VERB', '/tel/', '텔'),
(9329, 'hear', NULL, '전해 듣다', 'VERB', '/hɪr/', '히어'),
(9330, 'leave', NULL, '남기다 · 두고 가다', 'VERB', '/liːv/', '리-브'),
(9331, 'sign', NULL, '서명하다', 'VERB', '/saɪn/', '사인'),
(9332, 'put', NULL, '놓다 · 두다', 'VERB', '/pʊt/', '풋'),
(9333, 'cut', NULL, '자르다 · 베다', 'VERB', '/kʌt/', '컷'),
(9334, 'sudden', NULL, '갑작스러운', 'ADJECTIVE', '/ˈsʌdn/', '서든'),
(9335, 'absent', NULL, '자리에 없는 · 결근한', 'ADJECTIVE', '/ˈæbsənt/', '앱선트');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 3 「묻고 아니라고 할 땐 did가 과거를 가져간다」 — Did you ~? · didn''t · be 과거는 did를 안 데려온다
-- 문법 9110~9112 / 예문 9330~9338 / 회화 9103(대사 9240~9245) / 표현 9420~9426 / 어휘 9340~9355
-- 순서의 근거(기획 §3-2): 유닛 2에서 went·took을 힘들게 외운 다음이라야 "의문문에서는 그걸 안 써도 된다"가 선물이 된다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9110, 'Did you ~?', '과거는 앞에서 한 번만 말한다', '학교에서는 "과거 의문문은 did를 쓴다"로 외웠습니다. 실제로는 E1에서 본 does와 똑같은 일이 벌어집니다 — did가 과거를 통째로 가져가므로 뒤의 동사는 원래 모양으로 돌아갑니다: Did you went?이 아니라 Did you go? 한 문장에 과거 표시는 한 번뿐입니다. 유닛 2에서 힘들게 외운 went를 여기서는 쓸 일이 없다는 뜻이기도 합니다. 주어가 he·she여도 does 같은 짝 없이 did 하나입니다.'),
(9111, 'didn''t', '현재형에서 둘로 갈리던 것이 하나로 합쳐진다', '학교에서는 부정문 만드는 법을 문장 종류마다 따로 외웠습니다. 실제로 I didn''t went이 안 되는 이유는 바로 앞 항목과 같습니다 — didn''t가 이미 과거를 가져갔으므로 뒤는 원형입니다: I didn''t go. 그리고 현재형에서 don''t와 doesn''t로 갈리던 것이 과거에는 didn''t 하나뿐입니다. 주어가 he·she·it이어도 갈리지 않습니다. 여기서도 고를 일이 줄어듭니다.'),
(9112, 'be동사 과거의 의문·부정 (Were you ~? / wasn''t)', '갈림은 여전히 be동사인가 아닌가다', '학교에서는 was·were의 의문문과 부정문을 또 다른 규칙으로 따로 배웠습니다. 실제로는 E1에서 세운 것이 그대로 옵니다 — be동사는 혼자 앞으로 나가고, 부정은 뒤에 not만 붙입니다: Were you at the meeting? / I wasn''t there. Did you were busy? 같은 문장은 없습니다. 갈리는 지점은 시제가 아니라 be동사인가 아닌가 하나뿐이고, 그 하나는 현재에서 과거로 와도 바뀌지 않습니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9330, 9110, 1, 'Did you call me last night?', NULL, '어젯밤에 저한테 전화했어요?'),
(9331, 9110, 2, 'Did she send the file yesterday?', NULL, '그녀가 어제 파일을 보냈어요?'),
(9332, 9110, 3, 'Did they go to the meeting?', NULL, '그들은 회의에 갔어요?'),
(9333, 9111, 1, 'I didn''t see your message.', NULL, '메시지를 못 봤어요.'),
(9334, 9111, 2, 'He didn''t answer the phone.', NULL, '그는 전화를 안 받았어요.'),
(9335, 9111, 3, 'We didn''t know about the change.', NULL, '우리는 그 변경을 몰랐어요.'),
(9336, 9112, 1, 'Were you at the office yesterday?', NULL, '어제 사무실에 있었어요?'),
(9337, 9112, 2, 'I wasn''t at my desk this morning.', NULL, '오늘 아침엔 자리에 없었어요.'),
(9338, 9112, 3, 'Was the meeting long?', NULL, '회의가 길었어요?');

INSERT INTO dialog (id, title) VALUES
(9103, '어제 전화, 서로 엇갈렸네요');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9240, 9103, 1, 'Ben', 'Did you call me last night?', NULL, '어젯밤에 저한테 전화했어요?'),
(9241, 9103, 2, 'Mina', 'No, I didn''t. I sent a message.', NULL, '아니요, 안 했어요. 메시지를 보냈어요.'),
(9242, 9103, 3, 'Ben', 'Oh, I didn''t see it. My phone was off.', NULL, '아, 못 봤어요. 휴대폰이 꺼져 있었어요.'),
(9243, 9103, 4, 'Mina', 'Were you at the meeting at four?', NULL, '4시 회의에는 있었어요?'),
(9244, 9103, 5, 'Ben', 'No, I wasn''t. My bus was late.', NULL, '아니요, 없었어요. 버스가 늦었어요.'),
(9245, 9103, 6, 'Mina', 'My bad. I waited for you at the door.', NULL, '제가 잘못 알았네요. 문 앞에서 기다렸어요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9420, 'my bad', '제 잘못이에요', '가볍게 잘못을 인정하는 구어입니다. I am sorry보다 훨씬 가볍고 친한 사이에서 씁니다. 문법이 어긋나 보이지만 통째로 굳은 말이라 그대로 씁니다.', '/maɪ bæd/', '마이 배드'),
(9421, 'come to think of it', '생각해 보니', '말하다가 방금 떠오른 것을 꺼낼 때 문장 앞에 놓습니다. 상대에게 생각해 보라는 권유가 아니라 말하는 사람이 떠올렸다는 신호입니다.', '/kʌm tuː θɪŋk əv ɪt/', '컴 투- 씽크 어브 잇'),
(9422, 'for a second', '잠깐 동안', '말 그대로 1초가 아니라 아주 짧은 사이를 말합니다. 같은 자리에 for a moment도 씁니다.', '/fɔːr ə ˈsekənd/', '포- 어 세컨드'),
(9423, 'get back to', '~에게 다시 연락하다', '지금 답을 못 주고 나중에 답을 준다는 뜻이라 뒤에는 사람이 옵니다. 되돌아간다는 뜻의 go back과 달리 답장·회신 쪽입니다.', '/ɡet bæk tuː/', '겟 백 투-'),
(9424, 'leave a message', '메시지를 남기다', '상대가 전화를 받지 않았을 때 남기는 말입니다. leave가 "떠나다"가 아니라 "남기다"로 쓰이는 대표 자리이고, 과거는 left a message입니다.', '/liːv ə ˈmesɪdʒ/', '리-브 어 메시지'),
(9425, 'wrong number', '전화를 잘못 걸었음', 'You have the wrong number.처럼 씁니다. 번호가 어긋났다는 말이지 상대를 탓하는 말이 아니라서 사과할 일도 아닙니다.', '/rɔːŋ ˈnʌmbər/', '롱- 넘버'),
(9426, 'mix up', '헷갈리다 · 잘못 알다', '두 가지를 서로 바꿔 알았다는 뜻이라 뒤에는 헷갈린 대상이 옵니다 — 시간·날짜·이름처럼 짝이 있는 것에 씁니다. 목적어가 it이면 mix it up처럼 사이에 넣고, 과거는 mixed up입니다.', '/mɪks ʌp/', '믹스 업');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9420, 9420, 1, 'My bad — I wrote the wrong date.', '제 잘못이에요, 날짜를 잘못 적었어요.'),
(9421, 9421, 1, 'Come to think of it, he called me on Monday.', '생각해 보니 그가 월요일에 전화했어요.'),
(9422, 9422, 1, 'The line went quiet for a second.', '통화가 잠깐 조용해졌어요.'),
(9423, 9423, 1, 'He got back to me an hour later.', '그가 한 시간 뒤에 다시 연락해 줬어요.'),
(9424, 9424, 1, 'I left a message at the front desk.', '안내데스크에 메시지를 남겼어요.'),
(9425, 9425, 1, 'Sorry, I had the wrong number.', '죄송해요, 번호를 잘못 알았어요.'),
(9426, 9426, 1, 'I mixed up the time and missed your call.', '시간을 헷갈려서 전화를 못 받았어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9340, 'voicemail', NULL, '음성 메시지', 'NOUN', '/ˈvɔɪsmeɪl/', '보이스메일'),
(9341, 'number', NULL, '번호', 'NOUN', '/ˈnʌmbər/', '넘버'),
(9342, 'text', NULL, '문자 메시지', 'NOUN', '/tekst/', '텍스트'),
(9343, 'call', NULL, '전화하다', 'VERB', '/kɔːl/', '콜-'),
(9344, 'contact', NULL, '연락하다', 'VERB', '/ˈkɑːntækt/', '칸-택트'),
(9345, 'ring', NULL, '(전화가) 울리다', 'VERB', '/rɪŋ/', '링'),
(9346, 'reach', NULL, '연락이 닿다', 'VERB', '/riːtʃ/', '리-치'),
(9347, 'reply', NULL, '답장하다', 'VERB', '/rɪˈplaɪ/', '리플라이'),
(9348, 'remember', NULL, '기억하다', 'VERB', '/rɪˈmembər/', '리멤버'),
(9349, 'miss', NULL, '놓치다 · 못 받다', 'VERB', '/mɪs/', '미스'),
(9350, 'mention', NULL, '말을 꺼내다 · 언급하다', 'VERB', '/ˈmenʃn/', '멘션'),
(9351, 'chat', NULL, '이야기를 나누다', 'VERB', '/tʃæt/', '챗'),
(9352, 'weird', NULL, '묘한 · 이상한', 'ADJECTIVE', '/wɪrd/', '위어드'),
(9353, 'strange', NULL, '낯선 · 뜻밖의', 'ADJECTIVE', '/streɪndʒ/', '스트레인지'),
(9354, 'off', NULL, '꺼진 · 쉬는', 'ADJECTIVE', '/ɔːf/', '오-프'),
(9355, 'around', NULL, '~쯤에 · ~ 근처에', 'PREPOSITION', '/əˈraʊnd/', '어라운드');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 4 「어땠는지 묻는다」 — 과거의 의문사 · Who가 주어일 때 · How was it? / What was it like?
-- 문법 9115~9117 / 예문 9345~9353 / 회화 9104(대사 9260~9266) / 표현 9430~9436 / 어휘 9360~9375
-- ⚠️ 소감을 말하는 표현 일곱 개 어디에도 비교급을 쓰지 않았다 — better than 류는 E3다(기획 §2-1 · AC-17).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9115, '과거의 의문사 의문문 (What / Where / When did you ~?)', '앞에 한 단어만 세우고 뒤는 하나도 안 바뀐다', '학교에서는 의문사마다 예문을 따로 외웠습니다. 실제로는 E1에서 한 조립과 완전히 같습니다 — 이미 만든 Did you go? 앞에 Where 한 단어를 세우면 끝이고 뒤는 하나도 바뀌지 않습니다: Where did you go? 새로 배울 것이 없다는 것이 이 항목의 요지입니다. 뒤의 동사가 원형으로 돌아가는 것도 그대로라 Where did you went?는 없습니다. 유닛 3을 만들 줄 알면 이 유닛의 절반은 이미 끝나 있습니다.'),
(9116, 'Who가 주어면 did를 세우지 않는다 (Who called?)', '묻는 말이 곧 주어면 순서를 흔들 일이 없다', '학교에서는 "과거 의문문에는 did"만 배웠습니다. 그런데 의문사가 주어 자리에 있으면 did가 필요 없습니다 — Who called you?이지 Who did call you?가 아닙니다. 주어 자리를 그대로 물어보는 말이라 순서를 흔들 일이 없기 때문입니다. E1에서 현재형으로 세운 규칙(Who knows Mina?)이 과거에서 그대로 반복됩니다. What happened?도 같은 모양이라 did가 없습니다.'),
(9117, 'How was it? / What was it like?', '겪은 일의 소감을 묻는 두 마디', '학교에서는 이 둘을 How about ~?과 뒤섞어 배웠습니다. 실제로 다녀온 일의 소감을 묻는 말은 이 둘이 거의 전부입니다 — How was it?은 좋았는지를 묻고, What was it like?는 어떤 느낌이었는지를 묻습니다. 여기서 like는 "~ 같은"을 뜻하는 자리라 Did you like it?의 like(좋아하다)와 아예 다른 말입니다. 대답도 그래서 갈립니다: It was great. / It was like a small village.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9345, 9115, 1, 'Where did you stay?', NULL, '어디서 묵었어요?'),
(9346, 9115, 2, 'What did you eat there?', NULL, '거기서 뭘 먹었어요?'),
(9347, 9115, 3, 'When did you come back?', NULL, '언제 돌아왔어요?'),
(9348, 9116, 1, 'Who went with you?', NULL, '누가 같이 갔어요?'),
(9349, 9116, 2, 'Who called this morning?', NULL, '오늘 아침에 누가 전화했어요?'),
(9350, 9116, 3, 'What happened at the airport?', NULL, '공항에서 무슨 일이 있었어요?'),
(9351, 9117, 1, 'How was the trip?', NULL, '여행은 어땠어요?'),
(9352, 9117, 2, 'What was the hotel like?', NULL, '호텔은 어떤 느낌이었어요?'),
(9353, 9117, 3, 'How was the food there?', NULL, '거기 음식은 어땠어요?');

INSERT INTO dialog (id, title) VALUES
(9104, '출장 다녀온 동료에게');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9260, 9104, 1, 'Mina', 'You were in Osaka last week. How was it?', NULL, '지난주에 오사카에 계셨어요. 어땠어요?'),
(9261, 9104, 2, 'Ben', 'It was great. The office there was really quiet.', NULL, '좋았어요. 거기 사무실은 정말 조용했어요.'),
(9262, 9104, 3, 'Mina', 'Who went with you?', NULL, '누가 같이 갔어요?'),
(9263, 9104, 4, 'Ben', 'Jun did. We took the early flight on Monday.', NULL, '준이요. 월요일 이른 비행기를 탔어요.'),
(9264, 9104, 5, 'Mina', 'Where did you stay?', NULL, '어디서 묵었어요?'),
(9265, 9104, 6, 'Ben', 'A small hotel near the station. What was your week like?', NULL, '역 근처 작은 호텔에서요. 그쪽 한 주는 어떤 느낌이었어요?'),
(9266, 9104, 7, 'Mina', 'Busy, but not bad.', NULL, '바빴지만 나쁘지 않았어요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9430, 'not bad', '나쁘지 않아요 · 괜찮았어요', '말은 부정인데 뜻은 칭찬 쪽입니다. 기대보다 괜찮았다는 평이고 아주 좋았다는 말까지는 아닙니다. 한국어의 "나쁘지 않네요"와 자리가 같습니다.', '/nɑːt bæd/', '낫 배드'),
(9431, 'worth it', '그만한 값을 하다', '돈이나 시간을 쓴 값을 했다는 뜻입니다. 앞에 It was를 붙여 문장을 만들고, 값이 얼마인지가 아니라 값어치를 말하는 자리입니다.', '/wɜːrθ ɪt/', '워-쓰 잇'),
(9432, 'a waste of time', '시간 낭비', 'worth it의 반대편입니다. 사람을 주어로 두면 무례해지므로 일·모임처럼 사물을 주어에 놓습니다.', '/ə weɪst əv taɪm/', '어 웨이스트 어브 타임'),
(9433, 'no wonder', '어쩐지 · 그러니 그랬군요', '이유를 듣고 납득했을 때 문장 앞에 놓습니다: No wonder you were tired. 궁금하지 않다는 뜻이 아닙니다.', '/noʊ ˈwʌndər/', '노우 원더'),
(9434, 'pretty good', '꽤 괜찮은', '여기서 pretty는 "예쁜"이 아니라 "꽤"입니다. very보다 한 칸 아래라 아주 좋다는 말까지는 아니고 괜찮다는 쪽입니다.', '/ˈprɪti ɡʊd/', '프리티 굿'),
(9435, 'all right', '무난한 · 괜찮은', '두 단어로 띄어 씁니다. 상태를 묻는 Are you all right?에서는 "괜찮으세요?"가 되고, 한 단어 alright는 격식 있는 글에서 피합니다.', '/ɔːl raɪt/', '올- 라이트'),
(9436, 'nothing special', '별거 없는', '특별할 것이 없었다는 평입니다. 나쁘다는 말은 아니라서 not bad와 나란히 놓이고, 형용사가 nothing 뒤에 오는 굳은 어순입니다.', '/ˈnʌθɪŋ ˈspeʃl/', '나씽 스페셜');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9430, 9430, 1, 'The hotel was small, but not bad.', '호텔은 작았지만 나쁘지 않았어요.'),
(9431, 9431, 1, 'The tour was long, but it was worth it.', '투어는 길었지만 그만한 값을 했어요.'),
(9432, 9432, 1, 'The meeting was a waste of time.', '그 회의는 시간 낭비였어요.'),
(9433, 9433, 1, 'No wonder you were tired.', '어쩐지 피곤했던 거군요.'),
(9434, 9434, 1, 'The food was pretty good.', '음식은 꽤 괜찮았어요.'),
(9435, 9435, 1, 'The flight was all right.', '비행은 무난했어요.'),
(9436, 9436, 1, 'The tour was nothing special.', '그 투어는 별거 없었어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9360, 'flight', NULL, '항공편 · 비행', 'NOUN', '/flaɪt/', '플라이트'),
(9361, 'hotel', NULL, '호텔', 'NOUN', '/hoʊˈtel/', '호우텔'),
(9362, 'airport', NULL, '공항', 'NOUN', '/ˈerpɔːrt/', '에어포-트'),
(9363, 'tour', NULL, '관광 · 견학', 'NOUN', '/tʊr/', '투어'),
(9364, 'guide', NULL, '안내인 · 안내서', 'NOUN', '/ɡaɪd/', '가이드'),
(9365, 'trip', NULL, '여행 · 출장', 'NOUN', '/trɪp/', '트립'),
(9366, 'luggage', NULL, '짐 · 수하물', 'NOUN', '/ˈlʌɡɪdʒ/', '러기지'),
(9367, 'train', NULL, '기차', 'NOUN', '/treɪn/', '트레인'),
(9368, 'view', NULL, '경치 · 전망', 'NOUN', '/vjuː/', '뷰-'),
(9369, 'stay', NULL, '묵다 · 머무르다', 'VERB', '/steɪ/', '스테이'),
(9370, 'amazing', NULL, '놀랄 만큼 좋은', 'ADJECTIVE', '/əˈmeɪzɪŋ/', '어메이징'),
(9371, 'awful', NULL, '지독한 · 형편없는', 'ADJECTIVE', '/ˈɔːfl/', '오-플'),
(9372, 'comfortable', NULL, '편안한', 'ADJECTIVE', '/ˈkʌmftəbl/', '컴프터블'),
(9373, 'local', NULL, '그 지역의', 'ADJECTIVE', '/ˈloʊkl/', '로우클'),
(9374, 'foreign', NULL, '외국의', 'ADJECTIVE', '/ˈfɔːrən/', '포-런'),
(9375, 'abroad', NULL, '해외로 · 해외에서', 'ADVERB', '/əˈbrɔːd/', '어브로-드');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 5 「예전엔 그랬는데 지금은 아니다」 ★복습(1~5) — used to · There was/were · ago와 for
-- 문법 9120~9122 / 예문 9360~9368 / 회화 9105(대사 9280~9286) / 표현 9440~9446 / 어휘 9380~9395
-- ★ 정리 스텝에 1~5 복습 블록이 붙는다(unitNo % 5 == 0) — 유닛 1~4가 모두 있는 상태로만 배포한다(기획 예외 E-3).
-- ★ 표현 9443 `be used to`는 문법 9120 `used to`와 **모양이 같고 뜻이 다른 최고의 혼동 짝**이라 이 유닛에 두었다
--   (기획 Q-E2-5: 문법으로 승격하지 않고 표현 스텝의 usage_note가 대비를 맡는다).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9120, 'used to + 동사원형', '지금은 안 그렇다는 말까지 들어 있다', '학교에서는 "used to = ~하곤 했다"로 뜻만 외웠습니다. 실제로 이 말의 핵심은 지금은 아니라는 것입니다 — I used to work near here. 한 마디에 "예전에 그랬고 지금은 아니다"가 다 들어갑니다. 같은 일을 과거형으로만 말하면(I worked near here.) 지금 어떤지는 한 마디도 안 한 것이 됩니다. 뒤는 언제나 원형이라 used to working이 없고(E1의 can 자리와 같습니다), 지금의 습관에는 쓰지 않습니다.'),
(9121, 'There was / There were', '뒤에 오는 명사의 수가 앞의 모양을 정한다', '학교에서는 There is의 과거라고 한 줄만 보고 지나갔습니다. 실제로는 E1에서 세운 규칙이 그대로입니다 — 뒤에 오는 명사가 하나면 There was, 여럿이면 There were로 고릅니다: There was a bakery here. / There were two banks on this street. 예전 이야기를 꺼내면 가장 먼저 필요해지는 문형이고, "그 자리에 빵집이 있었다"를 The place had a bakery로 말하지 않는 이유도 그때와 같습니다.'),
(9122, '얼마나 전인지, 얼마나 오래였는지 (ago / for / all day)', '거꾸로 세는 말과 길이를 재는 말', '학교에서는 ago와 before를 같은 칸에 놓고 "~ 전에"로 함께 외웠습니다. 실제로 둘은 재는 것이 다릅니다 — ago는 지금에서 거꾸로 셉니다(two years ago = 지금부터 2년 전). 그래서 언제나 과거형과 함께 오고 숫자 뒤에 붙습니다. for는 얼마나 오래였는지 길이를 잽니다(for two years). 하루를 꽉 채웠다면 all day입니다. 무엇을 재는 말인지만 갈라 두면 셋이 섞이지 않습니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9360, 9120, 1, 'I used to work near here.', NULL, '예전엔 이 근처에서 일했어요.'),
(9361, 9120, 2, 'She used to live in Busan.', NULL, '그녀는 예전에 부산에 살았어요.'),
(9362, 9120, 3, 'We used to eat lunch at that place.', NULL, '우리는 예전에 저 가게에서 점심을 먹었어요.'),
(9363, 9121, 1, 'There was a bakery on this corner.', NULL, '이 모퉁이에 빵집이 있었어요.'),
(9364, 9121, 2, 'There were two banks near the station.', NULL, '역 근처에 은행이 두 곳 있었어요.'),
(9365, 9121, 3, 'There wasn''t a park here ten years ago.', NULL, '10년 전엔 여기에 공원이 없었어요.'),
(9366, 9122, 1, 'They moved here three years ago.', NULL, '그들은 3년 전에 여기로 이사 왔어요.'),
(9367, 9122, 2, 'I lived in that building for two years.', NULL, '저는 그 건물에서 2년 동안 살았어요.'),
(9368, 9122, 3, 'The market was open all day on Sunday.', NULL, '그 시장은 일요일에 하루 종일 열었어요.');

INSERT INTO dialog (id, title) VALUES
(9105, '이 동네, 예전엔 달랐어요');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9280, 9105, 1, 'Mina', 'This street was really quiet ten years ago.', NULL, '10년 전엔 이 거리가 정말 조용했어요.'),
(9281, 9105, 2, 'Ben', 'Really? What was here back then?', NULL, '정말요? 그 시절엔 여기에 뭐가 있었어요?'),
(9282, 9105, 3, 'Mina', 'There was a small bakery right here. I used to buy bread there every morning.', NULL, '바로 여기에 작은 빵집이 있었어요. 예전엔 매일 아침 거기서 빵을 샀어요.'),
(9283, 9105, 4, 'Ben', 'Nice. I used to work near here, too, but I didn''t know the place.', NULL, '좋네요. 저도 예전에 이 근처에서 일했는데 그 가게는 몰랐어요.'),
(9284, 9105, 5, 'Mina', 'It closed down about two years ago. The owner moved away.', NULL, '2년쯤 전에 문을 닫았어요. 주인이 멀리 이사 갔어요.'),
(9285, 9105, 6, 'Ben', 'These days everything changes fast.', NULL, '요즘은 뭐든 빨리 바뀌네요.'),
(9286, 9105, 7, 'Mina', 'It does. But the park was here at that time, and it''s still here.', NULL, '그러게요. 그래도 공원은 그때도 있었고 지금도 있어요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9440, 'back then', '그 시절에는', '이야기하던 그 시절을 가리켜 문장 앞이나 끝에 놓습니다. 지금과 대비하는 자리라 these days와 짝으로 쓰이고, 언제나 과거형과 함께 옵니다.', '/bæk ðen/', '백 덴'),
(9441, 'these days', '요즘은', '요즘 사정을 말할 때 씁니다. 과거의 back then과 짝이고, 오늘 하루를 뜻하는 today와 달리 요즘 한동안을 덮습니다. 현재형과 함께 옵니다.', '/ðiːz deɪz/', '디-즈 데이즈'),
(9442, 'not anymore', '이제는 아니에요', '예전엔 그랬지만 지금은 아니라고 잘라 말할 때 씁니다. 문장 끝이나 단독으로 놓습니다: I worked there. Not anymore.', '/nɑːt ˌeniˈmɔːr/', '낫 에니모-'),
(9443, 'be used to', '~에 익숙하다', '⚠️ 문법 스텝의 used to(예전엔 ~했다)와 글자가 같고 뜻이 다릅니다. 갈림은 앞에 be가 있느냐입니다 — I used to walk(예전엔 걸었다) / I''m used to the walk(그 길에 익숙하다).', '/bi ˈjuːst tuː/', '비 유-스트 투-'),
(9444, 'once in a while', '가끔씩', '빈도로는 sometimes보다 드뭅니다. 문장 끝에 놓는 것이 가장 흔하고, 한 번뿐이라는 뜻이 아닙니다.', '/wʌns ɪn ə waɪl/', '원스 인 어 와일'),
(9445, 'at some point', '어느 순간엔가', '정확한 시점을 말하지 않고 "언제인지 모르는 어느 때"를 가리킵니다. 지난 일에도 그대로 씁니다: At some point the street changed.', '/æt sʌm pɔɪnt/', '앳 섬 포인트'),
(9446, 'close down', '(가게가) 문을 닫다 · 폐업하다', '가게나 공장이 영업을 아예 그만둔다는 뜻입니다. 오늘 하루 문을 닫는 close와 달리 다시 열지 않는다는 뜻이 들어 있습니다.', '/kloʊz daʊn/', '클로우즈 다운');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9440, 9440, 1, 'Back then, this street was quiet.', '그 시절엔 이 거리가 조용했어요.'),
(9441, 9441, 1, 'These days the street is full of cafes.', '요즘 이 거리는 카페로 가득해요.'),
(9442, 9442, 1, 'He lived here, but not anymore.', '그는 여기 살았지만 이제는 아니에요.'),
(9443, 9443, 1, 'I''m used to the noise now.', '이제 그 소음에는 익숙해요.'),
(9444, 9444, 1, 'We ate out once in a while.', '우리는 가끔씩 외식을 했어요.'),
(9445, 9445, 1, 'At some point the old market closed.', '어느 순간엔가 옛 시장이 문을 닫았어요.'),
(9446, 9446, 1, 'The bakery closed down two years ago.', '그 빵집은 2년 전에 문을 닫았어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9380, 'bakery', NULL, '빵집', 'NOUN', '/ˈbeɪkəri/', '베이커리'),
(9381, 'market', NULL, '시장', 'NOUN', '/ˈmɑːrkɪt/', '마-킷'),
(9382, 'neighborhood', NULL, '동네', 'NOUN', '/ˈneɪbərhʊd/', '네이버후드'),
(9383, 'place', NULL, '곳 · 가게', 'NOUN', '/pleɪs/', '플레이스'),
(9384, 'area', NULL, '지역 · 일대', 'NOUN', '/ˈeriə/', '에리어'),
(9385, 'library', NULL, '도서관', 'NOUN', '/ˈlaɪbreri/', '라이브레리'),
(9386, 'bank', NULL, '은행', 'NOUN', '/bæŋk/', '뱅크'),
(9387, 'owner', NULL, '주인', 'NOUN', '/ˈoʊnər/', '오우너'),
(9388, 'village', NULL, '마을', 'NOUN', '/ˈvɪlɪdʒ/', '빌리지'),
(9389, 'change', NULL, '바뀌다 · 바꾸다', 'VERB', '/tʃeɪndʒ/', '체인지'),
(9390, 'build', NULL, '짓다 · 세우다', 'VERB', '/bɪld/', '빌드'),
(9391, 'close', NULL, '닫다 · 문을 닫다', 'VERB', '/kloʊz/', '클로우즈'),
(9392, 'grow', NULL, '자라다 · 커지다', 'VERB', '/ɡroʊ/', '그로우'),
(9393, 'disappear', NULL, '사라지다', 'VERB', '/ˌdɪsəˈpɪr/', '디서피어'),
(9394, 'old', NULL, '오래된 · 예전의', 'ADJECTIVE', '/oʊld/', '오울드'),
(9395, 'new', NULL, '새로 생긴 · 새로운', 'ADJECTIVE', '/nuː/', '누-');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 6~10(덩어리 ② 그 시점에 벌어지는 일) 작성 기록 — 2026-11-14 backend-dev
--   * 유닛당 실제 사용: 문법 3 · 문법당 예문 3 · 회화 1편(8~9줄) · 표현 7 · 표현 예문 7 · 어휘 16 · 한자 0.
--   * **앞일을 말하지 않았다**(기획 §3-4 ②·④). 다섯 장면 어디에서도 두 사람이 앞일을 새로 정하지 않는다 —
--     전화로 서로 지금 뭐 하는 중인지 / 이미 나온 점심을 먹으며 / 어제 전화를 왜 못 받았는지 / 어제 있었던 소동 /
--     엇갈린 기억 맞추기. will·be going to·진행형의 미래·have p.p.가 한 줄도 없다.
--   * `call back`은 **과거로만** 썼다(I called you back twice.) — "다시 걸게요"는 유닛 11이다(기획 §3-3).
--   * 진행형의 미래(유닛 13의 주제)를 쓰지 않았다 — 유닛 7의 see는 these days가 붙는
--     「요즘 만나는 사이」 쪽 하나뿐이다.
--   * **was/were 뒤에는 명사·형용사·장소구·-ing만** 놓았다(§8-3 25). blocked를 피하려고 어휘를 slow로 둔 기획
--     지정값을 그대로 따랐다(Traffic was slow.). stuck in traffic · tied up의 stuck·tied는 형용사처럼
--     굳은 말이라 usage_note가 그 사실을 적는다.
--   * when·while·if 절 · 비교급 · 관계절 · could/would/should/might · 수동태를 쓰지 않았다.
--     earlier는 than 없이 시간 부사로만 썼다(기획 §4-2가 유닛 1부터 허용한 표기다).
--   * **표를 다시 그리지 않았다**(§8-3 21). 학교의 표 → E2가 주는 판정 기준 한 줄:
--       진행형 공식표         → "be동사를 빠뜨리면 문장이 서지 않는다"        (유닛 6 문법 1)
--       진행형 불가 동사 목록 → "내 마음대로 멈출 수 있는 일인가"            (유닛 7 문법 1)
--       과거진행 공식표       → "앞의 be동사만 갈아 끼운다"                   (유닛 8 문법 1)
--       시제 일치 규칙        → "문장마다 새로 고른다"                        (유닛 9 문법 3)
--       부가의문문 규칙표     → "규칙표를 못 외워도 한 마디면 통한다"         (유닛 10 문법 3)
--   * E1과 겹친 표제어는 일곱이고 전부 기획 §3-3이 근거를 적어 둔 자리다 —
--     wait·drive(그 유닛 문법 없이는 설명이 안 되는 쓰임) · busy(바쁜 → 통화 중인) · order(주문하다 → 순서) ·
--     later(나중에 → 그 얼마 뒤에) · sure·actually(유닛 10의 되묻기 그 자체).
--     ⚠️ 어휘 병합 키는 (word, ipa)이므로 **E1과 같은 발음·같은 한글 근사를 그대로 썼다** — 자료실에서 한 행으로
--     묶이고 뜻만 senses로 쌓이는 것이 정상이다(§11-3 상자 · leave 전례).
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 6 「지금 하는 중인 일은 be와 -ing가 함께 말한다」 — 현재진행 · 진행의 의문·부정 · 지금인가 원래인가
-- 문법 9125~9127 / 예문 9375~9383 / 회화 9106(대사 9300~9307) / 표현 9450~9456 / 어휘 9400~9415
-- 장면: 전화로 서로 지금 뭐 하는 중인지 확인한다 — **만나려고 거는 전화가 아니다**(기획 §3-3 가드).
--       "이따 봐요"로 끝맺지 않고, 각자 무엇을 하는 중인지 주고받고 끝난다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9125, '현재진행 (am / is / are + -ing)', 'be동사를 세우지 않으면 문장이 서지 않는다', '학교에서는 현재진행형을 "be동사 + -ing"라는 공식으로 외웠습니다. 공식을 외웠는데도 말할 때 틀리는 이유는 따로 있습니다 — 앞의 be동사를 빠뜨리기 때문입니다. I working now.가 가장 흔한 실수인데, 한국어 "일하는 중이에요"에는 be에 해당하는 말이 아예 없어서 생기는 일입니다. 뒤의 -ing는 혼자 서지 못합니다. 주어에 맞춰 am·is·are를 먼저 세우고 그다음에 -ing를 붙입니다: I am working. / She is cooking. / They are waiting.'),
(9126, '진행의 의문·부정 (Are you ~ing? / I''m not ~ing)', 'be동사 규칙이 그대로 간다', '학교에서는 진행형의 의문문·부정문을 또 다른 공식으로 따로 외웠습니다. 실제로는 새로 배울 규칙이 하나도 없습니다 — E1에서 세운 be동사 규칙이 그대로 갑니다. 의문은 be동사가 주어 앞으로 나가고(Are you working?), 부정은 뒤에 not만 붙습니다(I''m not working.). do·does·did를 데려오지 않습니다. Do you working? 같은 문장이 없는 이유가 그것입니다 — 앞에 이미 be동사가 서 있으니 일꾼을 하나 더 부를 필요가 없습니다.'),
(9127, '지금인가, 원래 그런가', '요즘·임시도 진행형이다', '학교에서는 진행형을 "지금 하고 있는 중"이라고만 배웠습니다. 실제로 갈리는 자리는 지금·요즘·임시인가, 원래 늘 그런가입니다. I live with my parents.는 원래 그렇다는 말이고, I''m living with my parents.는 요즘 잠깐 그렇다는 말입니다. 한국어로는 둘 다 "살아요"라서 표시가 안 되는 자리입니다. 그래서 지금 이 순간 하는 중이 아니어도, 요즘 임시로 그런 일에는 진행형을 씁니다: I''m studying Japanese these days.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9375, 9125, 1, 'I am working right now.', NULL, '지금 일하는 중이에요.'),
(9376, 9125, 2, 'She is washing the dishes in the kitchen.', NULL, '그녀는 부엌에서 설거지를 하는 중이에요.'),
(9377, 9125, 3, 'They are waiting at the station.', NULL, '그 사람들은 역에서 기다리는 중이에요.'),
(9378, 9126, 1, 'Are you listening to me?', NULL, '제 말 듣고 있어요?'),
(9379, 9126, 2, 'I''m not sleeping. I''m awake.', NULL, '자는 중 아니에요. 깨어 있어요.'),
(9380, 9126, 3, 'Is Mina studying now? No, she isn''t.', NULL, '미나는 지금 공부하는 중이에요? 아뇨, 아니에요.'),
(9381, 9127, 1, 'I live with my parents.', NULL, '저는 부모님과 함께 살아요. (원래 그렇습니다)'),
(9382, 9127, 2, 'I''m living alone these days.', NULL, '요즘은 혼자 지내요. (잠깐 그렇습니다)'),
(9383, 9127, 3, 'She''s studying French this month.', NULL, '그녀는 이번 달에 프랑스어를 배우는 중이에요.');

INSERT INTO dialog (id, title) VALUES
(9106, '통화 중, 서로 지금 뭐 하는 중인지');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9300, 9106, 1, 'Mina', 'Hi, Ben. Are you busy right now?', NULL, '안녕하세요, 벤. 지금 바빠요?'),
(9301, 9106, 2, 'Ben', 'Not at all. I''m doing the laundry. What are you doing?', NULL, '전혀요. 빨래하는 중이에요. 미나 씨는 뭐 하는 중이에요?'),
(9302, 9106, 3, 'Mina', 'I''m waiting at the station. My sister is still in the shop.', NULL, '저는 역에서 기다리는 중이에요. 언니가 아직 가게 안에 있어요.'),
(9303, 9106, 4, 'Ben', 'Your voice is breaking up. Is there a lot of noise there?', NULL, '목소리가 뭉개져서 들려요. 거기 소리가 많이 나요?'),
(9304, 9106, 5, 'Mina', 'Yes, a train is coming in. Can you hear me now?', NULL, '네, 기차가 들어오는 중이에요. 지금은 들려요?'),
(9305, 9106, 6, 'Ben', 'Yes, I can hear you fine now.', NULL, '네, 이제 잘 들려요.'),
(9306, 9106, 7, 'Mina', 'Good. Are you still doing the laundry?', NULL, '다행이네요. 아직 빨래하는 중이에요?'),
(9307, 9106, 8, 'Ben', 'No, I''m not. I''m washing the dishes now. I''m cooking a lot these days.', NULL, '아뇨. 지금은 설거지하는 중이에요. 요즘 요리를 많이 하거든요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9450, 'running late', '예정보다 늦어지고 있다', 'be late(이미 늦었다)와 다릅니다 — 아직 가는 중인데 시간이 밀리고 있다는 말입니다. I run late가 아니라 I''m running late처럼 진행형으로만 씁니다.', '/ˈrʌnɪŋ leɪt/', '러닝 레이트'),
(9451, 'tied up', '(일에) 붙잡혀 손을 못 떼는', 'busy보다 좁습니다 — 지금 하는 일 하나에 묶여 있다는 말입니다. 여기 tied는 형용사처럼 굳은 말이라 be동사와 붙어 I''m tied up 꼴로 씁니다.', '/taɪd ʌp/', '타이드 업'),
(9452, 'almost there', '거의 다 왔다', '길 위에서 쓰는 말이라 장소를 가리킵니다. there가 가리키는 것은 상대가 있는 자리입니다 — 일이 거의 끝나 간다는 뜻으로는 쓰지 않습니다.', '/ˈɔːlmoʊst ðer/', '올-모우스트 데어'),
(9453, 'break up', '(통화 소리가) 뭉개져 들리다', '사람 사이가 끝난다는 뜻으로도 쓰이지만, 전화에서는 신호가 끊겨 소리가 조각난다는 말입니다. You''re breaking up.처럼 진행형으로 씁니다.', '/breɪk ʌp/', '브레이크 업'),
(9454, 'at work', '직장에서 · 일하는 중인', '건물이 아니라 "일하는 상태"를 가리킵니다. 앞에 the를 붙이지 않습니다 — at the work가 아닙니다.', '/æt wɜːrk/', '앳 워-크'),
(9455, 'at home', '집에 (있는)', '역시 the를 붙이지 않습니다. in the house가 건물 안을 가리킨다면 at home은 "집에 있는 상태"를 가리킵니다.', '/æt hoʊm/', '앳 호움'),
(9456, 'right now', '바로 지금', 'E1의 right away(즉시)와 재는 것이 다릅니다 — right now는 시점(바로 이 순간)을, right away는 지체 없음(뜸 들이지 않고)을 가리킵니다. 진행형과 가장 자주 붙습니다.', '/raɪt naʊ/', '라이트 나우');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9450, 9450, 1, 'I''m running late this morning.', '오늘 아침에 좀 늦어지고 있어요.'),
(9451, 9451, 1, 'I''m tied up with work right now.', '지금은 일에 붙잡혀 있어요.'),
(9452, 9452, 1, 'I''m almost there. I can see the building.', '거의 다 왔어요. 건물이 보여요.'),
(9453, 9453, 1, 'You''re breaking up. The line isn''t good here.', '소리가 뭉개져서 들려요. 여기는 연결 상태가 안 좋네요.'),
(9454, 9454, 1, 'I''m at work right now. I can''t speak.', '저는 지금 직장이에요. 통화하기 어려워요.'),
(9455, 9455, 1, 'He''s working at home today.', '그는 오늘 집에서 일하는 중이에요.'),
(9456, 9456, 1, 'What are you doing right now?', '지금 뭐 하는 중이에요?');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9400, 'line', NULL, '(전화) 연결 상태', 'NOUN', '/laɪn/', '라인'),
(9401, 'voice', NULL, '목소리', 'NOUN', '/vɔɪs/', '보이스'),
(9402, 'noise', NULL, '소음 · 잡음', 'NOUN', '/nɔɪz/', '노이즈'),
(9403, 'laundry', NULL, '빨래', 'NOUN', '/ˈlɔːndri/', '론-드리'),
(9404, 'dish', NULL, '접시 · 요리', 'NOUN', '/dɪʃ/', '디시'),
(9405, 'shower', NULL, '샤워', 'NOUN', '/ˈʃaʊər/', '샤워'),
(9406, 'kitchen', NULL, '부엌', 'NOUN', '/ˈkɪtʃən/', '키친'),
(9407, 'wait', NULL, '(그 자리에서) 기다리다', 'VERB', '/weɪt/', '웨이트'),
(9408, 'connect', NULL, '연결하다 · (전화를) 이어 주다', 'VERB', '/kəˈnekt/', '커넥트'),
(9409, 'speak', NULL, '말하다 · 통화하다', 'VERB', '/spiːk/', '스피-크'),
(9410, 'study', NULL, '공부하다', 'VERB', '/ˈstʌdi/', '스터디'),
(9411, 'listen', NULL, '귀 기울여 듣다', 'VERB', '/ˈlɪsn/', '리슨'),
(9412, 'alone', NULL, '혼자 있는', 'ADJECTIVE', '/əˈloʊn/', '얼로운'),
(9413, 'awake', NULL, '깨어 있는', 'ADJECTIVE', '/əˈweɪk/', '어웨이크'),
(9414, 'nearby', NULL, '근처에', 'ADVERB', '/ˈnɪrbaɪ/', '니어바이'),
(9415, 'busy', NULL, '(전화가) 통화 중인', 'ADJECTIVE', '/ˈbɪzi/', '비지');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 7 「-ing를 붙이지 않는 동사가 있다」 — 머릿속 일의 동사 · have의 두 얼굴 · see와 think
-- 문법 9130~9132 / 예문 9390~9398 / 회화 9107(대사 9320~9327) / 표현 9460~9466 / 어휘 9420~9435
-- 장면: **이미 음식이 나온 뒤** 같이 점심을 먹으며 취향과 상태를 주고받는다 — 주문하는 자리가 아니다(기획 §3-3 가드).
--       주문 장면이 되는 순간 I''m having the soup.의 한국어가 「수프로 할게요」(즉석 결정)가 되고, 그건 유닛 11이다.
--       여기서는 「지금 수프를 먹는 중이에요」다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9130, '-ing를 붙이지 않는 동사 (know / want / need / like)', '내 마음대로 멈출 수 없는 일', '학교에서는 "상태동사는 진행형 불가"라는 용어로 외웠고, 어느 동사가 거기 드는지는 목록으로 받았습니다. 실제로는 목록을 외울 일이 아닙니다 — 내가 마음대로 시작하고 멈출 수 있는 일인가만 보면 됩니다. 걷는 것은 멈출 수 있지만 아는 것은 멈출 수 없습니다. 그래서 I''m knowing이 없습니다. know·want·need·like가 전부 그 무리라, 지금 그렇다는 말인데도 현재형으로 적습니다: I know him. / I want some water.'),
(9131, 'have는 뜻에 따라 갈린다', '가진 것인가, 하는 일인가', '학교에서는 "have는 진행형 불가"로 외웠다가 I''m having lunch.를 보고 무너집니다. 갈림은 뜻 하나입니다 — 가지고 있다는 뜻일 때만 진행형이 없습니다(I have a car. / She has two sisters.). 먹다·열다처럼 하는 일을 가리킬 때는 진행형이 됩니다(I''m having lunch. / We''re having a meeting.). 같은 글자가 두 가지 일을 하는 셈이고, 멈출 수 있는 일인가만 물으면 그대로 갈립니다.'),
(9132, 'see와 think도 두 얼굴이다', '진행형이 되느냐가 곧 뜻의 신호다', '학교에서는 한 단어에 뜻 하나를 붙여 외웠습니다. 실제로는 -ing가 붙느냐가 어느 뜻인지를 알려 줍니다. I see.는 "알겠다"이고 They''re seeing each other these days.는 "요즘 만나는 사이다"입니다. I think so.는 "그렇게 본다"는 의견이고 I''m thinking about it.은 "고민하는 중이다"입니다. 멈출 수 없는 쪽이 현재형, 내가 하고 있는 쪽이 진행형입니다 — 형태가 뜻을 가리키는 표지입니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9390, 9130, 1, 'I know Ben well.', NULL, '벤을 잘 알아요.'),
(9391, 9130, 2, 'She wants a cup of coffee now.', NULL, '그녀는 지금 커피를 한 잔 마시고 싶어 해요.'),
(9392, 9130, 3, 'I don''t like spicy food that much.', NULL, '저는 매운 음식을 그렇게 좋아하지는 않아요.'),
(9393, 9131, 1, 'I have two sisters.', NULL, '저는 언니가 둘 있어요.'),
(9394, 9131, 2, 'I''m having lunch right now.', NULL, '지금 점심을 먹는 중이에요.'),
(9395, 9131, 3, 'They''re having dinner at home.', NULL, '그들은 집에서 저녁을 먹는 중이에요.'),
(9396, 9132, 1, 'I see. That makes sense.', NULL, '알겠어요. 말이 되네요.'),
(9397, 9132, 2, 'They''re seeing each other these days.', NULL, '그 둘은 요즘 만나는 사이예요.'),
(9398, 9132, 3, 'I''m thinking about it.', NULL, '그건 고민하는 중이에요.');

INSERT INTO dialog (id, title) VALUES
(9107, '점심을 먹으면서, 입맛 이야기');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9320, 9107, 1, 'Ben', 'That smells really good. What is it?', NULL, '그거 냄새 정말 좋네요. 뭐예요?'),
(9321, 9107, 2, 'Mina', 'I''m having the soup. It''s a little salty, but I like it.', NULL, '저는 수프를 먹는 중이에요. 좀 짠데 그래도 맛있어요.'),
(9322, 9107, 3, 'Ben', 'Mine tastes sweet. I think it has sugar in it.', NULL, '제 건 달아요. 설탕이 들어간 것 같아요.'),
(9323, 9107, 4, 'Mina', 'Do you want some? Have a bite.', NULL, '좀 드실래요? 한 입 먹어 봐요.'),
(9324, 9107, 5, 'Ben', 'No, thanks. I''m not a fan of sour food. And I''m full.', NULL, '괜찮아요. 신 음식은 별로 안 좋아해서요. 그리고 배불러요.'),
(9325, 9107, 6, 'Mina', 'Really? You aren''t eating much today.', NULL, '그래요? 오늘은 많이 안 드시네요.'),
(9326, 9107, 7, 'Ben', 'I know. I''m not feeling great. I think I need some water.', NULL, '그러게요. 컨디션이 별로예요. 물이 좀 필요한 것 같아요.'),
(9327, 9107, 8, 'Mina', 'I see. Then have some tea. It goes well with dessert.', NULL, '그렇군요. 그럼 차를 좀 드세요. 디저트랑 잘 어울려요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9460, 'feel like', '(왠지) ~이 당기다', '뒤에 명사나 -ing가 옵니다(I feel like pizza. / I feel like eating out.). want to만큼 단단한 의지가 아니라 지금 그쪽으로 마음이 기운다는 말입니다.', '/fiːl laɪk/', '피-일 라이크'),
(9461, 'taste like', '~ 맛이 나다', '뒤에 명사가 옵니다. 맛의 성질을 말할 때는 like 없이 형용사를 바로 붙입니다 — taste sweet는 맞고 taste like sweet는 틀립니다.', '/teɪst laɪk/', '테이스트 라이크'),
(9462, 'can''t stand', '도저히 못 참겠다', 'don''t like보다 훨씬 셉니다. 여기 stand는 "서다"가 아니라 "견디다"이고, 거의 언제나 부정으로만 씁니다.', '/kænt stænd/', '캔트 스탠드'),
(9463, 'go well with', '~과 잘 어울리다', '음식·옷처럼 두 가지를 함께 놓았을 때 어울린다는 말입니다. 사람과 잘 지낸다는 뜻으로는 쓰지 않습니다.', '/ɡoʊ wel wɪð/', '고우 웰 위드'),
(9464, 'not a fan of', '~을 별로 좋아하지 않다', '싫다고 딱 잘라 말하지 않으면서 선을 긋는 말입니다. 운동 팬이라는 뜻의 fan에서 왔지만 음식·날씨 등 아무것에나 씁니다.', '/nɑːt ə fæn ʌv/', '낫 어 팬 어브'),
(9465, 'have a bite', '한 입 먹다', '여기 have는 "가지다"가 아니라 "먹다"라서 진행형도 됩니다(I''m having a bite.). 맛보라고 권할 때 Have a bite.로 그대로 씁니다.', '/hæv ə baɪt/', '해브 어 바이트'),
(9466, 'dig in', '어서 먹다 · 마음껏 먹다', '음식 앞에서 "자, 드세요"에 해당하는 말입니다. 땅을 판다는 dig에서 왔지만 식탁에서는 숟가락을 든다는 뜻이고, 친한 사이에서 씁니다.', '/dɪɡ ɪn/', '디그 인');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9460, 9460, 1, 'I feel like something sweet.', '뭔가 단 게 당기네요.'),
(9461, 9461, 1, 'This soup tastes like lemon.', '이 수프는 레몬 맛이 나요.'),
(9462, 9462, 1, 'I can''t stand the smell of this.', '이건 냄새를 도저히 못 참겠어요.'),
(9463, 9463, 1, 'This dessert goes well with tea.', '이 디저트는 차와 잘 어울려요.'),
(9464, 9464, 1, 'I''m not a fan of spicy food.', '매운 음식은 별로 안 좋아해요.'),
(9465, 9465, 1, 'Have a bite. It''s really good.', '한 입 먹어 봐요. 정말 맛있어요.'),
(9466, 9466, 1, 'Everything is ready. Dig in!', '다 준비됐어요. 어서 드세요!');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9420, 'taste', NULL, '맛이 나다 · 맛보다', 'VERB', '/teɪst/', '테이스트'),
(9421, 'smell', NULL, '냄새가 나다 · 냄새를 맡다', 'VERB', '/smel/', '스멜'),
(9422, 'soup', NULL, '수프', 'NOUN', '/suːp/', '수-프'),
(9423, 'salad', NULL, '샐러드', 'NOUN', '/ˈsæləd/', '샐러드'),
(9424, 'dessert', NULL, '후식 · 디저트', 'NOUN', '/dɪˈzɜːrt/', '디저-트'),
(9425, 'spicy', NULL, '매운', 'ADJECTIVE', '/ˈspaɪsi/', '스파이시'),
(9426, 'sweet', NULL, '단 · 달콤한', 'ADJECTIVE', '/swiːt/', '스위-트'),
(9427, 'salty', NULL, '짠', 'ADJECTIVE', '/ˈsɔːlti/', '솔-티'),
(9428, 'sour', NULL, '신 · 시큼한', 'ADJECTIVE', '/ˈsaʊər/', '사워'),
(9429, 'bitter', NULL, '쓴', 'ADJECTIVE', '/ˈbɪtər/', '비터'),
(9430, 'favorite', NULL, '가장 좋아하는', 'ADJECTIVE', '/ˈfeɪvərɪt/', '페이버리트'),
(9431, 'delicious', NULL, '아주 맛있는', 'ADJECTIVE', '/dɪˈlɪʃəs/', '딜리셔스'),
(9432, 'choose', NULL, '고르다', 'VERB', '/tʃuːz/', '추-즈'),
(9433, 'mind', NULL, '꺼리다 · 신경 쓰다', 'VERB', '/maɪnd/', '마인드'),
(9434, 'hate', NULL, '몹시 싫어하다', 'VERB', '/heɪt/', '헤이트'),
(9435, 'full', NULL, '배부른', 'ADJECTIVE', '/fʊl/', '풀');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 8 「그때 하고 있던 중이었다」 — 과거진행 · 그 시각에 뭘 하고 있었는지 · 배경인가 사건인가
-- 문법 9135~9137 / 예문 9405~9413 / 회화 9108(대사 9340~9347) / 표현 9470~9476 / 어휘 9440~9455
-- 장면: 어제 전화를 왜 못 받았는지 설명한다 — **왜 못 받았는지까지만 말하고 끝낸다**(기획 §3-3 가드).
--       "다음엔 받을게요" · "이따 다시 걸게요"로 넘어가면 그 줄이 유닛 11이 된다.
-- ⚠️ call back은 과거로만 쓴다 — I called you back twice. ⭕ / 다시 걸겠다는 말 ❌(유닛 11).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9135, '과거진행 (was / were + -ing)', '앞의 be동사만 과거로 갈아 끼운다', '학교에서는 "과거진행형 = was/were + -ing"라는 또 하나의 공식으로 외웠습니다. 실제로는 새 공식이 아니라 부품 하나 교체입니다 — 유닛 6에서 만든 I''m working의 앞부분만 과거로 바꾸면 I was working이 됩니다. -ing 쪽은 손대지 않습니다. 주어를 보고 was·were를 고르는 것도 유닛 1에서 하던 그대로입니다: I was driving. / They were waiting. 외울 것이 하나도 늘지 않는 자리입니다.'),
(9136, '그 시각에 뭘 하고 있었는지 묻기 (What were you doing at eight?)', '시각을 함께 말해야 뜻이 산다', '학교에서는 예문 한둘을 외우고 넘어갔습니다. 실제로 과거진행은 언제인지를 말해 주지 않으면 붕 뜹니다 — "그때 하고 있던 일"이라는 말인데 정작 "그때"가 없기 때문입니다. at eight·then·at that time을 함께 놓는 것이 이 문형의 절반입니다. 유닛 1의 "과거 문장은 시간을 달고 다닌다"가 여기서도 그대로입니다: What were you doing at eight? / I was driving at that time.'),
(9137, '배경인가, 일어난 일인가', '두 문장을 나란히 놓으면 장면이 그려진다', '학교에서는 과거진행과 과거형을 따로 배우고 어느 쪽을 쓸지는 배우지 않았습니다. 실제로 갈림은 하나입니다 — 그때의 상황(배경)은 과거진행, 그때 일어난 일(사건)은 과거형입니다. I was driving.(그래서 못 받았다) / I called you twice.(그 일이 일어났다). 둘을 하나로 묶지 않고 나란히 놓기만 해도 장면이 그려집니다. 길게 잇는 것은 다음 단계의 일이고, 지금은 끊어 놓는 편이 오히려 또렷합니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9405, 9135, 1, 'I was driving at seven.', NULL, '일곱 시에 운전하는 중이었어요.'),
(9406, 9135, 2, 'We were sitting at the back of the bus.', NULL, '우리는 버스 뒤쪽에 앉아 있었어요.'),
(9407, 9135, 3, 'She wasn''t sleeping. She was reading.', NULL, '그녀는 자는 중이 아니었어요. 책을 읽는 중이었어요.'),
(9408, 9136, 1, 'What were you doing at eight?', NULL, '여덟 시에 뭐 하고 있었어요?'),
(9409, 9136, 2, 'I was driving home at that time.', NULL, '그때는 차로 집에 가는 중이었어요.'),
(9410, 9136, 3, 'Were you sleeping then?', NULL, '그때 자고 있었어요?'),
(9411, 9137, 1, 'I was driving. I didn''t hear the phone.', NULL, '운전하는 중이었어요. 전화 소리를 못 들었어요.'),
(9412, 9137, 2, 'The bus was moving slowly. Then it stopped.', NULL, '버스가 느리게 가고 있었어요. 그러다 멈췄어요.'),
(9413, 9137, 3, 'We were in the tunnel. My phone lost the signal.', NULL, '우리는 터널 안이었어요. 전화 신호가 끊겼어요.');

INSERT INTO dialog (id, title) VALUES
(9108, '어제 전화를 왜 못 받았는지');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9340, 9108, 1, 'Mina', 'I called you twice last night. Were you asleep?', NULL, '어젯밤에 두 번 전화했어요. 자고 있었어요?'),
(9341, 9108, 2, 'Ben', 'No, I wasn''t. I was driving home at that time.', NULL, '아뇨. 그때 차로 집에 가는 중이었어요.'),
(9342, 9108, 3, 'Mina', 'I called you back at nine, too.', NULL, '아홉 시에도 다시 걸었어요.'),
(9343, 9108, 4, 'Ben', 'The traffic was slow, and I was in a tunnel. I had no signal there.', NULL, '차가 느리게 가고 있었고 터널 안이었어요. 거기선 신호가 없었어요.'),
(9344, 9108, 5, 'Mina', 'So you didn''t hear the phone at all.', NULL, '그래서 전화 소리를 아예 못 들었군요.'),
(9345, 9108, 6, 'Ben', 'I noticed it later, but my battery was dead. The charger was at home.', NULL, '좀 뒤에 알아차리긴 했는데 배터리가 나가 있었어요. 충전기는 집에 있었고요.'),
(9346, 9108, 7, 'Mina', 'That explains it. I was getting worried.', NULL, '그래서였군요. 걱정하던 참이었어요.'),
(9347, 9108, 8, 'Ben', 'Sorry about that. I pulled over at a rest area, but the call didn''t get through.', NULL, '미안해요. 휴게소에 차를 세웠는데 전화가 연결되지 않더라고요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9470, 'hang up', '전화를 끊다', '수화기를 걸어 두던 시절에서 온 말이라 up이 붙습니다. 상대 말을 자르고 끊는 느낌은 hang up on 쪽이고, 그냥 통화를 마치는 것도 hang up입니다.', '/hæŋ ʌp/', '행 업'),
(9471, 'call back', '다시 전화하다', '걸려 온 전화에 되걸어 준다는 말이라 back이 붙습니다. 처음 거는 전화에는 쓰지 않습니다.', '/kɔːl bæk/', '콜- 백'),
(9472, 'get through', '(전화가) 연결되다', '막힌 것을 뚫고 닿는다는 말입니다. 선이 통했는지를 가리키므로 통화 내용이 아니라 연결 여부를 말합니다.', '/ɡet θruː/', '겟 스루-'),
(9473, 'on the road', '(차로) 이동 중인', '길 위에 있다는 말 그대로 이동 중이라는 뜻입니다. 길 한가운데를 가리키는 in the road와 다릅니다.', '/ɑːn ðə roʊd/', '온- 더 로우드'),
(9474, 'in a meeting', '회의 중인', 'the가 아니라 a를 씁니다 — 어느 회의인지는 중요하지 않고 회의 중이라는 상태만 말하기 때문입니다.', '/ɪn ə ˈmiːtɪŋ/', '인 어 미-팅'),
(9475, 'stuck in traffic', '차가 막혀 꼼짝 못 하는', '차가 많은 상태는 heavy traffic이고, 그 안에 갇혀 못 움직이는 쪽이 stuck in traffic입니다. 여기 stuck은 형용사처럼 굳은 말이라 be동사와 붙어 다닙니다.', '/stʌk ɪn ˈtræfɪk/', '스턱 인 트래픽'),
(9476, 'pull over', '(차를) 길가에 세우다', '달리던 차를 길 가장자리로 붙여 세우는 것입니다. 주차장에 대는 park와 다릅니다.', '/pʊl ˈoʊvər/', '풀 오우버');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9470, 9470, 1, 'I hung up and started the car.', '전화를 끊고 차에 시동을 걸었어요.'),
(9471, 9471, 1, 'I called you back twice last night.', '어젯밤에 두 번 다시 걸었어요.'),
(9472, 9472, 1, 'The call didn''t get through.', '전화가 연결되지 않았어요.'),
(9473, 9473, 1, 'I was on the road all morning.', '아침 내내 차로 이동 중이었어요.'),
(9474, 9474, 1, 'She was in a meeting at three.', '그녀는 세 시에 회의 중이었어요.'),
(9475, 9475, 1, 'We were stuck in traffic for an hour.', '한 시간 동안 차가 막혀 꼼짝 못 했어요.'),
(9476, 9476, 1, 'I pulled over and answered the phone.', '차를 길가에 세우고 전화를 받았어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9440, 'traffic', NULL, '차량 통행 · 교통량', 'NOUN', '/ˈtræfɪk/', '트래픽'),
(9441, 'road', NULL, '길 · 도로', 'NOUN', '/roʊd/', '로우드'),
(9442, 'tunnel', NULL, '터널', 'NOUN', '/ˈtʌnl/', '터널'),
(9443, 'highway', NULL, '고속도로', 'NOUN', '/ˈhaɪweɪ/', '하이웨이'),
(9444, 'battery', NULL, '배터리', 'NOUN', '/ˈbætəri/', '배터리'),
(9445, 'signal', NULL, '(전파) 신호', 'NOUN', '/ˈsɪɡnəl/', '시그널'),
(9446, 'passenger', NULL, '승객 · 동승자', 'NOUN', '/ˈpæsɪndʒər/', '패신저'),
(9447, 'sound', NULL, '소리', 'NOUN', '/saʊnd/', '사운드'),
(9448, 'charge', NULL, '충전하다', 'VERB', '/tʃɑːrdʒ/', '차-지'),
(9449, 'park', NULL, '주차하다', 'VERB', '/pɑːrk/', '파-크'),
(9450, 'hurry', NULL, '서두르다', 'VERB', '/ˈhɜːri/', '허리'),
(9451, 'notice', NULL, '알아차리다', 'VERB', '/ˈnoʊtɪs/', '노우티스'),
(9452, 'drive', NULL, '차를 몰고 가다', 'VERB', '/draɪv/', '드라이브'),
(9453, 'slow', NULL, '(차가) 느리게 가는', 'ADJECTIVE', '/sloʊ/', '슬로우'),
(9454, 'asleep', NULL, '잠든', 'ADJECTIVE', '/əˈsliːp/', '어슬리-프'),
(9455, 'dead', NULL, '(배터리가) 나간', 'ADJECTIVE', '/ded/', '데드');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 9 「지난 일을 순서대로 말한다」 — 순서의 이정표 · 배경과 사건을 번갈아 · 문장마다 시제를 고른다
-- 문법 9140~9142 / 예문 9420~9428 / 회화 9109(대사 9360~9367) / 표현 9480~9486 / 어휘 9460~9475
-- 장면: 어제 있었던 소동을 순서대로 전한다 — 전부 지나간 일이고 앞일을 새로 정하지 않는다.
-- ⚠️ 두 문장을 when·while로 묶지 않는다(E3). 끊어 놓고 앞에 이정표만 붙인다 — 그것이 문법 1이 가르치는 기술이다.
-- ⚠️ later의 뜻은 「(그) 얼마 뒤에」로 고정했다. 「나중에」(앞일)로 적으면 학습자가 만들고 싶어지는 문장이
--    유닛 11의 것뿐이다(기획 §3-3 · tonight과 같은 함정).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9140, '순서를 매기는 말 (at first / then / after that / finally)', '문장 앞에 놓는 이정표', '학교에서는 작문용 연결어 목록으로 외웠습니다. 실제로 이 말들은 문장을 잇는 것이 아니라 각 문장 앞에 놓는 이정표입니다. 문장은 그대로 두고 앞에 한 마디만 얹으면 이야기가 순서대로 섭니다: At first I didn''t know. Then I heard the alarm. Finally we went outside. 긴 문장을 만들 필요가 없습니다 — 짧게 끊고 앞에 표지만 달아 두면 듣는 사람이 순서를 그대로 따라옵니다.'),
(9141, '배경과 사건을 번갈아 놓는다', '한 장면을 두 시제로 그린다', '학교에서는 이런 것을 거의 배운 적이 없습니다. 실제로 이야기는 과거진행(배경)과 과거형(사건)의 반복으로 굴러갑니다 — I was sitting at my desk. Then the alarm started. 배경은 그때 이미 펼쳐져 있던 상황이고, 사건은 그 위에 떨어진 일입니다. 유닛 8에서 나눠 둔 둘을 여기서 번갈아 씁니다. 두 문장을 하나로 묶을 필요는 없습니다 — 순서대로 늘어놓기만 해도 장면이 됩니다.'),
(9142, '문장마다 시제를 새로 고른다', '이야기의 끝은 지금으로 돌아온다', '학교에서는 "시제 일치"를 배웠습니다 — 글 전체의 시제를 맞추라는 것이었습니다. 말할 때는 그렇지 않습니다. 문장마다 새로 고릅니다. 지난 일을 늘어놓다가 Now로 지금을 말하면 듣는 사람이 그대로 따라옵니다: I worked there for two years. Now I work here. 억지로 맞추면 오히려 틀립니다 — 지금도 사실인 것까지 과거형으로 밀면 그 일이 끝난 것처럼 들립니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9420, 9140, 1, 'At first I didn''t know. Then I heard the alarm.', NULL, '처음에는 몰랐어요. 그러다 경보 소리를 들었어요.'),
(9421, 9140, 2, 'After that everyone ran down the stairs.', NULL, '그다음에 다들 계단으로 뛰어 내려갔어요.'),
(9422, 9140, 3, 'Finally everyone escaped through the back door.', NULL, '마지막에는 모두 뒷문으로 빠져나갔어요.'),
(9423, 9141, 1, 'I was sitting at my desk. Then the alarm started.', NULL, '저는 책상에 앉아 있었어요. 그러다 경보가 울렸어요.'),
(9424, 9141, 2, 'Smoke was coming out of the kitchen. Someone shouted in the hall.', NULL, '부엌에서 연기가 나오고 있었어요. 누군가 복도에서 소리를 질렀어요.'),
(9425, 9141, 3, 'We were standing outside. After that the fire team arrived.', NULL, '우리는 밖에 서 있었어요. 그다음에 소방팀이 도착했어요.'),
(9426, 9142, 1, 'I worked there for two years. Now I work here.', NULL, '거기서 2년 일했어요. 지금은 여기서 일해요.'),
(9427, 9142, 2, 'The alarm was loud. Now everyone is fine.', NULL, '경보 소리가 컸어요. 지금은 다들 괜찮아요.'),
(9428, 9142, 3, 'I was upset earlier. Now I think it was lucky.', NULL, '아까는 속상했어요. 지금은 운이 좋았다고 생각해요.');

INSERT INTO dialog (id, title) VALUES
(9109, '어제 사무실에서 있었던 소동');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9360, 9109, 1, 'Ben', 'What happened here yesterday? Tell me in order.', NULL, '어제 여기서 무슨 일이 있었어요? 순서대로 말해 줘요.'),
(9361, 9109, 2, 'Mina', 'At first nobody knew. I was sitting at my desk, and the alarm started.', NULL, '처음엔 아무도 몰랐어요. 저는 책상에 앉아 있었는데 경보가 울렸어요.'),
(9362, 9109, 3, 'Ben', 'Was there smoke?', NULL, '연기가 났어요?'),
(9363, 9109, 4, 'Mina', 'No. But people panicked and ran to the stairs. It was a big crowd.', NULL, '아뇨. 그런데 사람들이 당황해서 계단으로 뛰었어요. 사람이 엄청 몰렸고요.'),
(9364, 9109, 5, 'Ben', 'Was everyone okay?', NULL, '다들 괜찮았어요?'),
(9365, 9109, 6, 'Mina', 'Yes, everyone was safe. Two minutes later, the fire team came in.', NULL, '네, 다들 무사했어요. 2분쯤 뒤에 소방팀이 들어왔어요.'),
(9366, 9109, 7, 'Ben', 'And then?', NULL, '그러고는요?'),
(9367, 9109, 8, 'Mina', 'It turned out to be a drill. Finally we all went back in. We were lucky.', NULL, '알고 보니 대피 훈련이었어요. 마지막엔 다들 다시 들어갔고요. 운이 좋았죠.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9480, 'all of a sudden', '갑자기', '예고 없이 벌어진 일을 들여올 때 씁니다. 문장 맨 앞에 놓는 일이 많고, 뒤에는 사건을 말하는 과거형이 옵니다.', '/ɔːl ʌv ə ˈsʌdn/', '올- 어브 어 서든'),
(9481, 'end up', '결국 ~하게 되다', '뜻한 바와 다르게 도착한 자리를 말합니다. 뒤에 -ing나 장소가 옵니다(end up waiting / end up outside).', '/end ʌp/', '엔드 업'),
(9482, 'turn out', '알고 보니 ~이다', '뚜껑을 열어 보니 그랬다는 말입니다. 뒤에 to be가 따라붙는 꼴이 가장 흔합니다. 불을 끄는 turn off와는 관계가 없습니다.', '/tɜːrn aʊt/', '터-은 아웃'),
(9483, 'in the end', '결국에는', '여러 일이 지나간 끝을 가리킵니다. 맨 끝 자리를 가리키는 at the end of와 다릅니다 — 이쪽은 시간의 결말입니다.', '/ɪn ði end/', '인 디 엔드'),
(9484, 'for a while', '한동안', '길이를 정하지 않고 "꽤 되는 동안"을 말합니다. a while ago가 시점이라면 이쪽은 길이입니다.', '/fɔːr ə waɪl/', '포- 어 와일'),
(9485, 'one after another', '하나씩 차례로', '같은 일이 줄줄이 이어질 때 씁니다. 사람 둘을 가리킬 때는 one after the other 쪽이 자연스럽습니다.', '/wʌn ˈæftər əˈnʌðər/', '원 애프터 어나더'),
(9486, 'the next thing', '그러고는 (바로)', '눈 깜짝할 새 다음 일이 벌어졌다는 말입니다. 사건과 사건 사이에 놓아 속도를 보여 줍니다.', '/ðə nekst θɪŋ/', '더 넥스트 싱');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9480, 9480, 1, 'All of a sudden the alarm started.', '갑자기 경보가 울리기 시작했어요.'),
(9481, 9481, 1, 'We ended up waiting outside for an hour.', '결국 밖에서 한 시간을 기다리게 됐어요.'),
(9482, 9482, 1, 'It turned out to be a drill.', '알고 보니 대피 훈련이었어요.'),
(9483, 9483, 1, 'In the end everyone was fine.', '결국 다들 괜찮았어요.'),
(9484, 9484, 1, 'We waited outside for a while.', '우리는 한동안 밖에서 기다렸어요.'),
(9485, 9485, 1, 'The doors opened one after another.', '문이 하나씩 차례로 열렸어요.'),
(9486, 9486, 1, 'The next thing, everyone was outside.', '그러고는 바로 다들 밖에 나와 있었어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9460, 'alarm', NULL, '경보 · 경보음', 'NOUN', '/əˈlɑːrm/', '얼라-암'),
(9461, 'fire', NULL, '불 · 화재', 'NOUN', '/ˈfaɪər/', '파이어'),
(9462, 'smoke', NULL, '연기', 'NOUN', '/smoʊk/', '스모우크'),
(9463, 'drill', NULL, '(대피·소방) 훈련', 'NOUN', '/drɪl/', '드릴'),
(9464, 'crowd', NULL, '몰려든 사람들', 'NOUN', '/kraʊd/', '크라우드'),
(9465, 'order', NULL, '순서', 'NOUN', '/ˈɔːrdər/', '오-더'),
(9466, 'escape', NULL, '빠져나가다', 'VERB', '/ɪˈskeɪp/', '이스케이프'),
(9467, 'shout', NULL, '소리를 지르다', 'VERB', '/ʃaʊt/', '샤우트'),
(9468, 'run', NULL, '뛰다 · 달리다', 'VERB', '/rʌn/', '런'),
(9469, 'panic', NULL, '당황해 어쩔 줄 모르다', 'VERB', '/ˈpænɪk/', '패닉'),
(9470, 'safe', NULL, '무사한 · 안전한', 'ADJECTIVE', '/seɪf/', '세이프'),
(9471, 'lucky', NULL, '운이 좋은', 'ADJECTIVE', '/ˈlʌki/', '러키'),
(9472, 'upset', NULL, '속상한 · 마음이 상한', 'ADJECTIVE', '/ʌpˈset/', '업셋'),
(9473, 'finally', NULL, '마지막에는 · 드디어', 'ADVERB', '/ˈfaɪnəli/', '파이널리'),
(9474, 'earlier', NULL, '(그보다) 앞서 · 아까', 'ADVERB', '/ˈɜːrliər/', '어-리어'),
(9475, 'later', NULL, '(그) 얼마 뒤에', 'ADVERB', '/ˈleɪtər/', '레이터');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 10 「아니라고 물어도 사실대로 답한다」 ★복습(6~10) — 부정의문 · Yes/No는 사실을 따른다 · ~, right?
-- 문법 9145~9147 / 예문 9435~9443 / 회화 9110(대사 9380~9388) / 표현 9490~9496 / 어휘 9480~9495
-- 장면: **이미 지나간 일**을 두고 엇갈린 기억을 맞춘다 — 앞으로 잡을 날짜를 맞추는 자리가 아니다(기획 §3-3 가드).
--       Didn''t you say Friday? 의 금요일은 **지난** 금요일이다. 다가올 일정을 맞추는 장면이 되면 유닛 13의 몫이 된다.
-- ⚠️ 기획 §3-4 ⑤ 요구: Didn''t you ~? 류에 No, I didn''t.(또는 Yes, I was.)로 답하는 줄이 있어야 문법 2가 증명된다 —
--    한국어라면 "네"로 답할 자리다. 대사 2·4·7이 그 자리이고 meaning_ko가 한국어 쪽을 그대로 적는다.
-- ⚠️ 이 유닛의 정리 스텝에 6~10 복습 블록이 붙는다(unitNo % 5 == 0) — 유닛 6~9의 unit_grammar 매핑이 전부 있어야 성립한다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9145, '부정으로 묻기 (Didn''t you ~? / Weren''t you ~? / Aren''t you ~ing?)', '맨 앞 한 단어만 바꾼다', '학교에서는 부정의문문을 또 하나의 단원으로 배웠습니다. 실제로는 새 규칙이 없습니다 — 유닛 1~9에서 만든 의문문의 맨 앞 한 단어를 줄임꼴 부정으로 바꾸면 끝입니다: Did you call? → Didn''t you call? / Were you there? → Weren''t you there? 뒤는 하나도 안 바뀝니다. 이 말은 대개 그런 줄 알았는데 아닌 것 같을 때 씁니다 — 따지는 말이 아니라 내 기억을 맞춰 보는 말입니다.'),
(9146, 'Yes와 No는 질문이 아니라 사실을 따른다', '한국어와 정반대가 되는 자리', '학교에서는 "Yes는 네"로 외웠습니다. 실제로 한국어는 질문에 동의하느냐로 답하고("안 갔어요?" — "네, 안 갔어요"), 영어는 사실이 어떤가로 답합니다. Didn''t you go?에 안 갔으면 무조건 No, I didn''t.입니다 — 질문이 부정이든 긍정이든 상관없습니다. 한국어를 그대로 옮기면 정확히 반대로 말하게 되는 자리이고, 이 코스에서 가장 자주 틀리는 한 줄입니다.'),
(9147, '~, right? / ~, didn''t you?', '규칙표를 못 외워도 한 마디면 통한다', '학교에서는 부가의문문 규칙표(긍정과 부정을 뒤집고 동사를 맞추는 것)를 외우다 지쳤습니다. 실제로 말할 때 압도적으로 쓰는 것은 right? 하나입니다 — 문장 끝에 붙이기만 하면 되고 앞 문장이 무엇이든 모양이 안 바뀝니다: You said Thursday, right? 앞에 쓴 동사를 그대로 되받는 형은 그다음이고, 그것도 E1에서 배운 "물어본 동사로 되받기"가 문장 끝으로 옮겨 온 것일 뿐입니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9435, 9145, 1, 'Didn''t you say Friday?', NULL, '금요일이라고 하지 않았어요?'),
(9436, 9145, 2, 'Weren''t you at the meeting?', NULL, '회의에 있지 않았어요?'),
(9437, 9145, 3, 'Aren''t you listening?', NULL, '안 듣고 있어요?'),
(9438, 9146, 1, 'Didn''t you call me? No, I didn''t.', NULL, '저한테 전화 안 했어요? 네, 안 했어요. (안 했으면 영어는 No입니다)'),
(9439, 9146, 2, 'Weren''t you there? Yes, I was.', NULL, '거기 없었어요? 아뇨, 있었어요. (있었으면 영어는 Yes입니다)'),
(9440, 9146, 3, 'Aren''t you busy? No, I''m not.', NULL, '안 바빠요? 네, 안 바빠요. (안 바쁘면 영어는 No입니다)'),
(9441, 9147, 1, 'You said Thursday, right?', NULL, '목요일이라고 했죠?'),
(9442, 9147, 2, 'You were there, weren''t you?', NULL, '거기 있었잖아요, 그렇죠?'),
(9443, 9147, 3, 'She didn''t call, did she?', NULL, '그녀는 전화 안 했죠, 그렇죠?');

INSERT INTO dialog (id, title) VALUES
(9110, '엇갈린 기억을 맞춰 보는 자리');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9380, 9110, 1, 'Mina', 'Didn''t you say Friday? The meeting was on Thursday.', NULL, '금요일이라고 하지 않았어요? 회의는 목요일이었잖아요.'),
(9381, 9110, 2, 'Ben', 'No, I didn''t. I said Thursday. Check the message.', NULL, '네, 안 그랬어요. 목요일이라고 했어요. 메시지 확인해 봐요.'),
(9382, 9110, 3, 'Mina', 'Hmm. Weren''t you in a meeting that morning?', NULL, '음. 그날 아침에 회의 중이지 않았어요?'),
(9383, 9110, 4, 'Ben', 'Yes, I was. But I sent the message earlier, at eight.', NULL, '아뇨, 회의 중이었어요. 그런데 메시지는 그보다 앞서 여덟 시에 보냈어요.'),
(9384, 9110, 5, 'Mina', 'You''re right. I got it wrong. I''m looking at the message now.', NULL, '맞네요. 제가 잘못 알고 있었어요. 지금 메시지를 보고 있어요.'),
(9385, 9110, 6, 'Ben', 'It happens. You were driving all afternoon that day, weren''t you?', NULL, '그럴 수 있죠. 그날 오후 내내 운전 중이었잖아요, 그렇죠?'),
(9386, 9110, 7, 'Mina', 'I was. So I didn''t notice your message at all.', NULL, '맞아요. 그래서 메시지를 아예 못 봤어요.'),
(9387, 9110, 8, 'Ben', 'That explains it. We''re on the same page now, right?', NULL, '그래서였군요. 이제 서로 같은 걸 알고 있는 거죠?'),
(9388, 9110, 9, 'Mina', 'We are. My memory isn''t perfect.', NULL, '그러네요. 제 기억이 완벽하진 않네요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9490, 'keep in mind', '잊지 않고 기억해 두다', 'remember가 떠올리는 것이라면 이쪽은 머릿속에 얹어 두는 것입니다. 사이에 목적어가 들어가기도 합니다(keep that in mind).', '/kiːp ɪn maɪnd/', '키-프 인 마인드'),
(9491, 'make sure', '확실히 해 두다', '확인해서 틀림없게 만든다는 말입니다. 내 기분을 말하는 I''m sure(나는 확신한다)와 달리 행동을 가리킵니다.', '/meɪk ʃʊr/', '메이크 슈어'),
(9492, 'check with', '~에게 확인해 보다', '사람에게 물어 맞는지 보는 것입니다. 물건·숫자를 들여다보는 check와 달리 뒤에 사람이 옵니다.', '/tʃek wɪð/', '체크 위드'),
(9493, 'get it wrong', '잘못 알다', '틀린 답을 낸 것이 아니라 사실을 잘못 기억하고 있었다는 쪽입니다. 반대는 get it right입니다.', '/ɡet ɪt rɔːŋ/', '겟 잇 롱-'),
(9494, 'the other way around', '반대로 · 거꾸로', '둘의 순서나 방향이 뒤바뀌었다는 말입니다. 내가 말한 것과 사실이 뒤집혀 있을 때 한마디로 바로잡습니다.', '/ði ˈʌðər weɪ əˈraʊnd/', '디 아더 웨이 어라운드'),
(9495, 'ring a bell', '어디서 들어 본 것 같다', '머릿속에서 종이 울린다는 그림입니다. 또렷이 기억난다는 말이 아니라 희미하게 걸린다는 쪽이고, 부정으로도 자주 씁니다.', '/rɪŋ ə bel/', '링 어 벨'),
(9496, 'on the same page', '서로 같은 것을 알고 있다', '같은 쪽을 펴 놓고 본다는 그림입니다. 의견이 같다는 뜻보다 알고 있는 내용이 어긋나지 않는다는 쪽에 가깝습니다.', '/ɑːn ðə seɪm peɪdʒ/', '온- 더 세임 페이지');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9490, 9490, 1, 'Keep that in mind.', '그건 기억해 두세요.'),
(9491, 9491, 1, 'I made sure, and the date was Thursday.', '제가 확실히 확인했는데 날짜는 목요일이었어요.'),
(9492, 9492, 1, 'I checked with Ben, and he said Thursday.', '벤에게 확인했는데 목요일이라고 했어요.'),
(9493, 9493, 1, 'I got it wrong. The meeting was on Thursday.', '제가 잘못 알고 있었어요. 회의는 목요일이었어요.'),
(9494, 9494, 1, 'It was the other way around.', '그게 아니라 반대였어요.'),
(9495, 9495, 1, 'That name rings a bell.', '그 이름 어디서 들어 본 것 같아요.'),
(9496, 9496, 1, 'We''re on the same page now.', '이제 서로 같은 걸 알고 있네요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9480, 'memory', NULL, '기억 · 기억력', 'NOUN', '/ˈmeməri/', '메머리'),
(9481, 'detail', NULL, '세부 사항', 'NOUN', '/ˈdiːteɪl/', '디-테일'),
(9482, 'fact', NULL, '사실', 'NOUN', '/fækt/', '팩트'),
(9483, 'truth', NULL, '진실', 'NOUN', '/truːθ/', '트루-스'),
(9484, 'confuse', NULL, '헷갈리게 하다', 'VERB', '/kənˈfjuːz/', '컨퓨-즈'),
(9485, 'admit', NULL, '(사실임을) 인정하다', 'VERB', '/ədˈmɪt/', '어드미트'),
(9486, 'swear', NULL, '분명하다고 단언하다', 'VERB', '/swer/', '스웨어'),
(9487, 'sure', NULL, '(기억이) 확실한', 'ADJECTIVE', '/ʃʊr/', '슈어'),
(9488, 'honest', NULL, '솔직한', 'ADJECTIVE', '/ˈɑːnɪst/', '아-니스트'),
(9489, 'certain', NULL, '(사실이) 분명한', 'ADJECTIVE', '/ˈsɜːrtn/', '서-튼'),
(9490, 'obvious', NULL, '누가 봐도 뻔한', 'ADJECTIVE', '/ˈɑːbviəs/', '아-비어스'),
(9491, 'opposite', NULL, '정반대의', 'ADJECTIVE', '/ˈɑːpəzɪt/', '아-퍼지트'),
(9492, 'exactly', NULL, '정확히 · 바로 그렇게', 'ADVERB', '/ɪɡˈzæktli/', '이그잭틀리'),
(9493, 'actually', NULL, '(알고 보면) 실은', 'ADVERB', '/ˈæktʃuəli/', '액추얼리'),
(9494, 'totally', NULL, '완전히', 'ADVERB', '/ˈtoʊtəli/', '토우털리'),
(9495, 'possibly', NULL, '어쩌면', 'ADVERB', '/ˈpɑːsəbli/', '파-서블리');


-- ── 유닛 11~15(덩어리 ③ 앞으로의 일) 작성 기록 — 2026-11-14 backend-dev ──
--   ⚠️⚠️ **이 다섯 유닛은 앞 열 유닛과 경계의 방향이 반대다**(기획 §8-3 27 · §3-4 ⑤ · AC-15).
--     유닛 1~10 저자의 일은 will·be going to를 **피하는 것**이었고, 여기서는 **쓰는 것**이 일이다.
--     점검 한 줄: *"이 회화에서 will과 be going to를 전부 지워도 장면이 성립하는가?"* → 성립하면 결함이다.
--     다섯 장면 모두 그 줄을 통과한다 — 11 즉석 분담 · 12 전부터 정해 둔 이사·휴가 · 13 네 가지 미래가 한 장면 ·
--     14 won''t와 not going to가 둘 다 오감 · 15 was going to(못 한 일) + I''ll(다음번).
--   * 유닛당 실제 사용: 문법 3 · 문법당 예문 3 · 회화 1편(8줄) · 표현 7 · 표현 예문 7 · 어휘 16 · 한자 0.
--   * **표를 다시 그리지 않았다**(기획 §8-3 21). 학교의 표 → E2가 주는 판정 기준 한 줄:
--       will vs be going to 비교표 → "언제 정했는가"             (유닛 12 문법 1)
--       미래 표현 4종 비교표       → "누가 언제 정했는가"         (유닛 13 문법 3)
--       in/within 용법표           → "거꾸로 세나 앞으로 세나"    (유닛 14 문법 3 — 유닛 5의 ago와 한 쌍)
--       12시제 표                  → "바뀌는 것은 동사 한 자리뿐" (유닛 15 문법 3)
--   * **아직 안 열린 것을 쓰지 않았다**: 완료형(유닛 16) 0건 · could/would/should/might(E4) 0건 ·
--     수동태(E4) 0건 · when/while/if 절(E3) 0건 · 비교급(E3) 0건.
--     - 유닛 11 회화는 "문제가 어떻게 생겼는지"를 **능동으로** 적었다(Something went wrong / The file won''t open) —
--       The file was deleted. 류로 가면 수동태라 E4다(§8-3 25). 유닛 13의 tight·overlap도 비교 없이만 썼다.
--     - 유닛 15 회화는 "그동안 한 번도 못 왔다"(I haven''t been able to come.)로 가지 않고 **어제 하루**로 못 박았다.
--     - 유닛 12·13·15에서 so로 두 문장을 이었다(§2-1 허용). when/while/if로 바꾸지 않았다 —
--       meanwhile(유닛 13 어휘 9555)은 문장 앞 이정표로만 썼고(회화 8번째 줄) while 절은 한 번도 안 나온다.
--   ⚠️ **기획 §3-3이 어휘에 요구한 usage_note는 넣을 자리가 없다** — `usage_note` 컬럼은 `expression`에만 있고
--     `vocabulary`에는 (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx)뿐이다(VocabularyEntity).
--     그래서 어휘 쪽 혼동 짝은 전부 **meaning_ko의 괄호**로 좁혔다(§11-5의 방식) —
--     fix「(고장난 것을) 고치다」↔ solve「(문제를) 풀다」 · depart「(시간표대로) 출발하다」↔ E2 유닛 2 leave ·
--     turn「(일을 맡을) 차례」↔ E1 turn「돌다」 · move「이사하다」↔ E1 move「옮기다」 ·
--     relax「(긴장을 풀고) 느긋해지다」↔ 유닛 1 rest「휴식」 · peaceful「(사람 손이 안 탄) 고요한」↔ E1 quiet ·
--     sick「(몸이) 아픈」 · shame「아쉬운 일」 · regret「(못 해서) 아쉬워하다」 · hopefully「바라건대」.
--     **표현 쪽 혼동 짝은 전부 usage_note에 적었다**(deal with↔E1 take care of · go wrong↔유닛 10 get it wrong ·
--     push back↔E1 put off·같은 유닛 reschedule · come up↔E1 come up with · on second thought↔유닛 3
--     come to think of it · can''t wait↔유닛 6 wait · take time off↔E1 day off · work out↔E1 work for·work on).
--     → senior-dev에게 넘김: 어휘에도 혼동 짝을 적어야 한다면 컬럼 추가가 **계약 변경**이다.
--   * **E1과 겹친 표제어는 둘뿐이고 둘 다 기획 §4-5-1이 임자를 정해 둔 자리다** —
--     turn(E1 9255 돌다/VERB → E2 9505 차례/NOUN) · move(E1 9260 옮기다 → E2 9532 이사하다).
--     **발음(ipa·ko_approx)은 E1 값을 그대로 복사했다** — 자료실 병합 키가 (word, ipa)라서다(§11-3 상자 · 기획 §4-4 1).
--   * 기획이 후보 단계에서 거른 것을 그대로 지켰다: one of these days(유닛 5 these days의 변형) ·
--     catch up on(E1 catch up의 변형) · nothing much(유닛 4 nothing special) · be scheduled for(수동태) ·
--     next(한정사) · maybe·probably(유닛 15 문법 2의 것) · flight·busy·change(E2 내부 중복) ·
--     rest(유닛 1 9304) — 전부 어휘·표현 표제어로 올리지 않고 본문에만 썼다.


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 11 「지금 정한 일은 will로 말한다」 — will + 원형 · won''t · I think it will ~
-- 문법 9150~9152 / 예문 9450~9458 / 회화 9111(대사 9400~9407) / 표현 9500~9506 / 어휘 9500~9515
-- 장면: 일이 틀어져 **그 자리에서** 누가 무엇을 맡을지 나눈다 — 미리 세운 계획을 확인하는 자리가 아니다.
-- ⚠️ 기획 §8-3 27 요구: Let me ~(E1 우회로)로 때운 줄이 없다. 여덟 줄 중 다섯 줄이 I''ll ~ 이고,
--    표현 7개가 **전부 이 회화 안에 실제로 나온다**(go wrong 1 · take over 3 · sort out 4 · deal with 5 ·
--    be on it 6 · back on track 8 · in no time 8).
-- ⚠️ 여기서부터 앞을 가리키는 시간 표기를 쓸 수 있다(§4-2 · AC-24) — tomorrow는 유닛 14가 임자라 본문에만 썼다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9150, 'will + 동사원형', '미리 정해 둔 것이 아니라 지금 정한 것이다', '학교에서는 will을 「~할 것이다(미래형)」라는 이름으로 외웠습니다. 실제로 will이 하는 일은 말하는 그 순간 정했다는 표시입니다. 무거운 상자를 든 사람을 보고 I''ll get the door.라고 하면 미리 세워 둔 계획이 아니라 지금 막 정한 일입니다. 주어가 I든 Mina든 모양이 안 바뀌고, 뒤에는 언제나 원형이 옵니다 — E1에서 배운 can이 앉던 바로 그 자리입니다. 말할 때는 I will보다 I''ll 쪽이 훨씬 자주 나옵니다.'),
(9151, 'won''t', '예고가 아니라 끝내 안 한다는 뜻이다', '학교에서는 will not의 줄임으로만 배웠습니다. 실제로 이 말에는 하지 않겠다는 뜻이 실립니다 — 사람에게 쓰면 「그럴 생각이 없다」에 가깝고, 사물에 쓰면 그 성질이 그대로 드러납니다: The door won''t open.은 「문이 안 열린다」는 말이고 「열리지 않을 것이다」라는 예고가 아닙니다. 그래서 단순한 미래 부정이 아니라 끝까지 안 한다는 쪽으로 기울고, 말할 때 풀어 쓰는 일이 거의 없습니다.'),
(9152, 'I think it will ~', '짐작에는 눈앞의 근거가 없어도 된다', '학교에서는 will을 「단순미래」라는 이름으로만 받았습니다. 실제로 눈에 보이는 근거 없이 그냥 그럴 것 같을 때 고르는 것이 will입니다 — I think it will rain tomorrow.는 하늘을 보고 하는 말이 아니라 그냥 짐작입니다. 하늘이 시커먼 것을 보고 말하는 쪽은 유닛 12에서 따로 배웁니다. E1에서 배운 I think ~가 여기서 앞일과 처음 만나고, 아니라고 할 때는 뒤가 아니라 앞을 부정합니다(I don''t think it will ~).');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9450, 9150, 1, 'I''ll get the door.', NULL, '제가 문 열어 드릴게요.'),
(9451, 9150, 2, 'I''ll call them right now.', NULL, '제가 지금 바로 전화할게요.'),
(9452, 9150, 3, 'Mina will handle the rest.', NULL, '나머지는 미나가 알아서 처리할 거예요.'),
(9453, 9151, 1, 'The door won''t open.', NULL, '문이 안 열려요.'),
(9454, 9151, 2, 'I won''t be late again.', NULL, '다시는 늦지 않을게요.'),
(9455, 9151, 3, 'Ben won''t answer the phone.', NULL, '벤이 전화를 받으려고 하지 않아요.'),
(9456, 9152, 1, 'I think it will rain tomorrow.', NULL, '내일 비 올 것 같아요.'),
(9457, 9152, 2, 'I think Mina will solve it in a minute.', NULL, '미나가 금방 풀 것 같아요.'),
(9458, 9152, 3, 'I don''t think it will take long.', NULL, '오래 걸리지 않을 것 같아요.');

INSERT INTO dialog (id, title) VALUES
(9111, '일이 틀어진 아침, 누가 무엇을 맡을지 나눈다');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9400, 9111, 1, 'Mina', 'Something went wrong with the delivery list. Half of it is a mess.', NULL, '배송 목록이 틀어졌어요. 절반이 엉망이에요.'),
(9401, 9111, 2, 'Ben', 'The file won''t open on my computer either. I''ll call the support team.', NULL, '제 컴퓨터에서도 파일이 안 열려요. 제가 지원팀에 전화할게요.'),
(9402, 9111, 3, 'Mina', 'Then I''ll take over the list and fix the numbers by hand.', NULL, '그럼 제가 목록을 넘겨받아서 숫자를 손으로 고칠게요.'),
(9403, 9111, 4, 'Ben', 'Let''s split it. I''ll sort out the first half.', NULL, '나눠서 하죠. 앞쪽 절반은 제가 정리할게요.'),
(9404, 9111, 5, 'Mina', 'Good. It''s my turn to deal with the client, so I''ll send a quick note too.', NULL, '좋아요. 고객 응대는 제 차례니까 짧은 메모도 제가 보낼게요.'),
(9405, 9111, 6, 'Ben', 'I''m on it. I think it will take about an hour.', NULL, '지금 하고 있어요. 한 시간쯤 걸릴 것 같아요.'),
(9406, 9111, 7, 'Mina', 'It wasn''t your fault, anyway. Nobody volunteered for this.', NULL, '어차피 당신 잘못도 아니었어요. 아무도 하겠다고 나선 일이 아니고요.'),
(9407, 9111, 8, 'Ben', 'Thanks. We''ll be back on track in no time.', NULL, '고마워요. 금방 다시 제자리로 돌아올 거예요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9500, 'take over', '(남이 하던 일을) 넘겨받아 맡다', '처음부터 내가 하는 것이 아니라 하고 있던 사람에게서 중간에 받아 오는 것입니다. 새 일을 떠안는 take on과 갈리는 지점이 바로 그것입니다.', '/teɪk ˈoʊvər/', '테이크 오우버'),
(9501, 'deal with', '(성가신 일·사람을) 상대해 처리하다', 'E1의 take care of는 맡아서 돌보는 쪽이고, 이쪽은 귀찮은 것을 마주 보고 처리하는 쪽입니다. 뒤에는 대개 문제·불만·까다로운 사람이 옵니다.', '/diːl wɪð/', '디-일 위드'),
(9502, 'be on it', '(이미) 손대고 있다 · 지금 하고 있다', '맡았다는 대답으로 I''m on it.처럼 현재진행으로 씁니다(유닛 6). I''ll be on it.은 어색합니다 — 앞일을 정하는 말이 아니라 이미 손을 댔다는 말이기 때문입니다.', '/bi ɑːn ɪt/', '비 온- 잇'),
(9503, 'sort out', '(엉킨 것을) 갈라서 바로잡다', '뒤섞인 것을 하나씩 제자리에 놓는 그림입니다. 고장을 고치는 fix와 달리 목록·서류·오해처럼 엉켜 있는 것에 씁니다.', '/sɔːrt aʊt/', '소-트 아웃'),
(9504, 'in no time', '아주 금방', '시간이 하나도 안 걸린다는 과장입니다. no가 들어 있어도 부정이 아니라 「빨리」라는 뜻이고, 자리는 문장 끝입니다.', '/ɪn noʊ taɪm/', '인 노우 타임'),
(9505, 'go wrong', '(일이) 틀어지다', '유닛 10의 get it wrong은 사람이 잘못 아는 것이고, 이쪽은 일·기계가 어긋나는 것입니다. 그래서 주어가 사람이 아니라 대개 something이나 그 일 자체입니다.', '/ɡoʊ rɔːŋ/', '고우 롱-'),
(9506, 'back on track', '다시 제자리로', '궤도를 벗어났던 일이 원래 흐름으로 돌아온다는 말입니다. be나 get 뒤에 붙여 씁니다(We''re back on track.).', '/bæk ɑːn træk/', '백 온- 트랙');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9500, 9500, 1, 'I''ll take over the delivery list.', '배송 목록은 제가 넘겨받을게요.'),
(9501, 9501, 1, 'I''ll deal with the client.', '고객은 제가 상대할게요.'),
(9502, 9502, 1, 'I''m on it.', '지금 하고 있어요.'),
(9503, 9503, 1, 'I''ll sort out the first half.', '앞쪽 절반은 제가 정리할게요.'),
(9504, 9504, 1, 'We''ll be done in no time.', '금방 끝날 거예요.'),
(9505, 9505, 1, 'Something went wrong with the list.', '목록에 뭔가 틀어졌어요.'),
(9506, 9506, 1, 'We''ll be back on track today.', '오늘 다시 제자리로 돌아올 거예요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9500, 'trouble', NULL, '(곤란한) 말썽', 'NOUN', '/ˈtrʌbl/', '트러블'),
(9501, 'mess', NULL, '엉망인 상태', 'NOUN', '/mes/', '메스'),
(9502, 'fault', NULL, '(누구의) 잘못', 'NOUN', '/fɔːlt/', '폴-트'),
(9503, 'part', NULL, '(전체 중 한) 부분', 'NOUN', '/pɑːrt/', '파-트'),
(9504, 'half', NULL, '절반', 'NOUN', '/hæf/', '해프'),
(9505, 'turn', NULL, '(일을 맡을) 차례', 'NOUN', '/tɜːrn/', '턴-'),
(9506, 'fix', NULL, '(고장난 것을) 고치다', 'VERB', '/fɪks/', '픽스'),
(9507, 'solve', NULL, '(문제를) 풀다', 'VERB', '/sɑːlv/', '살-브'),
(9508, 'handle', NULL, '(일을) 알아서 처리하다', 'VERB', '/ˈhændl/', '핸들'),
(9509, 'volunteer', NULL, '(하겠다고) 나서다', 'VERB', '/ˌvɑːlənˈtɪr/', '발-런티어'),
(9510, 'split', NULL, '(둘로) 나누다', 'VERB', '/splɪt/', '스플릿'),
(9511, 'serious', NULL, '(가볍지 않게) 심각한', 'ADJECTIVE', '/ˈsɪriəs/', '시리어스'),
(9512, 'extra', NULL, '(원래 것 말고) 추가의', 'ADJECTIVE', '/ˈekstrə/', '엑스트러'),
(9513, 'quick', NULL, '(손이 금방 가는) 빠른', 'ADJECTIVE', '/kwɪk/', '퀵'),
(9514, 'simple', NULL, '(손이 많이 안 가는) 간단한', 'ADJECTIVE', '/ˈsɪmpl/', '심플'),
(9515, 'anyway', NULL, '어차피 · 아무튼', 'ADVERB', '/ˈeniweɪ/', '에니웨이');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 12 「미리 정해 둔 일은 be going to」 — be going to · 보고 아는 앞일 · going to go
-- 문법 9155~9157 / 예문 9465~9473 / 회화 9112(대사 9420~9427) / 표현 9510~9516 / 어휘 9520~9535
-- 장면: **전부터 정해 둔** 이사·휴가를 주고받는다 — "집을 알아보는 중"으로 흐르면 유닛 6이고,
--       "이미 상대와 잡힌 일정"으로 흐르면 유닛 13의 몫이다(기획 §3-3 가드).
-- ⚠️ maybe·probably를 대사에 섞지 않았다 — 확신의 세기를 한 단어로 얹는 것은 **유닛 15 문법 2**의 몫이다.
-- ⚠️ 어휘 move(9532)는 E1 9260과 같은 표기다. 뜻을 「이사하다」로 갈랐고 **발음은 E1 값을 그대로 복사**했다.
-- ⚠️⚠️ **지정값 `closet`을 `landlord`(9522)로 바꿨다 — 테스트가 막았다. senior-dev 판정 필요.**
--    `EnglishVocabularyMergeContractIntegrationTest.an_english_homograph_with_two_pronunciations_is_two_rows`가
--    `/api/en/library/vocabulary?q=close` 결과를 **정확히 2행**(E1 close 가까운 · E2 유닛 5 close 닫다)으로 고정하는데,
--    자료실 검색이 부분 일치라서 `closet`이 **3번째 행**으로 끼어들어 그 계약이 깨졌다(실측 실패 메시지 그대로).
--    테스트는 senior-dev 소유라 손대지 않았고, 06 §11-11 3-3(한 코스 안에 어간이 같은 표기를 두 번 올리지 않는다 —
--    E2 유닛 5가 `close`를 이미 가졌다)도 같은 방향을 가리켜 **대체**를 골랐다.
--    `landlord`를 고른 이유: ① E1 238 · E2 유닛 1~10 160 · 유닛 11~15 신규 어디에도 없고, ② 같은 유닛의
--    `rent`·`deposit`·`budget`과 한 덩어리로 「이사·임대」 테마 정중앙이며, ③ 뒤 유닛(16~20) 테마를 가져가지 않고,
--    ④ `close`·`leave`(테스트가 쓰는 검색어 둘) 어느 쪽도 부분 문자열로 품지 않는다.
--    → **되돌릴 선택지**: 테스트를 표기 완전일치로 거르게 고치면 `closet`을 복구할 수 있다. 그 판단은 senior-dev다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9155, 'be going to + 동사원형', '뜻이 아니라 언제 정했는지가 다르다', '학교에서는 「will = be going to, 바꿔 써도 된다」로 배웠습니다. 실제로 갈리는 지점은 언제 정했느냐 하나입니다. 말하는 순간 정했으면 will, 전부터 정해 둔 것이면 be going to입니다 — I''m going to move next month.는 오늘 갑자기 정한 일이 아닙니다. 그래서 짐을 싸 둔 사람, 표를 끊어 둔 사람이 쓰는 말입니다. 뜻이 다른 것이 아니라 결정한 시점이 다릅니다. 앞의 be는 주어에 맞춰 am·is·are로 갈립니다.'),
(9156, '보고 아는 앞일도 be going to', '짐작과 갈리는 자리는 근거가 보이느냐 하나다', '학교에서는 앞일의 짐작을 전부 will로 배웠습니다. 실제로는 눈에 보이는 근거가 있으면 be going to입니다 — 하늘이 시커먼 것을 보고 It''s going to rain.이라고 합니다. 유닛 11의 I think it will rain.은 아무 근거 없는 짐작이었습니다. 표를 외울 일이 아니라 질문 하나로 끝납니다: 지금 눈앞에 징조가 보이나. 보이면 be going to, 그냥 느낌이면 will입니다.'),
(9157, 'going to 뒤에 go가 또 와도 된다', '통째로 하나라서 뒤에 무엇이 와도 된다', '학교에서는 이것을 배운 적이 거의 없어서, I''m going to go라고 쓰다가 go가 두 번이라 스스로 고쳐 버립니다. 실제로 be going to는 통째로 하나의 표시라서 뒤에 어떤 동사든 옵니다 — go가 와도 맞는 문장입니다. 짧게 하려고 I''m going to the station.으로 바꾸면 뜻이 달라집니다(지금 역으로 가는 중이라는 말이 됩니다). 앞일을 말할 생각이면 go를 지우지 않습니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9465, 9155, 1, 'I''m going to move next month.', NULL, '저는 다음 달에 이사해요.'),
(9466, 9155, 2, 'We''re going to rent a truck.', NULL, '우리는 트럭을 빌릴 거예요.'),
(9467, 9155, 3, 'Ben is going to take a week off.', NULL, '벤은 일주일 휴가를 낼 거예요.'),
(9468, 9156, 1, 'It''s going to rain. Look at the sky.', NULL, '비 올 거예요. 하늘 좀 보세요.'),
(9469, 9156, 2, 'The bus is going to leave. Hurry.', NULL, '버스 출발하려고 해요. 서둘러요.'),
(9470, 9156, 3, 'This box is going to fall.', NULL, '이 상자 떨어지려고 해요.'),
(9471, 9157, 1, 'I''m going to go to the bank first.', NULL, '저는 먼저 은행에 갈 거예요.'),
(9472, 9157, 2, 'We''re going to go by truck.', NULL, '우리는 트럭으로 갈 거예요.'),
(9473, 9157, 3, 'Mina is going to go home early today.', NULL, '미나는 오늘 일찍 집에 갈 거예요.');

INSERT INTO dialog (id, title) VALUES
(9112, '다음 달 이사와 휴가 계획을 주고받는다');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9420, 9112, 1, 'Mina', 'I''m going to move next month. The new apartment is near the station.', NULL, '저 다음 달에 이사해요. 새 집이 역 근처예요.'),
(9421, 9112, 2, 'Ben', 'Nice. Are you going to rent a truck?', NULL, '좋네요. 트럭 빌릴 거예요?'),
(9422, 9112, 3, 'Mina', 'Yes. I saved up for a year, so I can afford a small one.', NULL, '네. 1년 동안 돈을 모아서 작은 건 감당할 수 있어요.'),
(9423, 9112, 4, 'Ben', 'Are you going to take a week off?', NULL, '일주일 휴가 낼 거예요?'),
(9424, 9112, 5, 'Mina', 'Just two days. I''m going to pack on Friday, and I''ll unpack over the weekend.', NULL, '이틀만요. 금요일에 짐을 싸고, 주말 동안 짐을 풀 거예요.'),
(9425, 9112, 6, 'Ben', 'The kitchen stuff is going to be the hard part. Mine took two days.', NULL, '부엌 짐이 제일 힘든 부분일 거예요. 제 건 이틀 걸렸어요.'),
(9426, 9112, 7, 'Mina', 'I know. I''m going to give the old furniture away and buy nothing new.', NULL, '알아요. 낡은 가구는 그냥 줘 버리고 새로 안 살 거예요.'),
(9427, 9112, 8, 'Ben', 'Good plan. I can''t wait to see the new place. I''ll help you on Saturday.', NULL, '좋은 계획이네요. 새 집 보는 게 너무 기대돼요. 토요일에 도와줄게요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9510, 'look forward to', '(앞일을) 기대하며 기다리다', '뒤에는 명사나 -ing가 옵니다(look forward to moving). to가 보여서 원형을 넣기 쉬운데 그 자리가 아닙니다.', '/lʊk ˈfɔːrwərd tuː/', '룩 포-워드 투-'),
(9511, 'save up', '(쓰지 않고) 돈을 모으다', '그냥 save는 아끼는 것이고 up이 붙으면 목표를 두고 모아 간다는 쪽입니다. 무엇을 위한 돈인지는 for로 붙입니다.', '/seɪv ʌp/', '세이브 업'),
(9512, 'settle in', '(새 곳에) 자리를 잡다', '이사·입사 직후에 짐과 생활이 제자리를 찾는 기간을 말합니다. 들어가는 순간(move in)이 아니라 그 뒤의 적응입니다.', '/ˈsetl ɪn/', '세틀 인'),
(9513, 'take time off', '(일을 쉬고) 휴가를 내다', 'E1의 day off는 쉬는 날이라는 명사이고, 이쪽은 휴가를 내는 행동입니다. 사이에 기간을 넣습니다: take a week off.', '/teɪk taɪm ɔːf/', '테이크 타임 오-프'),
(9514, 'for good', '(돌아오지 않게) 아예 · 영영', 'good이 들어 있지만 좋다는 뜻이 아니라 「이번이 마지막」이라는 말입니다. 떠남·그만둠과 붙여 씁니다.', '/fər ɡʊd/', '퍼 굿'),
(9515, 'plan on', '(하기로) 작정해 두다', '뒤에 -ing가 옵니다(plan on moving). plan to와 뜻이 거의 같지만 말할 때는 이쪽이 더 흔합니다.', '/plæn ɑːn/', '플랜 온-'),
(9516, 'can''t wait', '너무 기대된다', '정말 못 기다린다는 말이 아니라 기대가 크다는 과장입니다. 유닛 6의 wait(그 자리에서 기다리다)과 뜻이 거꾸로 서는 자리입니다. 뒤에는 for 명사나 to 원형이 옵니다.', '/kænt weɪt/', '캔트 웨이트');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9510, 9510, 1, 'I''m looking forward to the trip.', '여행이 기대돼요.'),
(9511, 9511, 1, 'I saved up for a year.', '1년 동안 돈을 모았어요.'),
(9512, 9512, 1, 'I''m going to settle in by Sunday.', '일요일까지는 자리를 잡을 거예요.'),
(9513, 9513, 1, 'I''m going to take a week off.', '일주일 휴가를 낼 거예요.'),
(9514, 9514, 1, 'He left the city for good.', '그는 아예 도시를 떠났어요.'),
(9515, 9515, 1, 'I''m planning on moving next month.', '다음 달에 이사할 작정이에요.'),
(9516, 9516, 1, 'I can''t wait for the vacation.', '휴가가 너무 기대돼요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9520, 'apartment', NULL, '(한 세대가 사는) 아파트 · 집', 'NOUN', '/əˈpɑːrtmənt/', '어파-트먼트'),
(9521, 'furniture', NULL, '가구', 'NOUN', '/ˈfɜːrnɪtʃər/', '퍼-니처'),
(9522, 'landlord', NULL, '(집을 빌려주는) 집주인', 'NOUN', '/ˈlændlɔːrd/', '랜드로-드'),
(9523, 'truck', NULL, '트럭 · 짐차', 'NOUN', '/trʌk/', '트럭'),
(9524, 'stuff', NULL, '(잡다한) 짐 · 물건', 'NOUN', '/stʌf/', '스터프'),
(9525, 'deposit', NULL, '(집을 얻을 때 내는) 보증금', 'NOUN', '/dɪˈpɑːzɪt/', '디파-지트'),
(9526, 'budget', NULL, '(쓰기로 잡아 둔) 예산', 'NOUN', '/ˈbʌdʒɪt/', '버지트'),
(9527, 'vacation', NULL, '(길게 쉬며 떠나는) 휴가', 'NOUN', '/veɪˈkeɪʃn/', '베이케이션'),
(9528, 'passport', NULL, '여권', 'NOUN', '/ˈpæspɔːrt/', '패스포-트'),
(9529, 'rent', NULL, '(돈을 내고) 빌리다', 'VERB', '/rent/', '렌트'),
(9530, 'pack', NULL, '(짐을) 싸다', 'VERB', '/pæk/', '팩'),
(9531, 'unpack', NULL, '(짐을) 풀다', 'VERB', '/ˌʌnˈpæk/', '언팩'),
(9532, 'move', NULL, '이사하다', 'VERB', '/muːv/', '무-브'),
(9533, 'cost', NULL, '(값이) 얼마 들다', 'VERB', '/kɔːst/', '코-스트'),
(9534, 'afford', NULL, '(돈이 돼서) 감당하다', 'VERB', '/əˈfɔːrd/', '어포-드'),
(9535, 'someday', NULL, '(언제인지 모를) 언젠가', 'ADVERB', '/ˈsʌmdeɪ/', '섬데이');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 13 「이미 잡힌 일정은 진행형으로 말한다」 — 진행형의 미래 · 시간표의 단순현재 · 네 가지를 고르는 한 줄
-- 문법 9160~9162 / 예문 9480~9488 / 회화 9113(대사 9440~9447) / 표현 9520~9526 / 어휘 9540~9555
-- 장면: 다음 주 일정을 맞춰 본다.
-- ⚠️⚠️ 기획 §3-3·§8-3 27이 **지시로 못 박은 것**: 이 회화에는 will로 즉석에서 정하는 줄이 **하나 더** 있어야 한다.
--    문법 3이 「앞일을 말하는 네 가지」를 고르게 하므로 진행형·단순현재만 나오면 그 문법이 증명되지 않고,
--    AC-15가 요구하는 will·be going to도 사라진다. 대사 6·7이 will, 8이 be going to, 1·4가 진행형, 5가 단순현재다.
-- ⚠️ be scheduled for를 쓰지 않았다 — be + 과거분사라 자연스러운 예문이 곧 수동태가 된다(§8-3 25 · §11-11 3-4).
--    대신 능동인 fit in·move up을 넣었고, 「일정이 잡혔다」는 뜻은 문법 1의 진행형이 감당한다.
-- ⚠️ tight·overlap은 비교급으로 번지지 않게 썼다(tighter than 금지 · §2-1).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9160, '현재진행으로 앞일 말하기 (I''m meeting Mina at two.)', '약속이 이미 잡혔다는 신호', '학교에서는 「현재진행은 지금 하는 중」으로만 배워서 I''m meeting Mina at two.를 틀린 문장으로 읽습니다. 실제로는 시간이 함께 오면 진행형이 앞일을 가리킵니다. 그리고 이 말에는 이미 상대와 약속이 잡혔다는 뜻이 실려서, 혼자 정해 둔 be going to보다 확실합니다. 유닛 6에서 배운 모양 그대로이고 바뀌는 것은 가리키는 시간뿐입니다 — at two, on Friday처럼 시간을 붙이는 것이 그 신호입니다.'),
(9161, '시간표처럼 정해진 일은 단순현재 (The train leaves at seven.)', '내가 못 바꾸는 일정', '학교에서는 「현재형은 현재」로만 배웠습니다. 실제로 기차·영화·가게 시간처럼 내 마음대로 못 바꾸는 일정은 단순현재로 말합니다 — The train leaves at seven. 여기에 will을 쓰면 오히려 어색해집니다. 내 사정으로 바뀌는 일이 아니라 시간표에 적힌 사실이기 때문입니다. E1에서 「습관·사실」로 배운 현재형이 앞일을 가리키는 유일한 자리입니다.'),
(9162, '앞일을 말하는 네 가지를 한 줄로 고른다', '누가 언제 정했는가', '학교에서는 네 가지를 표로 비교했습니다. 실제로는 질문 하나로 끝납니다 — 누가 언제 정했는가. 지금 내가 정했으면 will, 전에 내가 정해 뒀으면 be going to, 이미 상대와 잡았으면 진행형, 아무도 못 바꾸면 단순현재입니다. 네 칸을 외우는 것이 아니라 이 한 줄을 들고 고르면 됩니다. 한 대화 안에서 넷이 섞여 나오는 것도 정상입니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9480, 9160, 1, 'I''m meeting Mina at two.', NULL, '두 시에 미나를 만나요. (약속이 이미 잡혀 있어요)'),
(9481, 9160, 2, 'Ben is leaving on Friday.', NULL, '벤은 금요일에 떠나요.'),
(9482, 9160, 3, 'We''re having dinner with the client on Monday.', NULL, '월요일에 고객과 저녁을 먹어요.'),
(9483, 9161, 1, 'The train leaves at seven.', NULL, '기차는 일곱 시에 출발해요.'),
(9484, 9161, 2, 'The store opens at ten on Sundays.', NULL, '그 가게는 일요일에 열 시에 열어요.'),
(9485, 9161, 3, 'My flight departs at six sharp.', NULL, '제 비행기는 여섯 시 정각에 출발해요.'),
(9486, 9162, 1, 'I''ll book the early train.', NULL, '제가 이른 기차를 예약할게요. (지금 정했어요)'),
(9487, 9162, 2, 'I''m going to visit the client on Monday.', NULL, '월요일에 고객을 찾아갈 거예요. (전부터 정해 뒀어요)'),
(9488, 9162, 3, 'I''m seeing the client at two, and the train leaves at seven.', NULL, '두 시에 고객을 만나고, 기차는 일곱 시에 출발해요. (이미 잡힌 약속과 시간표)');

INSERT INTO dialog (id, title) VALUES
(9113, '다음 주 일정을 서로 맞춰 본다');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9440, 9113, 1, 'Mina', 'I''m meeting the client at two on Tuesday.', NULL, '화요일 두 시에 고객을 만나요.'),
(9441, 9113, 2, 'Ben', 'My Tuesday is back to back. Can we make time on Wednesday?', NULL, '제 화요일은 일정이 줄줄이 붙어 있어요. 수요일에 시간 낼 수 있을까요?'),
(9442, 9113, 3, 'Mina', 'Wednesday is tight. Two things overlap in the morning.', NULL, '수요일은 빠듯해요. 아침에 두 건이 겹쳐요.'),
(9443, 9113, 4, 'Ben', 'Then let''s push back the review. I''m taking the early train on Thursday.', NULL, '그럼 검토는 뒤로 밀죠. 저는 목요일에 이른 기차를 타요.'),
(9444, 9113, 5, 'Mina', 'The train leaves at seven, so you need to confirm the seat today.', NULL, '기차는 일곱 시에 출발하니까 오늘 좌석을 확정해야 해요.'),
(9445, 9113, 6, 'Ben', 'Right. Then I''ll book the aisle seat now.', NULL, '맞아요. 그럼 지금 복도 쪽 좌석을 예약할게요.'),
(9446, 9113, 7, 'Mina', 'I''ll double-check the calendar and move up the afternoon call.', NULL, '제가 일정표를 다시 확인하고 오후 통화를 앞당길게요.'),
(9447, 9113, 8, 'Ben', 'Good. Meanwhile I''m going to reschedule the Friday meeting.', NULL, '좋아요. 그동안 저는 금요일 회의 날짜를 다시 잡을 거예요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9520, 'push back', '(이미 잡힌 일정을) 뒤로 밀다', 'E1의 put off는 할 일을 그냥 미루는 것이고, 이쪽은 날짜·시각이 이미 잡힌 일정을 뒤로 옮기는 것입니다. 같은 유닛의 reschedule은 날짜를 새로 잡는 것이라 또 다릅니다 — 이쪽은 밀기만 합니다.', '/pʊʃ bæk/', '푸시 백'),
(9521, 'move up', '(일정을) 앞당기다', 'push back의 정확한 반대편입니다. 여기의 move는 유닛 12의 move(이사하다)와 다른 말이고, 뒤에는 일정·시각이 옵니다.', '/muːv ʌp/', '무-브 업'),
(9522, 'make time', '(없는 중에) 시간을 내다', 'have time(시간이 있다)과 달리 일부러 자리를 비운다는 말입니다. 누구를 위한 시간인지는 for로 붙입니다.', '/meɪk taɪm/', '메이크 타임'),
(9523, 'fit in', '(일정 사이에) 끼워 넣다', '빈 틈에 밀어 넣는 그림입니다. 사람을 주어로 쓰면 「무리에 섞여 들다」라는 다른 뜻이 되니 일정 이야기임을 함께 말해 줍니다.', '/fɪt ɪn/', '핏 인'),
(9524, 'double-check', '(한 번 더) 확인하다', '이미 한 번 봤는데 또 본다는 말입니다. 처음 확인하는 check와 달리 두 번째라는 사실이 말 안에 들어 있습니다.', '/ˈdʌbl tʃek/', '더블 체크'),
(9525, 'back to back', '(일정이) 줄줄이 붙어 있는', '등을 맞대고 선 그림입니다. 바쁘다는 말이 아니라 쉬는 틈 없이 이어 붙었다는 모양을 말합니다.', '/bæk tə bæk/', '백 터 백'),
(9526, 'run over', '(회의가) 예정 시간을 넘기다', '차로 치는 뜻이 아니라 시간이 넘쳐 흐르는 쪽입니다. 유닛 9의 run(뛰다·달리다)과 뜻이 완전히 갈립니다.', '/rʌn ˈoʊvər/', '런 오우버');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9520, 9520, 1, 'Let''s push back the review to Friday.', '검토는 금요일로 미루죠.'),
(9521, 9521, 1, 'I''ll move up the afternoon call.', '오후 통화를 앞당길게요.'),
(9522, 9522, 1, 'Can we make time on Wednesday?', '수요일에 시간 낼 수 있을까요?'),
(9523, 9523, 1, 'I''m going to fit it in before lunch.', '점심 전에 끼워 넣을 거예요.'),
(9524, 9524, 1, 'I''ll double-check the calendar.', '일정표를 다시 확인할게요.'),
(9525, 9525, 1, 'My Tuesday is back to back.', '제 화요일은 일정이 줄줄이예요.'),
(9526, 9526, 1, 'The meeting ran over by twenty minutes.', '회의가 20분 넘겼어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9540, 'ticket', NULL, '(차·공연) 표', 'NOUN', '/ˈtɪkɪt/', '티킷'),
(9541, 'reservation', NULL, '(자리·방을 잡아 두는) 예약', 'NOUN', '/ˌrezərˈveɪʃn/', '레저베이션'),
(9542, 'seat', NULL, '(앉는) 자리', 'NOUN', '/siːt/', '시-트'),
(9543, 'aisle', NULL, '(좌석 사이의) 통로', 'NOUN', '/aɪl/', '아일'),
(9544, 'platform', NULL, '(기차) 승강장', 'NOUN', '/ˈplætfɔːrm/', '플랫폼-'),
(9545, 'gate', NULL, '(공항) 탑승구', 'NOUN', '/ɡeɪt/', '게이트'),
(9546, 'fare', NULL, '(차를 타는) 요금', 'NOUN', '/fer/', '페어'),
(9547, 'calendar', NULL, '일정표 · 달력', 'NOUN', '/ˈkælɪndər/', '캘린더'),
(9548, 'transfer', NULL, '(다른 차로) 갈아타다', 'VERB', '/trænsˈfɜːr/', '트랜스퍼-'),
(9549, 'depart', NULL, '(시간표대로) 출발하다', 'VERB', '/dɪˈpɑːrt/', '디파-트'),
(9550, 'confirm', NULL, '(틀림없다고) 확정하다', 'VERB', '/kənˈfɜːrm/', '컨펌-'),
(9551, 'reschedule', NULL, '(날짜를) 다시 잡다', 'VERB', '/ˌriːˈskedʒuːl/', '리-스케줄-'),
(9552, 'overlap', NULL, '(두 일정이) 겹치다', 'VERB', '/ˌoʊvərˈlæp/', '오우버랩'),
(9553, 'tight', NULL, '(일정이) 빠듯한', 'ADJECTIVE', '/taɪt/', '타이트'),
(9554, 'sharp', NULL, '(시각) 정각에', 'ADVERB', '/ʃɑːrp/', '샤-프'),
(9555, 'meanwhile', NULL, '그동안에 · 한편', 'ADVERB', '/ˈmiːnwaɪl/', '민-와일');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 14 「앞일을 묻고, 안 할 거라고 말한다」 — 미래의 의문 두 갈래 · won''t와 not going to · in two days
-- 문법 9165~9167 / 예문 9495~9503 / 회화 9114(대사 9460~9467) / 표현 9530~9536 / 어휘 9560~9575
-- 장면: 연휴 계획을 묻고 아무 계획 없다고 답한다 — "작년 연휴엔 어땠는지"로 새면 유닛 4의 재방송이 된다.
-- ⚠️ 기획 §8-3 27 요구: won''t**와** not going to가 **둘 다** 오간다 —
--    not going to는 대사 2·8, won''t는 대사 4다. 하나만 쓰면 문법 2(「두 가지」)가 비어 버린다.
-- ⚠️ recently·lately·already·yet을 대사에 쓰지 않았다 — 완료와 붙어 사는 말이라 유닛 16부터다(AC-24).
-- ⚠️ tomorrow(9575)는 **이 유닛이 임자다**(기획 §3-3) — 문법 3이 그것을 가르치므로 예문에 실제로 나온다.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9165, 'Will you ~? / Are you going to ~?', '계획을 묻는 말과 해 달라는 말이 갈린다', '학교에서는 둘을 같은 뜻으로 배웠습니다. 실제로 Are you going to ~?는 정해 둔 게 있는지를 묻고, Will you ~?는 해 줄 건지를 묻는 쪽으로 기웁니다. 그래서 계획을 물을 때는 be going to 쪽이 자연스럽습니다 — Will you travel?은 계획을 묻는 말로는 덜 자연스럽고 여행 좀 가 달라는 말처럼 들립니다. 묻는 모양은 E1과 같습니다: 앞의 be나 will을 주어 앞으로 보내면 끝이고 뒤는 하나도 안 바뀝니다.'),
(9166, 'won''t와 not going to의 갈림', '거절의 세기가 다르다', '학교에서는 부정을 하나만 배웠습니다. 실제로 I won''t.는 안 하겠다는 쪽(그러기로 정했다)이고, I''m not going to.는 그럴 계획이 없다는 쪽입니다. 거절의 세기가 다릅니다 — 앞쪽은 의지가 실려 단호하게 들리고, 뒤쪽은 예정에 없다는 사실만 말합니다. 그래서 부탁을 물리칠 때는 앞쪽이 세게 들리고, 계획을 묻는 말에는 뒤쪽이 자연스럽습니다.'),
(9167, '앞일의 시간을 재는 말 (tomorrow / next week / in two days)', '이틀 안이 아니라 이틀 뒤를 가리킨다', '학교에서는 in을 「~ 안에」로 외웠습니다. 실제로 앞일에 붙는 in two days는 지금부터 이틀 뒤입니다. 「이틀 안에」는 within two days라 아예 다른 말입니다. 유닛 5의 ago가 지금에서 거꾸로 세는 말이었다면 이 in은 앞으로 셉니다 — 한 쌍으로 기억하면 둘 다 안 틀립니다. 자리는 문장 끝이고, E1의 「장소 먼저 시간 나중」이 그대로 갑니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9495, 9165, 1, 'Are you going to travel this weekend?', NULL, '이번 주말에 여행 갈 계획이에요?'),
(9496, 9165, 2, 'Will you join us?', NULL, '같이 하실래요?'),
(9497, 9165, 3, 'What are you going to do tomorrow?', NULL, '내일 뭐 할 거예요?'),
(9498, 9166, 1, 'I''m not going to do anything this weekend.', NULL, '이번 주말엔 아무것도 안 할 거예요.'),
(9499, 9166, 2, 'I won''t say a word.', NULL, '한 마디도 하지 않을게요.'),
(9500, 9166, 3, 'Mina isn''t going to join the picnic.', NULL, '미나는 소풍에 올 계획이 없어요.'),
(9501, 9167, 1, 'The festival starts tomorrow.', NULL, '축제는 내일 시작해요.'),
(9502, 9167, 2, 'I''m going to visit my hometown next week.', NULL, '다음 주에 고향에 갈 거예요.'),
(9503, 9167, 3, 'They''re going to arrive in two days.', NULL, '그들은 이틀 뒤에 도착해요.');

INSERT INTO dialog (id, title) VALUES
(9114, '연휴에 뭐 할 거냐고 묻고, 아무 계획 없다고 답한다');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9460, 9114, 1, 'Mina', 'The holiday starts in two days. Are you going to travel?', NULL, '이틀 뒤면 연휴예요. 여행 갈 거예요?'),
(9461, 9114, 2, 'Ben', 'No, I''m not going to do anything. I''ll just stay in.', NULL, '아뇨, 아무것도 안 할 거예요. 그냥 집에 있을게요.'),
(9462, 9114, 3, 'Mina', 'Really? My relatives are going to gather at my hometown.', NULL, '진짜요? 저희 친척들은 고향에 모일 거예요.'),
(9463, 9114, 4, 'Ben', 'That sounds nice. But I won''t drive for five hours again.', NULL, '좋네요. 그래도 다섯 시간 운전은 다시 안 할 거예요.'),
(9464, 9114, 5, 'Mina', 'Fair enough. We''re going camping on Saturday. Will you join us?', NULL, '그럴 만하죠. 저희는 토요일에 캠핑 가요. 같이 가실래요?'),
(9465, 9114, 6, 'Ben', 'A tent in the rain? I''m going to sleep in and take it easy.', NULL, '비 오는데 텐트요? 저는 늦잠 자고 느긋하게 있을 거예요.'),
(9466, 9114, 7, 'Mina', 'Lazy but peaceful. I''ll send you a picnic photo.', NULL, '게으르지만 평화롭네요. 소풍 사진 보내 드릴게요.'),
(9467, 9114, 8, 'Ben', 'Please do. I''m not going out of town, so I''ll be here all week.', NULL, '그래 주세요. 저는 멀리 안 나갈 거니까 한 주 내내 여기 있을 거예요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9530, 'take it easy', '무리하지 않고 느긋하게 있다', '쉬라는 권유로도 쓰고 헤어질 때 인사로도 씁니다. it 자리를 다른 말로 바꾸지 않습니다 — 통째로 굳은 덩어리입니다.', '/teɪk ɪt ˈiːzi/', '테이크 잇 이-지'),
(9531, 'stay in', '(나가지 않고) 집에 있다', '바로 아래 stay up과 꼴이 비슷하지만 이쪽은 장소, 저쪽은 시간입니다. 밖에서 노는 go out의 반대편입니다.', '/steɪ ɪn/', '스테이 인'),
(9532, 'stay up', '(안 자고) 늦게까지 깨어 있다', '위의 stay in과 짝으로 외우면 안 섞입니다 — in은 집 안, up은 잠들지 않은 상태입니다. 늦게까지라면 뒤에 late를 붙입니다.', '/steɪ ʌp/', '스테이 업'),
(9533, 'sleep in', '(일부러) 늦잠을 자다', '유닛 1의 sleep(자다)과 달리 평소보다 늦게까지 자는 것입니다. 실수로 늦잠을 잔 것은 oversleep이라 아예 다른 말입니다.', '/sliːp ɪn/', '슬리-프 인'),
(9534, 'out of town', '(일·여행으로) 동네를 떠나 있는', '여행 중이라는 말이 아니라 지금 이 도시에 없다는 상태입니다. be나 go 뒤에 붙여 씁니다.', '/aʊt əv taʊn/', '아웃 어브 타운'),
(9535, 'get away', '(답답한 데서) 훌쩍 떠나다', '어디로 가는지보다 벗어난다는 쪽에 무게가 있습니다. 도망친다는 뜻으로도 쓰이니 쉬러 간다는 맥락을 함께 말해 줍니다.', '/ɡet əˈweɪ/', '겟 어웨이'),
(9536, 'kill time', '(남는 시간을) 때우다', '할 일이 없어 시간을 흘려보낸다는 말입니다. 즐기는 쪽이 아니라 버티는 쪽이라 쉬는 계획이 없을 때 씁니다.', '/kɪl taɪm/', '킬 타임');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9530, 9530, 1, 'I''m going to take it easy all weekend.', '주말 내내 느긋하게 있을 거예요.'),
(9531, 9531, 1, 'I''ll just stay in tomorrow.', '내일은 그냥 집에 있을게요.'),
(9532, 9532, 1, 'I stayed up late last night.', '어젯밤에 늦게까지 안 자고 있었어요.'),
(9533, 9533, 1, 'I''m going to sleep in on Sunday.', '일요일엔 늦잠 잘 거예요.'),
(9534, 9534, 1, 'Ben is out of town this week.', '벤은 이번 주에 동네에 없어요.'),
(9535, 9535, 1, 'We want to get away for a few days.', '며칠 훌쩍 떠나고 싶어요.'),
(9536, 9536, 1, 'I killed time at the station.', '역에서 시간을 때웠어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9560, 'countryside', NULL, '(도시 밖) 시골', 'NOUN', '/ˈkʌntrisaɪd/', '컨트리사이드'),
(9561, 'beach', NULL, '바닷가', 'NOUN', '/biːtʃ/', '비-치'),
(9562, 'camping', NULL, '캠핑', 'NOUN', '/ˈkæmpɪŋ/', '캠핑'),
(9563, 'tent', NULL, '텐트', 'NOUN', '/tent/', '텐트'),
(9564, 'picnic', NULL, '소풍', 'NOUN', '/ˈpɪknɪk/', '피크닉'),
(9565, 'festival', NULL, '축제', 'NOUN', '/ˈfestɪvl/', '페스티벌'),
(9566, 'hometown', NULL, '고향', 'NOUN', '/ˈhoʊmtaʊn/', '호움타운'),
(9567, 'relative', NULL, '친척', 'NOUN', '/ˈrelətɪv/', '렐러티브'),
(9568, 'gather', NULL, '(여럿이) 모이다', 'VERB', '/ˈɡæðər/', '개더'),
(9569, 'invite', NULL, '(오라고) 부르다', 'VERB', '/ɪnˈvaɪt/', '인바이트'),
(9570, 'join', NULL, '(무리에) 끼다 · 함께하다', 'VERB', '/dʒɔɪn/', '조인'),
(9571, 'relax', NULL, '(긴장을 풀고) 느긋해지다', 'VERB', '/rɪˈlæks/', '릴랙스'),
(9572, 'lazy', NULL, '(움직이기 싫은) 게으른', 'ADJECTIVE', '/ˈleɪzi/', '레이지'),
(9573, 'peaceful', NULL, '(사람 손이 안 탄) 고요한', 'ADJECTIVE', '/ˈpiːsfl/', '피-스펄'),
(9574, 'sunny', NULL, '햇볕이 좋은', 'ADJECTIVE', '/ˈsʌni/', '서니'),
(9575, 'tomorrow', NULL, '내일', 'ADVERB', '/təˈmɑːroʊ/', '터마-로우');


-- ═══════════════════════════════════════════════════════════════════
-- 유닛 15 「하려고 했는데」 ★복습(11~15) — was/were going to · 확신을 얹는 말 · 같은 일을 세 시점으로
-- 문법 9170~9172 / 예문 9510~9518 / 회화 9115(대사 9480~9487) / 표현 9540~9546 / 어휘 9580~9595
-- 장면: 어제 못 온 이유와 다음엔 어떻게 할지.
-- ⚠️ 기획 §8-3 27 요구: was going to(못 한 일)**와** I''ll(다음번)이 **한 장면에** 선다 —
--    대사 1이 was going to, 7이 I''ll definitely, 8이 will + be going to다. 과거만 말하고 끝내지 않았다.
-- ⚠️ "그동안 한 번도 못 왔다"로 가지 않았다 — 그 뜻의 영어는 I haven''t been able to come.이고 완료는 유닛 16이다.
--    못 온 것은 **어제 하루**이고 다음은 **다음번 한 번**이다. 시점을 박아 두면 완료형으로 샐 길이 막힌다(AC-13).
-- ⚠️ I should have come. 류로 끝맺지 않았다 — should는 E4다(§3-4 ⑥ · AC-17).
-- ⚠️ maybe(E1 9225)·probably(E1 9286)는 **어휘로 올리지 않았다** — 문법 2가 가르치고 예문·설명에만 나온다.
--    definitely(9595)만 어휘로 올렸다(E1·E2 어디에도 없는 표기다).
-- ⚠️ 이 유닛의 정리 스텝에 11~15 복습 블록이 붙는다(unitNo % 5 == 0) — 유닛 11~14의 unit_grammar 매핑이
--    하나라도 빠지면 404가 아니라 **조용히 적은 칩**으로 나타난다(규칙 7이 문법 칩 10~15개를 센다).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9170, 'was / were going to', '안 했다는 말까지 함께 전해진다', '학교에서는 이 모양을 배운 적이 거의 없습니다. 실제로는 앞일을 과거에서 본 것입니다 — I was going to call you.는 하려고 했는데 안 했다는 말까지 함께 전합니다. 유닛 5의 used to가 「지금은 아니다」를 담은 것과 같은 방식입니다. 형태는 유닛 12의 be만 과거로 갈아 끼운 것이라 새로 외울 것이 없습니다. 안 한 이유를 바로 뒤에 붙이는 것이 보통입니다.'),
(9171, '앞일에 확신을 얹는 말 (maybe / probably / definitely)', '얼마나 확실한지를 한 단어로', '학교에서는 「maybe = 아마」로만 외웠습니다. 실제로 셋은 확신의 세기가 다르고 앉는 자리도 다릅니다 — maybe는 문장 맨 앞, probably와 definitely는 will 뒤입니다(I''ll probably go.). 세기는 maybe(반쯤) → probably(거의) → definitely(틀림없이) 순서로 올라갑니다. E1에서 배운 「빈도를 말하는 말의 자리」가 여기서도 그대로 갑니다.'),
(9172, '같은 일을 세 시점으로 말한다', '바뀌는 것은 동사 한 자리뿐이다', '학교에서는 시제를 표의 칸으로 배웠습니다. 실제로 한 가지 일(work late)을 어제·지금·내일로 옮겨 보면 바뀌는 것은 동사 한 자리뿐입니다 — I worked late. / I''m working late. / I''ll work late. 표를 외울 일이 아니라 한 문장을 옮겨 보는 것이 시제 연습입니다. 유닛 1~15에서 배운 것이 전부 이 한 줄 안에 들어옵니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9510, 9170, 1, 'I was going to call you.', NULL, '전화하려고 했어요. (그런데 못 했어요)'),
(9511, 9170, 2, 'We were going to leave at six.', NULL, '여섯 시에 나가려고 했어요. (그런데 못 나갔어요)'),
(9512, 9170, 3, 'Ben was going to join us, but something came up.', NULL, '벤도 오려고 했는데 일이 갑자기 생겼어요.'),
(9513, 9171, 1, 'Maybe I''ll go next time.', NULL, '다음번엔 갈지도 몰라요.'),
(9514, 9171, 2, 'I''ll probably work late today.', NULL, '오늘은 아마 늦게까지 일할 거예요.'),
(9515, 9171, 3, 'I''ll definitely be there.', NULL, '꼭 갈게요.'),
(9516, 9172, 1, 'I worked late yesterday.', NULL, '어제 늦게까지 일했어요.'),
(9517, 9172, 2, 'I''m working late today.', NULL, '오늘 늦게까지 일하고 있어요.'),
(9518, 9172, 3, 'I''ll work late tomorrow.', NULL, '내일 늦게까지 일할 거예요.');

INSERT INTO dialog (id, title) VALUES
(9115, '어제 못 온 이유와 다음엔 어떻게 할지');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9480, 9115, 1, 'Mina', 'I was going to come yesterday. I''m sorry.', NULL, '어제 가려고 했어요. 미안해요.'),
(9481, 9115, 2, 'Ben', 'It happens. What came up?', NULL, '그럴 수 있죠. 무슨 일이 생겼어요?'),
(9482, 9115, 3, 'Mina', 'Something came up at home. A small accident with the water pipe.', NULL, '집에 일이 생겼어요. 수도관에 작은 사고가 났어요.'),
(9483, 9115, 4, 'Ben', 'That''s a shame. Our plan fell through too, so we called off the picnic.', NULL, '아쉽네요. 저희 계획도 틀어져서 소풍을 취소했어요.'),
(9484, 9115, 5, 'Mina', 'Unfortunately I only knew at the last minute. I apologize.', NULL, '하필 저도 막판에야 알았어요. 사과드려요.'),
(9485, 9115, 6, 'Ben', 'On second thought, let''s move it to next week. Is Tuesday all right?', NULL, '다시 생각해 보니, 다음 주로 옮기죠. 화요일 괜찮아요?'),
(9486, 9115, 7, 'Mina', 'Tuesday works. I''ll definitely be there next time. I promise.', NULL, '화요일 좋아요. 다음번엔 꼭 갈게요. 약속해요.'),
(9487, 9115, 8, 'Ben', 'Then everything will work out. I''m going to book the room today.', NULL, '그럼 다 잘 풀릴 거예요. 제가 오늘 방을 예약할 거예요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9540, 'come up', '(일이) 갑자기 생기다', 'E1의 come up with는 생각을 떠올리는 것이고, with가 없는 이쪽은 일·용건이 예고 없이 생기는 것입니다. 주어는 대개 something이고 사람이 아닙니다.', '/kʌm ʌp/', '컴 업'),
(9541, 'fall through', '(다 된 일이) 틀어지다', '바닥이 꺼져 아래로 빠지는 그림입니다. 계획·거래가 마지막에 무너지는 것이고, 주어는 사람이 아니라 그 계획입니다.', '/fɔːl θruː/', '폴- 스루-'),
(9542, 'call off', '(잡혀 있던 것을) 취소하다', '예정된 행사·경기를 없애는 것입니다. 사이에 목적어를 넣어도 됩니다: call the picnic off.', '/kɔːl ɔːf/', '콜- 오-프'),
(9543, 'at the last minute', '막판에 · 아주 늦게야', '시간이 거의 다 된 뒤라는 말입니다. 급하게라는 뜻이 아니라 늦은 시점을 가리킵니다.', '/æt ðə læst ˈmɪnɪt/', '앳 더 래스트 미닛'),
(9544, 'on second thought', '다시 생각해 보니', '마음을 바꿨다는 신호입니다. 유닛 3의 come to think of it은 말하다가 떠올린 것이고, 이쪽은 앞서 말한 것을 뒤집는 자리입니다.', '/ɑːn ˈsekənd θɔːt/', '온- 세컨드 소-트'),
(9545, 'next time', '다음번에는', '이번에 못 한 것을 다음으로 넘길 때 문장 맨 앞이나 끝에 붙입니다. 뒤에 오는 말이 앞일이라 will과 잘 붙습니다.', '/nekst taɪm/', '넥스트 타임'),
(9546, 'work out', '(일이) 잘 풀리다', '운동한다는 뜻이 아닙니다. 꼬였던 일이 결국 괜찮게 끝난다는 쪽이고, E1의 work for·work on과는 다른 세 번째 work입니다.', '/wɜːrk aʊt/', '워-크 아웃');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9540, 9540, 1, 'Something came up at home.', '집에 일이 생겼어요.'),
(9541, 9541, 1, 'The plan fell through.', '계획이 틀어졌어요.'),
(9542, 9542, 1, 'We called off the picnic.', '소풍을 취소했어요.'),
(9543, 9543, 1, 'I only knew at the last minute.', '막판에야 알았어요.'),
(9544, 9544, 1, 'On second thought, let''s meet on Tuesday.', '다시 생각해 보니, 화요일에 만나죠.'),
(9545, 9545, 1, 'I''ll be there next time.', '다음번엔 갈게요.'),
(9546, 9546, 1, 'Everything will work out.', '다 잘 풀릴 거예요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9580, 'excuse', NULL, '(못 한) 핑계 · 사정', 'NOUN', '/ɪkˈskjuːs/', '익스큐-스'),
(9581, 'emergency', NULL, '급한 일 · 비상', 'NOUN', '/ɪˈmɜːrdʒənsi/', '이머-전시'),
(9582, 'accident', NULL, '(뜻하지 않은) 사고', 'NOUN', '/ˈæksɪdənt/', '액시던트'),
(9583, 'rain', NULL, '비', 'NOUN', '/reɪn/', '레인'),
(9584, 'delay', NULL, '(늦어진) 지연', 'NOUN', '/dɪˈleɪ/', '딜레이'),
(9585, 'refund', NULL, '환불', 'NOUN', '/ˈriːfʌnd/', '리-펀드'),
(9586, 'shame', NULL, '아쉬운 일', 'NOUN', '/ʃeɪm/', '셰임'),
(9587, 'apologize', NULL, '사과하다', 'VERB', '/əˈpɑːlədʒaɪz/', '어팔-러자이즈'),
(9588, 'promise', NULL, '약속하다', 'VERB', '/ˈprɑːmɪs/', '프라-미스'),
(9589, 'understand', NULL, '(사정을) 이해하다', 'VERB', '/ˌʌndərˈstænd/', '언더스탠드'),
(9590, 'regret', NULL, '(못 해서) 아쉬워하다', 'VERB', '/rɪˈɡret/', '리그렛'),
(9591, 'sick', NULL, '(몸이) 아픈', 'ADJECTIVE', '/sɪk/', '식'),
(9592, 'sorry', NULL, '미안한 · 안타까운', 'ADJECTIVE', '/ˈsɑːri/', '사-리'),
(9593, 'unfortunately', NULL, '하필 · 아쉽게도', 'ADVERB', '/ʌnˈfɔːrtʃənətli/', '언포-처너틀리'),
(9594, 'hopefully', NULL, '바라건대', 'ADVERB', '/ˈhoʊpfəli/', '호웁펄리'),
(9595, 'definitely', NULL, '틀림없이 · 꼭', 'ADVERB', '/ˈdefɪnətli/', '데퍼너틀리');

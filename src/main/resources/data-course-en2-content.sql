-- ═══════════════════════════════════════════════════════════════════
-- 영어 코스 2(E2 「일상 말하기」) 콘텐츠 시드 — 문법·예문·회화·표현·어휘
-- 담당: backend-dev(영어) / 계약: 설계/04_API계약.md §8 · 설계/06_콘텐츠_제작규칙.md §11
-- 커리큘럼: 진행사항/기획_2026-09_영어_E2커리큘럼.md  (§3 유닛 표 · §8 인계만 읽어도 유닛을 쓸 수 있게 적혀 있다)
--
-- ★ 왜 E1과 파일을 갈랐나 (senior-dev 판정 2026-09-22 — 기획 §8-4 5)
--   ① **코스마다 파일 쌍 하나**가 이 저장소의 원래 관행이다(N5·N4·N3·N2·입문·N1 전부 그렇다 — 설계/03 §7-1).
--      영어가 한 쌍을 같이 쓴 것은 열린 코스가 E1 하나뿐이던 시절의 사정이지 규칙이 아니었다.
--   ② **E1은 15/15로 완성돼 더 이상 자라지 않는다.** 끝난 파일을 E2 작업 때마다 여는 것은 사고의 기회만 는다.
--   ③ 합치면 한 파일이 2,500줄을 넘어 **사람도 도구도 한 번에 못 읽는다.** 그러면 "유닛을 쓰기 전에 시드를 훑는다"는
--      중복 장부 절차(기획 §4-3)가 **E1 15유닛까지 끌고 다니는 일**이 된다. 갈라 두면 E2 장부는 이 파일 하나다.
--
-- ⚠️ 이 파일에 **코스 행(course)을 쓰지 않는다.** 코스 102를 여는 UPDATE(status·planned_unit_count·notice·description)는
--    `data-course-en-content.sql`에 있다 — 코스 행을 고치는 문장은 한 곳에 모은다(그 파일 머리 주석 참고).
--
-- ── ID 대역 (기획 §8-2 배정표 · 설계/06 §11-10 · 설계/03 §7-2) ─────────────────
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
(9314, 'tonight', NULL, '오늘 밤에', 'ADVERB', '/təˈnaɪt/', '터나이트'),
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
(9220, 9102, 1, 'Mina', 'You missed a lot yesterday, Ben.', NULL, '벤, 어제 일이 많았어요.'),
(9221, 9102, 2, 'Ben', 'Really? What happened?', NULL, '정말요? 무슨 일 있었어요?'),
(9222, 9102, 3, 'Mina', 'Guess what? The new manager came in the morning and said hello to everyone.', NULL, '있잖아요, 새 팀장님이 아침에 오셔서 모두에게 인사했어요.'),
(9223, 9102, 4, 'Ben', 'Oh no. And I took the day off.', NULL, '이런. 하필 저는 휴가였네요.'),
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
(9111, 'didn''t', '과거 표시가 didn''t로 옮겨 간다', '학교에서는 부정문 만드는 법을 문장 종류마다 따로 외웠습니다. 실제로 I didn''t went이 안 되는 이유는 바로 앞 항목과 같습니다 — didn''t가 이미 과거를 가져갔으므로 뒤는 원형입니다: I didn''t go. 그리고 현재형에서 don''t와 doesn''t로 갈리던 것이 과거에는 didn''t 하나뿐입니다. 주어가 he·she·it이어도 갈리지 않습니다. 여기서도 고를 일이 줄어듭니다.'),
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
(9426, 'at the last minute', '막판에', '일이 벌어지기 바로 직전을 말합니다. 실제로 1분이 아니라 "너무 늦게"라는 느낌이 핵심이고, 대개 예정이 바뀐 상황에 씁니다.', '/æt ðə læst ˈmɪnɪt/', '앳 더 라스트 미니트');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9420, 9420, 1, 'My bad — I wrote the wrong date.', '제 잘못이에요, 날짜를 잘못 적었어요.'),
(9421, 9421, 1, 'Come to think of it, he called me on Monday.', '생각해 보니 그가 월요일에 전화했어요.'),
(9422, 9422, 1, 'The line went quiet for a second.', '통화가 잠깐 조용해졌어요.'),
(9423, 9423, 1, 'He got back to me an hour later.', '그가 한 시간 뒤에 다시 연락해 줬어요.'),
(9424, 9424, 1, 'I left a message at the front desk.', '안내데스크에 메시지를 남겼어요.'),
(9425, 9425, 1, 'Sorry, I had the wrong number.', '죄송해요, 번호를 잘못 알았어요.'),
(9426, 9426, 1, 'She canceled at the last minute.', '그녀가 막판에 취소했어요.');

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
(9115, '과거의 의문사 의문문 (What / Where / When did you ~?)', 'did 앞에 한 단어를 더 세운다', '학교에서는 의문사마다 예문을 따로 외웠습니다. 실제로는 E1에서 한 조립과 완전히 같습니다 — 이미 만든 Did you go? 앞에 Where 한 단어를 세우면 끝이고 뒤는 하나도 바뀌지 않습니다: Where did you go? 새로 배울 것이 없다는 것이 이 항목의 요지입니다. 뒤의 동사가 원형으로 돌아가는 것도 그대로라 Where did you went?는 없습니다. 유닛 3을 만들 줄 알면 이 유닛의 절반은 이미 끝나 있습니다.'),
(9116, 'Who가 주어면 did를 세우지 않는다 (Who called?)', '누가 했는지 물을 때', '학교에서는 "과거 의문문에는 did"만 배웠습니다. 그런데 의문사가 주어 자리에 있으면 did가 필요 없습니다 — Who called you?이지 Who did call you?가 아닙니다. 주어 자리를 그대로 물어보는 말이라 순서를 흔들 일이 없기 때문입니다. E1에서 현재형으로 세운 규칙(Who knows Mina?)이 과거에서 그대로 반복됩니다. What happened?도 같은 모양이라 did가 없습니다.'),
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
(9260, 9104, 1, 'Mina', 'You were in Osaka last week. How was it?', NULL, '지난주에 오사카에 계셨죠. 어땠어요?'),
(9261, 9104, 2, 'Ben', 'It was great. The office there was really quiet.', NULL, '좋았어요. 거기 사무실은 정말 조용했어요.'),
(9262, 9104, 3, 'Mina', 'Who went with you?', NULL, '누가 같이 갔어요?'),
(9263, 9104, 4, 'Ben', 'Jun did. We took the early flight on Monday.', NULL, '준이요. 월요일 이른 비행기를 탔어요.'),
(9264, 9104, 5, 'Mina', 'Where did you stay?', NULL, '어디서 묵었어요?'),
(9265, 9104, 6, 'Ben', 'A small hotel near the station. What was your week like?', NULL, '역 근처 작은 호텔에서요. 그쪽 한 주는 어땠어요?'),
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
(9121, 'There was / There were', '그때 무엇이 있었는지', '학교에서는 There is의 과거라고 한 줄만 보고 지나갔습니다. 실제로는 E1에서 세운 규칙이 그대로입니다 — 뒤에 오는 명사가 하나면 There was, 여럿이면 There were로 고릅니다: There was a bakery here. / There were two banks on this street. 예전 이야기를 꺼내면 가장 먼저 필요해지는 문형이고, "그 자리에 빵집이 있었다"를 The place had a bakery로 말하지 않는 이유도 그때와 같습니다.'),
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

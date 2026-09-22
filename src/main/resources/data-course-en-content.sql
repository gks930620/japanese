-- ═══════════════════════════════════════════════════════════════════
-- 영어 과정 뼈대 시드 — 코스 5개(101~105) + 코스 1(E1 다시 세우기)의 유닛 콘텐츠
-- 담당: backend-dev(영어) / 계약: 설계/04_API계약.md §8 · 설계/06_콘텐츠_제작규칙.md §11
-- 규칙: 설계/06_콘텐츠_제작규칙.md §11-2(코스 5단계 E1~E5) · §11-4(유닛 구성) · §11-10(ID 대역)
--      부분 공개는 5의 배수 경계로만 넓힌다 — E1은 2 → 5 → 10 → 15 (§11-12 ①). 지금은 10유닛.
--
-- ID 대역: 코스 101~105 / 콘텐츠는 전 테이블 9000~9999
--   일본어 코스 대역(N5 1~999 · N4 1000~ · N3 2000~ · N2 3000~ · 입문 4000~ · N1 5000~)과
--   충분히 떨어뜨렸다 — 영어 코스가 늘어도 일본어 대역을 침범하지 않는다.
--
-- ★ 이 파일이 지키는 절대 조건: 기존 일본어 데이터에 영향 0 (설계/03 §3)
--   - data-courses.sql(공용, senior-dev 관리)을 수정하지 않는다. 영어 코스는 여기서 INSERT한다.
--   - 콘텐츠 테이블은 공유하되 course.language='EN' 한 컬럼으로만 갈린다.
--
-- ★ 영어만의 규칙 세 가지
--   1) kana 전량 NULL — 발음은 ipa + ko_approx 두 컬럼이다(판정 J-8 · 08 F-18, 둘 다 표기).
--      kana를 채우면 KanaContract("한자가 있을 때만 kana")가 영어를 거부한다.
--   2) 한자 0행 — kanji/kanji_word/unit_kanji에 이 대역의 행이 없다. 한자 자리는 expression이다.
--   3) part_of_speech는 영어 7종만 쓴다(NOUN·VERB·ADJECTIVE·ADVERB·PREPOSITION·CONJUNCTION·PHRASE).
--
-- ⚠️ 공유 테이블의 컬럼명 jp(grammar_example.jp · dialog_line.jp)는 "원문" 자리다 — 영어 문장이 들어간다.
--    컬럼 rename은 일본어 응답 계약(필드명 jp)을 바꾸므로 하지 않았다(senior-dev 판단 대기 — 인계 참고).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 코스 5개 (설계/06 §11-2 — 코스명은 08 F-17 확정, CEFR은 학습자에게 노출하지 않는다)
-- level_label은 코드와 같은 값으로 채워 둔다 — 영어 화면은 라벨을 쓰지 않는다(코스명이 곧 단계 이름).
-- 열린 코스는 1뿐: AVAILABLE, 나머지 넷은 PREPARING (설계/03 §5-2 조건).
-- notice에는 집계 수를 적지 않는다(§11-12 ③ R1) — 유닛 수는 화면이 데이터에서 세어 보여준다.
-- 15유닛이 다 차면 notice를 NULL로 지운다(R4).
-- ─────────────────────────────────────────────────────────────
INSERT INTO course (id, course_no, level_code, language, level_label, title, target_audience, goal, notice, description, status) VALUES
(101, 1, 'E1', 'EN', 'E1', '다시 세우기', '단어는 아는데 문장이 안 만들어지는 학습자', '학교에서 배운 조각들을 문장 만드는 규칙으로 다시 세워, 하고 싶은 말을 한 문장으로 끝맺을 수 있어요', '앞 유닛부터 순서대로 채우는 중이에요 — 열려 있는 유닛까지는 지금 그대로 학습하면 됩니다', '「I am go to school」 같은 문장이 왜 안 되는지부터 다시 답합니다. be동사와 일반동사를 뒤섞지 않고, 묻고 답하는 한 문장을 스스로 만들 수 있게 되는 것이 이 코스의 도착점입니다.', 'AVAILABLE'),
(102, 2, 'E2', 'EN', 'E2', '일상 말하기', '짧게는 말하는데 시제가 헷갈리는 학습자', '시제·의문·부정을 한 문장 안에서 자유롭게 다룰 수 있어요', NULL, NULL, 'PREPARING'),
(103, 3, 'E3', 'EN', 'E3', '이어 말하기', '문장은 되는데 길게 못 잇는 학습자', '연결·관계절·비교로 두세 문장을 하나로 이어 말할 수 있어요', NULL, NULL, 'PREPARING'),
(104, 4, 'E4', 'EN', 'E4', '뉘앙스', '말은 통하는데 어색하다는 말을 듣는 학습자', '조동사·가정·수동·완곡으로 의도와 태도를 얹을 수 있어요', NULL, NULL, 'PREPARING'),
(105, 5, 'E5', 'EN', 'E5', '실전과 격식', '회의·이메일에서 막히는 학습자', '상황과 격식에 맞는 정확한 영어로 회의·이메일을 감당할 수 있어요', NULL, NULL, 'PREPARING');

-- 계획 유닛 수 (설계/03 §1 course.planned_unit_count · 설계/04 §2-3-A · 08 C-29) — E1만 값을 갖는다.
-- "다음 유닛이 없다"와 "이 코스를 끝냈다"를 가르는 유일한 근거다. 이 값이 없으면 열린 마지막 유닛에서
-- 화면이 "🎉 끝까지 봤어요"라는 거짓 안내를 낸다(2026-09-21 검수 결함 2). 나머지 코스는 NULL 유지 —
-- NULL = 계획값 없음 = 지금 있는 유닛이 전부이고, 일본어 전 코스도 여기 해당해 동작이 한 줄도 바뀌지 않는다.
-- 10 → 15유닛이 다 차면 사람이 플래그를 내리지 않아도 totalUnits >= 15가 되어 자동으로 완주가 된다.
--
-- ★ 위 INSERT의 컬럼에 넣지 않고 UPDATE 한 줄로 둔 이유: 운영 DB에는 course 101 행이 이미 있어
--   INSERT는 다시 실행되지 않는다(운영은 sql.init.mode: never — 설계/07). 이 한 줄만 따로 실행하면
--   신규 DB(H2)와 운영 DB가 같은 상태가 된다. 운영 반영도 이 줄 그대로다.
UPDATE course SET planned_unit_count = 15 WHERE id = 101;

-- ─────────────────────────────────────────────────────────────
-- 문법 4개 (9001~9004) — 유닛당 2개 (설계/06 §11-4 "문법 2~3개")
-- 톤: 다시 배우기식 — "학교에서 이렇게 배웠죠? 실제로는 이렇게 씁니다"(설계/06 §11-2)
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9001, 'be동사 현재형 (am / is / are)', '~이다 · ~에 있다', '주어가 I면 am, he·she·it이면 is, you·we·they면 are입니다. be동사는 상태를 말할 때 쓰고 뒤에는 명사나 형용사가 옵니다. 학교에서 표로 외웠는데도 말할 때 틀리는 이유는 be동사 뒤에 동사를 또 붙이기 때문입니다. I am go 같은 문장은 없습니다 — 동사는 한 문장에 하나입니다.'),
(9002, '일반동사 현재형과 3인칭 -s', '평소에 하는 일을 말한다', '학교에서는 인칭·수 변화표를 칸마다 외웠습니다. 실제로 기억할 것은 표가 아니라 한 줄입니다 — 평소에 늘 하는 일은 동사를 그대로 쓰고, 주어가 he·she·it일 때만 끝에 -s를 붙입니다: I work, they live, he works. 시험지에서는 표를 다 채웠는데 말할 때 -s가 빠지는 이유는 한국어에 주어를 따라 동사가 바뀌는 자리가 없어서입니다. 문장을 시작하기 전에 주어가 한 사람·한 개인지만 확인하면 끝납니다.'),
(9003, 'do / does 의문문', '평소에 ~해요? 라고 묻기', '학교에서는 "의문문은 주어와 동사의 자리를 바꾼다"로 배웠습니다. 실제로 일반동사 문장은 자리를 바꾸지 않습니다. 앞에 Do를 하나 세우고 나머지는 그대로 둡니다: You work here. → Do you work here? 주어가 he·she·it이면 Does이고, 이때 뒤의 동사는 -s를 떼고 원래 모양으로 돌아갑니다: Does she work here? -s를 Does가 이미 가져갔기 때문입니다. 한 문장에 -s는 한 번뿐입니다.'),
(9004, '부정문 don''t / doesn''t', '평소에 ~하지 않아요', '학교에서는 부정문 만드는 법을 문장 종류마다 따로 외웠습니다. 실제로 갈리는 지점은 하나뿐입니다 — 동사가 be동사인가 아닌가. 일반동사는 앞에 don''t를 넣습니다: I don''t drink coffee. 주어가 he·she·it이면 doesn''t이고 뒤의 동사는 원래 모양으로 돌아갑니다: He doesn''t drink coffee. -s는 doesn''t가 이미 가져갔습니다. be동사는 do를 데려오지 않고 뒤에 not만 붙입니다: I am not busy.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9001, 9001, 1, 'I am new here.', NULL, '저는 여기 처음이에요.'),
(9002, 9001, 2, 'She is on the fifth floor.', NULL, '그녀는 5층에 있어요.'),
(9003, 9001, 3, 'We are on the same team.', NULL, '우리는 같은 팀이에요.'),
(9004, 9002, 1, 'I work near the station.', NULL, '저는 역 근처에서 일해요.'),
(9005, 9002, 2, 'He works with us.', NULL, '그는 우리와 함께 일해요.'),
(9006, 9002, 3, 'They live in Seoul.', NULL, '그들은 서울에 살아요.'),
(9007, 9003, 1, 'Do you work on weekends?', NULL, '주말에도 일하세요?'),
(9008, 9003, 2, 'Does he live near here?', NULL, '그는 이 근처에 살아요?'),
(9009, 9003, 3, 'Do they know each other?', NULL, '그들은 서로 아는 사이예요?'),
(9010, 9004, 1, 'I don''t drink coffee.', NULL, '저는 커피를 안 마셔요.'),
(9011, 9004, 2, 'She doesn''t work on Fridays.', NULL, '그녀는 금요일에는 일하지 않아요.'),
(9012, 9004, 3, 'I am not busy today.', NULL, '저는 오늘 안 바빠요.');

-- ─────────────────────────────────────────────────────────────
-- 회화 2편 (9001~9002) — 유닛당 정확히 1편, 화자 2명 (설계/06 §11-4)
-- 그 유닛의 문법이 실제로 쓰인 장면이어야 한다 — 유닛 1은 be동사·일반동사, 유닛 2는 do/does 의문·부정.
-- ─────────────────────────────────────────────────────────────
INSERT INTO dialog (id, title) VALUES
(9001, '첫 출근 날, 옆자리에서'),
(9002, '주말에 뭐 하세요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9001, 9001, 1, 'Mina', 'Hi, I''m Mina. I''m new here.', NULL, '안녕하세요, 저는 미나예요. 여기 처음이에요.'),
(9002, 9001, 2, 'Ben', 'Nice to meet you. I''m Ben. I work on this floor too.', NULL, '반가워요. 저는 벤이에요. 저도 이 층에서 일해요.'),
(9003, 9001, 3, 'Mina', 'Is the meeting room near here?', NULL, '회의실이 이 근처인가요?'),
(9004, 9001, 4, 'Ben', 'Yes. It''s between the kitchen and my desk. I usually get there early.', NULL, '네. 탕비실과 제 자리 사이에 있어요. 저는 보통 일찍 가 있어요.'),
(9005, 9002, 1, 'Ben', 'Do you have plans this weekend?', NULL, '이번 주말에 계획 있어요?'),
(9006, 9002, 2, 'Mina', 'Not really. I usually spend the weekend at home.', NULL, '딱히요. 저는 주말을 보통 집에서 보내요.'),
(9007, 9002, 3, 'Ben', 'Does your team hang out together?', NULL, '팀에서 같이 어울리기도 해요?'),
(9008, 9002, 4, 'Mina', 'Sometimes. But I don''t go out when I''m tired. I watch a movie instead.', NULL, '가끔요. 그런데 피곤할 땐 안 나가요. 대신 영화를 봐요.');

-- ─────────────────────────────────────────────────────────────
-- 표현 12개 (9001~9012) — 유닛당 6개 (설계/06 §11-4 "6~10개")
-- 표현 = 단어보다 크고 문장보다 작은, 통째로 외워 쓰는 덩어리(구동사·연어·관용을 한 종류로 다룬다 — 설계/06 §11-5).
-- text에 UNIQUE가 없다(설계/03 §3) — 열린 집합이라 코스 간 중복이 허용된다.
-- 코스 내부 중복만 금지이며 12개 표기가 전부 다르다.
-- ─────────────────────────────────────────────────────────────
INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9001, 'get up', '(잠자리에서) 일어나다', 'wake up은 잠이 깨는 것, get up은 몸을 일으키는 것입니다. 눈만 뜬 상태라면 아직 get up이 아닙니다.', '/ɡet ʌp/', '겟 업'),
(9002, 'be good at', '~을 잘하다', 'at 뒤에는 명사나 -ing가 옵니다: good at math, good at cooking. good to는 누구에게 잘해 준다는 뜻이라 완전히 다릅니다.', '/bi ɡʊd æt/', '비 굿 앳'),
(9003, 'on my way', '가는 길이다', '전화로 지금 가고 있다고 한 마디로 끝내는 표현입니다. I''m on my way. 뒤에 to를 붙여 목적지를 말합니다.', '/ɑːn maɪ weɪ/', '온 마이 웨이'),
(9004, 'a couple of', '두어 개의 · 몇 개의', '엄밀히는 2개지만 실제로는 두세 개쯤으로 헐겁게 씁니다. of를 빼먹지 않는 것이 요령입니다.', '/ə ˈkʌpl əv/', '어 커플 어브'),
(9005, 'take a break', '잠깐 쉬다', 'rest는 몸을 쉬는 것, take a break는 하던 일을 잠시 멈추는 것입니다. 회사에서 훨씬 자주 씁니다.', '/teɪk ə breɪk/', '테이크 어 브레이크'),
(9006, 'right away', '바로 · 즉시', 'now보다 지금 당장 처리하겠다는 느낌이 강합니다. 부탁을 받고 답할 때 씁니다.', '/raɪt əˈweɪ/', '라이트 어웨이'),
(9007, 'hang out', '(친구와) 어울려 놀다', '특별한 목적 없이 같이 시간을 보내는 것입니다. play는 아이들이 노는 것이라 어른에게 쓰면 어색합니다.', '/hæŋ aʊt/', '행 아웃'),
(9008, 'be into', '~에 푹 빠져 있다', 'like보다 강합니다. I''m into hiking은 요즘 등산에 빠져 있다는 뜻입니다. 취미를 말할 때 가장 자연스러운 한 마디입니다.', '/bi ˈɪntuː/', '비 인투'),
(9009, 'how come', '어째서 · 왜', 'why와 뜻은 같지만 뒤 어순이 평서문 그대로입니다: How come you are here? (Why are you here?와 대비)', '/haʊ kʌm/', '하우 컴'),
(9010, 'kind of', '좀 · 약간', '단정하기 싫을 때 붙이는 완충어입니다. I''m kind of tired. 말할 때는 카인더에 가깝게 뭉개집니다.', '/kaɪnd əv/', '카인드 어브'),
(9011, 'come up with', '(생각·아이디어를) 떠올리다', '세 단어가 통째로 하나입니다. 중간의 up이나 with를 빼면 뜻이 사라집니다.', '/kʌm ʌp wɪð/', '컴 업 위드'),
(9012, 'no big deal', '별거 아니다', '고맙다는 말이나 사과를 가볍게 받아넘길 때 씁니다. It''s no big deal.', '/noʊ bɪɡ diːl/', '노 빅 딜');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9001, 9001, 1, 'I get up at six on weekdays.', '저는 평일에 6시에 일어나요.'),
(9002, 9002, 1, 'She''s good at explaining things.', '그녀는 설명을 잘해요.'),
(9003, 9003, 1, 'Sorry, I''m on my way to the office.', '미안해요, 지금 사무실 가는 길이에요.'),
(9004, 9004, 1, 'I have a couple of questions.', '질문이 두어 개 있어요.'),
(9005, 9005, 1, 'Let''s take a break for ten minutes.', '10분만 쉬었다 하죠.'),
(9006, 9006, 1, 'I send it right away.', '저는 그걸 바로 보내요.'),
(9007, 9007, 1, 'We hang out after work sometimes.', '우리는 가끔 퇴근하고 어울려요.'),
(9008, 9008, 1, 'He''s really into old movies.', '그는 옛날 영화에 푹 빠져 있어요.'),
(9009, 9009, 1, 'How come you never tell me?', '어째서 저한테는 말을 안 해요?'),
(9010, 9010, 1, 'It''s kind of hard to explain.', '설명하기가 좀 어렵네요.'),
(9011, 9011, 1, 'She comes up with good ideas.', '그녀는 좋은 아이디어를 잘 떠올려요.'),
(9012, 9012, 1, 'Thanks. - No big deal.', '고마워요. - 별거 아니에요.');

-- ─────────────────────────────────────────────────────────────
-- 어휘 30개 (9001~9030) — 유닛당 15개 (설계/06 §11-4 "15~20개")
-- kana는 전량 NULL(계약 J-8), 발음은 ipa + ko_approx 둘 다.
-- part_of_speech는 영어 7종만: NOUN·VERB·ADJECTIVE·ADVERB·PREPOSITION·CONJUNCTION·PHRASE.
-- 코스 내 중복 금지 — 30개 표기가 전부 다르다.
-- ─────────────────────────────────────────────────────────────
INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
-- 유닛 1
(9001, 'morning', NULL, '아침', 'NOUN', '/ˈmɔːrnɪŋ/', '모-닝'),
(9002, 'meeting', NULL, '회의', 'NOUN', '/ˈmiːtɪŋ/', '미-팅'),
(9003, 'team', NULL, '팀', 'NOUN', '/tiːm/', '팀-'),
(9004, 'desk', NULL, '책상 · 자리', 'NOUN', '/desk/', '데스크'),
(9005, 'floor', NULL, '층 · 바닥', 'NOUN', '/flɔːr/', '플로-어'),
(9006, 'work', NULL, '일하다', 'VERB', '/wɜːrk/', '워-크'),
(9007, 'live', NULL, '살다', 'VERB', '/lɪv/', '리브'),
(9008, 'start', NULL, '시작하다', 'VERB', '/stɑːrt/', '스타-트'),
(9009, 'usually', NULL, '보통 · 대개', 'ADVERB', '/ˈjuːʒuəli/', '유-주얼리'),
(9010, 'early', NULL, '일찍', 'ADVERB', '/ˈɜːrli/', '어-리'),
(9011, 'busy', NULL, '바쁜', 'ADJECTIVE', '/ˈbɪzi/', '비지'),
(9012, 'nervous', NULL, '긴장한', 'ADJECTIVE', '/ˈnɜːrvəs/', '너-버스'),
(9013, 'near', NULL, '~ 근처에', 'PREPOSITION', '/nɪr/', '니어'),
(9014, 'between', NULL, '~ 사이에', 'PREPOSITION', '/bɪˈtwiːn/', '비트윈-'),
(9015, 'because', NULL, '왜냐하면', 'CONJUNCTION', '/bɪˈkɔːz/', '비코-즈'),
-- 유닛 2
(9016, 'weekend', NULL, '주말', 'NOUN', '/ˈwiːkend/', '위-켄드'),
(9017, 'movie', NULL, '영화', 'NOUN', '/ˈmuːvi/', '무-비'),
(9018, 'hobby', NULL, '취미', 'NOUN', '/ˈhɑːbi/', '하-비'),
(9019, 'plan', NULL, '계획', 'NOUN', '/plæn/', '플랜'),
(9020, 'enjoy', NULL, '즐기다', 'VERB', '/ɪnˈdʒɔɪ/', '인조이'),
(9021, 'spend', NULL, '(시간을) 보내다', 'VERB', '/spend/', '스펜드'),
(9022, 'practice', NULL, '연습하다', 'VERB', '/ˈpræktɪs/', '프랙티스'),
(9023, 'often', NULL, '자주', 'ADVERB', '/ˈɔːfn/', '오-펀'),
(9024, 'never', NULL, '결코 ~않다', 'ADVERB', '/ˈnevər/', '네버'),
(9025, 'together', NULL, '함께', 'ADVERB', '/təˈɡeðər/', '투게더'),
(9026, 'instead', NULL, '대신에', 'ADVERB', '/ɪnˈsted/', '인스테드'),
(9027, 'tired', NULL, '피곤한', 'ADJECTIVE', '/ˈtaɪərd/', '타이어드'),
(9028, 'free', NULL, '한가한 · 무료의', 'ADJECTIVE', '/friː/', '프리-'),
(9029, 'during', NULL, '~ 동안', 'PREPOSITION', '/ˈdʊrɪŋ/', '두-링'),
(9030, 'but', NULL, '그러나', 'CONJUNCTION', '/bʌt/', '벗');

-- ═══════════════════════════════════════════════════════════════════
-- 유닛 3·4·5 콘텐츠 (2026-09-21 증설 — 기획 `진행사항/기획_2026-09_영어_E1커리큘럼.md` §3-3)
--
-- ID 대역: 기획 §8-2 배정표 그대로 — **유닛마다 블록을 통째로 잡는다.**
--   grammar_point 유닛당 5칸(유닛 n = 9011+(n-3)*5) · grammar_example 15칸(9031+(n-3)*15)
--   dialog 1칸(9000+n) · dialog_line 12칸(9021+(n-3)*12)
--   expression 10칸(9021+(n-3)*10) · expression_example = 표현 id와 같은 수 · vocabulary 20칸(9031+(n-3)*20)
--   유닛 안에서 항목이 늘어도 뒤 유닛과 부딪히지 않게 한 것이라 **빈 번호가 남는 것은 문제가 아니다.**
--
-- 유닛당 실제 사용: 문법 3 · 문법 예문 9(문법당 3) · 회화 1편(6줄) · 표현 7 · 표현 예문 7 · 어휘 16 · 한자 0.
-- kana 전량 NULL · 발음은 ipa(슬래시) + ko_approx 둘 다 · 품사는 영어 7종 (설계/06 §11-3 · §11-6).
-- 표현·어휘 표기는 코스 1 안에서 유닛 1·2와도 서로와도 겹치지 않는다 (기획 §4 장부 대조 완료).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 유닛 3 「예·아니오는 되받아서 답한다」 — be 의문 · 짧은 대답 · be 부정
-- 문법 9011~9013 / 예문 9031~9039 / 회화 9003(대사 9021~9026) / 표현 9021~9027 / 어휘 9031~9046
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9011, 'be동사 의문문 (Am / Is / Are ~?)', '~인가요? 라고 묻기', '학교에서는 "주어와 be동사의 자리를 바꾼다"를 규칙으로 외웠습니다. 실제로 앞으로 나가는 것은 be동사 하나뿐입니다. You are new here.에서 are만 앞으로 보내면 Are you new here?가 되고 뒤는 그대로입니다. 여기서 Do you are ~? 처럼 do를 같이 세우는 실수가 나옵니다. be동사 문장에는 do가 필요 없습니다 — 유닛 1의 "한 문장에 동사는 하나"가 의문문에서도 그대로입니다.'),
(9012, '짧은 대답 (Yes, I am. / No, I don''t.)', '물어본 동사로 되받기', '학교에서는 Yes, I am.을 통째로 외웠습니다. 실제로는 질문에 쓰인 동사를 그대로 되받는 것입니다. be로 물으면 be로, do로 물으면 do로 답합니다. Are you busy? - Yes, I am. / Do you work here? - Yes, I do. 그래서 Do you work here?에 Yes, I am.이라고 하면 어긋납니다. 주어도 대답하는 사람 기준으로 바꿔 줍니다 — Is your manager in? - No, he isn''t.'),
(9013, 'be동사 부정 (am not / isn''t / aren''t)', '~가 아니에요', '학교에서는 don''t와 not을 같은 칸에서 배웠습니다. 실제로 be동사는 뒤에 not만 붙입니다. I am not busy. She is not here. do를 데려오지 않습니다 — I don''t be busy라는 문장이 없는 이유가 이것입니다. 줄임말은 is not → isn''t, are not → aren''t이고, am not만 줄이지 않습니다. 대신 앞을 줄여 I''m not이라고 씁니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9031, 9011, 1, 'Are you the new designer?', NULL, '새로 오신 디자이너분이세요?'),
(9032, 9011, 2, 'Is she on your team?', NULL, '그분은 같은 팀이세요?'),
(9033, 9011, 3, 'Am I in the right place?', NULL, '제가 제대로 찾아온 건가요?'),
(9034, 9012, 1, 'Are you Mina? - Yes, I am.', NULL, '미나 씨인가요? - 네, 맞아요.'),
(9035, 9012, 2, 'Do you work here? - Yes, I do.', NULL, '여기서 일하세요? - 네, 그래요.'),
(9036, 9012, 3, 'Is he your manager? - No, he isn''t.', NULL, '그분이 팀장님이세요? - 아니요, 아니에요.'),
(9037, 9013, 1, 'I''m not on that team.', NULL, '저는 그 팀이 아니에요.'),
(9038, 9013, 2, 'She isn''t in the office today.', NULL, '그분은 오늘 사무실에 없어요.'),
(9039, 9013, 3, 'We aren''t colleagues. We''re friends.', NULL, '우리는 동료가 아니에요. 친구예요.');

INSERT INTO dialog (id, title) VALUES
(9003, '혹시 새로 오신 분인가요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9021, 9003, 1, 'Jun', 'Excuse me, are you the new designer?', NULL, '실례지만, 새로 오신 디자이너분이세요?'),
(9022, 9003, 2, 'Mina', 'No, I''m not. I''m on the sales team.', NULL, '아니요, 아니에요. 저는 영업팀이에요.'),
(9023, 9003, 3, 'Jun', 'Sorry about that. By the way, are you Mina?', NULL, '죄송해요. 그런데 혹시 미나 씨인가요?'),
(9024, 9003, 4, 'Mina', 'Yes, I am. And you''re Jun, right?', NULL, '네, 맞아요. 그쪽은 준 씨죠?'),
(9025, 9003, 5, 'Jun', 'That''s right. My desk isn''t far from yours.', NULL, '맞아요. 제 자리가 미나 씨 자리에서 멀지 않아요.'),
(9026, 9003, 6, 'Mina', 'Nice to meet you. I''m still new here, so I ask a lot of questions.', NULL, '반가워요. 저는 아직 여기가 익숙지 않아서 질문을 많이 해요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9021, 'be from', '~ 출신이다 · ~에서 오다', 'be동사 뒤에 from을 붙여 출신지를 말합니다. come from도 같은 뜻이지만 소개 자리에서는 I am from ~ 이 훨씬 흔합니다.', '/bi frʌm/', '비 프럼'),
(9022, 'work for', '~에서 일하다 · ~에 다니다', '뒤에 회사 이름이 옵니다. work at은 장소(건물)를, work for는 소속을 말합니다. work with는 함께 일하는 사람입니다.', '/wɜːrk fɔːr/', '워-크 포-'),
(9023, 'in charge of', '~을 맡고 있는', 'be동사와 함께 씁니다: I am in charge of the schedule. 직함이 없어도 무엇을 맡았는지 한 마디로 말할 수 있습니다.', '/ɪn tʃɑːrdʒ əv/', '인 차-지 어브'),
(9024, 'not really', '딱히 그렇지는 않아요', 'No보다 부드러운 부정입니다. 상대의 말을 정면으로 자르지 않고 반쯤만 아니라고 할 때 씁니다. 짧은 대답 대신 그대로 쓸 수 있습니다.', '/nɑːt ˈriːəli/', '낫 리-얼리'),
(9025, 'for sure', '확실히 · 틀림없이', '확신을 더하는 한 마디입니다. 문장 끝에 붙이거나 대답 하나로 씁니다. sure 하나만 쓰면 "그럼요"라는 승낙이 되어 뜻이 갈립니다.', '/fɔːr ʃʊr/', '포- 슈어'),
(9026, 'by the way', '그런데 · 말 나온 김에', '화제를 바꿀 때 앞에 붙입니다. 갑자기 다른 말을 꺼내는 무례함을 덜어 주는 장치라서 짧은 대화에서 특히 자주 나옵니다.', '/baɪ ðə weɪ/', '바이 더 웨이'),
(9027, 'look like', '~처럼 보이다 · ~를 닮다', '뒤에 명사가 옵니다: look like a student. 뒤에 형용사가 오면 like를 빼고 look tired라고 합니다 — 이 자리를 자주 틀립니다.', '/lʊk laɪk/', '룩 라이크');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9021, 9021, 1, 'I''m from Busan, but I live in Seoul now.', '저는 부산 출신인데 지금은 서울에 살아요.'),
(9022, 9022, 1, 'She works for a design agency.', '그분은 디자인 회사에 다녀요.'),
(9023, 9023, 1, 'Who is in charge of this floor?', '이 층은 누가 맡고 있나요?'),
(9024, 9024, 1, 'Are you busy right now? - Not really.', '지금 바쁘세요? - 딱히 그렇진 않아요.'),
(9025, 9025, 1, 'The new manager starts on Monday, for sure.', '새 팀장님은 월요일에 오시는 게 확실해요.'),
(9026, 9026, 1, 'By the way, are you on the sales team?', '그런데, 영업팀이세요?'),
(9027, 9027, 1, 'You look like my colleague.', '제 동료랑 닮으셨네요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9031, 'name', NULL, '이름', 'NOUN', '/neɪm/', '네임'),
(9032, 'office', NULL, '사무실', 'NOUN', '/ˈɔːfɪs/', '오-피스'),
(9033, 'manager', NULL, '팀장 · 관리자', 'NOUN', '/ˈmænɪdʒər/', '매니저'),
(9034, 'colleague', NULL, '동료', 'NOUN', '/ˈkɑːliːɡ/', '칼-리-그'),
(9035, 'guest', NULL, '손님 · 방문객', 'NOUN', '/ɡest/', '게스트'),
(9036, 'introduce', NULL, '소개하다', 'VERB', '/ˌɪntrəˈduːs/', '인트러두-스'),
(9037, 'meet', NULL, '만나다', 'VERB', '/miːt/', '미-트'),
(9038, 'ask', NULL, '묻다 · 부탁하다', 'VERB', '/æsk/', '애스크'),
(9039, 'friendly', NULL, '친절한 · 다정한', 'ADJECTIVE', '/ˈfrendli/', '프렌들리'),
(9040, 'sure', NULL, '확신하는', 'ADJECTIVE', '/ʃʊr/', '슈어'),
(9041, 'same', NULL, '같은 · 동일한', 'ADJECTIVE', '/seɪm/', '세임'),
(9042, 'right', NULL, '맞는 · 옳은', 'ADJECTIVE', '/raɪt/', '라이트'),
(9043, 'actually', NULL, '사실은', 'ADVERB', '/ˈæktʃuəli/', '액추얼리'),
(9044, 'also', NULL, '또한 · ~도', 'ADVERB', '/ˈɔːlsoʊ/', '올-소-'),
(9045, 'still', NULL, '아직 · 여전히', 'ADVERB', '/stɪl/', '스틸'),
(9046, 'with', NULL, '~와 함께', 'PREPOSITION', '/wɪð/', '위드');

-- ─────────────────────────────────────────────────────────────
-- 유닛 4 「무엇을·어디서·언제를 앞에 세운다」 — 의문사 · how+형용사 · who 주어
-- 문법 9016~9018 / 예문 9046~9054 / 회화 9004(대사 9033~9038) / 표현 9031~9037 / 어휘 9051~9066
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9016, '의문사 의문문 (what / where / when / who)', '무엇을·어디서·언제 묻기', '학교에서는 의문사를 목록으로 외우고 예문을 따로 배웠습니다. 실제로는 새 규칙이 아니라 유닛 2·3에서 만든 의문문 앞에 단어 하나를 더 세우는 것뿐입니다. Do you eat lunch? 앞에 Where만 붙이면 Where do you eat lunch?가 되고 뒤는 하나도 바뀌지 않습니다. be동사 문장도 같습니다: Is it? → What is it? 의문사를 세웠다고 어순을 또 바꾸지 않습니다.'),
(9017, 'how + 한 마디 더 (how much / how long / how often)', '얼마나 ~인지 묻기', '학교에서는 how를 "어떻게"로 배웠습니다. 실제로 how는 혼자 쓰는 것보다 뒤에 말을 하나 더 붙여 쓰는 경우가 훨씬 많습니다. 값은 how much, 시간은 how long, 횟수는 how often, 거리는 how far입니다. 무엇을 묻는지는 how 뒤에 붙은 말이 정하고, 그 뒤 어순은 보통 의문문과 똑같습니다.'),
(9018, 'who가 주어일 때는 어순이 바뀌지 않는다', '누가 ~해요?', '학교에서는 "의문문은 do를 세운다"만 배웠습니다. 실제로 의문사가 주어 자리에 있으면 do를 세우지 않습니다. Who knows him?이지 Who does know him?이 아닙니다. 주어가 이미 제자리에 있으니 순서를 바꿀 이유가 없습니다. 그리고 who는 한 사람으로 보아 동사에 -s를 붙입니다: Who wants coffee? what이 주어 자리에 와도 같습니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9046, 9016, 1, 'What do you usually have for lunch?', NULL, '점심으로 보통 뭘 드세요?'),
(9047, 9016, 2, 'Where do you eat on weekdays?', NULL, '평일에는 어디서 드세요?'),
(9048, 9016, 3, 'When does the restaurant open?', NULL, '그 식당은 언제 열어요?'),
(9049, 9017, 1, 'How much is this?', NULL, '이거 얼마예요?'),
(9050, 9017, 2, 'How long does it take?', NULL, '얼마나 걸려요?'),
(9051, 9017, 3, 'How far is the station from here?', NULL, '여기서 역까지 얼마나 멀어요?'),
(9052, 9018, 1, 'Who wants coffee?', NULL, '커피 드실 분?'),
(9053, 9018, 2, 'Who works on the fifth floor?', NULL, '5층에서 일하는 사람이 누구예요?'),
(9054, 9018, 3, 'What comes with the set menu?', NULL, '세트 메뉴에는 뭐가 같이 나와요?');

INSERT INTO dialog (id, title) VALUES
(9004, '점심은 어디서 드세요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9033, 9004, 1, 'Ben', 'Where do you usually eat lunch?', NULL, '점심은 보통 어디서 드세요?'),
(9034, 9004, 2, 'Mina', 'At the noodle place across the street. How about you?', NULL, '길 건너 국수집에서요. 벤 씨는요?'),
(9035, 9004, 3, 'Ben', 'I bring lunch from home. How much is a bowl of noodles?', NULL, '저는 집에서 싸 와요. 국수 한 그릇에 얼마예요?'),
(9036, 9004, 4, 'Mina', 'About nine dollars. It''s cheap for this area.', NULL, '9달러쯤이요. 이 동네치고는 싼 편이에요.'),
(9037, 9004, 5, 'Ben', 'How long does it take on foot?', NULL, '걸어서 얼마나 걸려요?'),
(9038, 9004, 6, 'Mina', 'Ten minutes. Who else brings lunch from home?', NULL, '10분이요. 집에서 싸 오는 사람이 또 누가 있어요?');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9031, 'how about', '~는 어때요?', '뒤에 명사나 -ing가 옵니다: How about pizza? 상대에게 되묻는 가장 짧은 방법이고, what about보다 제안 쪽에 기웁니다.', '/haʊ əˈbaʊt/', '하우 어바웃'),
(9032, 'take a look', '한번 보다 · 살펴보다', 'look보다 가볍습니다 — 잠깐 훑어본다는 뜻입니다. 대상을 말할 때는 at을 붙입니다: take a look at the menu.', '/teɪk ə lʊk/', '테이크 어 룩'),
(9033, 'be about to', '막 ~하려던 참이다', '뒤에는 동사원형이 옵니다. 곧 일어날 일을 말하지만 문장은 현재형 그대로입니다: I am about to leave.', '/bi əˈbaʊt tuː/', '비 어바웃 투-'),
(9034, 'on foot', '걸어서', '교통수단은 by bus, by subway인데 걷는 것만 on foot입니다. by foot이라고 하지 않습니다. 거리를 가늠해 말할 때 붙입니다.', '/ɑːn fʊt/', '온 풋'),
(9035, 'stop by', '잠깐 들르다', '오래 머무르지 않고 들르는 것입니다. 목적지를 바로 뒤에 붙입니다: stop by the cafe. 사람을 만나러 들를 때도 씁니다.', '/stɑːp baɪ/', '스탑 바이'),
(9036, 'eat out', '외식하다', '밖에서 사 먹는 것입니다. 포장이나 배달은 eat out이 아닙니다. 어디서 먹는지를 말하지 않아도 뜻이 통합니다.', '/iːt aʊt/', '이-트 아웃'),
(9037, 'in line', '줄을 서서', 'be동사나 wait와 함께 씁니다: wait in line. 영국에서는 in a queue라고 하고, 미국에서는 in line이 기본입니다.', '/ɪn laɪn/', '인 라인');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9031, 9031, 1, 'How about the noodle place across the street?', '길 건너 국수집은 어때요?'),
(9032, 9032, 1, 'Take a look at the menu first.', '먼저 메뉴를 한번 보세요.'),
(9033, 9033, 1, 'I''m about to leave for lunch.', '저 지금 점심 먹으러 나가려던 참이에요.'),
(9034, 9034, 1, 'The station is ten minutes away on foot.', '역은 걸어서 10분 거리예요.'),
(9035, 9035, 1, 'I stop by a cafe every morning.', '저는 아침마다 카페에 들러요.'),
(9036, 9036, 1, 'We eat out on Fridays.', '우리는 금요일에는 외식해요.'),
(9037, 9037, 1, 'Ten people are in line already.', '벌써 열 명이 줄을 서 있어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9051, 'lunch', NULL, '점심', 'NOUN', '/lʌntʃ/', '런치'),
(9052, 'restaurant', NULL, '식당', 'NOUN', '/ˈrestrɑːnt/', '레스트란-트'),
(9053, 'menu', NULL, '메뉴', 'NOUN', '/ˈmenjuː/', '메뉴-'),
(9054, 'price', NULL, '가격', 'NOUN', '/praɪs/', '프라이스'),
(9055, 'minute', NULL, '분', 'NOUN', '/ˈmɪnɪt/', '미닛'),
(9056, 'coffee', NULL, '커피', 'NOUN', '/ˈkɔːfi/', '커-피'),
(9057, 'order', NULL, '주문하다', 'VERB', '/ˈɔːrdər/', '오-더'),
(9058, 'walk', NULL, '걷다', 'VERB', '/wɔːk/', '워-크'),
(9059, 'wait', NULL, '기다리다', 'VERB', '/weɪt/', '웨이트'),
(9060, 'take', NULL, '(시간이) 걸리다 · 가져가다', 'VERB', '/teɪk/', '테이크'),
(9061, 'far', NULL, '먼', 'ADJECTIVE', '/fɑːr/', '파-'),
(9062, 'cheap', NULL, '싼', 'ADJECTIVE', '/tʃiːp/', '치-프'),
(9063, 'expensive', NULL, '비싼', 'ADJECTIVE', '/ɪkˈspensɪv/', '익스펜시브'),
(9064, 'close', NULL, '가까운', 'ADJECTIVE', '/kloʊs/', '클로-스'),
(9065, 'already', NULL, '벌써 · 이미', 'ADVERB', '/ɔːlˈredi/', '올-레디'),
(9066, 'across', NULL, '~ 건너편에', 'PREPOSITION', '/əˈkrɔːs/', '어크로-스');

-- ─────────────────────────────────────────────────────────────
-- 유닛 5 「순서가 곧 조사다」 ★복습(1~5) — SVO · 장소 먼저 시간 나중 · 주어를 빼지 않는다
-- 문법 9021~9023 / 예문 9061~9069 / 회화 9005(대사 9045~9050) / 표현 9041~9047 / 어휘 9071~9086
-- 정리 스텝에 1~5 복습 블록이 붙는다(unitNo % 5 == 0) — 유닛 1~4가 모두 있는 상태로만 배포한다.
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9021, '기본 어순 (주어 + 동사 + 목적어)', '자리가 뜻을 정한다', '학교에서는 1~5형식 표로 배웠습니다. 실제로 필요한 것은 형식 번호가 아니라 자리입니다. 한국어는 "을·를" 같은 조사가 역할을 알려 주지만 영어는 자리가 알려 줍니다. The manager knows Mina.와 Mina knows the manager.는 쓰인 단어가 같고 자리만 다른데 뜻이 뒤집힙니다. 목적어를 앞으로 빼거나 동사를 뒤로 미루면 다른 말이 됩니다. 형식을 외울 게 아니라 주어 → 동사 → 목적어 순서만 지키면 됩니다. 유닛 2·3에서 의문문을 만들 때 바꾼 것도 결국 자리였습니다.'),
(9022, '장소 먼저, 시간 나중', '뒤에 붙이는 말의 순서', '학교에서는 거의 다루지 않은 규칙입니다. 실제로 문장 뒤에 말을 더 붙일 때는 장소를 먼저, 시간을 나중에 놓습니다: I work at home in the morning. 뒤집어서 I work in the morning at home이라고 하면 틀린 문장은 아니어도 어색하게 들립니다. 시간을 강조하고 싶으면 뒤에서 순서를 바꾸는 게 아니라 문장 맨 앞으로 통째로 보냅니다.'),
(9023, '주어를 빼지 않는다 — 날씨·시간의 it', '주어 없는 문장은 없다', '학교에서는 "비인칭 주어 it"이라는 용어로 배웠습니다. 실제로 기억할 것은 용어가 아니라 영어에 주어 없는 문장이 없다는 사실입니다. 한국어는 "비 와", "늦었어"로 끝나지만 영어는 Rains나 Is late라고 하지 않습니다. 뜻이 없어도 자리를 채우는 it을 세웁니다: It rains a lot here. 날씨·시간·거리를 말할 때 이 it이 나옵니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9061, 9021, 1, 'Ben helps Mina.', NULL, '벤이 미나를 도와요.'),
(9062, 9021, 2, 'Mina helps Ben.', NULL, '미나가 벤을 도와요.'),
(9063, 9021, 3, 'We take the subway every day.', NULL, '우리는 매일 지하철을 타요.'),
(9064, 9022, 1, 'I meet him at the station at seven.', NULL, '저는 7시에 역에서 그를 만나요.'),
(9065, 9022, 2, 'She waits outside after work.', NULL, '그녀는 퇴근 후에 밖에서 기다려요.'),
(9066, 9022, 3, 'We arrive at the office around nine.', NULL, '우리는 9시쯤 사무실에 도착해요.'),
(9067, 9023, 1, 'It rains a lot in summer.', NULL, '여름에는 비가 많이 와요.'),
(9068, 9023, 2, 'It''s almost six.', NULL, '거의 6시예요.'),
(9069, 9023, 3, 'It takes twenty minutes by bus.', NULL, '버스로 20분 걸려요.');

INSERT INTO dialog (id, title) VALUES
(9005, '퇴근길 통화 — 어디서 볼까요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9045, 9005, 1, 'Jun', 'Hi, Mina. Where are you now?', NULL, '미나 씨, 지금 어디예요?'),
(9046, 9005, 2, 'Mina', 'I''m at the subway station. It''s cold outside.', NULL, '지하철역이에요. 밖이 춥네요.'),
(9047, 9005, 3, 'Jun', 'I know. I get off at the next stop. We meet at six, right?', NULL, '그러게요. 저는 다음 정거장에서 내려요. 우리 6시에 만나는 거 맞죠?'),
(9048, 9005, 4, 'Mina', 'Yes. Where do we meet?', NULL, '네. 어디서 만나요?'),
(9049, 9005, 5, 'Jun', 'The cafe near exit four. I meet my team there every Friday.', NULL, '4번 출구 옆 카페요. 저는 금요일마다 거기서 팀 사람들을 만나요.'),
(9050, 9005, 6, 'Mina', 'I know that cafe. It''s five minutes from here.', NULL, '아, 그 카페 알아요. 여기서 5분이에요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9041, 'pick up', '데리러 가다 · 집어 들다', '사람을 차로 데리러 가는 것과 물건을 집어 드는 것 둘 다입니다. 대명사가 오면 반드시 사이에 넣습니다 — pick you up이지 pick up you가 아닙니다.', '/pɪk ʌp/', '픽 업'),
(9042, 'get on', '(버스·지하철에) 타다', '버스·지하철·비행기처럼 서서 들어가는 탈것에 씁니다. 승용차는 get in a car라고 합니다.', '/ɡet ɑːn/', '겟 온'),
(9043, 'get off', '(버스·지하철에서) 내리다', 'get on의 짝입니다. 어디서 내리는지는 at을 붙여 말합니다: get off at the next stop. 승용차는 get out of a car입니다.', '/ɡet ɔːf/', '겟 오-프'),
(9044, 'on time', '시간에 맞춰 · 정시에', 'in time(늦지 않게, 아슬아슬하게)과 다릅니다. on time은 정해진 시각 그대로라는 뜻입니다.', '/ɑːn taɪm/', '온 타임'),
(9045, 'head home', '집으로 향하다', 'head는 명사로만 알기 쉽지만 동사로 "~쪽으로 가다"입니다. home 앞에 to를 붙이지 않습니다 — head to home은 틀립니다.', '/hed hoʊm/', '헤드 홈'),
(9046, 'run into', '우연히 마주치다', '달려 들어간다는 뜻이 아닙니다. 약속하고 만나는 meet과 달리 뜻밖에 마주치는 것입니다.', '/rʌn ˈɪntuː/', '런 인투'),
(9047, 'give a ride', '태워 주다', '사람을 사이에 넣습니다 — give me a ride. 영국에서는 give a lift라고 합니다.', '/ɡɪv ə raɪd/', '기브 어 라이드');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9041, 9041, 1, 'He picks me up at the station every Friday.', '그가 금요일마다 역으로 저를 데리러 와요.'),
(9042, 9042, 1, 'We get on the subway at city hall.', '우리는 시청에서 지하철을 타요.'),
(9043, 9043, 1, 'She gets off at the same stop.', '그분은 저와 같은 정거장에서 내려요.'),
(9044, 9044, 1, 'The bus leaves on time.', '그 버스는 정시에 출발해요.'),
(9045, 9045, 1, 'I head home right after work.', '저는 퇴근하고 바로 집으로 가요.'),
(9046, 9046, 1, 'I often run into him on the street.', '저는 길에서 그를 자주 마주쳐요.'),
(9047, 9047, 1, 'She gives me a ride every morning.', '그분이 아침마다 저를 태워 줘요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9071, 'station', NULL, '역', 'NOUN', '/ˈsteɪʃn/', '스테이션'),
(9072, 'bus', NULL, '버스', 'NOUN', '/bʌs/', '버스'),
(9073, 'subway', NULL, '지하철', 'NOUN', '/ˈsʌbweɪ/', '서브웨이'),
(9074, 'street', NULL, '길 · 거리', 'NOUN', '/striːt/', '스트리-트'),
(9075, 'corner', NULL, '모퉁이 · 구석', 'NOUN', '/ˈkɔːrnər/', '코-너'),
(9076, 'exit', NULL, '출구', 'NOUN', '/ˈeksɪt/', '엑싯'),
(9077, 'arrive', NULL, '도착하다', 'VERB', '/əˈraɪv/', '어라이브'),
(9078, 'leave', NULL, '떠나다 · 출발하다', 'VERB', '/liːv/', '리-브'),
(9079, 'drive', NULL, '운전하다', 'VERB', '/draɪv/', '드라이브'),
(9080, 'cross', NULL, '건너다', 'VERB', '/krɔːs/', '크로-스'),
(9081, 'late', NULL, '늦은', 'ADJECTIVE', '/leɪt/', '레이트'),
(9082, 'crowded', NULL, '붐비는', 'ADJECTIVE', '/ˈkraʊdɪd/', '크라우디드'),
(9083, 'outside', NULL, '밖에 · 밖으로', 'ADVERB', '/ˌaʊtˈsaɪd/', '아웃사이드'),
(9084, 'away', NULL, '떨어져 · 떨어진 곳에', 'ADVERB', '/əˈweɪ/', '어웨이'),
(9085, 'along', NULL, '~을 따라', 'PREPOSITION', '/əˈlɔːŋ/', '어롱-'),
(9086, 'stop', NULL, '정거장 · 정류장', 'NOUN', '/stɑːp/', '스탑');

-- ═══════════════════════════════════════════════════════════════════
-- 유닛 6~10 콘텐츠 (2026-09-21 증설 — 기획 `진행사항/기획_2026-09_영어_E1커리큘럼.md` §3-3)
--
-- 덩어리 ② 「문장을 채운다」 — 명사·관사·대명사·있다·전치사. 유닛 1~5에서 세운 문장에 부품이 제자리로 들어간다.
--   학교에서 **표로 외웠던 것**이 몰려 있는 구간이라, 표를 다시 그리지 않고 **기준 하나**로 바꿔 적었다:
--   6 소리 · 7 듣는 사람이 아느냐 · 8 앉는 자리 · 9 There로 여느냐 have로 여느냐 · 10 크기 순서.
--
-- ID 대역: 기획 §8-2 배정표 그대로(유닛 3~5와 같은 계산식, 유닛마다 블록을 통째로 잡는다).
--   grammar_point 9011+(n-3)*5 · grammar_example 9031+(n-3)*15 · dialog 9000+n · dialog_line 9021+(n-3)*12
--   expression 9021+(n-3)*10 · expression_example = 표현 id와 같은 수 · vocabulary 9031+(n-3)*20
--
-- 유닛당 실제 사용: 문법 3 · 문법 예문 9(문법당 3) · 회화 1편(6줄) · 표현 7 · 표현 예문 7 · 어휘 16 · 한자 0.
-- 표현·어휘 표기는 코스 1 안에서 유닛 1~5(표현 33 · 어휘 78)와도 서로와도 겹치지 않는다 — 시드 전량 대조.
--
-- ⚠️ E1은 현재 시제만 다룬다 — 회화·예문에 과거·미래·진행·완료를 넣지 않았다(E2 몫).
--    관계절·비교는 E3, 조동사 뉘앙스·가정·수동은 E4 몫이라 같은 이유로 배제했다.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 유닛 6 「셀 수 있는지부터 본다」 — 가산/불가산 · 복수 -s · a/an은 소리로
-- 문법 9026~9028 / 예문 9076~9084 / 회화 9006(대사 9057~9062) / 표현 9051~9057 / 어휘 9091~9106
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9026, '셀 수 있는 명사와 셀 수 없는 명사', 'a를 붙일 수 있나부터 본다', '학교에서는 물질명사·추상명사라는 용어로 나눴습니다. 실제로 던질 질문은 두 개뿐입니다 — a를 붙일 수 있나, -s를 붙일 수 있나. water·bread·money·advice는 둘 다 안 되니 셀 수 없는 명사입니다. 그래서 a water나 two advices라는 말이 없습니다. 셀 수 없는 것을 세고 싶으면 담는 그릇을 앞에 세웁니다: a bottle of water, two bags of rice. 세는 것은 그릇이지 물이 아닙니다.'),
(9027, '복수형 -s', '둘 이상이면 반드시 표시한다', '학교에서는 -s / -es / -ies 변화표를 외웠습니다. 실제로 먼저 몸에 붙여야 할 것은 표가 아니라 "둘 이상이면 무조건 표시한다"입니다. 한국어는 "사과 세 개"처럼 수를 말해도 명사가 그대로여서 -s가 빠집니다. three apple이 아니라 three apples입니다. 모양이 아예 다른 것(man - men, child - children)은 몇 개 안 되니 그때그때 외우면 됩니다. 변화표는 나중 문제이고 -s를 빼먹지 않는 것이 먼저입니다.'),
(9028, 'a와 an은 철자가 아니라 소리로 고른다', 'an hour, a university', '학교에서는 "모음 앞에는 an"으로 외웠습니다. 실제 기준은 철자가 아니라 첫소리입니다. hour는 h로 쓰지만 첫소리가 "아"라서 an hour이고, university는 u로 쓰지만 첫소리가 "유"라서 a university입니다. 눈으로 철자를 보지 말고 입으로 소리를 내 보세요 — 모음 소리로 시작하면 an, 자음 소리로 시작하면 a입니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9076, 9026, 1, 'I need some water.', NULL, '물이 좀 필요해요.'),
(9077, 9026, 2, 'We buy two bottles of water every week.', NULL, '우리는 매주 물 두 병을 사요.'),
(9078, 9026, 3, 'She gives me a lot of advice.', NULL, '그분은 저에게 조언을 많이 해 줘요.'),
(9079, 9027, 1, 'Three apples are enough for the salad.', NULL, '샐러드에는 사과 세 개면 충분해요.'),
(9080, 9027, 2, 'I carry two heavy bags.', NULL, '저는 무거운 가방 두 개를 들어요.'),
(9081, 9027, 3, 'Two men work at that shop.', NULL, '저 가게에서는 두 사람이 일해요.'),
(9082, 9028, 1, 'I wait an hour for the bus.', NULL, '저는 버스를 한 시간 기다려요.'),
(9083, 9028, 2, 'He works at a university near here.', NULL, '그는 이 근처 대학교에서 일해요.'),
(9084, 9028, 3, 'We need an egg and a bag of flour.', NULL, '달걀 한 개랑 밀가루 한 봉지가 필요해요.');

INSERT INTO dialog (id, title) VALUES
(9006, '장 보러 가는 길');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9057, 9006, 1, 'Ben', 'We need a few things for dinner. What is on the list?', NULL, '저녁거리로 몇 가지 사야 해요. 목록에 뭐가 있어요?'),
(9058, 9006, 2, 'Mina', 'Rice, some bread, and two bottles of water.', NULL, '쌀이랑 빵 조금, 그리고 물 두 병이요.'),
(9059, 9006, 3, 'Ben', 'How much rice do we need?', NULL, '쌀은 얼마나 필요해요?'),
(9060, 9006, 4, 'Mina', 'One bag is enough. We still have a little at home.', NULL, '한 봉지면 충분해요. 집에 조금 남아 있거든요.'),
(9061, 9006, 5, 'Ben', 'I carry the water, then. Two bottles are heavy.', NULL, '그럼 물은 제가 들게요. 두 병은 무거우니까요.'),
(9062, 9006, 6, 'Mina', 'Thanks. We run out of milk every week, so I buy some, too.', NULL, '고마워요. 우유는 매주 떨어지니까 그것도 살게요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9051, 'a lot of', '많은', '셀 수 있는 것과 없는 것 양쪽에 다 씁니다 — a lot of people, a lot of water. many와 much는 둘을 가려 써야 하지만 a lot of는 그 고민이 없어서 말할 때 훨씬 편합니다.', '/ə lɑːt əv/', '어 랏 어브'),
(9052, 'a little', '조금 (셀 수 없는 것에)', '뒤에 셀 수 없는 명사가 옵니다: a little water, a little time. a를 빼고 little만 쓰면 "거의 없다"는 부정 쪽으로 뜻이 뒤집힙니다.', '/ə ˈlɪtl/', '어 리틀'),
(9053, 'a few', '몇 개의 (셀 수 있는 것에)', 'a little의 짝이고 뒤에 복수 명사가 옵니다: a few questions. 여기서도 a를 빼고 few만 쓰면 "거의 없다"가 됩니다. 유닛 1의 a couple of보다 조금 넉넉한 느낌입니다.', '/ə fjuː/', '어 퓨-'),
(9054, 'run out of', '다 떨어지다 · 다 써 버리다', '유닛 5의 run into(우연히 마주치다)와 모양만 비슷하고 뜻이 전혀 다릅니다. 남은 것이 0이 되는 쪽입니다: run out of paper.', '/rʌn aʊt əv/', '런 아웃 어브'),
(9055, 'some more', '조금 더', 'more 앞에 some을 붙여 "조금 더"로 눅입니다. 권할 때 자주 씁니다: some more coffee? 셀 수 있는 것에도 그대로 씁니다.', '/sʌm mɔːr/', '섬 모-'),
(9056, 'plenty of', '충분히 많은', 'a lot of가 양만 말한다면 plenty of는 "모자라지 않다"는 안심까지 담습니다. 뒤에 셀 수 있는 것도 없는 것도 옵니다.', '/ˈplenti əv/', '플렌티 어브'),
(9057, 'a piece of', '~ 한 조각 · 한 장', '셀 수 없는 명사를 세는 그릇입니다 — a piece of cake, a piece of paper. advice처럼 눈에 보이지 않는 것도 a piece of advice로 셉니다.', '/ə piːs əv/', '어 피-스 어브');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9051, 9051, 1, 'We have a lot of work today.', '오늘은 일이 많아요.'),
(9052, 9052, 1, 'I take a little sugar in my coffee.', '저는 커피에 설탕을 조금 넣어요.'),
(9053, 9053, 1, 'A few people are in the shop.', '가게에 사람이 몇 명 있어요.'),
(9054, 9054, 1, 'We run out of coffee every Friday.', '금요일마다 커피가 다 떨어져요.'),
(9055, 9055, 1, 'Do you want some more rice?', '밥 조금 더 드릴까요?'),
(9056, 9056, 1, 'There is plenty of bread at home.', '집에 빵은 충분히 많아요.'),
(9057, 9057, 1, 'I eat a piece of cake after lunch.', '저는 점심 먹고 케이크 한 조각을 먹어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9091, 'water', NULL, '물', 'NOUN', '/ˈwɔːtər/', '워-터'),
(9092, 'bread', NULL, '빵', 'NOUN', '/bred/', '브레드'),
(9093, 'rice', NULL, '쌀 · 밥', 'NOUN', '/raɪs/', '라이스'),
(9094, 'milk', NULL, '우유', 'NOUN', '/mɪlk/', '밀크'),
(9095, 'bottle', NULL, '병', 'NOUN', '/ˈbɑːtl/', '바-틀'),
(9096, 'bag', NULL, '가방 · 봉지', 'NOUN', '/bæɡ/', '백'),
(9097, 'money', NULL, '돈', 'NOUN', '/ˈmʌni/', '머니'),
(9098, 'shop', NULL, '가게', 'NOUN', '/ʃɑːp/', '샵'),
(9099, 'buy', NULL, '사다', 'VERB', '/baɪ/', '바이'),
(9100, 'sell', NULL, '팔다', 'VERB', '/sel/', '셀'),
(9101, 'cook', NULL, '요리하다', 'VERB', '/kʊk/', '쿡'),
(9102, 'need', NULL, '필요하다', 'VERB', '/niːd/', '니-드'),
(9103, 'fresh', NULL, '신선한', 'ADJECTIVE', '/freʃ/', '프레시'),
(9104, 'heavy', NULL, '무거운', 'ADJECTIVE', '/ˈhevi/', '헤비'),
(9105, 'once', NULL, '한 번', 'ADVERB', '/wʌns/', '원스'),
(9106, 'without', NULL, '~ 없이', 'PREPOSITION', '/wɪˈðaʊt/', '위드아웃');

-- ─────────────────────────────────────────────────────────────
-- 유닛 7 「처음엔 a, 다시 말하면 the」 — a와 the의 갈림 · 관사 없는 자리 · 굳은 the
-- 문법 9031~9033 / 예문 9091~9099 / 회화 9007(대사 9069~9074) / 표현 9061~9067 / 어휘 9111~9126
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9031, 'a와 the의 갈림', '듣는 사람이 아는가로 정한다', '학교에서는 "a는 하나, the는 그"로 외웠습니다. 실제 기준은 개수가 아니라 듣는 사람이 무엇인지 아느냐입니다. 처음 꺼낸 것은 a, 이미 나왔거나 서로 아는 것은 the입니다. A package is on your desk. - Is the package for me? 같은 자리에서 a가 the로 바뀝니다. 세상에 하나뿐이거나 그 자리에서 하나뿐이라 서로 알 수밖에 없는 것(the sun, the elevator on this floor)은 처음부터 the입니다.'),
(9032, '관사를 아예 쓰지 않는 자리', 'have lunch, by bus, go home', '학교에서는 거의 다루지 않은 자리입니다. 실제로 식사(have lunch), 교통수단(by bus), 장소를 기능으로 말할 때(at work, go to bed)에는 관사를 붙이지 않습니다. a lunch나 the bus를 넣으면 "어떤 점심 한 끼" "그 버스 한 대"처럼 물건 하나를 가리키는 말이 되어 뜻이 달라집니다. home 앞에는 to도 관사도 붙지 않습니다 — 유닛 5의 head home이 같은 자리입니다.'),
(9033, 'the가 통째로 굳은 자리', 'in the morning, on the phone', '학교에서는 이 the도 규칙으로 설명하려 했습니다. 실제로는 규칙이 아니라 덩어리로 굳은 것입니다. in the morning, on the phone, at the moment, all the time — 왜 the가 붙는지 따지는 대신 통째로 외웁니다. 같은 morning인데 this morning, on Monday morning처럼 앞에 다른 말이 오면 the가 사라지는 것도 규칙이 바뀐 게 아니라 덩어리가 다른 것입니다. 따질 대상이 아니라 외울 대상입니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9091, 9031, 1, 'A package is on your desk.', NULL, '책상에 택배가 하나 있어요.'),
(9092, 9031, 2, 'The package is for the design team.', NULL, '그 택배는 디자인팀 거예요.'),
(9093, 9031, 3, 'The elevator on this floor is slow.', NULL, '이 층 엘리베이터는 느려요.'),
(9094, 9032, 1, 'I have lunch at noon.', NULL, '저는 정오에 점심을 먹어요.'),
(9095, 9032, 2, 'She goes to work by bus.', NULL, '그분은 버스로 출근해요.'),
(9096, 9032, 3, 'We go home after the meeting.', NULL, '우리는 회의가 끝나면 집에 가요.'),
(9097, 9033, 1, 'I check my email in the morning.', NULL, '저는 아침에 이메일을 확인해요.'),
(9098, 9033, 2, 'He is on the phone at the moment.', NULL, '그는 지금 통화 중이에요.'),
(9099, 9033, 3, 'She talks about her team all the time.', NULL, '그분은 늘 자기 팀 이야기를 해요.');

INSERT INTO dialog (id, title) VALUES
(9007, '그 택배 어디 뒀어요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9069, 9007, 1, 'Jun', 'Mina, a package is on your desk.', NULL, '미나 씨, 책상에 택배가 하나 있어요.'),
(9070, 9007, 2, 'Mina', 'The package from the design team? I am on the phone at the moment.', NULL, '디자인팀에서 온 그 택배요? 저 지금 통화 중이에요.'),
(9071, 9007, 3, 'Jun', 'It is not urgent. The box is on the table by the window.', NULL, '급한 건 아니에요. 상자는 창가 탁자에 뒀어요.'),
(9072, 9007, 4, 'Mina', 'Thanks. I open it after lunch.', NULL, '고마워요. 점심 먹고 열어 볼게요.'),
(9073, 9007, 5, 'Jun', 'A letter is in the box, too. The letter looks important.', NULL, '상자 안에 편지도 하나 있어요. 그 편지는 중요해 보이더라고요.'),
(9074, 9007, 6, 'Mina', 'Then I read the letter first. I go home by bus at six.', NULL, '그럼 편지부터 읽을게요. 저는 6시에 버스로 집에 가요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9061, 'in the morning', '아침에 · 오전에', 'the가 든 채로 굳었습니다. 그런데 앞에 this·every·Monday가 오면 the가 사라집니다 — this morning, on Monday morning. 규칙이 아니라 덩어리가 다른 것입니다.', '/ɪn ðə ˈmɔːrnɪŋ/', '인 더 모-닝'),
(9062, 'at the moment', '지금 · 현재', '"바로 지금"이라는 뜻입니다. 유닛 1의 right away는 "당장 처리하겠다"는 쪽이라 자리가 다릅니다. 통화나 회의로 손을 못 뗄 때 이 한 마디로 상황을 알립니다.', '/æt ðə ˈmoʊmənt/', '앳 더 모우먼트'),
(9063, 'on the phone', '통화 중인', '전화기 위에 있다는 뜻이 아닙니다. be동사와 함께 써서 지금 통화 중이라는 상태를 말합니다: I am on the phone.', '/ɑːn ðə foʊn/', '온 더 포운'),
(9064, 'all the time', '늘 · 언제나', '문장 끝에 통째로 붙입니다. always와 뜻은 가깝지만 자리가 다릅니다 — always는 동사 앞(유닛 10), all the time은 문장 끝입니다.', '/ɔːl ðə taɪm/', '올- 더 타임'),
(9065, 'in the middle of', '~ 한가운데 · ~ 하는 중에', '장소에도 시간에도 씁니다: in the middle of the room, in the middle of a meeting. 뒤에는 명사가 옵니다.', '/ɪn ðə ˈmɪdl əv/', '인 더 미들 어브'),
(9066, 'at the end of', '~의 끝에 · ~ 말에', 'at the end of the month(월말에)처럼 시점을 찍습니다. in the end(결국)와 생김새만 비슷하고 뜻이 다릅니다.', '/æt ði end əv/', '앳 디 엔드 어브'),
(9067, 'for the first time', '처음으로', '무언가를 처음 해 볼 때 문장 끝에 붙입니다. at first(처음에는 ~였다)와 다릅니다 — at first는 나중에 달라졌다는 뜻을 품습니다.', '/fɔːr ðə fɜːrst taɪm/', '포- 더 퍼-스트 타임');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9061, 9061, 1, 'I check my schedule in the morning.', '저는 아침에 일정을 확인해요.'),
(9062, 9062, 1, 'She is in a meeting at the moment.', '그분은 지금 회의 중이에요.'),
(9063, 9063, 1, 'He is on the phone with a client.', '그는 고객과 통화 중이에요.'),
(9064, 9064, 1, 'The printer makes noise all the time.', '그 프린터는 늘 소리가 나요.'),
(9065, 9065, 1, 'A big box is in the middle of the room.', '큰 상자가 방 한가운데 있어요.'),
(9066, 9066, 1, 'We send the report at the end of the month.', '우리는 월말에 보고서를 보내요.'),
(9067, 9067, 1, 'I use this machine for the first time today.', '저는 오늘 이 기계를 처음 써 봐요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9111, 'package', NULL, '택배 · 소포', 'NOUN', '/ˈpækɪdʒ/', '패키지'),
(9112, 'box', NULL, '상자', 'NOUN', '/bɑːks/', '박스'),
(9113, 'letter', NULL, '편지', 'NOUN', '/ˈletər/', '레터'),
(9114, 'key', NULL, '열쇠', 'NOUN', '/kiː/', '키-'),
(9115, 'phone', NULL, '전화 · 전화기', 'NOUN', '/foʊn/', '포운'),
(9116, 'table', NULL, '탁자', 'NOUN', '/ˈteɪbl/', '테이블'),
(9117, 'chair', NULL, '의자', 'NOUN', '/tʃer/', '체어'),
(9118, 'paper', NULL, '종이 · 서류', 'NOUN', '/ˈpeɪpər/', '페이퍼'),
(9119, 'send', NULL, '보내다', 'VERB', '/send/', '센드'),
(9120, 'receive', NULL, '받다', 'VERB', '/rɪˈsiːv/', '리시-브'),
(9121, 'find', NULL, '찾다 · 발견하다', 'VERB', '/faɪnd/', '파인드'),
(9122, 'use', NULL, '쓰다 · 사용하다', 'VERB', '/juːz/', '유-즈'),
(9123, 'empty', NULL, '비어 있는', 'ADJECTIVE', '/ˈempti/', '엠프티'),
(9124, 'light', NULL, '가벼운', 'ADJECTIVE', '/laɪt/', '라이트'),
(9125, 'only', NULL, '오직 · ~만', 'ADVERB', '/ˈoʊnli/', '오운리'),
(9126, 'under', NULL, '~ 아래에', 'PREPOSITION', '/ˈʌndər/', '언더');

-- ─────────────────────────────────────────────────────────────
-- 유닛 8 「자리가 정해 주는 말 — I·my·me」 — 인칭대명사 네 모양 · it/they로 받기 · this/that
-- 문법 9036~9038 / 예문 9106~9114 / 회화 9008(대사 9081~9086) / 표현 9071~9077 / 어휘 9131~9146
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9036, '인칭대명사의 네 모양 (I / my / me / mine)', '어디에 앉느냐가 모양을 정한다', '학교에서는 I-my-me-mine을 표로 가로로 외웠습니다. 실제로 필요한 것은 표가 아니라 앉는 자리입니다. 주어 자리면 I, 명사 앞이면 my, 동사나 전치사 뒤면 me, 뒤에 명사가 없으면 mine입니다. 유닛 5에서 자리가 뜻을 정한다고 한 것이 대명사에도 그대로입니다. 그래서 Me and Ben work here가 아니라 Ben and I work here이고, 사이에 다른 사람이 끼어도 자리는 그대로입니다: She gives the key to Ben and me.'),
(9037, 'it과 they로 다시 받기', '한 번 말한 것은 대명사로 받는다', '학교에서는 "대명사는 명사를 대신한다"로 배웠습니다. 실제 문제는 한국어가 주어·목적어를 통째로 생략한다는 점입니다. "열쇠 필요해. 있어?"를 영어로 옮기면 I need the key. Do you have it?처럼 it을 반드시 채워야 합니다. 앞에 나온 것이 하나면 it, 둘 이상이면 they와 them으로 받습니다. 빈자리로 두면 문장이 끝나지 않습니다 — 유닛 5의 "주어 없는 문장은 없다"와 같은 이유입니다.'),
(9038, 'this / that / these / those', '가까운 것과 먼 것', '학교에서는 거리로만 배웠습니다(가까우면 this, 멀면 that). 실제로는 거리와 무관하게 굳어 쓰는 자리가 더 잦습니다 — 전화로 자기를 밝힐 때 This is Mina, 사람을 소개할 때 This is my colleague. 그리고 뒤에 오는 명사의 수에 따라 these·those로 바뀝니다: this box - these boxes(유닛 6). 뒤에 명사가 없어도 혼자 쓸 수 있습니다: This is yours.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9106, 9036, 1, 'Ben and I work on the same floor.', NULL, '벤과 저는 같은 층에서 일해요.'),
(9107, 9036, 2, 'That is my charger, not his.', NULL, '그건 제 충전기예요, 그의 것이 아니라요.'),
(9108, 9036, 3, 'She lends me her umbrella.', NULL, '그분이 저에게 자기 우산을 빌려줘요.'),
(9109, 9037, 1, 'I need the key. Do you have it?', NULL, '열쇠가 필요해요. 가지고 계세요?'),
(9110, 9037, 2, 'These are my files. I keep them in this box.', NULL, '이건 제 파일들이에요. 저는 그것들을 이 상자에 둬요.'),
(9111, 9037, 3, 'The charger works, but it is not mine.', NULL, '그 충전기는 잘 되는데, 제 건 아니에요.'),
(9112, 9038, 1, 'This is my colleague, Ben.', NULL, '이쪽은 제 동료 벤이에요.'),
(9113, 9038, 2, 'These boxes are mine. Those are yours.', NULL, '이 상자들은 제 거예요. 저것들은 그쪽 거고요.'),
(9114, 9038, 3, 'Is that your umbrella by the door?', NULL, '문 옆에 있는 저 우산, 그쪽 거예요?');

INSERT INTO dialog (id, title) VALUES
(9008, '이거 제 거예요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9081, 9008, 1, 'Ben', 'Mina, is this charger yours?', NULL, '미나 씨, 이 충전기 미나 씨 거예요?'),
(9082, 9008, 2, 'Mina', 'No, mine is white. That one looks like Jun''s.', NULL, '아니요, 제 건 흰색이에요. 그건 준 씨 것 같은데요.'),
(9083, 9008, 3, 'Ben', 'Then I leave it on his desk. He sits by the window, right?', NULL, '그럼 준 씨 자리에 둘게요. 준 씨가 창가에 앉죠?'),
(9084, 9008, 4, 'Mina', 'He does. And this umbrella — is it yours?', NULL, '맞아요. 그런데 이 우산은요, 벤 씨 거예요?'),
(9085, 9008, 5, 'Ben', 'It is mine, thanks. I always keep it under my desk.', NULL, '제 거 맞아요, 고마워요. 저는 늘 책상 밑에 둬요.'),
(9086, 9008, 6, 'Mina', 'Our things get mixed up every week. We share this corner, and they all look the same.', NULL, '우리 물건은 매주 섞여요. 이 구역을 같이 쓰는데 다 비슷하게 생겼잖아요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9071, 'help yourself', '마음껏 드세요 · 편하게 쓰세요', '상대가 직접 가져다 쓰라는 뜻입니다. 사람이 둘 이상이면 help yourselves로 바뀝니다 — 대명사가 자리에 따라 모양을 바꾸는 것이 여기서도 보입니다.', '/help jɔːrˈself/', '헬프 유어셀프'),
(9072, 'by myself', '혼자서 · 혼자 힘으로', '주어에 맞춰 by yourself, by himself로 바뀝니다. alone은 "곁에 아무도 없다"는 상태이고 by myself는 "도움 없이"라는 쪽입니다.', '/baɪ maɪˈself/', '바이 마이셀프'),
(9073, 'on your own', '스스로 · 혼자서', 'by myself와 뜻이 거의 같지만 "스스로 알아서"라는 자율 쪽 느낌이 조금 더 있습니다. 소유격이 들어가므로 주어에 맞춰 on my own으로 바꿉니다.', '/ɑːn jɔːr oʊn/', '온 유어 오운'),
(9074, 'all yours', '다 쓰세요 · 그쪽 거예요', 'be동사 뒤에 붙여 자리·물건을 넘길 때 씁니다: The room is all yours. 소유대명사 yours가 뒤에 명사 없이 혼자 서는 자리입니다.', '/ɔːl jɔːrz/', '올- 유어즈'),
(9075, 'take care of', '~을 맡아 처리하다 · 돌보다', '일에도 사람에도 씁니다. care about(마음을 쓰다)과 다릅니다 — of가 붙으면 직접 손을 대어 처리한다는 뜻입니다.', '/teɪk ker əv/', '테이크 케어 어브'),
(9076, 'each other', '서로', '둘 사이에 씁니다. 주어 자리에는 오지 않고 동사나 전치사 뒤에만 앉습니다: We help each other. 셋 이상이면 one another도 쓰지만 말할 때는 each other가 압도적입니다.', '/iːtʃ ˈʌðər/', '이-치 아더'),
(9077, 'belong to', '~의 것이다', '소유를 말하는 동사입니다. 뒤에 사람이 옵니다: This belongs to Ben. mine·yours로 말하는 자리를 동사로 바꿔 말할 때 씁니다.', '/bɪˈlɔːŋ tuː/', '빌롱- 투-');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9071, 9071, 1, 'The coffee is over there. Help yourself.', '커피는 저쪽에 있어요. 편하게 드세요.'),
(9072, 9072, 1, 'I finish this report by myself.', '이 보고서는 제가 혼자 끝내요.'),
(9073, 9073, 1, 'She works on her own most days.', '그분은 보통 혼자서 일해요.'),
(9074, 9074, 1, 'The meeting room is all yours after three.', '3시 이후에는 회의실 마음껏 쓰세요.'),
(9075, 9075, 1, 'Who takes care of the office keys?', '사무실 열쇠는 누가 맡고 있어요?'),
(9076, 9076, 1, 'We help each other on busy days.', '우리는 바쁜 날에는 서로 도와요.'),
(9077, 9077, 1, 'This umbrella belongs to Ben.', '이 우산은 벤 씨 거예요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9131, 'wallet', NULL, '지갑', 'NOUN', '/ˈwɑːlɪt/', '왈-릿'),
(9132, 'umbrella', NULL, '우산', 'NOUN', '/ʌmˈbrelə/', '엄브렐러'),
(9133, 'charger', NULL, '충전기', 'NOUN', '/ˈtʃɑːrdʒər/', '차-저'),
(9134, 'notebook', NULL, '공책 · 노트', 'NOUN', '/ˈnoʊtbʊk/', '노우트북'),
(9135, 'pocket', NULL, '주머니', 'NOUN', '/ˈpɑːkɪt/', '파-킷'),
(9136, 'friend', NULL, '친구', 'NOUN', '/frend/', '프렌드'),
(9137, 'borrow', NULL, '빌리다', 'VERB', '/ˈbɑːroʊ/', '바-로우'),
(9138, 'lend', NULL, '빌려주다', 'VERB', '/lend/', '렌드'),
(9139, 'share', NULL, '같이 쓰다 · 나누다', 'VERB', '/ʃer/', '셰어'),
(9140, 'keep', NULL, '가지고 있다 · 두다', 'VERB', '/kiːp/', '키-프'),
(9141, 'own', NULL, '소유하다', 'VERB', '/oʊn/', '오운'),
(9142, 'careful', NULL, '조심하는', 'ADJECTIVE', '/ˈkerfl/', '케어플'),
(9143, 'personal', NULL, '개인의', 'ADJECTIVE', '/ˈpɜːrsənl/', '퍼-서널'),
(9144, 'broken', NULL, '고장 난', 'ADJECTIVE', '/ˈbroʊkən/', '브로우컨'),
(9145, 'anyway', NULL, '어쨌든', 'ADVERB', '/ˈeniweɪ/', '에니웨이'),
(9146, 'about', NULL, '~에 대해', 'PREPOSITION', '/əˈbaʊt/', '어바웃');

-- ─────────────────────────────────────────────────────────────
-- 유닛 9 「있다고 말할 땐 There로 연다」 — There is/are · 그 의문·부정 · 위치는 문장 끝
-- 문법 9041~9043 / 예문 9121~9129 / 회화 9009(대사 9093~9098) / 표현 9081~9087 / 어휘 9151~9166
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9041, 'There is / There are', '~가 있어요', '학교에서는 "There is = ~가 있다"로 외웠습니다. 실제로 중요한 것은 have와 갈리는 자리입니다. 무엇이 어디에 있는지를 말할 때는 There로 엽니다 — "방에 의자가 있다"를 The room has a chair라고 하지 않고 There is a chair in the room이라고 합니다. have는 사람이 무언가를 가졌을 때 씁니다: I have a chair. There 뒤의 be동사는 뒤에 오는 명사의 수를 따라갑니다(유닛 6): There is a chair / There are two chairs.'),
(9042, 'There is의 의문·부정', '~가 있나요? · 없어요', '학교에서는 문장 하나만 배우고 넘어갔습니다. 실제로는 유닛 3의 be동사 규칙이 그대로 적용됩니다 — 앞으로 나가는 것은 be동사 하나입니다: Is there a printer on this floor? 부정도 not만 붙입니다: There isn''t a restroom on this side. 대답도 물어본 대로 되받습니다: Yes, there is. / No, there isn''t. 여기에 do를 데려오지 않습니다.'),
(9043, '위치는 문장 끝에 붙인다', 'There is a cafe on the first floor.', '학교에서는 전치사구를 따로 배웠습니다. 실제로는 유닛 5의 "장소 먼저, 시간 나중"이 여기서도 그대로입니다. There is로 열고 무엇이 있는지를 먼저 말한 다음, 어디에 있는지는 통째로 뒤에 붙입니다. 위치를 가리키는 덩어리(next to, in front of)도 쪼개지 않고 통째로 뒤에 갑니다. 장소를 앞으로 보내는 문장도 있지만 말할 때는 거의 쓰지 않습니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9121, 9041, 1, 'There is a cafe on the first floor.', NULL, '1층에 카페가 있어요.'),
(9122, 9041, 2, 'There are two elevators in this building.', NULL, '이 건물에는 엘리베이터가 두 대 있어요.'),
(9123, 9041, 3, 'There is a lot of parking behind the building.', NULL, '건물 뒤에 주차 공간이 많아요.'),
(9124, 9042, 1, 'Is there a printer on this floor?', NULL, '이 층에 프린터가 있어요?'),
(9125, 9042, 2, 'Are there any chairs in the meeting room? - Yes, there are.', NULL, '회의실에 의자가 있나요? - 네, 있어요.'),
(9126, 9042, 3, 'There isn''t a restroom upstairs.', NULL, '위층에는 화장실이 없어요.'),
(9127, 9043, 1, 'There is a vending machine next to the elevator.', NULL, '엘리베이터 옆에 자판기가 있어요.'),
(9128, 9043, 2, 'There are three desks in front of the window.', NULL, '창문 앞에 책상이 세 개 있어요.'),
(9129, 9043, 3, 'There is a small room across from the kitchen.', NULL, '주방 맞은편에 작은 방이 있어요.');

INSERT INTO dialog (id, title) VALUES
(9009, '이 층에 뭐가 있어요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9093, 9009, 1, 'Mina', 'Is there a printer on this floor?', NULL, '이 층에 프린터가 있어요?'),
(9094, 9009, 2, 'Jun', 'Yes, there is. It is next to the elevator.', NULL, '네, 있어요. 엘리베이터 옆에 있어요.'),
(9095, 9009, 3, 'Mina', 'Is there a restroom on this side, too?', NULL, '이쪽에 화장실도 있나요?'),
(9096, 9009, 4, 'Jun', 'No, there isn''t. There are two restrooms downstairs.', NULL, '아니요, 없어요. 화장실은 아래층에 두 개 있어요.'),
(9097, 9009, 5, 'Mina', 'Is there a cafe in the building?', NULL, '건물 안에 카페는 있어요?'),
(9098, 9009, 6, 'Jun', 'There is a small one in front of the main entrance. It is quiet in the morning.', NULL, '정문 앞에 작은 카페가 하나 있어요. 아침에는 조용해요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9081, 'next to', '~ 옆에', '바로 옆에 붙어 있다는 뜻입니다. 유닛 1의 near는 "근처"라 거리가 더 헐겁습니다. beside도 같은 뜻이지만 말할 때는 next to가 훨씬 흔합니다.', '/nekst tuː/', '넥스트 투-'),
(9082, 'across from', '~ 맞은편에', '길이나 복도를 사이에 두고 마주 본다는 뜻입니다. 유닛 4의 across(건너서)만 쓰면 방향이 되고, from이 붙어야 마주 본 위치가 됩니다.', '/əˈkrɔːs frʌm/', '어크로-스 프럼'),
(9083, 'in front of', '~ 앞에', '건물 바깥쪽 앞을 가리킵니다. the 하나가 더 들어간 in the front of는 "그 안쪽 앞부분"이라 뜻이 달라집니다 — 관사 하나로 위치가 바뀌는 자리입니다(유닛 7).', '/ɪn frʌnt əv/', '인 프런트 어브'),
(9084, 'over there', '저기에 · 저쪽에', '손으로 가리키며 씁니다. there 하나만 쓰는 것보다 "여기가 아니라 저 멀리"라는 거리감이 분명해집니다.', '/ˈoʊvər ðer/', '오우버 데어'),
(9085, 'right here', '바로 여기에', 'right가 "바로"로 위치를 콕 집어 줍니다. 유닛 1의 right away에서 right가 시간을 콕 집는 것과 같은 쓰임입니다.', '/raɪt hɪr/', '라이트 히어'),
(9086, 'down the hall', '복도 끝에 · 복도를 따라가면', 'down이 아래층을 뜻하는 것이 아닙니다 — 같은 층 복도를 따라 저쪽이라는 뜻입니다. 사무실·호텔에서 길을 알려 줄 때 가장 흔한 한 마디입니다.', '/daʊn ðə hɔːl/', '다운 더 홀-'),
(9087, 'around the corner', '모퉁이를 돌면 · 아주 가까이', '실제 모퉁이를 말하기도 하고 "엎어지면 코 닿을 데"라는 비유로도 씁니다. 유닛 5의 corner를 덩어리로 쓰는 자리입니다.', '/əˈraʊnd ðə ˈkɔːrnər/', '어라운드 더 코-너');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9081, 9081, 1, 'The printer is next to the elevator.', '프린터는 엘리베이터 옆에 있어요.'),
(9082, 9082, 1, 'My desk is across from the window.', '제 자리는 창문 맞은편이에요.'),
(9083, 9083, 1, 'There is a bench in front of the building.', '건물 앞에 벤치가 하나 있어요.'),
(9084, 9084, 1, 'The parking area is over there.', '주차장은 저쪽이에요.'),
(9085, 9085, 1, 'The restroom is right here, on this floor.', '화장실은 바로 여기 이 층에 있어요.'),
(9086, 9086, 1, 'The meeting room is down the hall.', '회의실은 복도 끝에 있어요.'),
(9087, 9087, 1, 'There is a cafe around the corner.', '모퉁이를 돌면 카페가 있어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9151, 'cafe', NULL, '카페', 'NOUN', '/kæˈfeɪ/', '캐페이'),
(9152, 'printer', NULL, '프린터', 'NOUN', '/ˈprɪntər/', '프린터'),
(9153, 'elevator', NULL, '엘리베이터', 'NOUN', '/ˈelɪveɪtər/', '엘리베이터'),
(9154, 'restroom', NULL, '화장실', 'NOUN', '/ˈrestruːm/', '레스트룸-'),
(9155, 'parking', NULL, '주차 · 주차 공간', 'NOUN', '/ˈpɑːrkɪŋ/', '파-킹'),
(9156, 'wall', NULL, '벽', 'NOUN', '/wɔːl/', '월-'),
(9157, 'window', NULL, '창문', 'NOUN', '/ˈwɪndoʊ/', '윈도우'),
(9158, 'building', NULL, '건물', 'NOUN', '/ˈbɪldɪŋ/', '빌딩'),
(9159, 'enter', NULL, '들어가다', 'VERB', '/ˈentər/', '엔터'),
(9160, 'sit', NULL, '앉다', 'VERB', '/sɪt/', '싯'),
(9161, 'stand', NULL, '서 있다', 'VERB', '/stænd/', '스탠드'),
(9162, 'clean', NULL, '깨끗한', 'ADJECTIVE', '/kliːn/', '클린-'),
(9163, 'noisy', NULL, '시끄러운', 'ADJECTIVE', '/ˈnɔɪzi/', '노이지'),
(9164, 'upstairs', NULL, '위층에', 'ADVERB', '/ˌʌpˈsterz/', '업스테어즈'),
(9165, 'downstairs', NULL, '아래층에', 'ADVERB', '/ˌdaʊnˈsterz/', '다운스테어즈'),
(9166, 'inside', NULL, '안에 · 안으로', 'ADVERB', '/ˌɪnˈsaɪd/', '인사이드');

-- ─────────────────────────────────────────────────────────────
-- 유닛 10 「시간과 장소에 붙는 at·on·in」 ★복습(6~10) — 시간의 at/on/in · 장소의 at/on/in · 빈도부사 자리
-- 문법 9046~9048 / 예문 9136~9144 / 회화 9010(대사 9105~9110) / 표현 9091~9097 / 어휘 9171~9186
-- 정리 스텝에 6~10 복습 블록이 붙는다(unitNo % 5 == 0) — 유닛 6~9가 모두 있는 상태로만 배포한다.
-- 복습 전용 유닛이 아니므로 문법·회화·표현·어휘를 정상 수량으로 채웠다(설계/06 §11-4).
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9046, '시간의 at / on / in', '시각·날짜·달의 크기 순서', '학교에서는 셋을 따로따로 외웠습니다. 실제로는 크기 순서 하나입니다. 점처럼 좁은 시각에는 at(at seven, at noon), 하루 단위인 날짜·요일에는 on(on Friday, on my birthday), 그보다 넓은 달·계절·연도에는 in(in May, in summer)을 씁니다. 좁은 데서 넓은 데로 at → on → in으로 넓어진다고 기억하면 셋을 따로 외울 일이 없습니다. this·next·every가 앞에 붙으면 전치사를 아예 뺍니다: this Friday.'),
(9047, '장소의 at / on / in', '같은 크기 규칙이 장소에도 간다', '학교에서는 시간과 장소를 다른 규칙으로 배웠습니다. 실제로는 같은 규칙입니다. 지점으로 볼 때는 at(at the door, at the station), 면에 닿아 있으면 on(on the table, on the second floor), 둘러싸인 공간 안이면 in(in the room, in Seoul)입니다. 같은 카페도 만나는 지점으로 말하면 at the cafe, 안에 들어가 있는 것을 말하면 in the cafe입니다 — 어느 쪽이 맞느냐가 아니라 무엇으로 보고 말하느냐입니다.'),
(9048, '빈도부사가 앉는 자리', 'be동사 뒤, 일반동사 앞', '학교에서는 always·sometimes·never를 목록으로 외웠습니다. 실제로 문제가 되는 것은 뜻이 아니라 자리입니다. be동사면 그 뒤에, 일반동사면 그 앞에 앉습니다: I am always busy / I always work late. 두 자리를 헷갈려 I always am busy라고 하면 어색합니다. never는 그 자체가 부정이라 don''t와 같이 쓰지 않습니다 — I don''t never go가 아니라 I never go입니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9136, 9046, 1, 'The meeting starts at nine.', NULL, '회의는 9시에 시작해요.'),
(9137, 9046, 2, 'We have a workshop on Friday.', NULL, '우리는 금요일에 워크숍이 있어요.'),
(9138, 9046, 3, 'She takes a long holiday in August.', NULL, '그분은 8월에 긴 휴가를 가요.'),
(9139, 9047, 1, 'She waits at the bus stop every morning.', NULL, '그분은 아침마다 버스 정류장에서 기다려요.'),
(9140, 9047, 2, 'The calendar is on the wall.', NULL, '달력은 벽에 있어요.'),
(9141, 9047, 3, 'We meet in the small room next to the cafe.', NULL, '우리는 카페 옆 작은 방에서 만나요.'),
(9142, 9048, 1, 'I am always ready at nine.', NULL, '저는 9시면 늘 준비가 돼 있어요.'),
(9143, 9048, 2, 'She sometimes works on Saturday.', NULL, '그분은 가끔 토요일에 일해요.'),
(9144, 9048, 3, 'He never answers the phone in a meeting.', NULL, '그는 회의 중에는 절대 전화를 받지 않아요.');

INSERT INTO dialog (id, title) VALUES
(9010, '금요일 몇 시에 될까요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9105, 9010, 1, 'Ben', 'Are you free on Friday?', NULL, '금요일에 시간 되세요?'),
(9106, 9010, 2, 'Mina', 'In the morning, yes. I am always busy after lunch.', NULL, '오전에는요. 점심 뒤에는 늘 바빠요.'),
(9107, 9010, 3, 'Ben', 'Then at ten? We meet in the small room on the third floor.', NULL, '그럼 10시에요? 3층 작은 방에서 봐요.'),
(9108, 9010, 4, 'Mina', 'Ten is good. I put it in my schedule now.', NULL, '10시 좋아요. 지금 일정에 넣을게요.'),
(9109, 9010, 5, 'Ben', 'Thanks. I always send the agenda in advance.', NULL, '고마워요. 저는 늘 자료를 미리 보내요.'),
(9110, 9010, 6, 'Mina', 'Good. I am never late for a meeting on Friday.', NULL, '좋아요. 저는 금요일 회의에는 절대 안 늦어요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9091, 'in advance', '미리', '미리 해 두는 일에 붙입니다: book in advance, send in advance. before와 달리 무엇보다 앞서는지를 말하지 않아도 되어서 한 마디로 끝납니다.', '/ɪn ədˈvæns/', '인 어드밴스'),
(9092, 'put off', '미루다', '일정을 뒤로 넘기는 것입니다. 사이에 목적어가 들어갈 수 있습니다: put the meeting off. 유닛 5의 get off(내리다)와 off만 같고 뜻은 다릅니다.', '/pʊt ɔːf/', '풋 오-프'),
(9093, 'make it', '(시간에 맞춰) 갈 수 있다 · 해내다', '약속 자리에 갈 수 있느냐를 묻고 답할 때 씁니다: I can''t make it on Friday. 무엇을 만든다는 뜻이 아닙니다.', '/meɪk ɪt/', '메이크 잇'),
(9094, 'show up', '나타나다 · (약속 자리에) 오다', 'come보다 "그 자리에 모습을 드러낸다"는 쪽입니다. 안 오는 사람을 말할 때 특히 자주 씁니다: He never shows up on time.', '/ʃoʊ ʌp/', '쇼우 업'),
(9095, 'first thing', '아침에 제일 먼저', 'first thing in the morning처럼 통째로 씁니다. 순서를 세는 "첫 번째 것"이 아니라 하루의 맨 앞자리를 가리키는 덩어리입니다.', '/fɜːrst θɪŋ/', '퍼-스트 씽'),
(9096, 'in time', '늦지 않게 · 시간 안에', '유닛 5의 on time(정해진 시각 그대로)과 갈리는 자리입니다. in time은 아슬아슬하더라도 늦지 않았다는 뜻이라, 정시 도착을 말할 때 바꿔 쓸 수 없습니다.', '/ɪn taɪm/', '인 타임'),
(9097, 'day off', '쉬는 날 · 휴무', 'take a day off로 통째로 씁니다. holiday가 달력에 있는 공휴일이라면 day off는 내가 쉬기로 한 하루입니다.', '/deɪ ɔːf/', '데이 오-프');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9091, 9091, 1, 'We book the meeting room in advance.', '우리는 회의실을 미리 잡아요.'),
(9092, 9092, 1, 'He puts off small tasks until Friday.', '그는 자잘한 일을 금요일까지 미뤄요.'),
(9093, 9093, 1, 'Sorry, I can''t make it on Friday.', '죄송해요, 금요일에는 못 갈 것 같아요.'),
(9094, 9094, 1, 'She shows up at eight every day.', '그분은 매일 8시에 와요.'),
(9095, 9095, 1, 'I check my email first thing in the morning.', '저는 아침에 제일 먼저 이메일을 확인해요.'),
(9096, 9096, 1, 'I arrive in time for the meeting.', '저는 회의에 늦지 않게 도착해요.'),
(9097, 9097, 1, 'I take a day off on my birthday.', '저는 생일에는 하루 쉬어요.');

INSERT INTO vocabulary (id, word, kana, meaning_ko, part_of_speech, ipa, ko_approx) VALUES
(9171, 'day', NULL, '날 · 하루', 'NOUN', '/deɪ/', '데이'),
(9172, 'week', NULL, '주', 'NOUN', '/wiːk/', '위-크'),
(9173, 'month', NULL, '달 · 개월', 'NOUN', '/mʌnθ/', '먼스'),
(9174, 'hour', NULL, '시간', 'NOUN', '/ˈaʊər/', '아워'),
(9175, 'birthday', NULL, '생일', 'NOUN', '/ˈbɜːrθdeɪ/', '버-스데이'),
(9176, 'holiday', NULL, '휴일 · 휴가', 'NOUN', '/ˈhɑːlədeɪ/', '할-러데이'),
(9177, 'schedule', NULL, '일정', 'NOUN', '/ˈskedʒuːl/', '스케줄-'),
(9178, 'appointment', NULL, '약속 (예약)', 'NOUN', '/əˈpɔɪntmənt/', '어포인트먼트'),
(9179, 'book', NULL, '예약하다', 'VERB', '/bʊk/', '북'),
(9180, 'cancel', NULL, '취소하다', 'VERB', '/ˈkænsl/', '캔슬'),
(9181, 'ready', NULL, '준비된', 'ADJECTIVE', '/ˈredi/', '레디'),
(9182, 'available', NULL, '시간이 되는 · 이용할 수 있는', 'ADJECTIVE', '/əˈveɪləbl/', '어베일러블'),
(9183, 'always', NULL, '늘 · 항상', 'ADVERB', '/ˈɔːlweɪz/', '올-웨이즈'),
(9184, 'sometimes', NULL, '가끔', 'ADVERB', '/ˈsʌmtaɪmz/', '섬타임즈'),
(9185, 'soon', NULL, '곧', 'ADVERB', '/suːn/', '순-'),
(9186, 'until', NULL, '~까지', 'PREPOSITION', '/ənˈtɪl/', '언틸');

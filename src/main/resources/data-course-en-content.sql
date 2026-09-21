-- ═══════════════════════════════════════════════════════════════════
-- 영어 과정 뼈대 시드 — 코스 5개(101~105) + 코스 1(E1 다시 세우기)의 유닛 콘텐츠
-- 담당: backend-dev(영어) / 계약: 설계/04_API계약.md §8 · 설계/06_콘텐츠_제작규칙.md §11
-- 규칙: 설계/06_콘텐츠_제작규칙.md §11-2(코스 5단계 E1~E5) · §11-4(유닛 구성) · §11-10(ID 대역)
--      부분 공개는 5의 배수 경계로만 넓힌다 — E1은 2 → 5 → 10 → 15 (§11-12 ①). 지금은 5유닛.
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

-- ─────────────────────────────────────────────────────────────
-- 문법 4개 (9001~9004) — 유닛당 2개 (설계/06 §11-4 "문법 2~3개")
-- 톤: 다시 배우기식 — "학교에서 이렇게 배웠죠? 실제로는 이렇게 씁니다"(설계/06 §11-2)
-- ─────────────────────────────────────────────────────────────
INSERT INTO grammar_point (id, name, name_ko, explanation) VALUES
(9001, 'be동사 현재형 (am / is / are)', '~이다 · ~에 있다', '주어가 I면 am, he·she·it이면 is, you·we·they면 are입니다. be동사는 상태를 말할 때 쓰고 뒤에는 명사나 형용사가 옵니다. 학교에서 표로 외웠는데도 말할 때 틀리는 이유는 be동사 뒤에 동사를 또 붙이기 때문입니다. I am go 같은 문장은 없습니다 — 동사는 한 문장에 하나입니다.'),
(9002, '일반동사 현재형과 3인칭 -s', '평소에 하는 일을 말한다', '평소에 늘 하는 일은 동사를 그대로 씁니다: I work, they live. 단 주어가 he·she·it이면 동사 끝에 -s를 붙입니다: he works, she lives. 이 -s 하나가 한국어에 없는 것이라 가장 많이 빠집니다. 말하기 전에 주어가 한 사람인지 한 개인지만 확인하세요.'),
(9003, 'do / does 의문문', '평소에 ~해요? 라고 묻기', '일반동사 문장을 물어볼 때는 문장 앞에 Do를 세웁니다: Do you work here? 주어가 he·she·it이면 Does입니다. 이때 뒤의 동사는 -s를 떼고 원래 모양으로 돌아갑니다: Does she work here? -s는 Does가 이미 가져갔습니다.'),
(9004, '부정문 don''t / doesn''t', '평소에 ~하지 않아요', '안 한다는 말은 동사 앞에 don''t를 넣습니다: I don''t drink coffee. 주어가 he·she·it이면 doesn''t이고 역시 뒤의 동사는 원래 모양입니다: He doesn''t drink coffee. be동사 문장은 다릅니다 — be동사 뒤에 not만 붙입니다: I am not busy.');

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
(9001, 9001, 1, 'Mina', 'Hi, I am Mina. I am new here.', NULL, '안녕하세요, 저는 미나예요. 여기 처음이에요.'),
(9002, 9001, 2, 'Ben', 'Nice to meet you. I am Ben. I work on this floor too.', NULL, '반가워요. 저는 벤이에요. 저도 이 층에서 일해요.'),
(9003, 9001, 3, 'Mina', 'Is the meeting room near here?', NULL, '회의실이 이 근처인가요?'),
(9004, 9001, 4, 'Ben', 'Yes. It is between the kitchen and my desk. I usually get there early.', NULL, '네. 탕비실과 제 자리 사이에 있어요. 저는 보통 일찍 가 있어요.'),
(9005, 9002, 1, 'Ben', 'Do you have plans this weekend?', NULL, '이번 주말에 계획 있어요?'),
(9006, 9002, 2, 'Mina', 'Not really. I usually spend the weekend at home.', NULL, '딱히요. 저는 주말을 보통 집에서 보내요.'),
(9007, 9002, 3, 'Ben', 'Does your team hang out together?', NULL, '팀에서 같이 어울리기도 해요?'),
(9008, 9002, 4, 'Mina', 'Sometimes. But I don''t go out when I am tired. I watch a movie instead.', NULL, '가끔요. 그런데 피곤할 땐 안 나가요. 대신 영화를 봐요.');

-- ─────────────────────────────────────────────────────────────
-- 표현 12개 (9001~9012) — 유닛당 6개 (설계/06 §11-4 "6~10개")
-- 표현 = 단어보다 크고 문장보다 작은, 통째로 외워 쓰는 덩어리(구동사·연어·관용을 한 종류로 다룬다 — 설계/06 §11-5).
-- text에 UNIQUE가 없다(설계/03 §3) — 열린 집합이라 코스 간 중복이 허용된다.
-- 코스 내부 중복만 금지이며 12개 표기가 전부 다르다.
-- ─────────────────────────────────────────────────────────────
INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9001, 'get up', '(잠자리에서) 일어나다', 'wake up은 잠이 깨는 것, get up은 몸을 일으키는 것입니다. 눈만 뜬 상태라면 아직 get up이 아닙니다.', '/ɡet ʌp/', '겟 업'),
(9002, 'be good at', '~을 잘하다', 'at 뒤에는 명사나 -ing가 옵니다: good at math, good at cooking. good to는 누구에게 잘해 준다는 뜻이라 완전히 다릅니다.', '/bi ɡʊd æt/', '비 굿 앳'),
(9003, 'on my way', '가는 길이다', '전화로 지금 가고 있다고 한 마디로 끝내는 표현입니다. I am on my way. 뒤에 to를 붙여 목적지를 말합니다.', '/ɑːn maɪ weɪ/', '온 마이 웨이'),
(9004, 'a couple of', '두어 개의 · 몇 개의', '엄밀히는 2개지만 실제로는 두세 개쯤으로 헐겁게 씁니다. of를 빼먹지 않는 것이 요령입니다.', '/ə ˈkʌpl əv/', '어 커플 어브'),
(9005, 'take a break', '잠깐 쉬다', 'rest는 몸을 쉬는 것, take a break는 하던 일을 잠시 멈추는 것입니다. 회사에서 훨씬 자주 씁니다.', '/teɪk ə breɪk/', '테이크 어 브레이크'),
(9006, 'right away', '바로 · 즉시', 'now보다 지금 당장 처리하겠다는 느낌이 강합니다. 부탁을 받고 답할 때 씁니다.', '/raɪt əˈweɪ/', '라이트 어웨이'),
(9007, 'hang out', '(친구와) 어울려 놀다', '특별한 목적 없이 같이 시간을 보내는 것입니다. play는 아이들이 노는 것이라 어른에게 쓰면 어색합니다.', '/hæŋ aʊt/', '행 아웃'),
(9008, 'be into', '~에 푹 빠져 있다', 'like보다 강합니다. I am into hiking은 요즘 등산에 빠져 있다는 뜻입니다. 취미를 말할 때 가장 자연스러운 한 마디입니다.', '/bi ˈɪntuː/', '비 인투'),
(9009, 'how come', '어째서 · 왜', 'why와 뜻은 같지만 뒤 어순이 평서문 그대로입니다: How come you are here? (Why are you here?와 대비)', '/haʊ kʌm/', '하우 컴'),
(9010, 'kind of', '좀 · 약간', '단정하기 싫을 때 붙이는 완충어입니다. I am kind of tired. 말할 때는 카인더에 가깝게 뭉개집니다.', '/kaɪnd əv/', '카인드 어브'),
(9011, 'come up with', '(생각·아이디어를) 떠올리다', '세 단어가 통째로 하나입니다. 중간의 up이나 with를 빼면 뜻이 사라집니다.', '/kʌm ʌp wɪð/', '컴 업 위드'),
(9012, 'no big deal', '별거 아니다', '고맙다는 말이나 사과를 가볍게 받아넘길 때 씁니다. It is no big deal.', '/noʊ bɪɡ diːl/', '노 빅 딜');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9001, 9001, 1, 'I get up at six on weekdays.', '저는 평일에 6시에 일어나요.'),
(9002, 9002, 1, 'She is good at explaining things.', '그녀는 설명을 잘해요.'),
(9003, 9003, 1, 'Sorry, I am on my way to the office.', '미안해요, 지금 사무실 가는 길이에요.'),
(9004, 9004, 1, 'I have a couple of questions.', '질문이 두어 개 있어요.'),
(9005, 9005, 1, 'Let us take a break for ten minutes.', '10분만 쉬었다 하죠.'),
(9006, 9006, 1, 'I will send it right away.', '바로 보내 드릴게요.'),
(9007, 9007, 1, 'We hang out after work sometimes.', '우리는 가끔 퇴근하고 어울려요.'),
(9008, 9008, 1, 'He is really into old movies.', '그는 옛날 영화에 푹 빠져 있어요.'),
(9009, 9009, 1, 'How come you never told me?', '어째서 한 번도 말 안 했어요?'),
(9010, 9010, 1, 'It is kind of hard to explain.', '설명하기가 좀 어렵네요.'),
(9011, 9011, 1, 'She came up with a better idea.', '그녀가 더 나은 아이디어를 냈어요.'),
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
(9023, 'often', NULL, '자주', 'ADVERB', '/ˈɔːfn/', '오-픈'),
(9024, 'never', NULL, '결코 ~않다', 'ADVERB', '/ˈnevər/', '네버'),
(9025, 'together', NULL, '함께', 'ADVERB', '/təˈɡeðər/', '투게더'),
(9026, 'instead', NULL, '대신에', 'ADVERB', '/ɪnˈsted/', '인스테드'),
(9027, 'tired', NULL, '피곤한', 'ADJECTIVE', '/ˈtaɪərd/', '타이어드'),
(9028, 'free', NULL, '한가한 · 무료의', 'ADJECTIVE', '/friː/', '프리-'),
(9029, 'during', NULL, '~ 동안', 'PREPOSITION', '/ˈdʊrɪŋ/', '두어링'),
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
(9039, 9013, 3, 'We aren''t colleagues. We are friends.', NULL, '우리는 동료가 아니에요. 친구예요.');

INSERT INTO dialog (id, title) VALUES
(9003, '혹시 새로 오신 분인가요?');

INSERT INTO dialog_line (id, dialog_id, sort_order, speaker, jp, kana, meaning_ko) VALUES
(9021, 9003, 1, 'Jun', 'Excuse me, are you the new designer?', NULL, '실례지만, 새로 오신 디자이너분이세요?'),
(9022, 9003, 2, 'Mina', 'No, I''m not. I''m on the sales team.', NULL, '아니요, 아니에요. 저는 영업팀이에요.'),
(9023, 9003, 3, 'Jun', 'Sorry about that. By the way, are you Mina?', NULL, '죄송해요. 그런데 혹시 미나 씨인가요?'),
(9024, 9003, 4, 'Mina', 'Yes, I am. And you are Jun, right?', NULL, '네, 맞아요. 그쪽은 준 씨죠?'),
(9025, 9003, 5, 'Jun', 'That''s right. My desk isn''t far from yours.', NULL, '맞아요. 제 자리가 미나 씨 자리에서 멀지 않아요.'),
(9026, 9003, 6, 'Mina', 'Nice to meet you. I''m still new here, so I ask a lot of questions.', NULL, '반가워요. 저도 아직 신입이라 질문을 많이 해요.');

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
(9027, 9027, 1, 'You look like someone I know.', '제가 아는 분이랑 닮으셨네요.');

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
(9017, 'how + 형용사 (how much / how long / how often)', '얼마나 ~인지 묻기', '학교에서는 how를 "어떻게"로 배웠습니다. 실제로 how는 혼자 쓰는 것보다 뒤에 말을 하나 더 붙여 쓰는 경우가 훨씬 많습니다. 값은 how much, 시간은 how long, 횟수는 how often, 거리는 how far입니다. 무엇을 묻는지는 how 뒤에 붙은 말이 정하고, 그 뒤 어순은 보통 의문문과 똑같습니다.'),
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
(9035, 9004, 3, 'Ben', 'I bring lunch from home. How much is a bowl there?', NULL, '저는 집에서 싸 와요. 거기는 한 그릇에 얼마예요?'),
(9036, 9004, 4, 'Mina', 'About nine dollars. It''s cheap for this area.', NULL, '9달러쯤이요. 이 동네치고는 싼 편이에요.'),
(9037, 9004, 5, 'Ben', 'How long does it take on foot?', NULL, '걸어서 얼마나 걸려요?'),
(9038, 9004, 6, 'Mina', 'Ten minutes. Who is free at noon today?', NULL, '10분이요. 오늘 점심때 시간 되는 사람 누구예요?');

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
(9052, 'restaurant', NULL, '식당', 'NOUN', '/ˈrestrɑːnt/', '레스트란트'),
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
(9021, '기본 어순 (주어 + 동사 + 목적어)', '자리가 뜻을 정한다', '학교에서는 1~5형식 표로 배웠습니다. 실제로 필요한 것은 형식 번호가 아니라 자리입니다. 한국어는 "을·를" 같은 조사가 역할을 알려 주지만 영어는 자리가 알려 줍니다. I know her.와 She knows me.는 쓰인 단어가 같고 자리만 다른데 뜻이 뒤집힙니다. 목적어를 앞으로 빼거나 동사를 뒤로 미루면 다른 말이 됩니다. 형식을 외울 게 아니라 주어 → 동사 → 목적어 순서만 지키면 됩니다.'),
(9022, '장소 먼저, 시간 나중', '뒤에 붙이는 말의 순서', '학교에서는 거의 다루지 않은 규칙입니다. 실제로 문장 뒤에 말을 더 붙일 때는 장소를 먼저, 시간을 나중에 놓습니다: I work at home in the morning. 뒤집어서 I work in the morning at home이라고 하면 틀린 문장은 아니어도 어색하게 들립니다. 시간을 강조하고 싶으면 뒤에서 순서를 바꾸는 게 아니라 문장 맨 앞으로 통째로 보냅니다.'),
(9023, '주어를 빼지 않는다 — 날씨·시간의 it', '주어 없는 문장은 없다', '학교에서는 "비인칭 주어 it"이라는 용어로 배웠습니다. 실제로 기억할 것은 용어가 아니라 영어에 주어 없는 문장이 없다는 사실입니다. 한국어는 "비 와", "늦었어"로 끝나지만 영어는 Rains나 Is late라고 하지 않습니다. 뜻이 없어도 자리를 채우는 it을 세웁니다: It rains a lot here. 날씨·시간·거리를 말할 때 이 it이 나옵니다.');

INSERT INTO grammar_example (id, grammar_point_id, sort_order, jp, kana, meaning_ko) VALUES
(9061, 9021, 1, 'I know your manager.', NULL, '저는 그쪽 팀장님을 알아요.'),
(9062, 9021, 2, 'Your manager knows me.', NULL, '그쪽 팀장님이 저를 알아요.'),
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
(9047, 9005, 3, 'Jun', 'I know. I get off at the next stop.', NULL, '그러게요. 저는 다음 정거장에서 내려요.'),
(9048, 9005, 4, 'Mina', 'Where do we meet?', NULL, '어디서 만나요?'),
(9049, 9005, 5, 'Jun', 'The cafe near exit four. I go there after work every day.', NULL, '4번 출구 옆 카페요. 저는 매일 퇴근하고 거기에 가요.'),
(9050, 9005, 6, 'Mina', 'Good. It takes five minutes on foot from here.', NULL, '좋아요. 여기서 걸어서 5분 걸려요.');

INSERT INTO expression (id, text, meaning_ko, usage_note, ipa, ko_approx) VALUES
(9041, 'pick up', '데리러 가다 · 집어 들다', '사람을 차로 데리러 가는 것과 물건을 집어 드는 것 둘 다입니다. 대명사가 오면 반드시 사이에 넣습니다 — pick you up이지 pick up you가 아닙니다.', '/pɪk ʌp/', '픽 업'),
(9042, 'get on', '(버스·지하철에) 타다', '버스·지하철·비행기처럼 서서 들어가는 탈것에 씁니다. 승용차는 get in a car라고 합니다.', '/ɡet ɑːn/', '겟 온'),
(9043, 'get off', '(버스·지하철에서) 내리다', 'get on의 짝입니다. 어디서 내리는지는 at을 붙여 말합니다: get off at the next stop. 승용차는 get out of a car입니다.', '/ɡet ɔːf/', '겟 오-프'),
(9044, 'on time', '시간에 맞춰 · 정시에', 'in time(늦지 않게, 아슬아슬하게)과 다릅니다. on time은 정해진 시각 그대로라는 뜻입니다.', '/ɑːn taɪm/', '온 타임'),
(9045, 'head home', '집으로 향하다', 'head는 명사로만 알기 쉽지만 동사로 "~쪽으로 가다"입니다. home 앞에 to를 붙이지 않습니다 — head to home은 틀립니다.', '/hed hoʊm/', '헤드 호움'),
(9046, 'run into', '우연히 마주치다', '달려 들어간다는 뜻이 아닙니다. 약속하고 만나는 meet과 달리 뜻밖에 마주치는 것입니다.', '/rʌn ˈɪntuː/', '런 인투'),
(9047, 'give a ride', '태워 주다', '사람을 사이에 넣습니다 — give me a ride. 영국에서는 give a lift라고 합니다.', '/ɡɪv ə raɪd/', '기브 어 라이드');

INSERT INTO expression_example (id, expression_id, sort_order, en, meaning_ko) VALUES
(9041, 9041, 1, 'He picks me up at the station every Friday.', '그가 금요일마다 역으로 저를 데리러 와요.'),
(9042, 9042, 1, 'We get on the subway at city hall.', '우리는 시청에서 지하철을 타요.'),
(9043, 9043, 1, 'I get off at the next stop.', '저는 다음 정거장에서 내려요.'),
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
(9086, 'or', NULL, '또는', 'CONJUNCTION', '/ɔːr/', '오-');

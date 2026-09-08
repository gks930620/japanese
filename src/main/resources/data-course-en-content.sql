-- ═══════════════════════════════════════════════════════════════════
-- 영어 과정 뼈대 시드 — 코스 5개(101~105) + 코스 1의 맛보기 콘텐츠
-- 담당: backend-dev(영어) / 계약: 설계/04_API계약.md §8 · 설계/06_콘텐츠_제작규칙.md §11
-- 규칙: 설계/06_콘텐츠_제작규칙.md §11-2(코스 5단계 E1~E5·맛보기 2유닛) · §11-4(유닛 구성) · §11-10(ID 대역)
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
-- 맛보기는 코스 1만: AVAILABLE + 유닛 2개, 나머지 넷은 PREPARING (설계/03 §5-2 조건).
-- ─────────────────────────────────────────────────────────────
INSERT INTO course (id, course_no, level_code, language, level_label, title, target_audience, goal, notice, description, status) VALUES
(101, 1, 'E1', 'EN', 'E1', '다시 세우기', '단어는 아는데 문장이 안 만들어지는 학습자', '학교에서 배운 조각들을 문장 만드는 규칙으로 다시 세워, 하고 싶은 말을 한 문장으로 끝맺을 수 있어요', '지금은 맛보기 2개 유닛만 열려 있어요', '「I am go to school」 같은 문장이 왜 안 되는지부터 다시 답합니다. be동사와 일반동사를 뒤섞지 않고, 묻고 답하는 한 문장을 스스로 만들 수 있게 되는 것이 이 코스의 도착점입니다.', 'AVAILABLE'),
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

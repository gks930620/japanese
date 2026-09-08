package com.test.test.editor.repository;

import com.test.test.course.content.GrammarPointEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.jpa.repository.JpaRepository;

/** 편집 모드 전용 문법 저장 접근 (설계/04 §9) — 읽기 경로(course·library)는 프로젝션 리포지토리를 쓰므로 여기 두지 않는다.
 * 컨트롤러·서비스와 같은 조건으로 등록된다 — 꺼진 환경에는 편집 관련 빈이 하나도 남지 않는다(설계/04 §9). */
@ConditionalOnProperty(name = "app.editor.enabled", havingValue = "true")
public interface EditorGrammarRepository extends JpaRepository<GrammarPointEntity, Long> {
}

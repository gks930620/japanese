package com.test.test.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 엔티티를 찾을 수 없을 때 발생하는 예외
 * HTTP 404 Not Found
 */
public class EntityNotFoundException extends BusinessException {

    public EntityNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    /**
     * 메시지는 <b>조사 없이</b> 만든다 — 앞말의 받침에 따라 조사가 갈리는데("한자를"/"문법을")
     * 리소스명이 인자로 들어오므로 서버가 고를 수 없다. "한자을(를) 찾을 수 없습니다" 같은
     * 자리표시자는 사용자에게 그대로 노출된다.
     */
    public static EntityNotFoundException of(String entityName, Long id) {
        return new EntityNotFoundException(notFoundMessage(entityName, String.valueOf(id)));
    }

    public static EntityNotFoundException of(String entityName, String identifier) {
        return new EntityNotFoundException(notFoundMessage(entityName, identifier));
    }

    private static String notFoundMessage(String entityName, String identifier) {
        return "존재하지 않는 " + entityName + "입니다: " + identifier;
    }
}


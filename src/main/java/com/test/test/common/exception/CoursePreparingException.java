package com.test.test.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 준비중 코스의 유닛 접근 시 발생하는 예외 (설계 §3-3)
 * HTTP 404 + errorCode COURSE_PREPARING — 프론트가 "없음"(NOT_FOUND)과 구분해
 * 준비중 안내 화면으로 분기한다.
 */
public class CoursePreparingException extends BusinessException {

    public CoursePreparingException(String courseTitle) {
        super("준비중인 코스입니다: " + courseTitle, HttpStatus.NOT_FOUND, "COURSE_PREPARING");
    }
}

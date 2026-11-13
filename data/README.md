# data/ — 런타임이 만들고 쓰는 것

**이 폴더의 내용은 저장소에 올라가지 않는다**(이 README만 예외). 지워도 되고, 다시 실행하면 생긴다.

| | 무엇 | 누가 만드나 |
|---|---|---|
| `logs/` | `application.log` · `error.log` + 날짜별 롤링 | `src/main/resources/logback-spring.xml` |
| `uploads/` | 첨부파일 (**로컬 전용**) | `application.yml`의 `file.upload-dir` 기본값 `./data/uploads` |

**운영(Railway)은 이 폴더를 쓰지 않는다** — 첨부는 S3 호환 버킷으로 가고(`application-prod.yml §5-3`),
업로드 경로는 환경변수 `FILE_UPLOAD_DIR`가 `/app/uploads`로 덮어쓴다. 로그는 표준 출력으로 나간다.

**H2는 여기 없다** — `jdbc:h2:mem:devdb`, 메모리 DB라 파일이 생기지 않는다. 서버를 내리면 데이터가 사라지고
다음 기동 때 `src/main/resources/data-*.sql` 시드가 다시 적재된다(`작업자(AI)_문서/02_아키텍처.md`).

**테스트는 여기를 안 쓴다** — 업로드 테스트는 `build/test-uploads`를 주입한다(`ApiIntegrationTestSupport`).

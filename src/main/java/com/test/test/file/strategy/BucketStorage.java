package com.test.test.file.strategy;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

/**
 * Railway Storage Buckets(S3 완전 호환) 파일 저장 전략 (§5-3).
 * - {@code app.bucket.endpoint} 가 설정돼 있을 때(운영) 활성화된다.
 * - 버킷은 private → 공개 URL 없음. 저장 경로는 {@code /uploads/{저장파일명}} 을 사용하고,
 *   서빙은 백엔드 프록시가 {@link #loadAsResource(String)} 로 바이트를 스트리밍한다.
 * - 표준 AWS SDK for Java v2 (S3), region 기본 {@code us-east-1}, path-style.
 */
@Component
@Slf4j
@ConditionalOnExpression("'${app.bucket.endpoint:}'.trim().length() > 0")
public class BucketStorage implements FileStorageStrategy {

    @Value("${app.bucket.endpoint:}")
    private String endpoint;

    @Value("${app.bucket.access-key-id:}")
    private String accessKeyId;

    @Value("${app.bucket.secret-access-key:}")
    private String secretAccessKey;

    @Value("${app.bucket.name:}")
    private String bucketName;

    @Value("${app.bucket.region:us-east-1}")
    private String region;

    private S3Client s3;

    @PostConstruct
    void init() {
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                // Railway/MinIO/R2 등 S3 호환 스토리지는 path-style 접근을 사용한다.
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
        log.info("BucketStorage 초기화 - endpoint: {}, bucket: {}, region: {}", endpoint, bucketName, region);
    }

    @Override
    public FileUploadResult uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다");
        }
        try {
            String originalFilename = file.getOriginalFilename();
            String storedFilename = UUID.randomUUID() + extractExtension(originalFilename);

            s3.putObject(PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(storedFilename)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes()));

            log.info("버킷 업로드 완료 - 원본: {}, key: {}", originalFilename, storedFilename);

            return FileUploadResult.builder()
                    .originalFilename(originalFilename)
                    .storedFilename(storedFilename)
                    .filePath(storedFilename)  // 버킷 key (내부 참고용)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();
        } catch (IOException e) {
            log.error("버킷 업로드 실패: {}", e.getMessage(), e);
            throw new RuntimeException("파일 저장 실패: " + file.getOriginalFilename(), e);
        }
    }

    @Override
    public void deleteFile(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return;
        }
        // DB에는 /uploads/{key} 가 저장되므로 파일명(=key)만 추출.
        String key = filePath.substring(filePath.lastIndexOf("/") + 1);
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
            log.info("버킷 파일 삭제 완료 - key: {}", key);
        } catch (Exception e) {
            log.warn("버킷 파일 삭제 실패 - key: {}, 사유: {}", key, e.getMessage());
        }
    }

    @Override
    public Resource loadAsResource(String storedFileName) {
        try {
            ResponseBytes<GetObjectResponse> object = s3.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucketName).key(storedFileName).build());
            return new ByteArrayResource(object.asByteArray());
        } catch (NoSuchKeyException e) {
            log.warn("버킷에 파일이 없습니다 - key: {}", storedFileName);
            return null;
        } catch (Exception e) {
            log.warn("버킷 파일 로드 실패 - key: {}, 사유: {}", storedFileName, e.getMessage());
            return null;
        }
    }

    private String extractExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }
}

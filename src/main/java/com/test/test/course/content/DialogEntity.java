package com.test.test.course.content;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회화 (설계 §1 dialog — 20편, 유닛당 1편 참조)
 */
@Entity
@Table(name = "dialog")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DialogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @OneToMany(mappedBy = "dialog", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<DialogLineEntity> lines = new ArrayList<>();

    /** 편집 모드 — 장면 제목 수정 (설계/04 §9) */
    public void rename(String title) {
        this.title = title;
    }
}

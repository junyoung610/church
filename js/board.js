// church/js/board.js - 게시판 로직: 글쓰기 접근 제어, 등록, 목록 로드, 상세 보기

document.addEventListener("DOMContentLoaded", () => {
  // Auth 객체와 Firestore 객체를 가져옵니다. (HTML에서 SDK 로드 가정)
  const auth = firebase.auth();
  const db = firebase.firestore();

  const writeForm = document.getElementById("write-form");
  const cancelWriteButton = document.getElementById("cancel-write");
  const writePostBtn = document.getElementById("write-post-btn"); // notice.html의 글쓰기 버튼
  const listBody = document.getElementById("notice-list-tbody"); // notice.html의 테이블 body

  // -----------------------------------------------------
  // 1. 글쓰기 페이지 접근 권한 확인 (write.html)
  // -----------------------------------------------------
  if (window.location.pathname.includes("write.html")) {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("글쓰기는 로그인한 사용자만 가능합니다. 로그인 페이지로 이동합니다.");
        window.location.href = "../login.html";
      }
    });
  }

  // -----------------------------------------------------
  // 2. 글 등록 처리 (write.html)
  // -----------------------------------------------------
  if (writeForm) {
    writeForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const user = auth.currentUser;

      // 로그인 상태 재확인
      if (!user) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        return;
      }

      const title = document.getElementById("post-title").value;
      const content = document.getElementById("post-content").value;

      // Firestore에 게시글 저장
      db.collection("notices")
        .add({
          // 'notices' 컬렉션에 추가
          title: title,
          content: content,
          authorId: user.uid,
          // 💡 추가: 작성자 이름 (displayName)을 저장합니다.
          authorName: user.displayName || "이름 없음",
          authorEmail: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          views: 0,
        })
        .then(() => {
          alert("새 글이 성공적으로 등록되었습니다.");
          window.location.href = "notice.html";
        })
        .catch((error) => {
          console.error("게시글 등록 오류:", error);
          alert("게시글 등록에 실패했습니다: " + error.message);
        });
    });
  }

  // -----------------------------------------------------
  // 3. 취소 버튼 처리 (write.html)
  // -----------------------------------------------------
  if (cancelWriteButton) {
    cancelWriteButton.addEventListener("click", () => {
      window.location.href = "notice.html";
    });
  }

  // church/js/board.js - 4. 게시글 목록 로드 및 '글쓰기' 버튼 표시 (notice.html)

  if (window.location.pathname.includes("notice.html")) {
    // ⭐ 페이지네이션 상수 정의
    const POSTS_PER_PAGE = 10;
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get("page")) || 1;
    const paginationContainer = document.querySelector(".pagination");
    const totalCountElement = document.querySelector("#total-posts"); // #total-posts ID 사용

    // 4-1. '글쓰기' 버튼 표시 제어 (로그인 시에만 보이도록)
    auth.onAuthStateChanged((user) => {
      if (writePostBtn) {
        if (user) {
          writePostBtn.classList.remove("hidden");
        } else {
          writePostBtn.classList.add("hidden");
        }
      }
    });

    // 4-2. 게시글 로드 및 페이지네이션 구현
    db.collection("notices")
      .orderBy("createdAt", "desc")
      .get() // 1차 쿼리: 전체 문서 수 확인
      .then((snapshot) => {
        const totalCount = snapshot.docs.length;
        const offset = (currentPage - 1) * POSTS_PER_PAGE;

        // 총 개수 표시
        if (totalCountElement) totalCountElement.textContent = totalCount;

        // 2차 쿼리: 현재 페이지에 해당하는 게시글만 쿼리 (Firebase 색인 설정 필수)
        return db
          .collection("notices")
          .orderBy("createdAt", "desc")
          .limit(POSTS_PER_PAGE)
          .offset(offset)
          .get() // ⭐ FIX: .get()을 호출한 결과를 다음 then()으로 전달
          .then((listSnapshot) => {
            // listSnapshot과 totalCount, offset을 다음 체인으로 전달
            return { listSnapshot, totalCount, offset };
          });
      })
      .then(({ listSnapshot, totalCount, offset }) => {
        let html = "";

        // ⭐ FIX 1: startNumber 계산 (NaN 오류 해결)
        const startNumber = totalCount - offset;

        if (listBody) {
          if (listSnapshot.empty) {
            html = '<tr><td colspan="4">등록된 게시글이 없습니다.</td></tr>';
          } else {
            listSnapshot.forEach((doc, index) => {
              const post = doc.data();
              const docId = doc.id;

              const postNumber = startNumber - index; // 번호 계산

              // ⭐ FIX 2: 날짜 포맷 (YYYY.MM.DD 형식으로 명확하게 수정)
              const dateObj = post.createdAt ? new Date(post.createdAt.toDate()) : null;
              const createdDate = dateObj
                ? dateObj.getFullYear() +
                  "." +
                  ("0" + (dateObj.getMonth() + 1)).slice(-2) +
                  "." +
                  ("0" + dateObj.getDate()).slice(-2)
                : "날짜 없음";

              const authorDisplay = post.authorName || post.authorEmail || "미상";

              html += `
                <tr>
                  <td class="col-num">${postNumber}</td> <td class="col-title"><a href="view.html?id=${docId}">${post.title}</a></td>
                  <td class="col-author">${authorDisplay}</td>
                  <td class="col-date">${createdDate}</td>
                </tr>
              `;
            });
          }
          listBody.innerHTML = html;
        }

        // 4-3. 페이지네이션 링크 생성
        generatePagination(totalCount, currentPage, POSTS_PER_PAGE, paginationContainer);
      })
      .catch((error) => {
        console.error("게시글 로드 오류:", error);
        if (listBody)
          listBody.innerHTML = '<tr><td colspan="4">게시글 로드 중 오류가 발생했습니다.</td></tr>';
      });

    // 4-4. 페이지네이션 HTML 생성 함수 정의 (generatePagination)
    function generatePagination(totalCount, currentPage, perPage, container) {
      if (!container) return;

      const totalPages = Math.ceil(totalCount / perPage);
      if (totalPages <= 1) {
        container.innerHTML = "";
        return;
      }

      let paginationHtml = "";

      // 이전 버튼
      if (currentPage > 1) {
        paginationHtml += `<a href="notice.html?page=${currentPage - 1}" class="prev">이전</a>`;
      } else {
        paginationHtml += `<a href="#" class="prev disabled">이전</a>`;
      }

      // 페이지 번호
      for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<a href="notice.html?page=${i}" class="${
          i === currentPage ? "active" : ""
        }">${i}</a>`;
      }

      // 다음 버튼
      if (currentPage < totalPages) {
        paginationHtml += `<a href="notice.html?page=${currentPage + 1}" class="next">다음</a>`;
      } else {
        paginationHtml += `<a href="#" class="next disabled">다음</a>`;
      }

      container.innerHTML = paginationHtml;
    }
  }

  // -----------------------------------------------------
  // 5. 게시글 상세 보기 (view.html)
  // -----------------------------------------------------
  if (window.location.pathname.includes("view.html")) {
    // URL에서 게시글 ID 가져오기 (예: view.html?id=abcdefg123)
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (postId) {
      db.collection("notices")
        .doc(postId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const post = doc.data();

            // 뷰 카운트 증가 (비동기 처리)
            db.collection("notices")
              .doc(postId)
              .update({
                views: firebase.firestore.FieldValue.increment(1),
              })
              .catch((error) => console.error("조회수 증가 오류:", error));

            // 날짜 포맷
            const createdDate = post.createdAt
              ? new Date(post.createdAt.toDate()).toLocaleDateString("ko-KR")
              : "날짜 없음";

            // HTML 요소에 데이터 삽입
            document.getElementById("post-title-view").textContent = post.title;
            // 💡 수정: authorName을 먼저 사용하고, 없으면 email을 사용합니다.
            document.getElementById("post-author").textContent = `작성자: ${
              post.authorName || post.authorEmail || "미상"
            }`;
            document.getElementById("post-date").textContent = `작성일: ${createdDate}`;
            document.getElementById("post-views").textContent = `조회수: ${post.views + 1}`;
            document.getElementById("post-content-view").textContent = post.content;

            const pageTitleElement = document.getElementById("page-title");
            if (pageTitleElement) pageTitleElement.textContent = `${post.title} - 의정부길교회`;

            // 수정/삭제 버튼 표시 제어 (본인 글일 경우만)
            auth.onAuthStateChanged((user) => {
              if (user && user.uid === post.authorId) {
                document.getElementById("edit-post-btn").classList.remove("hidden");
                document.getElementById("delete-post-btn").classList.remove("hidden");
              }
            });
          } else {
            document.querySelector(".post-view-section h2").textContent =
              "게시글을 찾을 수 없습니다.";
            document.getElementById("post-content-view").textContent =
              "삭제되었거나 잘못된 경로입니다.";
          }
        })
        .catch((error) => {
          console.error("게시글 상세 로드 오류:", error);
          document.querySelector(".post-view-section h2").textContent = "데이터 로드 오류";
          document.getElementById("post-content-view").textContent =
            "데이터베이스 연결에 문제가 발생했습니다.";
        });
    } else {
      document.querySelector(".post-view-section h2").textContent = "잘못된 접근입니다.";
      document.getElementById("post-content-view").textContent = "게시글 ID가 누락되었습니다.";
    }
  }
});

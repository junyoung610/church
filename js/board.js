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

      if (!user) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        return;
      }

      const title = document.getElementById("post-title").value;
      const content = document.getElementById("post-content").value;

      // Firestore에 게시글 저장
      db.collection("notices")
        .add({
          title: title,
          content: content,
          authorId: user.uid,
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

  // -----------------------------------------------------
  // 4. 게시글 목록 로드 및 '글쓰기' 버튼 표시 (notice.html)
  // -----------------------------------------------------
  if (window.location.pathname.includes("notice.html")) {
    const POSTS_PER_PAGE = 10;
    const paginationContainer = document.querySelector(".pagination");
    const totalCountElement = document.querySelector("#total-posts");
    const listBody = document.getElementById("notice-list-tbody");
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get("page")) || 1;

    // 4-1. 로그인한 사용자만 글쓰기 버튼 보이기
    auth.onAuthStateChanged((user) => {
      if (writePostBtn) {
        writePostBtn.classList.toggle("hidden", !user);
      }
    });

    // Firestore 컬렉션 참조
    const noticesRef = db.collection("notices").orderBy("createdAt", "desc");

    // 4-2. 전체 게시글 수 가져오기
    let totalCount = 0;
    noticesRef.get().then((snapshot) => {
      totalCount = snapshot.size;
      if (totalCountElement) totalCountElement.textContent = totalCount;

      // 페이지네이션 계산
      const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
      const startIndex = (currentPage - 1) * POSTS_PER_PAGE;

      // startAfter()를 위한 기준 문서 찾기
      if (startIndex === 0) {
        // 첫 페이지: 바로 limit()으로 불러옴
        loadPosts(noticesRef.limit(POSTS_PER_PAGE), totalCount, startIndex);
      } else {
        // 이전 페이지의 마지막 문서를 찾아 startAfter() 적용
        noticesRef
          .limit(startIndex)
          .get()
          .then((prevSnapshot) => {
            const lastVisible = prevSnapshot.docs[prevSnapshot.docs.length - 1];
            if (lastVisible) {
              const nextQuery = noticesRef.startAfter(lastVisible).limit(POSTS_PER_PAGE);
              loadPosts(nextQuery, totalCount, startIndex);
            } else {
              // 예외 처리
              listBody.innerHTML = '<tr><td colspan="4">데이터가 없습니다.</td></tr>';
            }
          });
      }

      // 페이지네이션 UI 생성
      generatePagination(totalCount, currentPage, POSTS_PER_PAGE, paginationContainer);
    });

    // 🔹 게시글 로드 함수
    function loadPosts(queryRef, totalCount, offset) {
      queryRef
        .get()
        .then((snapshot) => {
          let html = "";
          const startNumber = totalCount - offset;

          if (snapshot.empty) {
            html = '<tr><td colspan="4">등록된 게시글이 없습니다.</td></tr>';
          } else {
            snapshot.forEach((doc, index) => {
              const post = doc.data();
              const docId = doc.id;
              const postNumber = startNumber - index;
              const createdDate = post.createdAt
                ? new Date(post.createdAt.toDate()).toLocaleDateString("ko-KR")
                : "날짜 없음";
              const authorDisplay = post.authorName || post.authorEmail || "미상";

              html += `
              <tr>
                <td class="col-num">${postNumber}</td>
                <td class="col-title"><a href="view.html?id=${docId}">${post.title}</a></td>
                <td class="col-author">${authorDisplay}</td>
                <td class="col-date">${createdDate}</td>
              </tr>
            `;
            });
          }

          listBody.innerHTML = html;
        })
        .catch((error) => {
          console.error("게시글 로드 오류:", error);
          listBody.innerHTML = '<tr><td colspan="4">게시글 로드 중 오류가 발생했습니다.</td></tr>';
        });
    }

    // 🔹 페이지네이션 생성 함수
    function generatePagination(totalCount, currentPage, perPage, container) {
      if (!container) return;
      const totalPages = Math.ceil(totalCount / perPage);
      if (totalPages <= 1) {
        container.innerHTML = "";
        return;
      }

      let paginationHtml = "";

      // 이전 버튼
      paginationHtml +=
        currentPage > 1
          ? `<a href="notice.html?page=${currentPage - 1}" class="prev">이전</a>`
          : `<a href="#" class="prev disabled">이전</a>`;

      // 페이지 번호
      for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<a href="notice.html?page=${i}" class="${
          i === currentPage ? "active" : ""
        }">${i}</a>`;
      }

      // 다음 버튼
      paginationHtml +=
        currentPage < totalPages
          ? `<a href="notice.html?page=${currentPage + 1}" class="next">다음</a>`
          : `<a href="#" class="next disabled">다음</a>`;

      container.innerHTML = paginationHtml;
    }
  }

  // -----------------------------------------------------
  // 5. 게시글 상세 보기 및 삭제 (view.html)
  // -----------------------------------------------------
  if (window.location.pathname.includes("view.html")) {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    // 5-1. 게시글 데이터 로드 (기존 로직 유지)
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

            const createdDate = post.createdAt
              ? new Date(post.createdAt.toDate()).toLocaleDateString("ko-KR")
              : "날짜 없음";

            // HTML 요소에 데이터 삽입
            document.getElementById("post-title-view").textContent = post.title;
            document.getElementById("post-author").textContent = `작성자: ${
              post.authorName || post.authorEmail || "미상"
            }`;
            document.getElementById("post-date").textContent = `작성일: ${createdDate}`;
            document.getElementById("post-views").textContent = `조회수: ${post.views + 1}`;
            document.getElementById("post-content-view").textContent = post.content;

            const pageTitleElement = document.getElementById("page-title");
            if (pageTitleElement) pageTitleElement.textContent = `${post.title} - 의정부길교회`;

            // 5-2. 수정/삭제 버튼 표시 및 이벤트 할당
            auth.onAuthStateChanged((user) => {
              const editBtn = document.getElementById("edit-post-btn");
              const deleteBtn = document.getElementById("delete-post-btn");

              if (user && user.uid === post.authorId) {
                if (editBtn) editBtn.classList.remove("hidden");
                if (deleteBtn) deleteBtn.classList.remove("hidden");

                // ⭐ 글 삭제 이벤트 리스너 할당
                if (deleteBtn) {
                  deleteBtn.addEventListener("click", () => {
                    if (confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
                      db.collection("notices")
                        .doc(postId)
                        .delete()
                        .then(() => {
                          alert("게시글이 성공적으로 삭제되었습니다.");
                          window.location.href = "notice.html"; // 목록으로 이동
                        })
                        .catch((error) => {
                          console.error("삭제 오류:", error);
                          alert("게시글 삭제에 실패했습니다: " + error.message);
                        });
                    }
                  });
                }
              } else {
                if (editBtn) editBtn.classList.add("hidden");
                if (deleteBtn) deleteBtn.classList.add("hidden");
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

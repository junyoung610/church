// church/js/board.js - 최종 통합 및 중복 선언 오류 해결 버전

window.db = firebase.firestore();
window.auth = firebase.auth();
window.storage = firebase.storage();

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;

  // -----------------------------------------------------
  // I. 글쓰기 페이지 (write.html) 로직
  // -----------------------------------------------------
  if (currentPath.includes("write.html")) {
    const form = document.getElementById("write-form");

    // 1. 접근 권한 확인
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("글쓰기는 로그인한 사용자만 가능합니다. 로그인 페이지로 이동합니다.");
        window.location.href = "login.html";
      }
    });

    if (form) {
      const titleInput = document.getElementById("post-title");
      const contentInput = document.getElementById("post-content");
      const fileInput = document.getElementById("file");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const files = fileInput?.files || [];

        if (!title || !content) {
          alert("제목과 내용을 입력해주세요.");
          return;
        }

        try {
          // Firestore에서 사용자 이름(name) 로드
          const userDoc = await db.collection("users").doc(user.uid).get();
          let authorName = "익명";
          if (userDoc.exists) {
            authorName = userDoc.data().name || user.email;
          }

          // 🔹 파일 업로드 (Storage)
          const uploadedFiles = [];
          for (const file of files) {
            const fileRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            uploadedFiles.push({
              name: file.name,
              url: downloadURL,
              size: file.size,
              type: file.type,
            });
          }

          // 🔹 Firestore에 게시글 + 첨부파일 정보 저장
          await db.collection("notices").add({
            title,
            content,
            authorId: user.uid,
            authorName: authorName,
            authorEmail: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            attachments: uploadedFiles,
          });

          alert("게시글이 성공적으로 등록되었습니다.");
          window.location.href = "./board/notice.html";
        } catch (error) {
          console.error("글쓰기 오류:", error);
          if (
            error.code === "storage/unauthorized" ||
            error.message.includes("Permission denied")
          ) {
            alert(
              "등록 중 오류가 발생했습니다: 접근 권한이 없습니다. Firebase Storage의 '규칙'을 확인해주세요."
            );
          } else {
            alert("등록 중 오류가 발생했습니다: " + error.message);
          }
        }
      });
    }
  }

  // -----------------------------------------------------
  // II. 목록 페이지 (notice.html) 로직 (페이징 및 목록 표시)
  // -----------------------------------------------------
  if (currentPath.includes("notice.html")) {
    const POSTS_PER_PAGE = 10;
    const paginationContainer = document.querySelector(".pagination");
    const totalCountElement = document.querySelector("#total-posts");
    const listBody = document.getElementById("notice-list-tbody");
    const writePostBtn = document.querySelector("#write-post-btn");

    const noticesRef = db.collection("notices").orderBy("createdAt", "desc");

    let totalCount = 0;
    let currentPage = 1;
    let totalPages = 0;
    let pageSnapshots = [];

    // 로그인 상태에 따라 글쓰기 버튼 표시
    auth.onAuthStateChanged((user) => {
      if (writePostBtn) {
        writePostBtn.classList.toggle("hidden", !user);
      }
    });

    // 전체 게시글 수 계산 후 첫 페이지 불러오기
    noticesRef.get().then((snapshot) => {
      totalCount = snapshot.size;
      totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
      if (totalCountElement) totalCountElement.textContent = totalCount;
      loadPage(1);
    });

    // ✅ 페이지별 게시글 로드 함수
    async function loadPage(pageNumber) {
      let query = noticesRef.limit(POSTS_PER_PAGE);

      if (pageNumber > 1 && pageSnapshots[pageNumber - 2]) {
        query = noticesRef.startAfter(pageSnapshots[pageNumber - 2]).limit(POSTS_PER_PAGE);
      }

      try {
        const snapshot = await query.get();

        if (snapshot.empty) {
          listBody.innerHTML = '<tr><td colspan="4">등록된 게시글이 없습니다.</td></tr>';
          return;
        }

        pageSnapshots[pageNumber - 1] = snapshot.docs[snapshot.docs.length - 1];

        const startNumber = totalCount - (pageNumber - 1) * POSTS_PER_PAGE;
        let html = "";
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
                        <td class="col-title"><a href="./board/view.html?id=${docId}">${post.title}</a></td>
                        <td class="col-author">${authorDisplay}</td>
                        <td class="col-date">${createdDate}</td>
                    </tr>
                    `;
        });

        listBody.innerHTML = html;
        currentPage = pageNumber;
        updatePaginationUI();
      } catch (error) {
        console.error("게시글 로드 오류:", error);
        listBody.innerHTML = '<tr><td colspan="4">게시글 로드 중 오류가 발생했습니다.</td></tr>';
      }
    }

    // ✅ 숫자 기반 페이지네이션 UI 생성 (이벤트 리스너 포함)
    function updatePaginationUI() {
      let pagesHtml = "";
      for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `<a href="#" class="${
          i === currentPage ? "active" : ""
        }" data-page="${i}">${i}</a>`;
      }

      if (paginationContainer) {
        paginationContainer.innerHTML = `
                <a href="#" class="prev ${currentPage === 1 ? "disabled" : ""}">이전</a>
                ${pagesHtml}
                <a href="#" class="next ${currentPage === totalPages ? "disabled" : ""}">다음</a>
                `;

        // Event Listeners for Pagination
        paginationContainer.querySelectorAll("[data-page]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page !== currentPage) loadPage(page);
          });
        });

        const prevBtn = paginationContainer.querySelector(".prev");
        const nextBtn = paginationContainer.querySelector(".next");

        if (prevBtn) {
          prevBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage > 1) loadPage(currentPage - 1);
          });
        }

        if (nextBtn) {
          nextBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage < totalPages) loadPage(currentPage + 1);
          });
        }
      }
    }
  }

  // -----------------------------------------------------
  // III. 상세 보기 페이지 (view.html) 로직
  // -----------------------------------------------------
  if (currentPath.includes("view.html")) {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (postId) {
      // 5-1. 게시글 데이터 로드 및 뷰 카운트 증가
      db.collection("notices")
        .doc(postId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const post = doc.data();
            const postViews = post.views || 0;

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
            document.getElementById("post-views").textContent = `조회수: ${postViews + 1}`;
            document.getElementById("post-content-view").textContent = post.content;

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
                          window.location.href = "./board/notice.html";
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

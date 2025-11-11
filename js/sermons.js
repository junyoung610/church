// ------------------------------------------------------------------
// SECTION I: Utility Functions for YouTube (전역 함수)
// ------------------------------------------------------------------

/**
 * YouTube URL에서 비디오 ID를 추출합니다.
 */
function getYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com")) {
      return urlObj.searchParams.get("v");
    } else if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.substring(1);
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * 비디오 ID를 사용하여 임베드 iframe HTML을 생성합니다.
 */
function createYouTubeIframe(videoId) {
  if (!videoId) return "";
  return `<iframe width="100%" height="450" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

// ------------------------------------------------------------------
// SECTION II–IV: Main Logic (DOMContentLoaded)
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();

  const currentPath = window.location.pathname;

  // -----------------------------------------------------
  // II. 글쓰기 / 수정 페이지 (sermons/write.html)
  // -----------------------------------------------------
  if (currentPath.includes("sermons/write.html")) {
    const form = document.getElementById("write-form");
    const submitButton = document.querySelector('button[type="submit"]');

    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("글쓰기는 로그인한 사용자만 가능합니다. 로그인 페이지로 이동합니다.");
        window.location.href = "../login.html";
      }
    });

    if (form) {
      const titleInput = document.getElementById("post-title");
      const contentInput = document.getElementById("post-content");
      const youtubeLinkInput = document.getElementById("youtube-link");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const youtubeLink = youtubeLinkInput.value.trim();

        if (!title || !content) {
          alert("제목과 내용을 입력해주세요.");
          return;
        }

        let videoId = null;
        if (youtubeLink) {
          videoId = getYouTubeVideoId(youtubeLink);
          if (!videoId) {
            alert("유효한 YouTube 링크를 입력해주세요.");
            return;
          }
        }

        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          let authorName = user.email;
          if (userDoc.exists) {
            authorName = userDoc.data().name || user.email;
          }

          const postData = {
            title,
            content,
            authorName,
            authorUid: user.uid,
            authorEmail: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            youtube_link: youtubeLink,
            youtube_videoId: videoId,
          };

          const urlParams = new URLSearchParams(window.location.search);
          const postId = urlParams.get("id");
          const isEditMode = urlParams.get("mode") === "edit" && postId;

          if (isEditMode) {
            await db.collection("sermons").doc(postId).update(postData);
            alert("설교 말씀이 성공적으로 수정되었습니다.");
            window.location.href = `./view.html?id=${postId}`;
          } else {
            await db.collection("sermons").add(postData);
            alert("설교 말씀이 성공적으로 작성되었습니다.");
            window.location.href = "./list.html";
          }
        } catch (error) {
          console.error("Error saving document:", error.message);
          alert("저장 중 오류가 발생했습니다: " + error.message);
        }
      });

      // 수정 모드 데이터 로드
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get("id");
      const isEditMode = urlParams.get("mode") === "edit" && postId;

      if (isEditMode) {
        document.querySelector("h2").textContent = "설교 말씀 수정";
        if (submitButton) submitButton.textContent = "수정 완료";

        db.collection("sermons")
          .doc(postId)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const post = doc.data();
              titleInput.value = post.title;
              contentInput.value = post.content;
              youtubeLinkInput.value = post.youtube_link || "";
            }
          });
      }
    }
  }

  // sermons.js (SECTION III. 목록 페이지, loadPage 함수 부분만 확인하세요)

  // ... (중략: SECTION II 까지는 이전과 동일)

  // -----------------------------------------------------
  // III. 목록 페이지 (sermons/list.html)
  // -----------------------------------------------------
  if (currentPath.includes("sermons/list.html")) {
    const POSTS_PER_PAGE = 10;
    const paginationContainer = document.querySelector(".pagination");
    const totalCountElement = document.querySelector("#total-posts");
    const listBody = document.getElementById("notice-list-tbody");
    const writePostBtn = document.querySelector("#write-post-btn");

    const sermonsRef = db.collection("sermons").orderBy("createdAt", "desc");

    let totalCount = 0;
    let currentPage = 1;
    let totalPages = 0;
    let pageSnapshots = [];

    // [중요] 페이지네이션을 위한 초기 전체 카운트 로직은 유지
    sermonsRef.get().then((snapshot) => {
      totalCount = snapshot.size || 0;
      totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
      if (totalCountElement) totalCountElement.textContent = totalCount; // 총 개수 표시 로직은 유지 (NaN 문제와 별개)
      loadPage(1);
    });

    function updatePaginationUI() {
      // ... (페이지네이션 UI 로직은 생략/유지)
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

    auth.onAuthStateChanged((user) => {
      if (writePostBtn) writePostBtn.classList.toggle("hidden", !user);
    });

    // ----------------------------------------------------------------------
    // 🔥 loadPage 함수: 번호 계산 로직을 가장 단순하게 변경
    // ----------------------------------------------------------------------
    async function loadPage(pageNumber) {
      let query = sermonsRef.limit(POSTS_PER_PAGE);
      if (pageNumber > 1 && pageSnapshots[pageNumber - 2]) {
        query = sermonsRef.startAfter(pageSnapshots[pageNumber - 2]).limit(POSTS_PER_PAGE);
      }

      try {
        const snapshot = await query.get();
        if (!listBody) return;

        if (snapshot.empty) {
          listBody.innerHTML = '<tr><td colspan="4">등록된 게시글이 없습니다.</td></tr>';
          currentPage = pageNumber;
          updatePaginationUI();
          return;
        }

        // ✅ [중요] loadPage 내부에서 전체 카운트를 다시 조회하는 비효율적인 코드를 제거했습니다.
        // const allSnapshot = await sermonsRef.get(); // 제거
        // let totalPosts = Number(allSnapshot.size) || 0; // 제거

        pageSnapshots[pageNumber - 1] = snapshot.docs[snapshot.docs.length - 1];

        // 2. 게시글 번호 계산: 페이지 내 순번으로만 사용 (가장 안전한 방법)
        let startNumber = (pageNumber - 1) * POSTS_PER_PAGE + 1;

        let html = "";
        snapshot.forEach((doc, index) => {
          const post = doc.data();
          const docId = doc.id;

          // 3. 개별 게시글 번호는 현재 페이지의 순번 + index로 설정
          // 이 계산에는 NaN을 유발할 수 있는 변수가 전혀 없습니다.
          let postNumber = startNumber + index;

          const createdDate = post.createdAt
            ? new Date(post.createdAt.toDate()).toLocaleDateString("ko-KR")
            : "날짜 없음";
          const authorDisplay = post.authorName || post.authorEmail || "미상";

          html += `
          <tr>
            <td class="col-num">${postNumber}</td>
            <td class="col-title"><a href="./view.html?id=${docId}">${
            post.title || "제목 없음"
          }</a></td>
            <td class="col-author">${authorDisplay}</td>
            <td class="col-date">${createdDate}</td>
          </tr>`;
        });

        listBody.innerHTML = html;
        currentPage = pageNumber;
        updatePaginationUI();
      } catch (error) {
        console.error("게시글 로드 중 오류:", error);
        listBody.innerHTML = '<tr><td colspan="4">게시글 로드 중 오류가 발생했습니다.</td></tr>';
      }
    }
  } // <-- III. 목록 페이지 (sermons/list.html) if문의 닫는 중괄호

  // ... (이하 SECTION IV는 이전과 동일)

  // -----------------------------------------------------
  // IV. 상세 보기 페이지 (sermons/view.html)
  // -----------------------------------------------------
  if (currentPath.includes("sermons/view.html")) {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (postId) {
      db.collection("sermons")
        .doc(postId)
        .update({
          views: firebase.firestore.FieldValue.increment(1),
        })
        .catch((error) => console.error("조회수 증가 오류:", error));

      db.collection("sermons")
        .doc(postId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const post = doc.data();
            const postViews = (post.views || 0) + 1;
            const createdDate = post.createdAt
              ? new Date(post.createdAt.toDate()).toLocaleDateString("ko-KR")
              : "날짜 없음";

            document.getElementById("post-title-view").textContent = post.title;
            document.getElementById("post-author").textContent = `작성자: ${
              post.authorName || post.authorEmail || "미상"
            }`;
            document.getElementById("post-date").textContent = `작성일: ${createdDate}`;
            document.getElementById("post-views").textContent = `조회수: ${postViews}`;
            document.getElementById("post-content-view").textContent = post.content;

            const videoId = post.youtube_videoId || getYouTubeVideoId(post.youtube_link);
            const videoContainer = document.getElementById("youtube-video-container");

            if (videoContainer) {
              videoContainer.innerHTML = videoId ? createYouTubeIframe(videoId) : "";
            }

            const editBtn = document.getElementById("edit-post-btn");
            const deleteBtn = document.getElementById("delete-post-btn");

            auth.onAuthStateChanged((user) => {
              if (user && user.uid === post.authorUid) {
                if (editBtn) editBtn.classList.remove("hidden");
                if (deleteBtn) deleteBtn.classList.remove("hidden");

                if (editBtn) {
                  editBtn.addEventListener("click", () => {
                    window.location.href = `./write.html?id=${postId}&mode=edit`;
                  });
                }

                if (deleteBtn) {
                  deleteBtn.addEventListener("click", () => {
                    if (confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
                      db.collection("sermons")
                        .doc(postId)
                        .delete()
                        .then(() => {
                          alert("게시글이 성공적으로 삭제되었습니다.");
                          window.location.href = "./list.html";
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

            const listBtn = document.getElementById("list-btn");
            if (listBtn) {
              listBtn.addEventListener("click", () => {
                window.location.href = "./list.html";
              });
            }
          } else {
            document.querySelector(".post-view-section h2").textContent =
              "게시글을 찾을 수 없습니다.";
          }
        })
        .catch((error) => {
          console.error("게시글 상세 로드 오류:", error);
          document.querySelector(".post-view-section h2").textContent = "데이터 로드 오류";
        });
    }
  }
}); // <-- document.addEventListener의 닫는 괄호 및 중괄호

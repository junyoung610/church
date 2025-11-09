// junyoung610/.../js/sermons.js - 최종 완성 및 오류 수정 버전

// Firebase 객체는 auth.js가 로드된 후 전역에서 사용 가능합니다.
// board.js에서와 마찬가지로 전역 객체로 사용합니다.

// ------------------------------------------------------------------
// SECTION I: Utility Functions for YouTube (전역 함수)
// ------------------------------------------------------------------

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

function createYouTubeIframe(videoId) {
  if (!videoId) return "";
  return `<iframe width="100%" height="450" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

// ------------------------------------------------------------------
// SECTION II, III, IV: 메인 로직 (DOMContentLoaded)
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Firebase 객체는 DOMContentLoaded 내에서 안전하게 참조합니다.
  const auth = firebase.auth();
  const db = firebase.firestore();

  const currentPath = window.location.pathname; // ----------------------------------------------------- // II. 글쓰기/수정 페이지 (sermons/write.html) 로직 // -----------------------------------------------------

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
        if (!user) return; // ... (데이터 및 유효성 검사 로직 유지) ...

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const youtubeLink = youtubeLinkInput.value.trim();

        if (!title || !content || !youtubeLink) {
          alert("모든 필드를 채워주세요.");
          return;
        }

        const videoId = getYouTubeVideoId(youtubeLink);
        if (!videoId) {
          alert("유효한 YouTube 링크를 입력해주세요.");
          return;
        }

        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          let authorName = user.email;
          if (userDoc.exists) {
            authorName = userDoc.data().name || user.email;
          }

          const postData = {
            title: title,
            content: content,
            authorName: authorName,
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
            window.location.href = `./sermons/view.html?id=${postId}`;
          } else {
            await db.collection("sermons").add(postData);
            alert("설교 말씀이 성공적으로 작성되었습니다.");
            window.location.href = "list.html";
          }
        } catch (error) {
          console.error("Error saving document: ", error);
          alert("저장 중 오류가 발생했습니다: " + error.message);
        }
      }); // 편집 모드 데이터 로드 로직 (코드 유지)

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
  } // ----------------------------------------------------- // III. 목록 페이지 (sermons/list.html) 로직 // -----------------------------------------------------

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

    // ⭐⭐⭐ 페이지네이션 UI 업데이트 함수 정의 (2.번 해결) ⭐⭐⭐
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
    // ⭐⭐⭐ 페이지네이션 UI 업데이트 함수 정의 끝 ⭐⭐⭐

    auth.onAuthStateChanged((user) => {
      if (writePostBtn) {
        writePostBtn.classList.toggle("hidden", !user);
      }
    });

    sermonsRef.get().then((snapshot) => {
      totalCount = snapshot.size;
      totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
      if (totalCountElement) totalCountElement.textContent = totalCount;
      loadPage(1);
    });

    async function loadPage(pageNumber) {
      let query = sermonsRef.limit(POSTS_PER_PAGE);

      if (pageNumber > 1 && pageSnapshots[pageNumber - 2]) {
        query = sermonsRef.startAfter(pageSnapshots[pageNumber - 2]).limit(POSTS_PER_PAGE);
      }

      try {
        const snapshot = await query.get();

        if (snapshot.empty) {
          listBody.innerHTML = '<tr><td colspan="4">등록된 게시글이 없습니다.</td></tr>';
          return;
        }

        pageSnapshots[pageNumber - 1] = snapshot.docs[snapshot.docs.length - 1]; // ⭐ 누락된 핵심 렌더링 로직 (공백 제거하여 &nbsp; 문제 해결) ⭐

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

          html += `<tr><td class="col-num">${postNumber}</td><td class="col-title"><a href="./sermons/view.html?id=${docId}">${post.title}</a></td><td class="col-author">${authorDisplay}</td><td class="col-date">${createdDate}</td></tr>`;
        });
        listBody.innerHTML = html;
        currentPage = pageNumber;
        updatePaginationUI();
      } catch (error) {
        console.error("게시글 로드 중 오류:", error);
        listBody.innerHTML = '<tr><td colspan="4">게시글 로드 중 오류가 발생했습니다.</td></tr>';
      }
    }
  } // ----------------------------------------------------- // IV. 상세 보기 페이지 (sermons/view.html) 로직 // -----------------------------------------------------

  if (currentPath.includes("sermons/view.html")) {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (postId) {
      // ⭐ 컬렉션 이름: sermons
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
              : "날짜 없음"; // ⭐ HTML 요소 ID 수정: post-title-view 등 view.html에 맞는 ID로 수정 필요 // view.html에는 post-title-view가 없으므로 h2 태그를 직접 수정합니다. (오류 3 해결)

            const titleElement = document.querySelector(".post-view-section h2");
            if (titleElement) titleElement.textContent = post.title; // post-meta 영역의 데이터는 view.html에 없으므로 (현재 코드 기준),

            // ⭐ 1. HTML 요소에 데이터 삽입 (view.html의 ID와 일치)
            document.getElementById("post-title-view").textContent = post.title; // ⭐ ID 수정
            document.getElementById("post-author").textContent = `작성자: ${
              post.authorName || post.authorEmail || "미상"
            }`;
            document.getElementById("post-date").textContent = `작성일: ${createdDate}`;
            document.getElementById("post-views").textContent = `조회수: ${postViews}`;
            document.getElementById("post-content-view").textContent = post.content;

            // 상세 내용을 표시하는 로직만 유지합니다.

            document.getElementById("post-content-view").textContent = post.content; // ⭐ 유튜브 영상 임베드

            const videoId = post.youtube_videoId || getYouTubeVideoId(post.youtube_link);
            const videoContainer = document.getElementById("youtube-video-container");

            if (videoId && videoContainer) {
              videoContainer.innerHTML = createYouTubeIframe(videoId);
            }
          } else {
            document.querySelector(".post-view-section h2").textContent =
              "게시글을 찾을 수 없습니다.";
          }
          // ⭐ 2. 목록으로 버튼 이벤트 추가 ⭐
          const listBtn = document.getElementById("list-btn");
          if (listBtn) {
            listBtn.addEventListener("click", () => {
              window.location.href = "list.html";
            });
          }
        })

        .catch((error) => {
          console.error("게시글 상세 로드 오류:", error);
          document.querySelector(".post-view-section h2").textContent = "데이터 로드 오류";
        });
    }
  }
});

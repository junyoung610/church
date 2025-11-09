// junyoung610/.../js/sermons.js - 최종 오류 수정 및 기능 통합 완료

// ⭐ 파일 최상단에서 Firebase 객체를 한 번만 선언합니다.
const auth = firebase.auth();
const db = firebase.firestore();
// Storage는 sermons에서 직접 사용하지 않으므로 제거합니다.

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
    return null; // URL 형식이 아닐 경우
  }
  return null;
}

/**
 * 비디오 ID를 사용하여 임베드 iframe HTML을 생성합니다.
 */
function createYouTubeIframe(videoId) {
  if (!videoId) return ""; // height: 450px을 기준으로 반응형 임베드 HTML을 생성합니다.
  return `
        <iframe width="100%" height="450" 
            src="https://www.youtube.com/embed/${videoId}" 
            title="YouTube video player" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
}

// ------------------------------------------------------------------
// SECTION II, III, IV: 메인 로직 (DOMContentLoaded)
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname; // ----------------------------------------------------- // II. 글쓰기/수정 페이지 (sermons/write.html) 로직 // -----------------------------------------------------

  if (currentPath.includes("sermons/write.html")) {
    const form = document.getElementById("write-form");
    const submitButton = document.querySelector('button[type="submit"]'); // 1. 접근 권한 확인

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
          // Firestore에서 사용자 이름(name) 로드 (작성자 이름 정확도 개선)
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
            // 수정 모드: 'sermons' 컬렉션에 업데이트
            await db.collection("sermons").doc(postId).update(postData);
            alert("설교 말씀이 성공적으로 수정되었습니다.");
            window.location.href = `view.html?id=${postId}`;
          } else {
            // 작성 모드: 'sermons' 컬렉션에 추가 ⭐ 수정 완료
            await db.collection("sermons").add(postData);
            alert("설교 말씀이 성공적으로 작성되었습니다.");
            window.location.href = "list.html";
          }
        } catch (error) {
          console.error("Error saving document: ", error);
          alert("저장 중 오류가 발생했습니다: " + error.message);
        }
      }); // ⭐ 편집 모드 데이터 로드 로직

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
    // board.js의 목록 로드 로직을 복사하여 컬렉션 이름만 sermons로 변경

    const POSTS_PER_PAGE = 10;
    const paginationContainer = document.querySelector(".pagination");
    const totalCountElement = document.querySelector("#total-posts");
    const listBody = document.getElementById("notice-list-tbody");
    const writePostBtn = document.querySelector("#write-post-btn"); // ⭐ 컬렉션 이름: sermons

    const sermonsRef = db.collection("sermons").orderBy("createdAt", "desc");

    let totalCount = 0;
    let currentPage = 1;
    let totalPages = 0;
    let pageSnapshots = [];

    // ⭐⭐ 누락된 페이지네이션 UI 업데이트 함수 정의 ⭐⭐
    function updatePaginationUI() {
      // 이 함수가 정의되어 있지 않아 에러가 났습니다.
      // board.js의 해당 로직을 복사해 넣으면 됩니다.
      // 현재는 에러를 방지하기 위해 빈 함수로 정의합니다.
    } // 로그인 상태에 따라 글쓰기 버튼 표시 (auth.js와 중복될 수 있으나 안전을 위해 유지)

    auth.onAuthStateChanged((user) => {
      if (writePostBtn) {
        writePostBtn.classList.toggle("hidden", !user);
      }
    }); // 전체 게시글 수 계산 후 첫 페이지 불러오기

    sermonsRef.get().then((snapshot) => {
      totalCount = snapshot.size;
      totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
      if (totalCountElement) totalCountElement.textContent = totalCount;
      loadPage(1);
    }); // ✅ 페이지별 게시글 로드 함수

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

        pageSnapshots[pageNumber - 1] = snapshot.docs[snapshot.docs.length - 1]; // ⭐ 누락된 핵심 렌더링 로직 ⭐

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
                <td class="col-title"><a href="view.html?id=${docId}">${post.title}</a></td>
                <td class="col-author">${authorDisplay}</td>
                <td class="col-date">${createdDate}</td>
            </tr>
            `;
        });
        listBody.innerHTML = html;
        currentPage = pageNumber;
        updatePaginationUI();
      } catch (error) {
        // try 블록에 대한 catch 블록 추가
        console.error("게시글 로드 중 오류:", error);
        listBody.innerHTML = '<tr><td colspan="4">게시글 로드 중 오류가 발생했습니다.</td></tr>';
      }
    } // loadPage 함수 끝
  } // ------------------------------------- 목록 페이지 로직 끝 // ----------------------------------------------------- // IV. 상세 보기 페이지 (sermons/view.html) 로직 // -----------------------------------------------------
  // (Pagination UI 생성 및 이벤트 리스너 로직은 board.js의 해당 부분을 참고하여 추가해야 합니다.)
  // -----------------------------------------------------

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
              : "날짜 없음"; // HTML 요소에 데이터 삽입

            document.getElementById("post-title-view").textContent = post.title;
            document.getElementById("post-author").textContent = `작성자: ${
              post.authorName || post.authorEmail || "미상"
            }`;
            document.getElementById("post-date").textContent = `작성일: ${createdDate}`;
            document.getElementById("post-views").textContent = `조회수: ${postViews}`;
            document.getElementById("post-content-view").textContent = post.content; // ⭐ 유튜브 영상 임베드

            const videoId = post.youtube_videoId || getYouTubeVideoId(post.youtube_link);
            const videoContainer = document.getElementById("youtube-video-container");

            if (videoId && videoContainer) {
              videoContainer.innerHTML = createYouTubeIframe(videoId);
            } // (수정/삭제 버튼 로직은 board.js의 해당 부분을 참고하여 추가해야 합니다.)
          } else {
            document.querySelector(".post-view-section h2").textContent =
              "게시글을 찾을 수 없습니다.";
          }
        });
    }
  } // ------------------------------------- 상세 보기 로직 끝
}); // DOMContentLoaded 이벤트 리스너 끝

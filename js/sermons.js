const auth = firebase.auth();
const db = firebase.firestore();

// ------------------------------------------------------------------
// SECTION I: Utility Functions for YouTube (함수는 전역에 정의)
// ... (getYouTubeVideoId와 createYouTubeIframe 함수는 그대로 유지)
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;

  // ------------------------------------------------------------------
  // SECTION II: WRITE/EDIT LOGIC (sermons/write.html)
  // ------------------------------------------------------------------
  if (currentPath.includes("sermons/write.html")) {
    const form = document.getElementById("write-form");

    // 1. 접근 권한 확인
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("글쓰기는 로그인한 사용자만 가능합니다. 로그인 페이지로 이동합니다.");
        window.location.href = "../login.html";
      }
    });

    if (form) {
      // ⭐ HTML 필드 ID를 정확히 사용합니다.
      const titleInput = document.getElementById("post-title");
      const contentInput = document.getElementById("post-content");
      const youtubeLinkInput = document.getElementById("youtube-link"); // ⭐ 수정된 ID 사용

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // ... (나머지 글쓰기 로직은 이전 답변의 내용과 동일하게 유지)
        // ... (작성자 이름 로드, 유효성 검사, YouTube ID 추출)

        const user = auth.currentUser;
        // ... (title, content, youtubeLink 변수 가져오기)
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const youtubeLink = youtubeLinkInput.value.trim(); // ⭐ 수정된 ID 사용

        // ... (유효성 검사 및 data 구성 로직 유지)
        const videoId = getYouTubeVideoId(youtubeLink);
        if (!videoId) {
          alert("유효한 YouTube 링크를 입력해주세요.");
          return;
        }

        try {
          // Firestore에서 사용자 이름(name) 로드
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

          // ... (수정/작성 모드 구분 로직 유지 및 db.collection('sermons') 사용 확인)
          await db.collection("sermons").add(postData); // ⭐ 작성 모드 가정
          alert("설교 말씀이 성공적으로 작성되었습니다.");
          window.location.href = "list.html";
        } catch (error) {
          console.error("Error saving document: ", error);
          alert("저장 중 오류가 발생했습니다: " + error.message);
        }
      });

      // 편집 모드 데이터 로드 (추가 로직)
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get("id");
      const isEditMode = urlParams.get("mode") === "edit" && postId;

      if (isEditMode) {
        document.querySelector("h2").textContent = "설교 말씀 수정";
        submitButton.textContent = "수정 완료";

        db.collection("sermons")
          .doc(postId)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const post = doc.data();
              document.getElementById("title").value = post.title;
              document.getElementById("content").value = post.content;
              document.getElementById("youtube_link").value = post.youtube_link || "";
            }
          });
      }
    }
  }

  // ------------------------------------------------------------------
  // SECTION III: VIEW LOGIC (sermons/view.html)
  // ------------------------------------------------------------------
  if (currentPath.includes("sermons/view.html")) {
    // ... (이 부분은 이전 답변의 VIEW LOGIC을 참고하여 통합해야 합니다.)
    // **주의**: board.js의 VIEW LOGIC을 복사해와서 collection 이름을 'sermons'로 변경해야 합니다.
    // 이 로직이 누락되어 있으니, 필요 시 추가 요청해주세요.
  }
});

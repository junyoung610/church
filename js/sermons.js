// junyoung610/.../js/sermons.js - 수정 통합본

// ⭐ 1. Firebase 객체는 HTML에서 로드되므로, 여기서 'const'로 다시 선언하지 않습니다.
// 대신, 전역 변수(window 객체에 이미 초기화되어 있다고 가정)를 사용합니다.
const auth = firebase.auth();
const db = firebase.firestore();

// ------------------------------------------------------------------
// SECTION I: Utility Functions for YouTube (함수는 전역에 정의)
// ------------------------------------------------------------------

/**
 * YouTube URL에서 비디오 ID를 추출합니다.
 * ... (기존 getYouTubeVideoId 함수 내용 유지)
 */
function getYouTubeVideoId(url) {
  if (!url) return null;
  const urlObj = new URL(url);
  if (urlObj.hostname.includes("youtube.com")) {
    return urlObj.searchParams.get("v");
  } else if (urlObj.hostname.includes("youtu.be")) {
    return urlObj.pathname.substring(1);
  }
  return null;
}

/**
 * 비디오 ID를 사용하여 임베드 iframe HTML을 생성합니다.
 * ... (기존 createYouTubeIframe 함수 내용 유지)
 */
function createYouTubeIframe(videoId) {
  if (!videoId) return "";
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
// SECTION II: WRITE/EDIT LOGIC (sermons/write.html)
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;

  if (currentPath.includes("sermons/write.html")) {
    const form = document.getElementById("write-form");
    const submitButton = document.getElementById("submit-button"); // '작성 완료' 버튼 ID
    const errorMessage = document.getElementById("error-message");

    // 1. 접근 권한 확인
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("글쓰기는 로그인한 사용자만 가능합니다. 로그인 페이지로 이동합니다.");
        window.location.href = "../login.html"; // 경로 수정
      }
    });

    if (form) {
      // ⭐ onsubmit 대신 JS에서 이벤트 리스너 연결
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMessage.textContent = "";

        const user = auth.currentUser;
        if (!user) return;

        const title = document.getElementById("title").value;
        const content = document.getElementById("content").value;
        const youtubeLink = document.getElementById("youtube_link").value;

        if (!title || !content || !youtubeLink) {
          errorMessage.textContent = "모든 필드를 채워주세요.";
          return;
        }

        const videoId = getYouTubeVideoId(youtubeLink);
        if (!videoId) {
          errorMessage.textContent = "유효한 YouTube 링크를 입력해주세요.";
          return;
        }

        // Firestore 데이터 로드 (작성자 이름 가져오기)
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

        // 수정 모드 확인
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get("id");
        const isEditMode = urlParams.get("mode") === "edit" && postId;

        try {
          if (isEditMode) {
            // 수정 모드
            await db.collection("sermons").doc(postId).update(postData);
            alert("설교 말씀이 성공적으로 수정되었습니다.");
            window.location.href = `view.html?id=${postId}`;
          } else {
            // 작성 모드
            await db.collection("sermons").add(postData);
            alert("설교 말씀이 성공적으로 작성되었습니다.");
            window.location.href = "list.html";
          }
        } catch (error) {
          console.error("Error saving document: ", error);
          errorMessage.textContent = "저장 중 오류가 발생했습니다: " + error.message;
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

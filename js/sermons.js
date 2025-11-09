// junyoung610/.../js/sermons.js
const db = firebase.firestore();

// ------------------------------------------------------------------
// SECTION I: Utility Functions for YouTube
// ------------------------------------------------------------------

/**
 * YouTube URL에서 비디오 ID를 추출합니다.
 * @param {string} url - YouTube URL (e.g., watch?v=ID, youtu.be/ID)
 * @returns {string|null} - 비디오 ID 또는 null
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
 * @param {string} videoId - 추출된 YouTube 비디오 ID
 * @returns {string} - iframe HTML 코드
 */
function createYouTubeIframe(videoId) {
  if (!videoId) return "";
  // 반응형 임베드를 위한 YouTube 공식 iframe 형식 사용
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
// SECTION II: LIST LOGIC (sermons/list.html)
// ------------------------------------------------------------------

const currentPath = window.location.pathname;
const isSermonsList = currentPath.includes("sermons/list.html");
const isSermonsView = currentPath.includes("sermons/view.html");

if (isSermonsList) {
  // collection 이름을 'sermons'로 변경
  loadPage("sermons", "sermons/view.html", "notice-list-tbody", "pagination-div");
}

// loadPage 함수는 js/common.js에 정의되어 있음.
// -> (loadPage를 js/common.js로 옮겼거나, 이 파일에 정의되어 있다는 가정 하에 진행)

// ------------------------------------------------------------------
// SECTION III: WRITE/EDIT LOGIC (sermons/write.html)
// ------------------------------------------------------------------

// 게시글 저장 함수 (write.html, write.html)
function savePost(event, collectionName = "sermons") {
  event.preventDefault();

  // (이메일 인증 확인 로직은 auth.js 또는 common.js에 있어야 함)

  const user = firebase.auth().currentUser;
  if (!user) {
    document.getElementById("error-message").textContent = "로그인이 필요합니다.";
    return;
  }

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const youtubeLink = document.getElementById("youtube_link").value; // ⭐ 유튜브 링크 추가

  if (!title || !content || !youtubeLink) {
    document.getElementById("error-message").textContent = "모든 필드를 채워주세요.";
    return;
  }

  // Youtube ID 유효성 검사
  const videoId = getYouTubeVideoId(youtubeLink);
  if (!videoId) {
    document.getElementById("error-message").textContent = "유효한 YouTube 링크를 입력해주세요.";
    return;
  }

  // Firestore에 저장할 데이터 구성
  const postData = {
    title: title,
    content: content,
    author: user.email,
    authorUid: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    views: 0,
    youtube_link: youtubeLink, // ⭐ 유튜브 링크 저장
    youtube_videoId: videoId, // ⭐ 비디오 ID 저장
  };

  // 수정 모드 확인 (view.html에서 이동했을 경우)
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");
  const isEditMode = urlParams.get("mode") === "edit" && postId;

  if (isEditMode) {
    // 수정 모드: 파일 관련 로직 제거, youtube_link만 업데이트
    db.collection(collectionName)
      .doc(postId)
      .update(postData)
      .then(() => {
        alert("게시글이 성공적으로 수정되었습니다.");
        window.location.href = `view.html?id=${postId}`;
      })
      .catch((error) => {
        console.error("Error updating document: ", error);
        document.getElementById("error-message").textContent = "수정 중 오류가 발생했습니다.";
      });
  } else {
    // 작성 모드: 파일 관련 로직 제거, youtube_link만 저장
    db.collection(collectionName)
      .add(postData)
      .then(() => {
        alert("설교 말씀이 성공적으로 작성되었습니다.");
        window.location.href = "list.html";
      })
      .catch((error) => {
        console.error("Error adding document: ", error);
        document.getElementById("error-message").textContent = "작성 중 오류가 발생했습니다.";
      });
  }
}

// ------------------------------------------------------------------
// SECTION IV: VIEW LOGIC (sermons/view.html)
// ------------------------------------------------------------------

if (isSermonsView) {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (postId) {
    // 1. 조회수 업데이트 및 게시글 데이터 로드 (collection 이름을 'sermons'로 변경)
    db.collection("sermons")
      .doc(postId)
      .update({ views: firebase.firestore.FieldValue.increment(1) });

    db.collection("sermons")
      .doc(postId)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const post = doc.data();
          const postViews = (post.views || 0) + 1; // 조회수 +1
          const createdDate = post.createdAt
            ? new Date(post.createdAt.toDate()).toLocaleDateString()
            : "N/A";

          // 2. HTML 요소에 데이터 삽입
          document.getElementById("post-title-view").textContent = post.title;
          document.getElementById("post-author-view").textContent = post.author.split("@")[0];
          document.getElementById("post-date-view").textContent = createdDate;
          document.getElementById("post-views-view").textContent = postViews;
          document.getElementById("post-content-view").textContent = post.content;

          // ⭐ 3. 유튜브 영상 임베드
          const videoId = post.youtube_videoId || getYouTubeVideoId(post.youtube_link);
          const videoContainer = document.getElementById("youtube-video-container");
          if (videoId && videoContainer) {
            videoContainer.innerHTML = createYouTubeIframe(videoId);
          }

          // ⭐ 4. 수정/삭제 버튼 처리 (board.js 로직과 유사)
          firebase.auth().onAuthStateChanged((user) => {
            const editButton = document.getElementById("edit-button");
            const deleteButton = document.getElementById("delete-button");

            if (user && user.email === post.author) {
              // 수정 버튼: write.html로 이동 + mode=edit 파라미터 추가
              editButton.href = `./sermons/write.html?id=${postId}&mode=edit`;
              editButton.classList.remove("hidden");

              // 삭제 버튼: deletePost 함수 연결
              deleteButton.onclick = () => deletePost(postId, "sermons", "list.html");
              deleteButton.classList.remove("hidden");
            }
          });
        } else {
          alert("게시글을 찾을 수 없습니다.");
          window.location.href = "list.html";
        }
      })
      .catch((error) => {
        console.error("Error getting document:", error);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
        window.location.href = "list.html";
      });
  }
}

// ------------------------------------------------------------------
// SECTION V: EDIT VIEW LOGIC (sermons/write.html - for editing)
// ------------------------------------------------------------------

const isSermonsEdit =
  currentPath.includes("sermons/write.html") &&
  new URLSearchParams(window.location.search).get("mode") === "edit";

if (isSermonsEdit) {
  // (write.js 로직을 sermons.js에 통합)
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (postId) {
    document.querySelector("h2").textContent = "설교 말씀 수정";
    document.getElementById("submit-button").textContent = "수정 완료";

    db.collection("sermons")
      .doc(postId)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const post = doc.data();

          // 현재 로그인 사용자와 작성자 일치 여부 확인
          if (firebase.auth().currentUser && firebase.auth().currentUser.email !== post.author) {
            alert("수정 권한이 없습니다.");
            window.location.href = `./sermons/view.html?id=${postId}`;
            return;
          }

          document.getElementById("title").value = post.title;
          document.getElementById("content").value = post.content;
          document.getElementById("youtube_link").value = post.youtube_link || ""; // ⭐ 유튜브 링크 채우기
        } else {
          alert("게시글을 찾을 수 없습니다.");
          window.location.href = "list.html";
        }
      })
      .catch((error) => {
        console.error("Error fetching document for edit:", error);
        alert("게시글 정보를 불러오는 중 오류가 발생했습니다.");
      });

    // onsubmit 핸들러를 savePost(event, 'sermons')로 유지하면, 내부 로직이 업데이트를 처리함
  }
}

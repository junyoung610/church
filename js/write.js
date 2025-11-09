const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const form = document.getElementById("write-form");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const fileInput = document.getElementById("file");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("로그인 후 글을 작성할 수 있습니다.");
    return;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const files = fileInput.files;

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  try {
    // 🔹 1. 파일 업로드 (Storage)
    const uploadedFiles = [];

    for (const file of files) {
      const storageRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();

      uploadedFiles.push({
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
      });
    }

    // 🔹 2. 게시글 데이터 Firestore에 저장
    await db.collection("notices").add({
      title,
      content,
      authorName: user.displayName || "익명",
      authorEmail: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      attachments: uploadedFiles, // 파일 정보 저장
    });

    alert("게시글이 등록되었습니다.");
    window.location.href = "notice.html";
  } catch (error) {
    console.error("글쓰기 오류:", error);
    alert("등록 중 오류가 발생했습니다.");
  }
});

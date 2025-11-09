document.addEventListener("DOMContentLoaded", () => {
  const db = window.db;
  const auth = window.auth;
  const storage = window.storage;

  const form = document.getElementById("write-form");
  const titleInput = document.getElementById("post-title");
  const contentInput = document.getElementById("post-content");
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

      await db.collection("notices").add({
        title,
        content,
        authorName: user.displayName || "익명",
        authorEmail: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        attachments: uploadedFiles,
      });

      alert("게시글이 등록되었습니다.");
      window.location.href = "notice.html";
    } catch (error) {
      console.error("글쓰기 오류:", error);
      alert("등록 중 오류가 발생했습니다.");
    }
  });
});

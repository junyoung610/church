import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage, auth } from "./firebaseInit.js";

document.addEventListener("DOMContentLoaded", () => {
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
        const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        uploadedFiles.push({
          name: file.name,
          url: downloadURL,
          size: file.size,
          type: file.type,
        });
      }

      await addDoc(collection(db, "notices"), {
        title,
        content,
        authorName: user.displayName || "익명",
        authorEmail: user.email,
        createdAt: serverTimestamp(),
        attachments: uploadedFiles,
      });

      alert("게시글이 등록되었습니다.");
      window.location.href = "./board/notice.html";
    } catch (error) {
      console.error("글쓰기 오류:", error);
      alert("등록 중 오류가 발생했습니다.");
    }
  });
});

// js/auth.js - 통합 및 정리된 최종 코드

// 1. 모듈 및 기본 변수 선언
const auth = firebase.auth();
const db = firebase.firestore();
const currentPath = window.location.pathname;

// -----------------------------------------------------
// 2. 인증 상태 관찰 및 UI 업데이트 (common.js에서 헤더 로드 후 호출)
// -----------------------------------------------------
// church/js/auth.js - initializeAuthUI 함수 내부 (수정)

function initializeAuthUI() {
  // HTML 요소 선택 (PC용)
  const authLink = document.getElementById("auth-link");
  const mypageLink = document.getElementById("mypage-link");
  const logoutButton = document.getElementById("logout-button");

  // 🚨 HTML 요소 선택 (모바일용 추가)
  const authLinkMobile = document.getElementById("auth-link-mobile");
  const mypageLinkMobile = document.getElementById("mypage-link-mobile");
  const logoutButtonMobile = document.getElementById("logout-button-mobile");

  auth.onAuthStateChanged((user) => {
    if (user) {
      // [로그인 상태]: PC/모바일 모두 로그인 메뉴 숨기고 마이페이지/로그아웃 보이기
      console.log(`사용자 ${user.email} 로그인 상태`);

      // PC 메뉴
      if (authLink) authLink.classList.add("hidden");
      if (mypageLink) mypageLink.classList.remove("hidden");
      if (logoutButton) logoutButton.classList.remove("hidden");

      // 🚨 모바일 메뉴 추가
      if (authLinkMobile) authLinkMobile.classList.add("hidden");
      if (mypageLinkMobile) mypageLinkMobile.classList.remove("hidden");
      if (logoutButtonMobile) logoutButtonMobile.classList.remove("hidden");
    } else {
      // [로그아웃 상태]: PC/모바일 모두 로그인 메뉴 보이고 나머지 숨기기
      console.log("사용자 로그아웃 상태");

      // PC 메뉴
      if (authLink) authLink.classList.remove("hidden");
      if (mypageLink) mypageLink.classList.add("hidden");
      if (logoutButton) logoutButton.classList.add("hidden");

      // 🚨 모바일 메뉴 추가
      if (authLinkMobile) authLinkMobile.classList.remove("hidden");
      if (mypageLinkMobile) mypageLinkMobile.classList.add("hidden");
      if (logoutButtonMobile) logoutButtonMobile.classList.add("hidden");
    }
  });
}

// -----------------------------------------------------
// 4. 회원가입 페이지 (join.html) 로직
// -----------------------------------------------------
// church/js/auth.js - 4. 회원가입 페이지 (join.html) 로직

if (currentPath.includes("join.html")) {
  const joinForm = document.querySelector("form");

  if (joinForm) {
    joinForm.addEventListener("submit", (e) => {
      e.preventDefault(); // <-- ⭐ 이 코드가 폼 제출을 막습니다!
      const email = document.getElementById("join-id").value;
      const password = document.getElementById("join-pass").value;
      // join.html의 이름 필드 ID는 user-name
      const name = document.getElementById("user-name").value;

      auth
        .createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;

          // ⭐ 1. 이메일 인증 메일 발송
          return user.sendEmailVerification().then(() => {
            // 2. Firestore에 데이터 저장 (성공하면 체인으로 연결)
            return db.collection("users").doc(user.uid).set({
              email: email,
              name: name,
              joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
          });
        })
        .then(() => {
          console.log("회원가입 및 인증 메일 발송 성공");
          alert(
            "회원가입이 완료되었습니다! 이메일 인증을 완료해주세요. 로그인 페이지로 이동합니다."
          );
          window.location.href = "login.html";
        })
        .catch((error) => {
          alert("회원가입 오류: " + error.message);
        });
    });
  }
}

// -----------------------------------------------------
// 5. 로그인 페이지 (login.html) 로직
// -----------------------------------------------------
// church/js/auth.js - 5. 로그인 페이지 (login.html) 로직
// church/js/auth.js - 5. 로그인 페이지 (login.html) 로직 (수정 및 통합)

if (currentPath.includes("login.html")) {
  const loginForm = document.querySelector("form");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("user-id").value;
      const password = document.getElementById("password").value;

      auth
        .signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;

          // ⭐ 1. 사용자 정보 강제 새로고침 (Stale User Object 문제 해결)
          return user.reload().then(() => {
            // 새로고침 후 최신 상태의 사용자 객체를 가져옵니다.
            const freshUser = auth.currentUser;

            // 2. 이메일 인증 상태 확인
            if (!freshUser.emailVerified) {
              auth.signOut();
              // Custom Error를 throw하여 .catch에서 처리
              throw new Error(
                "이메일 인증이 완료되지 않았습니다. 전송된 인증 링크를 확인해주세요."
              );
            }

            // 3. 인증 완료된 경우에만 성공 처리
            console.log("로그인 성공:", freshUser);
            alert("로그인 성공! 환영합니다.");
            window.location.href = "index.html";
          });
        })
        .catch((error) => {
          // catch 블록에서 모든 오류(인증 오류, 이메일 미인증 오류)를 처리
          alert("로그인 오류: " + error.message);
          console.error("로그인 오류:", error);
        });
    });
  }
}

// -----------------------------------------------------
// (6) 마이페이지 (mypage.html) 로직
// -----------------------------------------------------
// church/js/auth.js - (6) 마이페이지 (mypage.html) 로직 (최종 통합)

if (currentPath.includes("mypage.html")) {
  // HTML 요소 선택 (mypage.html 기반)
  const viewMode = document.getElementById("view-mode");
  const editForm = document.getElementById("edit-form");
  const editStartButton = document.getElementById("edit-start-button");
  const editCancelButton = document.getElementById("edit-cancel-button");
  // church/js/auth.js - (6) 마이페이지 (mypage.html) 로직 내부에 추가/수정

  const passwordForm = document.getElementById("password-form");
  const changePasswordLink = document.getElementById("change-password-link");
  const passwordCancelButton = document.getElementById("password-cancel-button");

  // ⭐ 비밀번호 폼 토글 함수 정의
  function togglePasswordMode(isChanging) {
    // 다른 폼 (정보 수정 폼)이 열려있다면 닫아줍니다.
    if (viewMode) viewMode.classList.add("hidden");
    if (editForm) editForm.classList.add("hidden");

    if (isChanging) {
      if (passwordForm) passwordForm.classList.remove("hidden");
    } else {
      if (passwordForm) passwordForm.classList.add("hidden");
      if (viewMode) viewMode.classList.remove("hidden"); // 취소 시 보기 모드로 돌아가기
    }
  }

  // ⭐ [4] 마이페이지 이벤트 리스너: 모드 전환 (기존 로직 수정)

  if (editStartButton) {
    /* 기존 '정보 수정' 버튼 */
    editStartButton.addEventListener("click", () => {
      togglePasswordMode(false); // 혹시 비밀번호 폼 열려있으면 닫기
      toggleEditMode(true);
    });
  }

  // ⭐ [4-추가] '비밀번호 변경' 링크 클릭 시
  if (changePasswordLink) {
    changePasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      toggleEditMode(false); // 혹시 수정 폼 열려있으면 닫기
      togglePasswordMode(true);
      document.getElementById("password-form").reset(); // 폼 내용 초기화
    });
  }

  // ⭐ [4-추가] '비밀번호 변경 취소' 버튼 클릭 시
  if (passwordCancelButton) {
    passwordCancelButton.addEventListener("click", () => {
      togglePasswordMode(false);
    });
  }
  // ⭐ [1] Firestore에서 사용자 데이터 로드 및 UI 채우기 함수 정의
  function loadUserData(user) {
    // Firestore 데이터 로드
    db.collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const userData = doc.data();

          // --- 보기 모드 (View Mode) 채우기 ---
          const displayNameElement = document.getElementById("display-name");
          const displayPhoneElement = document.getElementById("display-phone");
          const displayRoleElement = document.getElementById("display-role");

          if (displayNameElement) displayNameElement.textContent = userData.name || "정보 없음";
          if (displayPhoneElement) displayPhoneElement.textContent = userData.phone || "미등록";
          if (displayRoleElement) displayRoleElement.textContent = userData.role || "미등록";

          // --- 수정 폼 (Edit Form) 채우기 ---
          const editNameElement = document.getElementById("edit-name");
          const editPhoneElement = document.getElementById("edit-phone");
          const editRoleElement = document.getElementById("edit-role");

          if (editNameElement) editNameElement.value = userData.name || "";
          if (editPhoneElement) editPhoneElement.value = userData.phone || "";
          // Select 박스 값 설정
          if (editRoleElement) editRoleElement.value = userData.role || "성도";
        } else {
          console.warn("Firestore에 사용자 문서가 없습니다. (UID: " + user.uid + ")");
        }
      })
      .catch((error) => {
        console.error("Firestore 데이터 로드 오류:", error);
      });
  }

  // ⭐ [2] 보기 모드 <-> 수정 모드 전환 함수 정의
  function toggleEditMode(isEditing) {
    if (isEditing) {
      if (viewMode) viewMode.classList.add("hidden");
      if (editForm) editForm.classList.remove("hidden");
    } else {
      if (viewMode) viewMode.classList.remove("hidden");
      if (editForm) editForm.classList.add("hidden");
    }
  }

  // ⭐ [3] 인증 상태 리스너 및 초기 데이터 로드
  auth.onAuthStateChanged((user) => {
    if (user) {
      // --- 3-1. Firebase Auth 기본 정보 표시 ---
      const emailElement = document.getElementById("display-email");
      const dateElement = document.getElementById("display-date");
      const lastLoginElement = document.getElementById("display-last-login");

      if (emailElement) emailElement.textContent = user.email;
      const created = new Date(user.metadata.creationTime);
      if (dateElement)
        dateElement.textContent = created.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short",
        });
      const lastLogin = new Date(user.metadata.lastSignInTime);
      if (lastLoginElement)
        lastLoginElement.textContent = lastLogin.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

      // --- 3-2. Firestore 데이터 로드 ---
      loadUserData(user);

      // --- 3-3. 이메일 인증 상태 확인 및 UI 업데이트 ---
      const verificationStatusElement = document.getElementById("verification-status");
      const resendButton = document.getElementById("resend-verification");

      if (user.emailVerified) {
        if (verificationStatusElement) verificationStatusElement.textContent = "인증 완료";
        if (resendButton) resendButton.classList.add("hidden");
      } else {
        if (verificationStatusElement) verificationStatusElement.textContent = "인증 대기 중";
        if (resendButton) resendButton.classList.remove("hidden");
      }
    } else {
      // 로그아웃 상태 처리
      alert("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
      window.location.href = "login.html";
    }
  });

  // ⭐ [4] 마이페이지 이벤트 리스너: 모드 전환
  if (editStartButton) {
    editStartButton.addEventListener("click", () => {
      toggleEditMode(true);
    });
  }

  if (editCancelButton) {
    editCancelButton.addEventListener("click", () => {
      loadUserData(auth.currentUser); // 취소 시 폼 내용을 다시 로드
      toggleEditMode(false);
    });
  }

  // ⭐ [5] 마이페이지 이벤트 리스너: 수정 완료 (Firestore 업데이트)
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      // 수정된 폼 값 가져오기
      const newName = document.getElementById("edit-name").value;
      const newPhone = document.getElementById("edit-phone").value;
      const newRole = document.getElementById("edit-role").value;

      // Firestore에 데이터 업데이트 (set with merge: true를 사용하여 문서 존재를 보장)
      db.collection("users")
        .doc(user.uid)
        .set(
          {
            name: newName,
            phone: newPhone,
            role: newRole,
          },
          { merge: true }
        ) // <-- 안전한 업데이트를 위한 핵심 옵션
        .then(() => {
          alert("회원 정보가 성공적으로 수정되었습니다.");
          loadUserData(user); // 수정된 데이터를 다시 로드하여 보기 모드 업데이트
          toggleEditMode(false); // 보기 모드로 전환
        })
        .catch((error) => {
          console.error("정보 수정 오류:", error);
          alert("정보 수정에 실패했습니다: " + error.message);
        });
    });
    // church/js/auth.js - (6) 마이페이지 (mypage.html) 로직 내부에 추가

    // ⭐ [5-추가] 비밀번호 변경 폼 제출
    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const currentPass = document.getElementById("current-password").value;
        const newPass = document.getElementById("new-password").value;
        const confirmPass = document.getElementById("confirm-password").value;
        const errorMessage = document.getElementById("password-error-message");
        errorMessage.textContent = ""; // 에러 메시지 초기화

        if (newPass !== confirmPass) {
          errorMessage.textContent = "새 비밀번호가 일치하지 않습니다.";
          return;
        }

        if (newPass.length < 6) {
          errorMessage.textContent = "새 비밀번호는 6자 이상이어야 합니다.";
          return;
        }

        // 1. 현재 비밀번호를 이용해 사용자 재인증 자격 증명 생성
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);

        user
          .reauthenticateWithCredential(credential)
          .then(() => {
            // 2. 재인증 성공 시 비밀번호 업데이트
            return user.updatePassword(newPass);
          })
          .then(() => {
            alert("비밀번호가 성공적으로 변경되었습니다. 다시 로그인해야 합니다.");
            auth.signOut(); // 보안상 로그아웃 권장
          })
          .catch((error) => {
            // 재인증 실패 (currentPass가 틀린 경우) 또는 updatePassword 실패
            if (error.code === "auth/wrong-password") {
              errorMessage.textContent = "현재 비밀번호가 올바르지 않습니다.";
            } else if (error.code === "auth/requires-recent-login") {
              errorMessage.textContent = "보안을 위해 다시 로그인 후 시도해주세요.";
            } else {
              errorMessage.textContent = `비밀번호 변경 오류: ${error.message}`;
            }
            console.error("비밀번호 변경 오류:", error);
          });
      });
    }
  }

  // ⭐ [6] 마이페이지 이벤트 리스너: 인증 메일 재발송
  const resendButton = document.getElementById("resend-verification");

  if (resendButton) {
    resendButton.addEventListener("click", () => {
      const user = auth.currentUser;
      if (!user) return;
      user
        .sendEmailVerification()
        .then(() => {
          alert("인증 메일이 재전송되었습니다. 이메일을 확인해주세요.");
        })
        .catch((error) => {
          console.error("메일 재발송 오류:", error);
          alert("메일 재전송에 실패했습니다: " + error.message);
        });
    });
  }
}
// church/js/auth.js 파일 가장 하단 (유지할 코드)

// -----------------------------------------------------
// 99. 동적 요소에 대한 로그아웃 이벤트 처리 (이벤트 위임)
// -----------------------------------------------------
document.addEventListener("click", (e) => {
  if (e.target && (e.target.id === "logout-button" || e.target.id === "logout-button-mobile")) {
    e.preventDefault();

    const auth = firebase.auth();

    auth
      .signOut()
      .then(() => {
        alert("로그아웃되었습니다.");
        window.location.href = "index.html"; // <-- 이 코드가 리다이렉션 처리
      })
      .catch((error) => {
        console.error("로그아웃 오류:", error);
        alert("로그아웃 중 오류가 발생했습니다: " + error.message);
      });
  }
});

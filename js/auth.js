// js/auth.js - 통합 및 정리된 최종 코드

// 1. 모듈 및 기본 변수 선언
const auth = firebase.auth();
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
if (currentPath.includes("join.html")) {
  const joinForm = document.querySelector("form");

  if (joinForm) {
    joinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("join-id").value;
      const password = document.getElementById("join-pass").value;

      auth
        .createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          console.log("회원가입 성공:", userCredential.user);
          alert("회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.");
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
          console.log("로그인 성공:", userCredential.user);
          alert("로그인 성공! 환영합니다.");
          window.location.href = "index.html";
        })
        .catch((error) => {
          alert("로그인 오류: 아이디 또는 비밀번호를 확인해주세요.");
          console.error("로그인 오류:", error);
        });
    });
  }
}

// -----------------------------------------------------
// (6) 마이페이지 (mypage.html) 로직
// -----------------------------------------------------
if (currentPath.includes("mypage.html")) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      // 로그인 상태인 경우 정보 표시
      const emailElement = document.getElementById("display-email");
      const dateElement = document.getElementById("display-date");
      const lastLoginElement = document.getElementById("display-last-login");

      // 1. 이메일 표시
      if (emailElement) emailElement.textContent = user.email;

      // 2. 가입 일자 (timestamp)를 한국어 형식으로 변환하여 표시 (예: 2025년 11월 7일 금요일)
      const created = new Date(user.metadata.creationTime);
      if (dateElement)
        dateElement.textContent = created.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short",
        });

      // 3. 마지막 로그인 일자 표시 (예: 2025년 11월 7일 오후 8:00)
      const lastLogin = new Date(user.metadata.lastSignInTime);
      if (lastLoginElement)
        lastLoginElement.textContent = lastLogin.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    } else {
      // 로그인되어 있지 않은 경우 경고 후 로그인 페이지로 리다이렉트
      alert("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
      window.location.href = "login.html";
    }
  });
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

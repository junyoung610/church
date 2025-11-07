/* -------------------------------
   전역 변수
-------------------------------- */
// 설교 관련 변수 제거

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderFooter();
  initializeDropdowns();
  // initMenuToggle(); // 헤더가 로드된 후 loadHeaderFooter 내부에서 호출
});

/* -------------------------------
   헤더/푸터 로드
-------------------------------- */
function loadHeaderFooter() {
  let baseURL = "";

  // GitHub Pages 환경이면 repository 이름 붙이기
  if (window.location.hostname.includes("github.io")) {
    baseURL = "/testchurchpage/";
  }

  // 헤더
  fetch(`${baseURL}common/header.html`)
    .then((response) => {
      if (!response.ok) throw new Error(`Header 로드 실패: ${response.status}`);
      return response.text();
    })
    .then((data) => {
      document.getElementById("header").innerHTML = data;
      initMenuToggle(); // <--- 헤더 요소가 DOM에 추가된 후 메뉴 토글 초기화
    })
    .catch((error) => console.error("헤더 로드 에러:", error));

  // 푸터
  fetch(`${baseURL}common/footer.html`)
    .then((response) => {
      if (!response.ok) throw new Error(`Footer 로드 실패: ${response.status}`);
      return response.text();
    })
    .then((data) => {
      document.getElementById("footer").innerHTML = data;
    })
    .catch((error) => console.error("푸터 로드 에러:", error));
}

/* -------------------------------
   드롭다운 메뉴
-------------------------------- */
function initializeDropdowns() {
  document
    .querySelectorAll("nav ul li.has-dropdown > a")
    .forEach(function (item) {
      item.addEventListener("click", function (event) {
        event.preventDefault();
        const parentLi = this.parentElement;

        // PC 모드에서만 실행 (모바일 메뉴는 initMenuToggle에서 처리)
        if (window.innerWidth > 1100) {
          // 다른 드롭다운 닫기
          document
            .querySelectorAll("nav ul li.has-dropdown")
            .forEach((otherLi) => {
              if (otherLi !== parentLi) {
                otherLi.classList.remove("active");
              }
            });

          // 현재 메뉴 토글
          parentLi.classList.toggle("active");
        }
      });
    });
}

/* -------------------------------
   모바일 GNB 토글
-------------------------------- */
function initMenuToggle() {
  // 버튼이 DOM에 로드된 후에 실행됨
  const btn1 = document.getElementById("btn1"); // 메뉴 아이콘
  const btn2 = document.getElementById("btn2"); // 닫기 아이콘
  const gnb = document.querySelector(".gnb");
  const body = document.body;

  function toggleMenu() {
    gnb.classList.toggle("active");
    body.classList.toggle("no-scroll");
    btn1.classList.toggle("hidden");
    btn2.classList.toggle("hidden");
  }

  if (btn1 && btn2 && gnb) {
    btn1.addEventListener("click", toggleMenu);
    btn2.addEventListener("click", toggleMenu);

    // 모바일 메뉴 서브메뉴 토글 로직
    document.querySelectorAll(".gnb > ul > li").forEach((li) => {
      // .menu-wrap은 header.html에 정의된 모바일 메뉴 클릭 영역
      const menuWrap = li.querySelector(".menu-wrap");
      const subGnb = li.querySelector(".sub-gnb");

      if (menuWrap && subGnb) {
        // 모바일 GNB에서는 .menu-wrap 클릭 시 서브메뉴 토글
        menuWrap.addEventListener("click", (e) => {
          if (window.innerWidth <= 1100) {
            e.preventDefault();

            // 다른 서브메뉴 닫기
            document.querySelectorAll(".gnb .sub-gnb").forEach((otherSub) => {
              if (otherSub !== subGnb) {
                otherSub.style.display = "none";
              }
            });
            // 현재 서브메뉴 토글
            subGnb.style.display =
              subGnb.style.display === "block" ? "none" : "block";
          }
        });
      }
    });

    // PC 모드 복귀 시 서브메뉴가 항상 보이도록 설정 (CSS/JS 충돌 방지)
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100) {
        document.querySelectorAll(".gnb .sub-gnb").forEach((sub) => {
          sub.style.display = "";
        });
        document.querySelectorAll(".gnb > ul > li").forEach((li) => {
          li.classList.remove("active");
        });
      }
    });
  }
}

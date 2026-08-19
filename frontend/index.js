/* =========================
   GLOBAL DATA
========================= */
function getImagePath(img) {

    // External URL
    if (/^(https?:)?\/\//.test(img)) {
        return img;
    }

    // Plain filename
    const isNavPage =
        window.location.pathname.includes(
            "/navpages/"
        );

    return isNavPage
        ? `../images/${img}`
        : `images/${img}`;
}

async function fetchArticlesFromAPI(
    category = "",
    page = 1,
    limit = 6
) {

    const params =
        new URLSearchParams();

    if (category) {
        params.set(
            "category",
            category
        );
    }

    params.set(
        "page",
        page
    );

    params.set(
        "limit",
        limit
    );

    const response =
        await fetch(
    `https://today-newspaper-api.onrender.com/api/articles?${params.toString()}`
);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return await response.json();
}

async function fetchTopNewsFromAPI() {

    const response =
        await fetch(
    "https://today-newspaper-api.onrender.com/api/top-news"
);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }

    return await response.json();
}


async function fetchCategoryTopNewsFromAPI(
    category
) {

    const params =
        new URLSearchParams();

    params.set(
        "category",
        category
    );

    const response =
        await fetch(
    `https://today-newspaper-api.onrender.com/api/top-news/category?${params.toString()}`
);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }

    return await response.json();
}


async function fetchMostReadFromAPI() {

    const response =
        await fetch(
    "https://today-newspaper-api.onrender.com/api/most-read"
);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }

    return await response.json();
}


async function fetchEditorsPicksFromAPI() {

    const response =
        await fetch(
    "https://today-newspaper-api.onrender.com/api/editors-picks"
);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }

    return await response.json();
}

function openArticle(id) {
  const articlePath = window.location.pathname.includes("/navpages/")
    ? "../article.html"
    : "article.html";

  window.location.href = `${articlePath}?id=${id}`;
}

function formatPublicationDate(dateString) {

  const published = new Date(dateString);
  const now = new Date();

  const diff = now - published;

  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  // Future dates
  if (diff < 0) {
    return published.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // Less than a minute
  if (diff < minute) {
    return "Just now";
  }

  // Minutes
  if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }

  // Hours
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  // Days (up to 3)
  if (diff < day * 4) {
    const days = Math.floor(diff / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  // Older than 3 days
  return published.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

}
/*topnews home page*/
function createNewsCard(article, type = "standard", showCategory = false) {
const card = document.createElement("article");
card.classList.add("card");
card.dataset.id = article.id;

if (type === "featured") {
card.classList.add("featured");
}

if (type === "side") {
card.classList.add("side-card");
}

const image = document.createElement("img");
image.src = getImagePath(article.img);
image.alt = article.headline;

const cardContent = document.createElement("div");
cardContent.classList.add("cardContent");

if (showCategory) {
const categoryTag = document.createElement("span");
categoryTag.classList.add("categoryTag");
categoryTag.textContent = article.category;
cardContent.appendChild(categoryTag);
}

const headline = document.createElement("h3");
headline.textContent = article.headline;
cardContent.appendChild(headline);

let summary = null;

if (type !== "side") {
summary = document.createElement("p");
summary.textContent = article.summary;
cardContent.appendChild(summary);
}

const date = document.createElement("span");
date.classList.add("date");
date.textContent = formatPublicationDate(article.date);
cardContent.appendChild(date);

image.addEventListener("error", () => {
image.onerror = null;

card.classList.add("image-error");

image.alt = "something when wrong";

image.removeAttribute("src");

if (summary) {
summary.style.display = "none";
}
});

card.appendChild(image);
card.appendChild(cardContent);

card.addEventListener("click", () => {
openArticle(article.id);
});

return card;
}





function renderTopNews(articles) {

    // =========================================
    // NEWEST FIRST
    // =========================================

    const sorted = [...articles].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );


    // =========================================
    // HERO
    // =========================================

    const latestEight = sorted.slice(0, 8);

    if (!latestEight.length) return;

    const hero =
        latestEight[
            Math.floor(Math.random() * latestEight.length)
        ];


    // =========================================
    // SIDE CATEGORIES
    // =========================================

    const categories = [
        "Education",
        "Politics",
        "Trending",
        "Entertainment"
    ];


    // =========================================
    // ONLY 2 SIDE ARTICLES
    // =========================================

    const others = categories
        .map(category =>
            sorted.find(article =>
                article.category === category &&
                article.id !== hero.id
            )
        )
        .filter(Boolean)
        .slice(0, 2);


    // =========================================
    // GRID
    // =========================================

    const grid =
        document.getElementById("topnewsGrid");

    if (!grid) return;

    grid.innerHTML = "";


    // =========================================
    // HERO CARD
    // KEEP HERO STRUCTURE
    // =========================================

    const heroCard =
        document.createElement("article");

    heroCard.classList.add(
        "hero-card"
    );

    heroCard.dataset.id =
        hero.id;


    // HERO IMAGE

    const heroImage =
        document.createElement("img");

    heroImage.src =
        getImagePath(hero.img);

    heroImage.alt =
        hero.headline;


    heroImage.addEventListener(
        "error",
        () => {

            heroCard.classList.add(
                "image-error"
            );

            heroImage.alt =
                "something went wrong";

        }
    );


    heroCard.appendChild(
        heroImage
    );


    // HERO CONTENT

    const heroContent =
        document.createElement("div");

    heroContent.classList.add(
        "content"
    );


    // CATEGORY

    const categoryTag =
        document.createElement("span");

    categoryTag.classList.add(
        "categoryTag"
    );

    categoryTag.textContent =
        hero.category;

    heroContent.appendChild(
        categoryTag
    );


    // HEADLINE

    const heroHeadline =
        document.createElement("h3");

    heroHeadline.textContent =
        hero.headline;

    heroContent.appendChild(
        heroHeadline
    );


    // SUMMARY

    const heroSummary =
        document.createElement("p");

    heroSummary.textContent =
        hero.summary;

    heroContent.appendChild(
        heroSummary
    );


    // DATE

    const heroDate =
        document.createElement("span");

    heroDate.classList.add(
        "date"
    );

    heroDate.textContent =
        formatPublicationDate(
            hero.date
        );

    heroContent.appendChild(
        heroDate
    );


    heroCard.appendChild(
        heroContent
    );


    grid.appendChild(
        heroCard
    );


    // =========================================
    // SIDE NEWS
    // =========================================

    const sideNews =
        document.createElement("div");

    sideNews.classList.add(
        "side-news"
    );


    others.forEach(article => {

        const sideCard =
            createNewsCard(
                article,
                "side",
                true
            );

        sideCard.classList.add(
            "side-card"
        );

        sideNews.appendChild(
            sideCard
        );

    });


    grid.appendChild(
        sideNews
    );


    // =========================================
    // CLICK
    // =========================================

    grid.onclick = (e) => {

        const card =
            e.target.closest(
                "[data-id]"
            );

        if (!card) return;

        openArticle(
            card.dataset.id
        );

    };

}
/* =========================================================
   FIT CATEGORY CONTENT TO ASIDE
   ========================================================= */

function fitCategoryContentToAside(latestContainer) {

    const container0 =
        document.querySelector(".container0");

    const mainContainer =
        container0?.querySelector(".container");

    const aside =
        container0?.querySelector(".aside");

    const topNews =
        document.getElementById("topNewsGrids");

    const pagination =
        document.getElementById("pagination");


    if (
        !container0 ||
        !mainContainer ||
        !aside ||
        !topNews ||
        !pagination ||
        !latestContainer
    ) {
        return null;
    }


    /* =====================================================
       RESPONSIVE BREAKPOINT
       ===================================================== */

    const width =
        window.innerWidth;


    /* =====================================================
       PHONE
       ===================================================== */

    if (width <= 746) {

        mainContainer.style.height =
            "auto";

        /*
           Phones do not try to match the
           sidebar height.

           Keep Latest News compact and
           predictable.
        */

        return 6;
    }


    /* =====================================================
       SIDEBAR HEIGHT
       ===================================================== */

    const asideHeight =
        aside.getBoundingClientRect().height;

    if (
        !Number.isFinite(asideHeight) ||
        asideHeight <= 0
    ) {
        return null;
    }


    /*
       Match the main container to the
       sidebar height.
    */

    mainContainer.style.height =
        `${asideHeight}px`;


    /* =====================================================
       MAIN CONTAINER INNER HEIGHT
       ===================================================== */

    const mainStyles =
        getComputedStyle(
            mainContainer
        );

    const paddingTop =
        parseFloat(
            mainStyles.paddingTop
        ) || 0;

    const paddingBottom =
        parseFloat(
            mainStyles.paddingBottom
        ) || 0;

    const containerHeight =
        asideHeight -
        paddingTop -
        paddingBottom;


    /* =====================================================
       MAIN CONTAINER GAP
       ===================================================== */

    const containerGap =
        parseFloat(
            mainStyles.gap
        ) || 0;


    /* =====================================================
       TOP NEWS HEIGHT
       ===================================================== */

    const topNewsHeight =
        topNews.getBoundingClientRect()
            .height;


    /* =====================================================
       PAGINATION HEIGHT
       ===================================================== */

    const paginationHeight =
        pagination.getBoundingClientRect()
            .height;


    /* =====================================================
       AVAILABLE LATEST NEWS HEIGHT
       ===================================================== */

    const availableHeight =
        containerHeight -
        topNewsHeight -
        paginationHeight -
        (containerGap * 2);


    if (
        !Number.isFinite(availableHeight) ||
        availableHeight <= 0
    ) {
        return null;
    }


    /* =====================================================
       LATEST NEWS WIDTH
       ===================================================== */

    const latestRect =
        latestContainer.getBoundingClientRect();

    const latestWidth =
        latestRect.width;

    if (
        !Number.isFinite(latestWidth) ||
        latestWidth <= 0
    ) {
        return null;
    }


    /* =====================================================
       GRID STYLES
       ===================================================== */

    const gridStyles =
        getComputedStyle(
            latestContainer
        );

    const columnGap =
        parseFloat(
            gridStyles.columnGap
        ) || 0;

    const rowGap =
        parseFloat(
            gridStyles.rowGap
        ) || 0;


    /* =====================================================
       RESPONSIVE COLUMNS
       ===================================================== */

    let columns;

    if (width <= 900) {

        columns = 2;

    } else {

        columns = 3;
    }


    /* =====================================================
       CARD WIDTH
       ===================================================== */

    const totalColumnGaps =
        columnGap *
        (columns - 1);

    const cardWidth =
        (
            latestWidth -
            totalColumnGaps
        ) / columns;


    if (
        !Number.isFinite(cardWidth) ||
        cardWidth <= 0
    ) {
        return null;
    }


    /* =====================================================
       SQUARE CARD
       ===================================================== */

    const cardHeight =
        cardWidth;


    /* =====================================================
       ROWS THAT FIT
       ===================================================== */

    const rows =
        Math.floor(
            (
                availableHeight +
                rowGap
            ) /
            (
                cardHeight +
                rowGap
            )
        );


    if (rows <= 0) {

        return columns;
    }


    /* =====================================================
       ARTICLE CAPACITY
       ===================================================== */

    let articleCount =
        rows *
        columns;


    /* =====================================================
       EDITORIAL / VISUAL LIMITS
       ===================================================== */

    const MIN_ARTICLES =
        4;

    const MAX_ARTICLES =
        12;


    articleCount =
        Math.max(
            MIN_ARTICLES,
            Math.min(
                MAX_ARTICLES,
                articleCount
            )
        );


    /* =====================================================
       KEEP COMPLETE GRID ROWS
       ===================================================== */

    articleCount =
        Math.floor(
            articleCount /
            columns
        ) *
        columns;


    /*
       Safety fallback.

       Prevents returning 0 when
       the minimum is smaller than
       the current column count.
    */

    if (articleCount < columns) {

        articleCount =
            columns;
    }


    return articleCount;
}

document.addEventListener("DOMContentLoaded", () => {

  function updateTime() {
    const dateElement = document.getElementById("dateheure");
    if (!dateElement) return;

    dateElement.textContent = new Date().toLocaleString();
  }

  updateTime();
  setInterval(updateTime, 1000);

});
/* =========================
   DARK MODE SYSTEM
========================= */

const darkModeToggle = document.getElementById("darkModeToggle");
const root = document.documentElement;

function updateLogo() {
  const logo = document.getElementById("logo");

  if (!logo) return;

  const isDarkMode = root.classList.contains("dark-mode");

  logo.src = isDarkMode
    ? getImagePath("logoDarkMode.PNG")
    : getImagePath("logoDefaultMode.PNG");
}


function toggleDarkMode() {

  root.classList.toggle("dark-mode");

  const isDarkMode = root.classList.contains("dark-mode");

  // Save preference
  localStorage.setItem(
    "darkMode",
    isDarkMode ? "enabled" : "disabled"
  );

  // Update logo
  updateLogo();
}


/* =========================
   SET CORRECT LOGO ON PAGE LOAD
========================= */

updateLogo();


/* =========================
   DARK MODE BUTTON
========================= */

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", toggleDarkMode);
}
// =========================
// WHATSAPP POPUP
// =========================

const whatsapp = document.getElementById("whatsapp");
const whatsappPopup = document.getElementById("whatsappPopup");


// =========================
// CHECK REQUIRED ELEMENTS
// =========================

if (whatsapp && whatsappPopup) {

  const whatsappLink = whatsapp.querySelector("a");

  const closeWhatsappPopup =
    document.getElementById("closeWhatsappPopup");

  const whatsappPopupOk =
    document.getElementById("whatsappPopupOk");


  // =========================
  // WHATSAPP GROUP URL
  // =========================

  const whatsappURL =
    "https://chat.whatsapp.com/JRep0h9StkDKcaHAel0TeN?mode=gi_t";


  // =========================
  // WHATSAPP LINK
  // =========================

  if (whatsappLink) {

    whatsappLink.addEventListener("click", function (event) {

      // Always stop the default link
      // behaviour
      event.preventDefault();


      // =========================
      // CHECK STORAGE
      // =========================

      const hasClicked =
        localStorage.getItem("whatsappClicked") === "true";


      // =========================
      // FIRST CLICK
      // =========================

      if (!hasClicked) {

        // Save BEFORE leaving page
        localStorage.setItem(
          "whatsappClicked",
          "true"
        );

        // Open WhatsApp in same tab
        window.location.href = whatsappURL;

        return;
      }


      // =========================
      // SECOND + FUTURE CLICKS
      // =========================

      whatsappPopup.classList.add("show");

    });

  }


  // =========================
  // CLOSE POPUP FUNCTION
  // =========================

  function closeWhatsappPopupFunction() {

    whatsappPopup.classList.remove("show");

  }


  // =========================
  // CLOSE WITH X
  // =========================

  if (closeWhatsappPopup) {

    closeWhatsappPopup.addEventListener(
      "click",
      closeWhatsappPopupFunction
    );

  }


  // =========================
  // CLOSE WITH OKAY BUTTON
  // =========================

  if (whatsappPopupOk) {

    whatsappPopupOk.addEventListener(
      "click",
      closeWhatsappPopupFunction
    );

  }


  // =========================
  // CLOSE OUTSIDE POPUP
  // =========================

  whatsappPopup.addEventListener(
    "click",
    function (event) {

      if (event.target === whatsappPopup) {

        closeWhatsappPopupFunction();

      }

    }
  );

}

/* =========================
   SLIDER SYSTEM
========================= */

const news = [
    {
      img: getImagePath("slider/bnimage1.png"),
      title: "FG Introduces National Textbook Ranking System, Implementation Begins September",
        desc: "The system is intended to create a nationwide framework for assessing and ranking textbooks used in Nigerian schools.",
        categoryTag: "Breaking News"
    },

    {
      img: getImagePath("slider/bnimage2.png"),
      title: "FG Launches ₦365m National Laureate Programme for Nigerian Students",
        desc: "The Federal Government has commenced the 2026 Tertiary Institutions National Laureate Programme, with a ₦365 million prize attached to the programme. Institutions have been directed to establish selection committees.",
        categoryTag: "Breaking News"
    },

    {
      img: getImagePath("slider/bnimage3.png"),
      title: "FG Unveils New Autism Education Reforms, Targets Specialist Workforce",
        desc: "Education Minister Tunji Alausa recently announced a major initiative aimed at transforming autism care and developing Nigeria’s specialist workforce.",
        categoryTag: "Breaking News"
    },

    {
        img: getImagePath("slider/bnimage4.png"),
        title: "JAMB’s New Admission Rules for 2026/27 Academic Session: UTME Exemption for Select Courses",
        desc: "JAMB Announces New Admission Rules, UTME Exemption Takes Effect for Selected Courses",
        categoryTag: "Breaking News"
    }
];


/* =========================
   STATE
========================= */

let index = 0;
let autoSlideTimer = null;

let startX = 0;
let isDragging = false;


/* =========================
   ELEMENTS
========================= */

const slider = document.getElementById("slider");
const slide = document.getElementById("slide");
const title = document.getElementById("title");
const desc = document.getElementById("desc");
const categoryTag = document.querySelector(".categoryTag");

const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");


/* =========================
   SHOW SLIDE
========================= */

function showSlide(newIndex) {

    if (!news.length || !slide) return;

    const targetIndex =
        (newIndex + news.length) % news.length;

    const current = news[targetIndex];

    /*
     * PRELOAD IMAGE FIRST
     *
     * This prevents the headline from
     * changing before the new image is ready.
     */

    const image = new Image();

    image.onload = function () {

        index = targetIndex;

        /*
         * Update EVERYTHING together.
         */

        slide.src = current.img;

        if (categoryTag) {
            categoryTag.textContent =
                current.categoryTag;
        }

        if (title) {
            title.textContent =
                current.title;
        }

        if (desc) {
            desc.textContent =
                current.desc;
        }

        updateDots();
    };

    image.onerror = function () {

        /*
         * If the image fails, still show
         * the corresponding story.
         */

        index = targetIndex;

        if (categoryTag) {
            categoryTag.textContent =
                current.categoryTag;
        }

        if (title) {
            title.textContent =
                current.title;
        }

        if (desc) {
            desc.textContent =
                current.desc;
        }

        updateDots();
    };

    image.src = current.img;
}


/* =========================
   NEXT
========================= */

function nextSlide() {

    showSlide(index + 1);

    restartAutoSlide();
}


/* =========================
   PREVIOUS
========================= */

function prevSlide() {

    showSlide(index - 1);

    restartAutoSlide();
}


/* =========================
   AUTO SLIDE
========================= */

function startAutoSlide() {

    clearInterval(autoSlideTimer);

    autoSlideTimer = setInterval(() => {

        showSlide(index + 1);

    }, 5000);
}


function stopAutoSlide() {

    clearInterval(autoSlideTimer);

    autoSlideTimer = null;
}


function restartAutoSlide() {

    stopAutoSlide();

    startAutoSlide();
}


/* =========================
   BUTTONS
========================= */

if (prevButton) {

    prevButton.addEventListener("click", (event) => {

        event.preventDefault();
        event.stopPropagation();

        prevSlide();

    });

}


if (nextButton) {

    nextButton.addEventListener("click", (event) => {

        event.preventDefault();
        event.stopPropagation();

        nextSlide();

    });

}


/* =========================
   DOTS
========================= */

function createDots() {

    const dotsContainer =
        document.getElementById("dots");

    if (!dotsContainer) return;

    dotsContainer.innerHTML = "";

    news.forEach((_, i) => {

        const dot =
            document.createElement("span");

        dot.classList.add("dot");

        dot.addEventListener("click", (event) => {

            event.preventDefault();
            event.stopPropagation();

            showSlide(i);

            restartAutoSlide();

        });

        dotsContainer.appendChild(dot);

    });

    updateDots();
}


function updateDots() {

    const dots =
        document.querySelectorAll(".dot");

    dots.forEach((dot, i) => {

        dot.classList.toggle(
            "active",
            i === index
        );

    });
}


/* =========================
   TOUCH SWIPE
========================= */

if (slider) {

    slider.addEventListener(
        "touchstart",
        (event) => {

            startX =
                event.touches[0].clientX;

        },
        { passive: true }
    );


    slider.addEventListener(
        "touchend",
        (event) => {

            const endX =
                event.changedTouches[0].clientX;

            const distance =
                startX - endX;

            if (Math.abs(distance) < 50) {
                return;
            }

            if (distance > 0) {

                nextSlide();

            } else {

                prevSlide();

            }

        },
        { passive: true }
    );

}


/* =========================
   MOUSE DRAG
========================= */

if (slider) {

    slider.addEventListener(
        "mousedown",
        (event) => {

            isDragging = true;

            startX =
                event.clientX;

        }
    );


    slider.addEventListener(
        "mouseup",
        (event) => {

            if (!isDragging) return;

            isDragging = false;

            const endX =
                event.clientX;

            const distance =
                startX - endX;

            if (Math.abs(distance) < 50) {
                return;
            }

            if (distance > 0) {

                nextSlide();

            } else {

                prevSlide();

            }

        }
    );


    slider.addEventListener(
        "mouseleave",
        () => {

            isDragging = false;

        }
    );

}


/* =========================
   PRELOAD ALL IMAGES
========================= */

news.forEach((item) => {

    const image =
        new Image();

    image.src =
        item.img;

});


/* =========================
   INITIALIZE
========================= */

showSlide(0);

createDots();

startAutoSlide();


/* =========================
  MENU SYSTEM
=========================  */
function updateMenuPosition() {
  const menu = document.getElementById("links");
  const nav = document.querySelector("nav");

  if (!menu || !nav) return;

  menu.style.top = `${nav.getBoundingClientRect().bottom}px`;
}

window.addEventListener("scroll", updateMenuPosition);
window.addEventListener("resize", updateMenuPosition);

function toggleMenu() {
  updateMenuPosition();
  const menu = document.getElementById("links");
  const overlay = document.getElementById("overlay");
  const nav = document.querySelector("nav");

  if (!menu || !nav) return;

  // Position menu directly below the visible nav
  const navRect = nav.getBoundingClientRect();
  const top = navRect.top + nav.offsetHeight;

  menu.style.top = `${top}px`;
  menu.style.height = `calc(100vh - ${top}px)`;

  menu.classList.toggle("show");

  if (overlay) {
    overlay.classList.toggle("show");
  }
}

function closeMenu() {
  const menu = document.getElementById("links");
  const overlay = document.getElementById("overlay");

  if (menu) {
    menu.classList.remove("show");
  }

  if (overlay) {
    overlay.classList.remove("show");
  }
}


const dots = document.querySelectorAll('.dotP');

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    dots.forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
  });
});

function showLoadingCards(container, count = 4) {
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const card = document.createElement("article");
    card.className = "card skeleton";

    card.innerHTML = `
    <div class="skeleton-image"></div>

    <div class="skeleton-content">

      <div class="skeleton-category"></div>

      <div class="skeleton-title"></div>
      <div class="skeleton-title"></div>

      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>

      <div class="skeleton-date"></div>

    </div>
  `;

    container.appendChild(card);
  }
}
function showFailedCards(container, count = 4) {

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {

    const card = document.createElement("article");
    card.className = "card failed-card";

    card.innerHTML = `
      <div class="failed-icon">
        📰
      </div>

      <div class="failed-content">

        <span class="failed-label">
          TODAY NEWSPAPER
        </span>

        <h3>article unavailable</h3>

        <p>
          We're having trouble loading this story at the moment.
          Please check your internet connectionand try again shortly.
        </p>

        <button class="retry-btn">
          ↻ Try Again
        </button>

      </div>
    `;

    card.querySelector(".retry-btn").addEventListener("click", () => {
      location.reload();
    });

    container.appendChild(card);
  }
}
function renderTopNewsCategory(articles) {

    const grid =
        document.getElementById(
            "topNewsGrids"
        );


    if (!grid) {

        console.log(
            "Top News grid not found."
        );

        return [];

    }


    /* =====================================================
       VALIDATE ARTICLES
       ===================================================== */

    if (
        !Array.isArray(articles) ||
        articles.length === 0
    ) {

        grid.innerHTML = "";

        return [];

    }


    /* =====================================================
       TOP NEWS EXPECTS 3 ARTICLES
       ===================================================== */

    const selected =
        articles.slice(
            0,
            3
        );


    if (
        selected.length < 3
    ) {

        grid.innerHTML = "";

        return [];

    }


    /* =====================================================
       HERO + SIDE ARTICLES
       ===================================================== */

    const hero =
        selected[0];

    const others =
        selected.slice(1);


    /* =====================================================
       CLEAR GRID
       ===================================================== */

    grid.innerHTML = "";


    /* =====================================================
       HERO
       ===================================================== */

    const heroCard =
        createNewsCard(
            hero,
            "featured",
            true
        );


    heroCard.classList.add(
        "hero-card"
    );


    grid.appendChild(
        heroCard
    );


    /* =====================================================
       SIDE NEWS
       ===================================================== */

    const sideNews =
        document.createElement(
            "div"
        );


    sideNews.classList.add(
        "side-news"
    );


    others.forEach(article => {

        const sideCard =
            createNewsCard(
                article,
                "side",
                true
            );


        sideNews.appendChild(
            sideCard
        );

    });


    grid.appendChild(
        sideNews
    );


    /* =====================================================
       RETURN USED ARTICLE IDS
       ===================================================== */

    return selected.map(
        article =>
            article.id
    );

}

function renderMostRead(articles) {
  const container = document.getElementById("mostReadGrid");
  if (!container) return;

  const mostRead = [...articles]
    .sort((a, b) => (b.view || 0) - (a.view || 0))
    .slice(0, 4);

  container.innerHTML = "";

  mostRead.forEach((article, index) => {
    const articleViews = article.view || 0;

    const item = document.createElement("article");
    item.classList.add("most-read-item");

    item.innerHTML = `
      <span class="most-read-number">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <div class="most-read-content">
        <h3>${article.headline}</h3>

        <span class="most-read-meta">
          ${articleViews} ${articleViews === 1 ? "view" : "views"}
        </span>
      </div>
    `;

    item.addEventListener("click", () => {
      openArticle(article.id);
    });

    container.appendChild(item);
  });
}
/* Load articles from JSON file and display them in the specified container */

let categoryPageLimit = null;
let categoryPageWidth = null;

async function loadMostRead() {

    try {

        const result =
            await fetchMostReadFromAPI();

        renderMostRead(
            result.articles
        );

    } catch (err) {

        console.error(
            "Failed to load Most Read:",
            err
        );

    }
}
loadMostRead();
async function loadArticles(containerId, category, limit = 6, page = 1) {

    const container =
        document.getElementById(containerId);
        const topNewsSection =
    document.getElementById("topNewsGrids");

    if (!container) {

        console.error(
            `Container "${containerId}" not found.`
        );

        return;
    }
    
    /* =====================================================
    EDITOR'S PICKS
    ===================================================== */

    if (containerId === "newsGridEditor") {

        showLoadingCards(
            container,
            limit
        );

        try {

            const result =
                await fetchEditorsPicksFromAPI();

            renderEditorCards(
                container,
                result.articles
            );

            return 1;

        } catch (err) {

            console.error(
                "Failed to load Editor's Picks:",
                err
            );

            showFailedCards(
                container,
                limit
            );

            return;
        }
    }


    /* =====================================================
       CATEGORY PAGE
       ===================================================== */

    const isCategoryPage =
        !!document.getElementById(
            "topNewsGrids"
        );


    /* =====================================================
       CACHE
       ===================================================== */

    const cacheKey =
        `pageCache_${containerId}_${category || "all"}_${page}`;


    if (!isCategoryPage) {

        const cachedPage =
            sessionStorage.getItem(
                cacheKey
            );

        if (cachedPage) {

            try {

                const saved =
                    JSON.parse(
                        cachedPage
                    );


                container.innerHTML =
                    saved.articleHTML || "";


                const topNewsGrid =
                    document.getElementById(
                        "topNewsGrid"
                    );


                if (
                    topNewsGrid &&
                    saved.topNewsHTML !==
                    undefined
                ) {

                    topNewsGrid.innerHTML =
                        saved.topNewsHTML;

                    topNewsGrid.style.display =
                        saved.topNewsDisplay || "";
                }


                const categoryTopNews =
                    document.getElementById(
                        "topNewsGrids"
                    );


                if (
                    categoryTopNews &&
                    saved.categoryTopNewsHTML !==
                    undefined
                ) {

                    categoryTopNews.innerHTML =
                        saved.categoryTopNewsHTML;
                }


                setArticleGridLayout(
                    container
                );


                /* =====================================
                   RESTORE IMAGE ERRORS
                   ===================================== */

                const restoreImageError =
                    image => {

                        image.addEventListener(
                            "error",
                            () => {

                                if (
                                    image.dataset
                                        .errorHandled ===
                                    "true"
                                ) {

                                    return;
                                }


                                image.dataset
                                    .errorHandled =
                                    "true";


                                const card =
                                    image.closest(
                                        ".card"
                                    );


                                if (!card) {
                                    return;
                                }


                                card.classList.add(
                                    "image-error"
                                );


                                image.removeAttribute(
                                    "src"
                                );


                                image.alt =
                                    "Image unavailable";
                            }
                        );
                    };


                container
                    .querySelectorAll("img")
                    .forEach(
                        restoreImageError
                    );


                if (topNewsGrid) {

                    topNewsGrid
                        .querySelectorAll("img")
                        .forEach(
                            restoreImageError
                        );
                }


                /* =====================================
                   RESTORE ARTICLE CLICKS
                   ===================================== */

                container
                    .querySelectorAll("[data-id]")
                    .forEach(card => {

                        card.addEventListener(
                            "click",
                            () => {

                                openArticle(
                                    card.dataset.id
                                );

                            }
                        );

                    });


                if (topNewsGrid) {

                    topNewsGrid
                        .querySelectorAll("[data-id]")
                        .forEach(card => {

                            card.addEventListener(
                                "click",
                                () => {

                                    openArticle(
                                        card.dataset.id
                                    );

                                }
                            );

                        });
                }


                return saved.totalPages;

            } catch (error) {

                console.warn(
                    "Invalid page cache. Loading page normally.",
                    error
                );


                sessionStorage.removeItem(
                    cacheKey
                );
            }
        }
    }


    /* =====================================================
   PAGE CAPACITY
   ===================================================== */

let pageLimit =
    limit;


/* =====================================================
   CATEGORY PAGE
   ===================================================== */

if (isCategoryPage) {

    /* ================================================
       PHONE
       ================================================ */

    if (window.innerWidth <= 746) {

        pageLimit =
            Math.max(
                4,
                Math.min(
                    6,
                    limit
                )
            );


        categoryPageLimit =
            pageLimit;


        categoryPageWidth =
            window.innerWidth;
    }


    /* ================================================
       DESKTOP / TABLET
       ================================================ */

    else {

        /*
           The first page must wait for Top News
           before calculating the available space.

           Therefore the capacity calculation is
           performed later, after Top News has
           been rendered.
        */

        if (
            page === 1 ||
            categoryPageLimit === null ||
            categoryPageWidth !==
                window.innerWidth
        ) {

            categoryPageLimit =
                null;
        }


        pageLimit =
            categoryPageLimit ||
            limit;
    }
}

    /* =====================================================
       LOADING
       ===================================================== */

    showLoadingCards(
        container,
        pageLimit
    );


    /* =====================================================
   CATEGORY TOP NEWS
   ===================================================== */

let usedIds = [];


/*
   Category Top News must be loaded and rendered
   BEFORE Latest News capacity is calculated.
*/

if (isCategoryPage) {

    try {

        const topNewsResponse =
            await fetch(
    `https://today-newspaper-api.onrender.com/api/top-news/category?category=${encodeURIComponent(category)}`
);


        if (!topNewsResponse.ok) {

            throw new Error(
                `HTTP ${topNewsResponse.status}`
            );

        }


        const topNewsData =
            await topNewsResponse.json();

            console.log(
    "TOP NEWS API:",
    topNewsData.articles
);


        usedIds =
            renderTopNewsCategory(
                topNewsData.articles
            ) || [];
            console.log(
    "TOP NEWS HTML:",
    document.getElementById(
        "topNewsGrids"
    )?.innerHTML
);


    } catch (err) {

        console.error(
            "Failed to load category Top News:",
            err
        );


        const topNewsGrid =
            document.getElementById(
                "topNewsGrids"
            );


        if (topNewsGrid) {

            topNewsGrid.innerHTML = "";

        }
    }
}


/* =====================================================
   CALCULATE LATEST NEWS CAPACITY
   ===================================================== */

if (
    isCategoryPage &&
    window.innerWidth > 746
) {

    if (
        page === 1 ||
        categoryPageLimit === null ||
        categoryPageWidth !==
            window.innerWidth
    ) {

        /*
           Top News has now been rendered.

           The browser has its actual DOM structure,
           so its height can now be measured.
        */

        await new Promise(resolve =>
    requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
    })
);

        const calculatedLimit =
            fitCategoryContentToAside(
                container
            );


        console.log(
    "Top News height:",
    document
        .getElementById("topNewsGrids")
        ?.getBoundingClientRect()
        .height
);

console.log(
    "Latest News capacity:",
    calculatedLimit
);


        if (
            calculatedLimit &&
            calculatedLimit > 0
        ) {

            categoryPageLimit =
                calculatedLimit;

        } else {

            categoryPageLimit =
                limit;
        }


        categoryPageWidth =
            window.innerWidth;
    }


    pageLimit =
        categoryPageLimit;
}


/* =====================================================
   LOADING LATEST NEWS
   ===================================================== */

showLoadingCards(
    container,
    pageLimit
);


/* =====================================================
   FETCH LATEST NEWS FROM BACKEND
   ===================================================== */

let articles = [];
let totalPages = 1;


try {

    const result =
        await fetchArticlesFromAPI(
            category,
            page,
            pageLimit
        );


    articles =
        Array.isArray(
            result.articles
        )
            ? result.articles
            : [];


    totalPages =
        Number(
            result.totalPages
        ) || 1;


} catch (err) {

    console.error(
        "Failed to load articles from backend:",
        err
    );


    showFailedCards(
        container,
        pageLimit
    );


    return;
}


/* =====================================================
   GENERAL TOP NEWS
   ===================================================== */

if (
    document.getElementById(
        "newsGridEducation"
    )
) {

    renderTopNews(
        articles
    );
}


/* =====================================================
   TOP NEWS ALWAYS VISIBLE
   ===================================================== */


if (topNewsSection) {

    topNewsSection.style.display =
        "";
}

    /* =====================================================
       RENDER ARTICLES
       
       The backend has already selected the correct page.
       There is NO frontend pagination anymore.
       ===================================================== */

    container.innerHTML = "";


    articles.forEach(
        article => {

            const card =
                createNewsCard(
                    article,
                    "standard"
                );


            container.appendChild(
                card
            );
        }
    );


    /* =====================================================
       GRID LAYOUT
       ===================================================== */

    setArticleGridLayout(
        container
    );


    /* =====================================================
       MATCH MAIN CONTAINER TO ASIDE
       ===================================================== */

    if (isCategoryPage) {

    const container0 =
        document.querySelector(".container0");

    const mainContainer =
        container0?.querySelector(".container");

    if (
        mainContainer &&
        window.innerWidth > 746
    ) {

        /*
         * The height was only needed during
         * the Latest News capacity calculation.
         *
         * Let the content determine the final
         * height so no empty space is created
         * before the footer.
         */
        mainContainer.style.height = "auto";
    }
}


    /* =====================================================
       CACHE NON-CATEGORY PAGES ONLY
       ===================================================== */

    if (!isCategoryPage) {

        try {

            sessionStorage.setItem(
                cacheKey,
                JSON.stringify({

                    articleHTML:
                        container.innerHTML,

                    topNewsHTML:
                        topNewsSection
                            ? topNewsSection.innerHTML
                            : "",

                    topNewsDisplay:
                        topNewsSection
                            ? topNewsSection.style.display
                            : "",

                    categoryTopNewsHTML:
                        document.getElementById(
                            "topNewsGrids"
                        )
                            ? document.getElementById(
                                  "topNewsGrids"
                              ).innerHTML
                            : "",

                    totalPages:
                        totalPages
                })
            );


        } catch (error) {

            console.warn(
                "Could not save page cache:",
                error
            );
        }
    }


    /* =====================================================
       RETURN TOTAL PAGES
       ===================================================== */

    return totalPages;
}



/* =========================
   SEARCH SYSTEM
========================= */

async function searchFunction() {

    const input =
        document.getElementById(
            "searchInput"
        );

    if (!input) return;


    const query =
        input.value
            .toLowerCase()
            .trim();


    const home =
        document.querySelector(
            "div.container"
        );

    const results =
        document.getElementById(
            "searchResults"
        );


    if (!results) return;


    /* =============================================
       FORCE HIDE HOME WHEN SEARCH RUNS
    ============================================= */

    if (home) {
        home.style.display = "none";
    }


    /* =============================================
       EMPTY SEARCH
    ============================================= */

    if (query === "") {

        if (home) {
            home.style.display = "block";
        }

        results.classList.add(
            "hidden"
        );

        results.innerHTML = "";

        return;

    }


    /* =============================================
       SEARCH API
    ============================================= */

    try {

        const response =
            await fetch(
    `https://today-newspaper-api.onrender.com/api/search?q=${encodeURIComponent(query)}&page=1&limit=10000`
);


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        /*
         * Backend already sorts newest → oldest.
         *
         * Sort again defensively so the frontend
         * can never display search results oldest
         * → newest.
         */

        const matches =
            [...(data.articles || [])]
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                );


        /* =============================================
           SHOW RESULTS
        ============================================= */

        results.classList.remove(
            "hidden"
        );


        results.innerHTML = `
            <h2>Search Results (${data.totalArticles})</h2>
            <div class="grid"></div>
        `;


        const grid =
            results.querySelector(
                ".grid"
            );


        /* =============================================
           NO RESULTS
        ============================================= */

        if (matches.length === 0) {

            grid.innerHTML =
                "<p>No articles found</p>";

            return;

        }


        /* =============================================
           RENDER NEWEST → OLDEST
        ============================================= */

        matches.forEach(
            article => {

                const card =
                    createNewsCard(
                        article
                    );


                grid.appendChild(
                    card
                );

            }
        );


    } catch (err) {

        console.error(
            "Failed to search articles:",
            err
        );

        results.classList.remove(
            "hidden"
        );

        results.innerHTML = `
            <h2>Search Results</h2>
            <p>Unable to load search results.</p>
        `;

    }

}

function setArticleGridLayout(container) {

    if (!container) return;

    const cards = container.querySelectorAll(".card");

    const count = cards.length;

    /*
     * Remove previous layout classes
     */
    container.classList.remove(
        "grid-1",
        "grid-2",
        "grid-3",
        "grid-4",
        "grid-5",
        "grid-6",
        "grid-7",
        "grid-8"
    );


    /*
     * Apply layout based on number of cards
     */

    if (count === 1) {

        container.classList.add("grid-1");

    } else if (count === 2) {

        container.classList.add("grid-2");

    } else if (count === 3) {

        container.classList.add("grid-3");

    } else if (count === 4) {

        container.classList.add("grid-4");

    } else if (count === 5) {

        container.classList.add("grid-5");

    } else if (count === 6) {

        container.classList.add("grid-6");

    } else if (count === 7) {

        container.classList.add("grid-7");

    } else {

        container.classList.add("grid-8");

    }
}
let currentPage = 1;
let totalPages = 1;
const limit = 4;


//PAGINATION

const pagination = document.getElementById("pagination");

if (pagination) {
  const category = document.body.dataset.category;

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const firstPageBtn = document.getElementById("firstPage");
  const lastPageBtn = document.getElementById("lastPage");

  function toggle(el, show) {
    el.classList.toggle("hidden", !show);
  }

  async function renderPage(page) {

    totalPages = await loadArticles(
      "articlesGrid",
      category,
      limit,
      page
    );

    const currentPageEl = document.getElementById("currentPage");
    const dots = document.querySelectorAll(".Dots");

    currentPageEl.textContent = page;
    firstPageBtn.textContent = 1;
    lastPageBtn.textContent = totalPages;

    const isFirst = page === 1;
    const isLast = page === totalPages;

    // Remove active state first
    firstPageBtn.classList.remove("active-page");
    lastPageBtn.classList.remove("active-page");

    // Add active state to first or last page button
    if (isFirst) {
      firstPageBtn.classList.add("active-page");
    }

    if (isLast) {
      lastPageBtn.classList.add("active-page");
    }

    // Show current page only when it is not first or last
    toggle(currentPageEl, !isFirst && !isLast);

    // Left dots
    if (dots[0]) {
      toggle(dots[0], page > 2);
    }

    // Right dots
    if (dots[1]) {
      toggle(dots[1], page < totalPages - 1);
    }

    prevBtn.disabled = isFirst;
    nextBtn.disabled = isLast;
  }

  // Previous button
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
    }
  });

  // Next button
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
    }
  });

  // First page button
  firstPageBtn.addEventListener("click", () => {
    if (currentPage !== 1) {
      currentPage = 1;
      renderPage(currentPage);
    }
  });

  // Last page button
  lastPageBtn.addEventListener("click", () => {
    if (currentPage !== totalPages) {
      currentPage = totalPages;
      renderPage(currentPage);
    }
  });

  // Initial render
  renderPage(currentPage);
}

async function loadHomePage() {

    try {

        // =====================================
        // TOP NEWS
        // =====================================

        try {

            const response =
                await fetch(
    "https://today-newspaper-api.onrender.com/api/top-news"
);

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }

            const result =
                await response.json();


            renderTopNews(
                [
                    result.hero,
                    ...result.side
                ]
            );

        } catch (err) {

            console.error(
                "Failed to load Top News:",
                err
            );

        }
        // =====================================
        // EDITOR'S PICKS
        // =====================================

        try {

            const result =
                await fetchEditorsPicksFromAPI();

            renderEditorCards(
                document.getElementById(
                    "newsGridEditor"
                ),
                result.articles
            );

        } catch (err) {

            console.error(
                "Failed to load Editor's Picks:",
                err
            );

        }


        // =====================================
        // EDUCATION
        // =====================================

        await loadArticles(
            "newsGridEducation",
            "Education",
            3
        );


        // =====================================
        // POLITICS
        // =====================================

        await loadArticles(
            "newsGridPolitics",
            "Politics",
            3
        );


        // =====================================
        // TRENDING
        // =====================================

        await loadArticles(
            "newsGridToday",
            "Trending",
            3
        );


    } catch (error) {

        console.error(
            "Failed to load home page:",
            error
        );

    }

}
//HOME PAGE
if (
    document.getElementById(
        "newsGridEducation"
    )
) {

    loadHomePage();

}

const pageCategories = {"education.html": "Education", "politics.html": "Politics", "entertainment.html": "Entertainment", "announces.html": "Announces", "economy.html": "Economy", "laugh.html": "Laugh", "pressEvent.html": "Press & Events", "today.html": "Trending"};
const currentPageName = window.location.pathname.split("/").pop();

function sidebarCarousel() {
  const track = document.querySelector(".track");
  if (!track) return;

  const images = [
    "today_bus_500px.jpg",
    "officeImage.jpeg",
    "waiting room.jpeg",
    "editorsOffice.jpeg",
    "chiefEditor.jpeg"
  ];

  images.forEach(image => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.innerHTML = `<img src="${getImagePath(`team/${image}`)}" alt="Today Newspaper Team">`;
    track.appendChild(slide);
  });

  const slides = [...track.children];
  if (slides.length <= 1) return;

  const firstClone = slides[0].cloneNode(true);
  track.appendChild(firstClone);

  let index = 0;

  function resizeCarousel() {
    const carousel = track.parentElement;
    const width = carousel.clientWidth;
    const height = width * 0.65;

    track.style.height = `${height}px`;

    [...track.children].forEach(slide => {
      slide.style.width = `${width}px`;
      slide.style.height = `${height}px`;
      slide.style.flex = `0 0 ${width}px`;

      const img = slide.querySelector("img");

      if (img) {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
      }
    });
  }

  function moveSlide() {
    index++;
    track.style.transition = "transform .6s ease";
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  track.addEventListener("transitionend", () => {
    if (index === slides.length) {
      track.style.transition = "none";
      index = 0;
      track.style.transform = "translateX(0)";
      track.offsetHeight;
      track.style.transition = "transform .6s ease";
    }
  });

  window.addEventListener("resize", resizeCarousel);

  resizeCarousel();

  setInterval(moveSlide, 3000);
}

sidebarCarousel();

function handleStickyAds(){
  const stickyArea=document.querySelector(".mobile-sticky-area");
  const aside=document.querySelector(".aside");
  const footer=document.querySelector("footer");

  if(!stickyArea||!aside||!footer){
    return;
  }

  let placeholder=document.querySelector(".mobile-sticky-placeholder");

  if(!placeholder){
    placeholder=document.createElement("div");
    placeholder.className="mobile-sticky-placeholder";
    stickyArea.parentNode.insertBefore(placeholder,stickyArea);
  }

  const stickyHeight=stickyArea.offsetHeight;

  const H=document.documentElement.scrollHeight;
  const F=footer.offsetHeight+stickyHeight;
  const V=window.innerHeight;

  const h=H-F;
  const fh=window.scrollY+V;

  const stick=fh<h;

  if(stick&&!stickyArea.classList.contains("is-sticky")){

    placeholder.style.height=`${stickyHeight}px`;

    const asideRect=aside.getBoundingClientRect();

    stickyArea.style.left=
      `${asideRect.left}px`;

    stickyArea.style.width=
      `${asideRect.width}px`;

    stickyArea.classList.add("is-sticky");

  }else if(!stick&&stickyArea.classList.contains("is-sticky")){

    stickyArea.classList.remove("is-sticky");

    stickyArea.style.left="";
    stickyArea.style.width="";

    placeholder.style.height="0px";
  }
}

window.addEventListener(
  "scroll",
  handleStickyAds,
  {passive:true}
);

window.addEventListener(
  "resize",
  handleStickyAds
);

window.addEventListener(
  "load",
  handleStickyAds
);

/*EPAPER - DAILY EDITION*/

function initEPaper() {
    const epaperImage = document.getElementById("epaperImage");

    if (!epaperImage) {
        console.error('Element with ID "epaperImage" not found.');
        return;
    }

    function getPreviousDate() {
        const date = new Date();
        date.setDate(date.getDate() - 1);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function loadEPaper() {
        const previousDate = getPreviousDate();
        const imagePath = getImagePath(`ePaper/${previousDate}.jpg`);

        epaperImage.src = imagePath;
        epaperImage.alt = `Today Newspaper ePaper - ${previousDate}`;
    }

    function scheduleNextMidnight() {
        const now = new Date();
        const nextMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0,
            0
        );

        const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

        setTimeout(() => {
            loadEPaper();
            scheduleNextMidnight();
        }, timeUntilMidnight);
    }

    epaperImage.addEventListener("error", () => {
        const previousDate = getPreviousDate();

        console.warn(`No ePaper found for ${previousDate}`);

        epaperImage.alt = "Today's ePaper is currently unavailable.";
    });

    loadEPaper();
    scheduleNextMidnight();
}

document.addEventListener("DOMContentLoaded", initEPaper);

function initEPaperModal() {
    const epaper = document.getElementById("ePaper");
    if (!epaper) return;

    const modal = document.createElement("div");
    modal.className = "epaper-modal";
    modal.id = "epaperModal";

    modal.innerHTML = `
        <div class="epaper-modal-content">
            <button class="epaper-close" aria-label="Close">&times;</button>

            <div class="epaper-modal-header">
                <span class="epaper-label">TODAY NEWSPAPER</span>
                <h2 id="epaperModalTitle">Access the ePaper</h2>
                <p id="epaperModalText">Sign in to continue reading today's edition.</p>
            </div>

            <form id="epaperSignInForm">
                <div class="epaper-input-group">
                    <label for="epaperEmail">Email Address</label>
                    <input type="email" id="epaperEmail" placeholder="Enter your email address" required>
                </div>

                <div class="epaper-input-group">
                    <label for="epaperPassword">Password</label>

                    <div class="epaper-password-wrapper">
                        <input 
                            type="password" 
                            id="epaperPassword" 
                            placeholder="Enter your password" 
                            required
                        >

                        <button 
                            type="button" 
                            class="epaper-show-password" 
                            data-target="epaperPassword"
                            aria-label="Show password"
                        >
                            <i data-lucide="eye"></i>
                        </button>
                    </div>
                </div>

                <div class="epaper-form-options">
                    <label class="remember-me">
                        <input type="checkbox">
                        <span>Remember me</span>
                    </label>
                    <a href="#" class="forgot-password">Forgot password?</a>
                </div>

                <button type="submit" class="epaper-signin-btn">Sign In</button>
            </form>

            <form id="epaperRegisterForm" style="display:none;">
                <div class="epaper-input-group">
                    <label for="epaperFullName">Full Name</label>
                    <input type="text" id="epaperFullName" placeholder="Enter your full name" required>
                </div>

                <div class="epaper-input-group">
                    <label for="epaperRegisterEmail">Email Address</label>
                    <input type="email" id="epaperRegisterEmail" placeholder="Enter your email address" required>
                </div>

                <div class="epaper-input-group">
                    <label for="epaperRegisterPassword">Password</label>

                    <div class="epaper-password-wrapper">
                        <input 
                            type="password" 
                            id="epaperRegisterPassword" 
                            placeholder="Create a password" 
                            required
                        >
                        <button 
                            type="button" 
                            class="epaper-show-password" 
                            data-target="epaperRegisterPassword"
                            aria-label="Show password"
                        >
                            <i data-lucide="eye"></i>
                        </button>
                    </div>
                                    
                    <div class="epaper-password-requirements">
                        <span>Password must contain:</span>
                        <ul>
                            <li data-rule="length"><i></i>At least 8 characters</li>
                            <li data-rule="uppercase"><i></i>One uppercase letter</li>
                            <li data-rule="lowercase"><i></i>One lowercase letter</li>
                            <li data-rule="number"><i></i>One number</li>
                            <li data-rule="special"><i></i>One special character</li>
                        </ul>
                    </div>
                </div>

                <div class="epaper-input-group">
                    <label for="epaperConfirmPassword">Confirm Password</label>

                    <div class="epaper-password-wrapper">
                        <input 
                            type="password" 
                            id="epaperConfirmPassword" 
                            placeholder="Confirm your password" 
                            required
                        >

                        <button 
                            type="button" 
                            class="epaper-show-password" 
                            data-target="epaperConfirmPassword"
                            aria-label="Show password"
                        >
                            <i data-lucide="eye"></i>
                        </button>
                    </div>

                    <div id="epaperPasswordMatchMessage" class="epaper-password-match-message"></div>
                </div>

                <button type="submit" class="epaper-signin-btn">Create Account</button>
            </form>

            <div class="epaper-divider">
                <span>or</span>
            </div>

            <p class="epaper-register" id="epaperSwitchText">
                Don't have an account?
                <a href="#" id="epaperCreateAccount">Create an account</a>
            </p>
        </div>
    `;

    document.body.appendChild(modal);
    lucide.createIcons();

    const closeButton = modal.querySelector(".epaper-close");
    const signInForm = modal.querySelector("#epaperSignInForm");
    const registerForm = modal.querySelector("#epaperRegisterForm");
    const createAccount = modal.querySelector("#epaperCreateAccount");
    const switchText = modal.querySelector("#epaperSwitchText");
    const title = modal.querySelector("#epaperModalTitle");
    const text = modal.querySelector("#epaperModalText");

    function openModal() {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }

    function showRegisterForm(event) {
        event.preventDefault();

        signInForm.style.display = "none";
        registerForm.style.display = "block";

        title.textContent = "Create an Account";
        text.textContent = "Create your account to access Today's ePaper.";

        switchText.innerHTML = `
            Already have an account?
            <a href="#" id="epaperSignIn">Sign in</a>
        `;

        modal.querySelector("#epaperSignIn").addEventListener("click", showSignInForm);
    }

    function showSignInForm(event) {
        event.preventDefault();

        registerForm.style.display = "none";
        signInForm.style.display = "block";

        title.textContent = "Access the ePaper";
        text.textContent = "Sign in to continue reading today's edition.";

        switchText.innerHTML = `
            Don't have an account?
            <a href="#" id="epaperCreateAccount">Create an account</a>
        `;

        modal.querySelector("#epaperCreateAccount").addEventListener("click", showRegisterForm);
    }

    epaper.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });
    const registerPassword = modal.querySelector("#epaperRegisterPassword");
    const passwordRequirements = modal.querySelectorAll(".epaper-password-requirements li");

    const showPasswordButtons = modal.querySelectorAll(".epaper-show-password");

    showPasswordButtons.forEach(button => {

        button.addEventListener("click", () => {

            const targetId = button.dataset.target;
            const passwordInput = modal.querySelector(`#${targetId}`);

            if (!passwordInput) {
                return;
            }

            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                button.setAttribute("aria-label", "Hide password");
                button.innerHTML = `<i data-lucide="eye-off"></i>`;

            } else {

                passwordInput.type = "password";

                button.setAttribute("aria-label", "Show password");
                button.innerHTML = `<i data-lucide="eye"></i>`;

            }

            lucide.createIcons();

        });

    });

    const confirmPassword = modal.querySelector("#epaperConfirmPassword");
    const passwordMatchMessage = modal.querySelector("#epaperPasswordMatchMessage");

    function checkPasswordMatch() {

        const password = registerPassword.value;
        const confirmPasswordValue = confirmPassword.value;

        // Don't show anything if confirm password is empty
        if (confirmPasswordValue === "") {
            passwordMatchMessage.textContent = "";
            passwordMatchMessage.classList.remove("error", "success");

            return true;
        }

        // Passwords don't match
        if (password !== confirmPasswordValue) {

            passwordMatchMessage.textContent = "Passwords do not match.";
            passwordMatchMessage.classList.add("error");
            passwordMatchMessage.classList.remove("success");

            return false;
        }

        // Passwords match
        passwordMatchMessage.textContent = "Passwords match.";
        passwordMatchMessage.classList.add("success");
        passwordMatchMessage.classList.remove("error");

        return true;
    }

    registerPassword.addEventListener("input", checkPasswordMatch);
    confirmPassword.addEventListener("input", checkPasswordMatch);

    registerPassword.addEventListener("input", () => {
                    const password = registerPassword.value;

        const rules = {length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        passwordRequirements.forEach(requirement => {
            const rule = requirement.dataset.rule;
            const icon = requirement.querySelector("i");

            if (rules[rule]) {
                requirement.classList.add("valid");
                icon.textContent = "✓";
            } else {
                requirement.classList.remove("valid");
                icon.textContent = "";
            }
        });
    });

    createAccount.addEventListener("click", showRegisterForm);

    signInForm.addEventListener("submit", event => {
        event.preventDefault();
        console.log("ePaper sign-in submitted");
    });


    registerForm.addEventListener("submit", event => {
    event.preventDefault();

    const submitButton = registerForm.querySelector(".epaper-signin-btn");
    submitButton.disabled = true;
    submitButton.textContent = "Creating Account...";

    setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Create Account";

        const popup = document.createElement("div");
        popup.className = "epaper-error-popup";

        popup.innerHTML = `
            <div class="epaper-error-content">
                <button type="button" class="epaper-error-close">&times;</button>
                <div class="epaper-error-icon">!</div>
                <h3>Something went wrong</h3>
                <p>Please try again later.</p>
                <button type="button" class="epaper-error-ok">Okay</button>
            </div>
        `;

        document.body.appendChild(popup);

        setTimeout(() => {
            popup.classList.add("active");
        }, 10);

        function closeErrorPopup() {
            popup.classList.remove("active");

            setTimeout(() => {
                popup.remove();
            }, 300);
        }

        popup.querySelector(".epaper-error-close").addEventListener("click", closeErrorPopup);
        popup.querySelector(".epaper-error-ok").addEventListener("click", closeErrorPopup);

        popup.addEventListener("click", event => {
            if (event.target === popup) {
                closeErrorPopup();
            }
        });
    }, 10000);
});


}

document.addEventListener("DOMContentLoaded", initEPaperModal);

function initMobileStickyAds(){
    const stickyArea=document.querySelector(".mobile-sticky-area");
    const ads=document.getElementById("mobileAds");

    if(!stickyArea||!ads) return;

    let button=document.getElementById("toggleMobileAds");

    if(!button){
        button=document.createElement("button");
        button.id="toggleMobileAds";
        button.className="toggle-mobile-ads";
        button.type="button";
        button.setAttribute("aria-label","Hide adverts");

        const arrow=document.createElement("span");
        arrow.id="toggleArrow";
        arrow.textContent="⌄";

        button.appendChild(arrow);
        stickyArea.insertBefore(button,ads);
    }

    const arrow=button.querySelector("#toggleArrow");

    if(!arrow) return;

    let timer=null;

    function isSticky(){
        return stickyArea.classList.contains("is-sticky");
    }

    function showAds(){
        ads.classList.remove("hidden");
        arrow.textContent="⌄";
        button.setAttribute("aria-label","Hide adverts");

        localStorage.removeItem("mobileAdsHidden");

        clearTimeout(timer);
        timer=null;
    }

    function hideAds(){
        ads.classList.add("hidden");
        arrow.textContent="⌃";
        button.setAttribute("aria-label","Show adverts");

        const hiddenTime=Date.now();

        localStorage.setItem(
            "mobileAdsHidden",
            hiddenTime
        );

        clearTimeout(timer);

        timer=setTimeout(()=>{
            localStorage.removeItem("mobileAdsHidden");

            if(isSticky()){
                showAds();
            }
        },300000);
    }

    function updateStickyState(){
        if(!isSticky()){
            button.style.display="none";
            ads.classList.remove("hidden");

            clearTimeout(timer);
            timer=null;

            return;
        }

        button.style.display="flex";

        const hiddenTime=
            localStorage.getItem("mobileAdsHidden");

        if(hiddenTime){

            const elapsed=
                Date.now()-Number(hiddenTime);

            if(elapsed<300000){

                ads.classList.add("hidden");
                arrow.textContent="⌃";
                button.setAttribute(
                    "aria-label",
                    "Show adverts"
                );

                clearTimeout(timer);

                timer=setTimeout(()=>{
                    localStorage.removeItem(
                        "mobileAdsHidden"
                    );

                    if(isSticky()){
                        showAds();
                    }
                },300000-elapsed);

            }else{
                showAds();
            }

        }else{
            showAds();
        }
    }

    button.addEventListener("click",function(event){
        event.preventDefault();
        event.stopPropagation();

        if(!isSticky()) return;

        if(ads.classList.contains("hidden")){
            showAds();
        }else{
            hideAds();
        }
    });

    const observer=new MutationObserver(()=>{
        updateStickyState();
    });

    observer.observe(stickyArea,{
        attributes:true,
        attributeFilter:["class"]
    });

    updateStickyState();
}
initMobileStickyAds();

function renderEditorsPicks(articles) {
const grid = document.getElementById("newsGridEditor");
if (!grid) return;

const storageKey = "editorsPicks";
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

let saved = null;

try {
    saved = JSON.parse(localStorage.getItem(storageKey));
} catch (error) {
    saved = null;
}

if (
    saved &&
    saved.expires > Date.now() &&
    Array.isArray(saved.ids)
) {
    const selected = saved.ids
        .map(id =>
            articles.find(
                article =>
                    String(article.id) === String(id)
            )
        )
        .filter(Boolean);

    if (selected.length === 4) {
        renderEditorCards(grid, selected);
        return;
    }
}

const now = Date.now();

const eligible = articles.filter(article => {
    const articleDate = new Date(article.date);

    if (Number.isNaN(articleDate.getTime())) {
        return false;
    }

    const age = now - articleDate.getTime();

    return age >= 0 && age <= TEN_DAYS;
});

const categoryGroups = {};

eligible.forEach(article => {
    const category = article.category;

    if (!category) return;

    if (!categoryGroups[category]) {
        categoryGroups[category] = [];
    }

    categoryGroups[category].push(article);
});

const categories = Object.keys(categoryGroups);

if (categories.length < 4) {
    grid.innerHTML = "";
    return;
}

const selectedCategories = [...categories]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

const selected = selectedCategories.map(category => {
    const categoryArticles = categoryGroups[category];

    const randomIndex = Math.floor(
        Math.random() * categoryArticles.length
    );

    return categoryArticles[randomIndex];
});

localStorage.setItem(
    storageKey,
    JSON.stringify({
        ids: selected.map(article => article.id),
        expires: Date.now() + SEVEN_DAYS
    })
);

renderEditorCards(grid, selected);

}

function renderEditorCards(grid, articles) {
grid.innerHTML = "";

articles.forEach(article => {
    const card = createNewsCard(
        article,
        "standard",
        true
    );

    grid.appendChild(card);
});

setArticleGridLayout(grid);

}

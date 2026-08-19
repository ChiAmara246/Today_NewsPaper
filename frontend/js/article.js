const params = new URLSearchParams(window.location.search);
const articleId = Number(params.get("id"));

async function loadRelatedArticles(articleId) {

    try {

        const response =
            await fetch(
    `https://today-newspaper-api.onrender.com/api/articles/${articleId}/related`
);


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const related =
            data.articles || [];


        const container =
            document.getElementById(
                "relatedGrid"
            );


        if (!container) return;


        container.innerHTML = "";


        related.forEach(
            article => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.classList.add(
                    "card"
                );


                card.innerHTML = `
                    <h3>${article.headline}</h3>
                `;


                card.addEventListener(
                    "click",
                    () => {
                        openArticle(
                            article.id
                        );
                    }
                );


                container.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Failed to load related articles:",
            error
        );

    }

}


function positionRelatedStories() {

    const related =
        document.querySelector(".related-section");

    const article =
        document.getElementById("story");

    if (!related || !article) return;

    if (window.innerWidth <= 746) {

        // Move Related Stories directly after the article
        article.insertAdjacentElement(
            "afterend",
            related
        );

        // Remember the new position for all articles
        localStorage.setItem(
            "relatedStoriesPosition",
            "mobile"
        );
    }
}

function getReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function showArticleSkeleton() {

    const headline = document.getElementById("headline");
    const author = document.getElementById("author");
    const date = document.getElementById("date");
    const readingTime = document.getElementById("readingTime");
    const articleImg = document.getElementById("articleImg");
    const story = document.getElementById("story");

    if (headline) {
        headline.innerHTML = `
            <div class="article-skeleton-block">
                <span class="article-skeleton-headline-line"></span>
                <span class="article-skeleton-headline-line"></span>
                <span class="article-skeleton-headline-line article-skeleton-headline-short"></span>
            </div>
        `;
    }

    if (author) {
        author.innerHTML = `
            <span class="article-skeleton-meta-line article-skeleton-author-line"></span>
        `;
    }

    if (date) {
        date.innerHTML = `
            <span class="article-skeleton-meta-line article-skeleton-date-line"></span>
        `;
    }

    if (readingTime) {
        readingTime.innerHTML = `
            <span class="article-skeleton-meta-line article-skeleton-reading-line"></span>
        `;
    }

    if (articleImg) {
        articleImg.classList.add("article-skeleton-image");
    }

    if (story) {
        story.innerHTML = `
            <div class="article-skeleton-story">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span class="article-skeleton-story-short"></span>
            </div>
        `;
    }
}

async function loadArticle() {

    showArticleSkeleton();

    const response =
    await fetch(
    `https://today-newspaper-api.onrender.com/api/articles/${articleId}`
);


if (!response.ok) {

    throw new Error(
        `HTTP ${response.status}`
    );

}


const data =
    await response.json();


const article =
    data.article;

    if (!article) {
        document.body.innerHTML = "Article not found";
        return;
    }

    document.getElementById("headline").textContent =
        article.headline;

    let authorText =
        article.author.trim() === ""
            ? "by Today Newspaper Staff"
            : `By ${article.author}`;

    document.getElementById("author").textContent =
        authorText;

    document.getElementById("date").textContent =
        formatPublicationDate(article.date);

    document.getElementById("readingTime").textContent =
        getReadingTime(article.fullStory);


    /* ONLY CHANGE: FULL STORY */

    const articleImg =
        document.getElementById("articleImg");

    const story =
        document.getElementById("story");

    articleImg.onload = function () {

        story.textContent =
            article.fullStory;

    };

    articleImg.onerror = function () {

        story.innerHTML = `
            <div class="article-content-error">

                <div class="article-content-error-icon">
                    !
                </div>

                <div class="article-content-error-title">
                    Article content unavailable
                </div>

                <div class="article-content-error-message">
                    something went wrong at the moment.
                    Please try again later.
                </div>

            </div>
        `;

    };

    articleImg.src =
        getImagePath(article.img);


    positionRelatedStories();

    loadRelatedArticles(articleId);
}

loadArticle();

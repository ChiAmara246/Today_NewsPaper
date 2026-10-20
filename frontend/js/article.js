/* Saved copies (article and related stories), shown if the server is unreachable */

const ARTICLE_COPIES = 30;

function saveArticleCopy(key, data) {

    try {

        const index = JSON.parse(localStorage.getItem("tnpArticleCopies") || "[]")
            .filter(item => item !== key);

        index.unshift(key);

        index.slice(ARTICLE_COPIES).forEach(old => localStorage.removeItem(old));

        localStorage.setItem(key, JSON.stringify(data));

        localStorage.setItem("tnpArticleCopies", JSON.stringify(index.slice(0, ARTICLE_COPIES)));

    } catch (error) {
        /* storage full or blocked: nothing to do */
    }

}

function readArticleCopy(key) {

    try {
        return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
        return null;
    }

}


const params = new URLSearchParams(window.location.search);

/* Server-rendered pages (/article/12-headline) give the id directly */
const articleId =
    Number(window.__ARTICLE_ID__ || params.get("id"));

/* True when the server already filled the page */
const serverRendered =
    Boolean(window.__ARTICLE_ID__);

async function loadRelatedArticles(articleId) {

    const copyKey = `tnpRelated_${articleId}`;

    const saved = readArticleCopy(copyKey);

    if (saved && Array.isArray(saved.articles) && saved.articles.length) {
        renderRelatedArticles(saved.articles);
    }

    try {

        const response =
        await fetch(
            `${API_BASE_URL}/api/articles/${articleId}/related`
        );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();

        saveArticleCopy(copyKey, data);

        renderRelatedArticles(data.articles || []);

    } catch (error) {

        /* Server unreachable: the saved copy stays on screen */

        console.error(
            "Failed to load related articles:",
            error
        );

    }

}


function renderRelatedArticles(related) {

    {


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
                        openArticle(article.id, article.headline);
                    }
                );


                container.appendChild(
                    card
                );

            }
        );


    }

}


function positionRelatedStories() {

    const related =
        document.querySelector(".related-section");

    const actions =
        document.querySelector(".article-actions");

    if (!related || !actions) return;

    if (window.innerWidth <= 746) {

        // Move Related Stories directly after
        // the views/share buttons
        actions.insertAdjacentElement(
            "afterend",
            related
        );

        // Remember the mobile position
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

/* =========================
   ARTICLE VIEWS
   One view per device: the device keeps
   a random id in its browser.
========================= */

function getVisitorId() {

    const key = "tnpVisitorId";

    try {

        let visitorId =
            localStorage.getItem(key);

        if (!visitorId) {

            visitorId =
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

            localStorage.setItem(key, visitorId);

        }

        return visitorId;

    } catch (error) {

        return null;

    }

}


async function registerArticleView(articleId, viewsElement) {

    const visitorId = getVisitorId();

    if (!visitorId) return;

    try {

        const response =
        await fetch(
            `${API_BASE_URL}/api/articles/${articleId}/view`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    visitorId
                })
            }
        );

        if (!response.ok) return;

        const data =
            await response.json();

        if (viewsElement) {
            viewsElement.textContent =
                Number(data.views || 0).toLocaleString();
        }

    } catch (error) {

        console.error(
            "Unable to register article view:",
            error
        );

    }

}


async function loadArticle() {

    /* Server-rendered: content is already there, only add the live parts */
    if (serverRendered) {

        const viewsElement =
            document.getElementById("articleViews");

        registerArticleView(articleId, viewsElement);

        positionRelatedStories();

        loadRelatedArticles(articleId);

        return;
    }

    showArticleSkeleton();

    let data = null;

    try {

        const response =
        await fetch(
            `${API_BASE_URL}/api/articles/${articleId}`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        data = await response.json();

        if (data && data.article) {
            saveArticleCopy(`tnpArticle_${articleId}`, data);
        }

    } catch (error) {

        /* Server unreachable: show the saved copy if we have one */

        data = readArticleCopy(`tnpArticle_${articleId}`);

        if (!data) {

            const story = document.getElementById("story");

            if (story) {
                story.innerHTML = `<p class="article-offline">We can't load this article right now. Please check your connection and try again in a moment.</p>`;
            }

            return;

        }

    }


const article =
    data.article;

    const viewsElement =
    document.getElementById("articleViews");

    if (viewsElement) {
        viewsElement.textContent =
            Number(article.view || 0).toLocaleString();
    }

    if (!article) {
        document.body.innerHTML = "Article not found";
        return;
    }

    registerArticleView(
        article.id,
        viewsElement
    );

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

if (
    typeof article.fullStory === "string" &&
    article.fullStory.trim() !== ""
) {

    story.textContent =
        article.fullStory;

} else {

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

}

/* Article page: no photo means no image at all
   (the branded placeholder is only for cards) */

const articleImagePath =
    getImagePath(article.img);

if (articleImagePath.endsWith(IMAGE_PLACEHOLDER)) {

    articleImg.hidden = true;

    articleImg.removeAttribute("src");

} else {

    articleImg.hidden = false;

    articleImg.onerror = () => {
        articleImg.hidden = true;
        articleImg.removeAttribute("src");
    };

    articleImg.src = articleImagePath;

}


    positionRelatedStories();

    loadRelatedArticles(articleId);
}

loadArticle();
const shareButton =
    document.getElementById("shareArticleBtn");

if (shareButton) {

    shareButton.addEventListener("click", async () => {

        const shareData = {
            title: document.title,
            text: "Read this article on Today Newspaper",
            url: window.location.href
        };

        try {

            if (navigator.share) {

                await navigator.share(shareData);

            } else {

                await navigator.clipboard.writeText(
                    window.location.href
                );

                const originalText =
                    shareButton.innerHTML;

                shareButton.innerHTML =
                    "<span>✓</span> Copied";

                setTimeout(() => {

                    shareButton.innerHTML =
                        originalText;

                }, 2000);

            }

        } catch (error) {

            // User cancelled the native share dialog.
            // Nothing needs to happen.

        }

    });

}

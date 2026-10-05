/* =====================================================
   SERVER-SIDE RENDERING + SEO
   Serves the frontend from Express and fills article
   pages on the server, so search engines and link
   previews (WhatsApp, Facebook, X) get real content
   instead of an empty page.

   - /article/:slug           full article HTML
   - /article.html?id=12      301 → /article/12-headline
   - /sitemap.xml             every article
   - /news-sitemap.xml        articles of the last 48 hours
   - /robots.txt
   - everything else          static frontend files
===================================================== */

const path = require("path");
const fs = require("fs");
const express = require("express");

let sharp = null;

try {
    sharp = require("sharp");
} catch {
    console.warn("sharp not installed: images are served uncompressed.");
}


const SITE_URL =
    (process.env.SITE_URL || "https://todaynewspaperng.com").replace(/\/+$/, "");

const SITE_NAME = "Today Newspaper";

const FRONTEND_DIR =
    path.join(__dirname, "..", "frontend");


/* ---------- helpers ---------- */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


function slugify(text) {

    return String(text || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);

}


function articlePath(article) {

    const slug = slugify(article.headline);

    return `/article/${encodeURIComponent(article.id)}${slug ? `-${slug}` : ""}`;

}


function isImageFile(img) {

    return /\.(jpe?g|png|gif|webp|avif)$/i.test(String(img || "").trim());

}


function imageUrl(img) {

    if (/^https?:\/\//.test(String(img || ""))) {
        return img;
    }

    return isImageFile(img)
        ? `${SITE_URL}/images/${encodeURI(String(img).trim())}`
        : `${SITE_URL}/images/logoDefaultMode.jpg`;

}


function shortText(text, max = 160) {

    const clean = String(text || "").replace(/\s+/g, " ").trim();

    return clean.length > max
        ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`
        : clean;

}


function readingTime(text) {

    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;

    return `${Math.max(1, Math.ceil(words / 200))} min read`;

}


function displayDate(dateString) {

    const date = new Date(dateString);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

}


/* Category → section page (breadcrumb) */

const SECTION_BY_CATEGORY = {
    "education": "navpages/education.html",
    "politics": "navpages/politics.html",
    "economy": "navpages/economy.html",
    "entertainment": "navpages/entertainment.html",
    "trending": "navpages/today.html",
    "announces": "navpages/announces.html",
    "jobs": "navpages/announces.html",
    "press & events": "navpages/pressEvent.html",
    "off the record": "navpages/offTheRecord.html"
};


function sectionUrl(category) {

    const page = SECTION_BY_CATEGORY[String(category || "").trim().toLowerCase()];

    return page ? `/${page}` : "/";

}


function sectionLabel(category) {

    const key = String(category || "").trim().toLowerCase();

    if (key === "announces" || key === "jobs") return "Jobs & Opportunities";

    if (key === "trending") return "Trending News";

    return String(category || "News").trim() || "News";

}


/* Authors: empty author = the newsroom */

const STAFF_NAME = "Today Newspaper Staff";


function authorName(article) {

    return String(article.author || "").trim() || STAFF_NAME;

}


function authorPath(name) {

    return `/author/${slugify(name) || "today-newspaper-staff"}`;

}


/* Compressed, resized image served by /img/:width/... */

const IMAGE_WIDTHS = [320, 640, 960, 1280];


function responsiveImage(img, alt, sizes) {

    const file = encodeURI(String(img).trim());

    if (!sharp) {
        return `<img id="articleImg" src="/images/${file}" alt="${escapeHtml(alt)}">`;
    }

    const srcset =
        IMAGE_WIDTHS.map(width => `/img/${width}/${file} ${width}w`).join(", ");

    return `<img id="articleImg" src="/img/1280/${file}" srcset="${srcset}" sizes="${sizes}" alt="${escapeHtml(alt)}" fetchpriority="high">`;

}


/* Puts the story's paragraphs in <p> tags */

function storyHtml(fullStory) {

    return String(fullStory || "")
        .split(/\n{2,}|\r\n\r\n/)
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
        .join("\n");

}


/* ---------- template ---------- */

let articleTemplate = null;


function getArticleTemplate() {

    if (!articleTemplate || process.env.NODE_ENV !== "production") {

        articleTemplate =
            fs.readFileSync(path.join(FRONTEND_DIR, "article.html"), "utf8");

    }

    return articleTemplate;

}


function setInner(html, id, content) {

    const pattern =
        new RegExp(`(<([a-z0-9]+)[^>]*\\bid="${id}"[^>]*>)([\\s\\S]*?)(</\\2>)`, "i");

    return html.replace(pattern, (match, open, tag, inner, close) => `${open}${content}${close}`);

}


function renderArticle(article) {

    const url = `${SITE_URL}${articlePath(article)}`;
    const title = `${article.headline} | ${SITE_NAME}`;
    const description = shortText(article.summary || article.fullStory);
    const image = imageUrl(article.img);
    const author = String(article.author || "").trim();
    const writer = authorName(article);
    const section = sectionLabel(article.category);
    const sectionHref = sectionUrl(article.category);
    const published = new Date(article.date);
    const publishedIso = Number.isNaN(published.getTime()) ? "" : published.toISOString();


    const structuredData = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: shortText(article.headline, 110),
        description,
        image: [image],
        datePublished: publishedIso || undefined,
        dateModified: publishedIso || undefined,
        articleSection: article.category,
        mainEntityOfPage: url,
        author: author
            ? { "@type": "Person", name: author, url: `${SITE_URL}${authorPath(author)}` }
            : { "@type": "Organization", name: STAFF_NAME, url: `${SITE_URL}${authorPath(STAFF_NAME)}` },
        publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/images/logoDefaultMode.jpg`
            }
        }
    };


    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: section, item: `${SITE_URL}${sectionHref}` },
            { "@type": "ListItem", position: 3, name: article.headline, item: url }
        ]
    };


    const jobData =
        jobPostingData(article, url, description);


    const head = `
    <base href="/">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(url)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(article.headline)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    ${publishedIso ? `<meta property="article:published_time" content="${publishedIso}">` : ""}
    <meta property="article:section" content="${escapeHtml(article.category)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(article.headline)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbData).replace(/</g, "\\u003c")}</script>
    ${jobData ? `<script type="application/ld+json">${JSON.stringify(jobData).replace(/</g, "\\u003c")}</script>` : ""}
    <script>window.__ARTICLE_ID__ = ${JSON.stringify(String(article.id))};</script>`;


    let html = getArticleTemplate();

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

    html = html.replace(/<head>/i, `<head>${head}`);

    html = setInner(html, "headline", escapeHtml(article.headline));

    html = setInner(
        html,
        "author",
        `<a class="article-author-link" href="${authorPath(writer)}" rel="author">${escapeHtml(author ? `By ${author}` : `by ${STAFF_NAME}`)}</a>`
    );


    html = setInner(
        html,
        "breadcrumb",
        `<ol>
            <li><a href="/">Home</a></li>
            <li><a href="${sectionHref}">${escapeHtml(section)}</a></li>
            <li aria-current="page"><span>${escapeHtml(shortText(article.headline, 70))}</span></li>
        </ol>`
    );

    html = setInner(html, "date", `<time datetime="${publishedIso}">${escapeHtml(displayDate(article.date))}</time>`);

    html = setInner(html, "readingTime", escapeHtml(readingTime(article.fullStory)));

    html = setInner(html, "story", jobBoxHtml(article) + storyHtml(article.fullStory));

    html = setInner(html, "articleViews", escapeHtml(Number(article.view || 0).toLocaleString("en-US")));


    /* Main image: only when the article has a real photo */

    html = html.replace(
        /<img id="articleImg"[^>]*>/i,
        isImageFile(article.img)
            ? responsiveImage(article.img, article.headline, "(max-width: 900px) 100vw, 860px")
            : `<img id="articleImg" hidden alt="">`
    );


    return html;

}


/* ---------- job offers (Jobs & Opportunities) ----------
   An article becomes a Google job listing when it has a "job" object:
   {
     "organization": "Babcock University",
     "organizationUrl": "https://babcock.edu.ng",
     "location": "Ilishan-Remo, Ogun",
     "country": "NG",
     "employmentType": "FULL_TIME",        (FULL_TIME, PART_TIME, CONTRACTOR, INTERN…)
     "validThrough": "2026-11-30",
     "salary": { "min": 150000, "max": 250000, "currency": "NGN", "unit": "MONTH" },
     "applyUrl": "https://…",
     "remote": false
   }
---------------------------------------------------------- */

function jobPostingData(article, url, description) {

    const job = article.job;

    if (!job || !job.organization) {
        return null;
    }


    const data = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: shortText(job.title || article.headline, 110),
        description: storyHtml(article.fullStory) || escapeHtml(description),
        datePosted: new Date(article.date).toISOString().slice(0, 10),
        hiringOrganization: {
            "@type": "Organization",
            name: job.organization,
            ...(job.organizationUrl ? { sameAs: job.organizationUrl } : {})
        },
        url
    };


    if (job.validThrough) data.validThrough = job.validThrough;

    if (job.employmentType) data.employmentType = job.employmentType;


    if (job.remote) {

        data.jobLocationType = "TELECOMMUTE";

        data.applicantLocationRequirements = { "@type": "Country", name: job.country || "NG" };

    } else {

        data.jobLocation = {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                addressLocality: job.location || "",
                addressCountry: job.country || "NG"
            }
        };

    }


    if (job.salary && (job.salary.min || job.salary.max)) {

        data.baseSalary = {
            "@type": "MonetaryAmount",
            currency: job.salary.currency || "NGN",
            value: {
                "@type": "QuantitativeValue",
                ...(job.salary.min ? { minValue: Number(job.salary.min) } : {}),
                ...(job.salary.max ? { maxValue: Number(job.salary.max) } : {}),
                unitText: job.salary.unit || "MONTH"
            }
        };

    }


    return data;

}


function jobBoxHtml(article) {

    const job = article.job;

    if (!job || !job.organization) {
        return "";
    }


    const rows = [
        ["Employer", job.organization],
        ["Location", job.remote ? "Remote" : job.location],
        ["Type", job.employmentType ? String(job.employmentType).replace(/_/g, " ").toLowerCase() : ""],
        ["Apply before", job.validThrough ? displayDate(job.validThrough) : ""]
    ].filter(([, value]) => value);


    return `
        <aside class="job-box">
            <dl>
                ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
            </dl>
            ${job.applyUrl ? `<a class="job-apply" href="${escapeHtml(job.applyUrl)}" target="_blank" rel="noopener noreferrer">Apply now →</a>` : ""}
        </aside>
    `;

}


/* ---------- author pages ---------- */

const AUTHOR_PAGE_SIZE = 24;


function renderAuthorPage(name, list, page) {

    const totalPages = Math.max(1, Math.ceil(list.length / AUTHOR_PAGE_SIZE));

    const current = Math.min(Math.max(1, page), totalPages);

    const items = list.slice((current - 1) * AUTHOR_PAGE_SIZE, current * AUTHOR_PAGE_SIZE);

    const url = `${SITE_URL}${authorPath(name)}${current > 1 ? `?page=${current}` : ""}`;

    const isStaff = name === STAFF_NAME;

    const description =
        isStaff
            ? `News, reports and analysis from the ${SITE_NAME} newsroom.`
            : `Articles written by ${name} for ${SITE_NAME}.`;


    const personData = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url,
        mainEntity: isStaff
            ? { "@type": "Organization", name: STAFF_NAME, url: `${SITE_URL}${authorPath(name)}` }
            : { "@type": "Person", name, url: `${SITE_URL}${authorPath(name)}`, worksFor: { "@type": "Organization", name: SITE_NAME } }
    };


    const head = `
    <base href="/">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(url)}">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(name)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    <script type="application/ld+json">${JSON.stringify(personData).replace(/</g, "\\u003c")}</script>`;


    const listHtml =
        items.map(article => `
            <li class="author-item">
                <a href="${articlePath(article)}">
                    <span class="author-item-meta">${escapeHtml(sectionLabel(article.category))} · <time datetime="${escapeHtml(article.date)}">${escapeHtml(displayDate(article.date))}</time></span>
                    <span class="author-item-title">${escapeHtml(article.headline)}</span>
                    <span class="author-item-summary">${escapeHtml(shortText(article.summary, 180))}</span>
                </a>
            </li>`).join("");


    const pager =
        totalPages > 1
            ? `<nav class="author-pager" aria-label="Pages">
                ${current > 1 ? `<a href="${authorPath(name)}?page=${current - 1}" rel="prev">← Newer</a>` : "<span></span>"}
                <span>Page ${current} of ${totalPages}</span>
                ${current < totalPages ? `<a href="${authorPath(name)}?page=${current + 1}" rel="next">Older →</a>` : "<span></span>"}
               </nav>`
            : "";


    const main = `
        <main class="article-page author-page">
          <div class="breadcrumb" role="navigation" aria-label="Breadcrumb">
            <ol><li><a href="/">Home</a></li><li aria-current="page"><span>${escapeHtml(name)}</span></li></ol>
          </div>
          <header class="author-head">
            <span class="author-avatar" aria-hidden="true">${escapeHtml(name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase())}</span>
            <div>
              <span class="author-kicker">${isStaff ? "Newsroom" : "Author"}</span>
              <h1>${escapeHtml(name)}</h1>
              <p>${escapeHtml(description)} ${list.length.toLocaleString("en-US")} articles.</p>
            </div>
          </header>
          <ol class="author-list">${listHtml}</ol>
          ${pager}
        </main>`;


    let html = getArticleTemplate();

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(name)} | ${SITE_NAME}</title>`);

    html = html.replace(/<head>/i, `<head>${head}`);

    html = html.replace(/<main class="article-page">[\s\S]*?<\/main>/i, main);

    html = html.replace(/<script src="js\/article\.js[^"]*"[^>]*><\/script>/i, "");


    return html;

}


/* =====================================================
   LISTING PAGES (home, sections, charity)
   The server fills the grids with real cards and links;
   the page's JavaScript then takes over as before.
===================================================== */

const API_ORIGIN =
    `http://127.0.0.1:${process.env.PORT || 3000}`;


async function apiGet(pathname) {

    try {

        const response = await fetch(`${API_ORIGIN}${pathname}`);

        return response.ok ? await response.json() : null;

    } catch (error) {

        console.error("SSR api error:", pathname, error.message);

        return null;

    }

}


const pageTemplates = new Map();


function getTemplate(relativeFile) {

    if (!pageTemplates.has(relativeFile) || process.env.NODE_ENV !== "production") {

        pageTemplates.set(
            relativeFile,
            fs.readFileSync(path.join(FRONTEND_DIR, relativeFile), "utf8")
        );

    }

    return pageTemplates.get(relativeFile);

}


function cardImageSrc(img, width) {

    if (!isImageFile(img)) {
        return "/images/placeholder.svg";
    }

    const file = encodeURI(String(img).trim());

    return sharp ? `/img/${width}/${file}` : `/images/${file}`;

}


/* Same structure as createNewsCard() in index.js */

function cardHtml(article, { type = "standard", showCategory = false, width = 640 } = {}) {

    const classes =
        ["card"]
            .concat(type === "featured" ? ["featured", "hero-card"] : [])
            .concat(type === "side" ? ["side-card"] : [])
            .join(" ");


    return `
<article class="${classes}" data-id="${escapeHtml(article.id)}" data-headline="${escapeHtml(article.headline)}" data-ssr="1">
  <img loading="lazy" decoding="async" src="${cardImageSrc(article.img, width)}" alt="${escapeHtml(article.headline)}">
  <div class="cardContent">
    ${showCategory ? `<span class="categoryTag">${escapeHtml(article.category)}</span>` : ""}
    <h3><a href="${articlePath(article)}">${escapeHtml(article.headline)}</a></h3>
    ${type !== "side" ? `<p>${escapeHtml(shortText(article.summary, 220))}</p>` : ""}
    <span class="date"><time datetime="${escapeHtml(article.date)}">${escapeHtml(displayDate(article.date))}</time></span>
  </div>
</article>`;

}


function topNewsHtml(hero, side, showCategory) {

    if (!hero) {
        return "";
    }

    return cardHtml(hero, { type: "featured", showCategory, width: 960 }) +
        `<div class="side-news">${side.map(article => cardHtml(article, { type: "side", showCategory })).join("")}</div>`;

}


function fillById(html, id, content) {

    return setInner(html, id, content);

}


function headTags({ title, description, url, image, type = "website", jsonLd = [] }) {

    return `
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(url)}">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:image" content="${escapeHtml(image || `${SITE_URL}/images/logoDefaultMode.jpg`)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image || `${SITE_URL}/images/logoDefaultMode.jpg`)}">
    ${jsonLd.map(data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`).join("\n    ")}`;

}


function applyHead(html, pageTitle, head) {

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    /* Right after the charset/viewport metas */
    return html.replace(/(<meta name="viewport"[^>]*>)/i, `$1${head}`);

}


function itemListData(articles, url) {

    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        url,
        itemListElement: articles.map((article, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}${articlePath(article)}`,
            name: article.headline
        }))
    };

}


/* ---------- sections ---------- */

const SECTION_META = {
    "education.html": "Education news from Nigeria: schools, universities, JAMB, WAEC, scholarships and education policy.",
    "politics.html": "Nigerian politics: the Presidency, National Assembly, states, elections and governance.",
    "economy.html": "Nigeria's economy: business, markets, oil and gas, banking, inflation and jobs.",
    "today.html": "Trending news in Nigeria and Africa today.",
    "entertainment.html": "Entertainment news: Nollywood, Afrobeats, celebrities, sports and culture.",
    "announces.html": "Jobs and opportunities in Nigeria: vacancies, scholarships, grants and training programmes.",
    "pressEvent.html": "Press releases and events from across Nigeria.",
    "offTheRecord.html": "Off the Record: behind-the-scenes stories and lighter moments from the news.",
    "about.html": "About Today Newspaper: our mission, our team and how to contact us."
};


const SECTION_TITLES = {
    "education.html": "Education",
    "politics.html": "Politics",
    "economy.html": "Economy",
    "today.html": "Trending News",
    "entertainment.html": "Entertainment",
    "announces.html": "Jobs & Opportunities",
    "pressEvent.html": "Press & Events",
    "offTheRecord.html": "Off the Record",
    "about.html": "About Us"
};


const SECTION_PAGE_SIZE = 4;


async function renderSectionPage(file, page) {

    let html = getTemplate(`navpages/${file}`);

    const category =
        (html.match(/<body[^>]*data-category="([^"]*)"/i) || [])[1] || "";

    const label = SECTION_TITLES[file] || category || SITE_NAME;

    const url = `${SITE_URL}/navpages/${file}${page > 1 ? `?page=${page}` : ""}`;

    const description = SECTION_META[file] || `${label} news from ${SITE_NAME}.`;


    let listed = [];


    if (category) {

        const [top, latest] = await Promise.all([
            page === 1 ? apiGet(`/api/top-news/category?category=${encodeURIComponent(category)}`) : null,
            apiGet(`/api/articles?category=${encodeURIComponent(category)}&page=${page}&limit=${SECTION_PAGE_SIZE}`)
        ]);


        const topArticles = (top && top.articles) || [];

        const latestArticles = (latest && latest.articles) || [];

        const totalPages = (latest && latest.totalPages) || 1;


        if (topArticles.length >= 3) {
            html = fillById(html, "topNewsGrids", topNewsHtml(topArticles[0], topArticles.slice(1, 3), false));
        }


        if (latestArticles.length) {

            html = fillById(html, "articlesGrid", latestArticles.map(article => cardHtml(article)).join(""));


            /* Plain links to the next pages, for crawlers without JavaScript */

            const base = `/navpages/${file}`;

            const pager = `
<noscript><nav class="seo-pager">
  ${page > 1 ? `<a href="${base}${page > 2 ? `?page=${page - 1}` : ""}" rel="prev">Newer stories</a>` : ""}
  ${page < totalPages ? `<a href="${base}?page=${page + 1}" rel="next">Older stories</a>` : ""}
</nav></noscript>`;

            html = html.replace(/(<div id="pagination">)/i, `${pager}$1`);

        }


        listed = topArticles.concat(latestArticles);

    }


    const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: label, item: url }
        ]
    };


    const jsonLd = [
        { "@context": "https://schema.org", "@type": file === "about.html" ? "AboutPage" : "CollectionPage", name: label, url, description },
        breadcrumb
    ];

    if (listed.length) jsonLd.push(itemListData(listed, url));


    return applyHead(
        html,
        `${label}${page > 1 ? ` – Page ${page}` : ""} | ${SITE_NAME}`,
        headTags({ title: `${label} | ${SITE_NAME}`, description, url, jsonLd })
    );

}


/* ---------- home ---------- */

async function renderHomePage() {

    let html = getTemplate("index.html");

    const url = `${SITE_URL}/`;

    const description =
        "Today Newspaper: credible news and analysis from Nigeria and Africa — education, politics, the economy, entertainment and trending stories.";


    const [top, education, politics, trending, editors] = await Promise.all([
        apiGet("/api/top-news"),
        apiGet("/api/articles?category=Education&page=1&limit=3"),
        apiGet("/api/articles?category=Politics&page=1&limit=3"),
        apiGet("/api/articles?category=Trending&page=1&limit=3"),
        apiGet("/api/editors-picks")
    ]);


    const listed = [];


    if (top && top.hero) {

        html = fillById(html, "topnewsGrid", topNewsHtml(top.hero, top.side || [], true));

        listed.push(top.hero, ...(top.side || []));

    }


    [
        ["newsGridEducation", education],
        ["newsGridPolitics", politics],
        ["newsGridToday", trending],
        ["newsGridEditor", editors]
    ].forEach(([id, data]) => {

        const list = (data && data.articles) || [];

        if (list.length) {

            html = fillById(html, id, list.map(article => cardHtml(article, { showCategory: id === "newsGridEditor" })).join(""));

            listed.push(...list);

        }

    });


    const organization = {
        "@context": "https://schema.org",
        "@type": "NewsMediaOrganization",
        name: SITE_NAME,
        url,
        logo: `${SITE_URL}/images/logoDefaultMode.jpg`,
        email: "infos@todaynewspaperng.com",
        telephone: "+2347076254498",
        address: { "@type": "PostalAddress", addressLocality: "Lekki, Lagos", addressCountry: "NG" },
        sameAs: [
            "https://www.facebook.com/Today-Newspaper-100000000000000",
            "https://twitter.com/TodayNewspaper",
            "https://www.instagram.com/todaynewspaper/",
            "https://www.tiktok.com/@todaynewspaper"
        ]
    };


    const website = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url
    };


    const jsonLd = [organization, website];

    if (listed.length) jsonLd.push(itemListData(listed, url));


    return applyHead(
        html,
        `${SITE_NAME} – Informed Today, Empowered Tomorrow`,
        headTags({ title: SITE_NAME, description, url, jsonLd })
    );

}


/* ---------- charity (Open Hearts Foundation) ---------- */

const FOUNDATION = "Open Hearts Foundation";


function charityImage(charity) {

    return isImageFile(charity.img)
        ? `${SITE_URL}/images/${encodeURI(String(charity.img).trim())}`
        : `${SITE_URL}/charityEvent/campaign%20images/logos/open-hearts-text.png`;

}


function charityDescription(charity) {

    const text = [].concat(charity.description || []).join(" ");

    return shortText(text || `${charity.activityHeadline} — a campaign by the ${FOUNDATION}.`);

}


function charityEventData(charity, url) {

    const start = new Date(charity.date);

    if (Number.isNaN(start.getTime())) {
        return null;
    }

    return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: charity.activityHeadline,
        description: charityDescription(charity),
        startDate: start.toISOString(),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
            "@type": "Place",
            name: charity.location || "Nigeria",
            address: { "@type": "PostalAddress", addressLocality: charity.location || "", addressCountry: "NG" }
        },
        image: [charityImage(charity)],
        url,
        organizer: { "@type": "NGO", name: FOUNDATION, url: `${SITE_URL}/charityEvent/charityEvents.html` }
    };

}


function charityDetailUrl(charity) {

    const upcoming =
        new Date(charity.date) >= new Date(new Date().setHours(0, 0, 0, 0));

    return `/charityEvent/${upcoming ? "upcomingWork" : "latestWork"}.html?id=${encodeURIComponent(charity.id)}`;

}


async function renderCharityHome() {

    let html = getTemplate("charityEvent/charityEvents.html");

    const url = `${SITE_URL}/charityEvent/charityEvents.html`;

    const data = await apiGet("/api/charities");

    const charities = (data && data.charities) || [];

    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const upcoming =
        charities
            .filter(charity => new Date(charity.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));


    const description =
        `The ${FOUNDATION} by Today Newspaper: charity campaigns for children and families in Africa. Donate, volunteer or propose an idea.`;


    /* A plain list of the next campaigns, replaced by the agenda script */

    if (upcoming.length) {

        html = fillById(
            html,
            "upcomingCharity",
            `<ol class="cp-agenda">${upcoming.slice(0, 6).map(charity => `
  <li><a class="cp-agenda-item" href="${charityDetailUrl(charity)}">
    <span class="cp-agenda-date"><strong>${new Date(charity.date).getDate()}</strong><span>${escapeHtml(new Date(charity.date).toLocaleDateString("en-GB", { month: "short" }))}</span></span>
    <span class="cp-agenda-body"><span class="cp-agenda-title">${escapeHtml(charity.activityHeadline)}</span><span class="cp-agenda-meta">${escapeHtml(charity.location || "")}</span></span>
  </a></li>`).join("")}</ol>`
        );

    }


    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "NGO",
            name: FOUNDATION,
            url,
            logo: `${SITE_URL}/charityEvent/campaign%20images/logos/open-hearts-text.png`,
            parentOrganization: { "@type": "NewsMediaOrganization", name: SITE_NAME, url: `${SITE_URL}/` }
        },
        ...upcoming.slice(0, 6).map(charity => charityEventData(charity, `${SITE_URL}${charityDetailUrl(charity)}`)).filter(Boolean)
    ];


    return applyHead(
        html,
        `${FOUNDATION} – Charity campaigns | ${SITE_NAME}`,
        headTags({ title: FOUNDATION, description, url, jsonLd })
    );

}


async function renderCharityDetail(file, id) {

    let html = getTemplate(`charityEvent/${file}`);

    const data = id ? await apiGet(`/api/charities/${encodeURIComponent(id)}`) : null;

    const charity = data && data.charity;


    if (!charity) {
        return null;
    }


    const url = `${SITE_URL}/charityEvent/${file}?id=${encodeURIComponent(charity.id)}`;

    const description = charityDescription(charity);

    const containerId = file === "upcomingWork.html" ? "upcomingDetail" : "charityDetail";


    /* Readable content until the page script draws the full layout */

    html = fillById(
        html,
        containerId,
        `<div class="ssr-charity">
  <p class="cp-label">${escapeHtml(charity.label || FOUNDATION)}</p>
  <h1>${escapeHtml(charity.activityHeadline)}</h1>
  <p class="cp-smallcaps">${escapeHtml(displayDate(charity.date))}${charity.location ? ` · ${escapeHtml(charity.location)}` : ""}</p>
  ${[].concat(charity.description || []).map(text => `<p>${escapeHtml(text)}</p>`).join("")}
</div>`
    );


    const event = charityEventData(charity, url);


    return applyHead(
        html,
        `${charity.activityHeadline} | ${FOUNDATION}`,
        headTags({
            title: charity.activityHeadline,
            description,
            url,
            image: charityImage(charity),
            jsonLd: event ? [event] : []
        })
    );

}


/* ---------- sitemaps ---------- */

function xmlEscape(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}


const SECTION_PAGES = [
    "",
    "navpages/education.html",
    "navpages/politics.html",
    "navpages/economy.html",
    "navpages/today.html",
    "navpages/entertainment.html",
    "navpages/announces.html",
    "navpages/pressEvent.html",
    "navpages/offTheRecord.html",
    "navpages/about.html",
    "charityEvent/charityEvents.html"
];


let sitemapCharities = [];


function sitemapXml(articles) {

    const sections =
        SECTION_PAGES.map(page => `
  <url><loc>${SITE_URL}/${page}</loc><changefreq>hourly</changefreq></url>`).join("");


    const items =
        articles.map(article => {

            const date = new Date(article.date);

            return `
  <url><loc>${xmlEscape(SITE_URL + articlePath(article))}</loc>${
                Number.isNaN(date.getTime()) ? "" : `<lastmod>${date.toISOString()}</lastmod>`
            }</url>`;

        }).join("");


    const authors =
        [...new Set(articles.map(authorName))]
            .map(name => `
  <url><loc>${xmlEscape(SITE_URL + authorPath(name))}</loc><changefreq>daily</changefreq></url>`).join("");


    const charities =
        sitemapCharities.map(charity => `
  <url><loc>${xmlEscape(SITE_URL + charityDetailUrl(charity))}</loc></url>`).join("");


    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sections}${authors}${charities}${items}
</urlset>`;

}


function newsSitemapXml(articles) {

    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;


    const recent =
        articles
            .filter(article => {
                const time = new Date(article.date).getTime();
                return !Number.isNaN(time) && time >= twoDaysAgo && time <= Date.now();
            })
            .slice(0, 1000);


    const items =
        recent.map(article => `
  <url>
    <loc>${xmlEscape(SITE_URL + articlePath(article))}</loc>
    <news:news>
      <news:publication><news:name>${SITE_NAME}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${new Date(article.date).toISOString()}</news:publication_date>
      <news:title>${xmlEscape(article.headline)}</news:title>
    </news:news>
  </url>`).join("");


    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>`;

}


/* ---------- routes ---------- */

function registerSsr(app, getArticles) {

    const findArticle = id =>
        getArticles().find(item => String(item.id) === String(id));


    /* Old links: article.html?id=12 → /article/12-headline */

    app.get(
        "/article.html",
        (req, res, next) => {

            const article = req.query.id && findArticle(req.query.id);

            if (!article) {
                return next();
            }

            res.redirect(301, articlePath(article));

        }
    );


    app.get(
        "/article/:slug",
        (req, res, next) => {

            const id = String(req.params.slug).split("-")[0];

            const article = findArticle(id);


            if (!article) {
                return next();
            }


            /* Wrong or outdated slug → the canonical address */

            const canonical = articlePath(article);

            if (decodeURIComponent(req.path) !== decodeURIComponent(canonical)) {
                return res.redirect(301, canonical);
            }


            try {

                res.set("Cache-Control", "public, max-age=300");

                res.type("html").send(renderArticle(article));

            } catch (error) {

                console.error("Article render error:", error.message);

                next();

            }

        }
    );


    app.get(
        "/author/:slug",
        (req, res, next) => {

            const slug = String(req.params.slug);

            const list =
                getArticles()
                    .filter(article => slugify(authorName(article)) === slug)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));


            if (!list.length) {
                return next();
            }


            res.set("Cache-Control", "public, max-age=300");

            res.type("html").send(
                renderAuthorPage(authorName(list[0]), list, Number(req.query.page) || 1)
            );

        }
    );


    /* Compressed images: /img/640/photo.jpg → resized WebP, cached on disk */

    const IMAGE_DIR = path.join(FRONTEND_DIR, "images");

    const CACHE_DIR = path.join(__dirname, ".image-cache");


    app.get(
        "/img/:width/*file",
        async (req, res, next) => {

            const width = Number(req.params.width);

            const file = [].concat(req.params.file).join("/");

            const source = path.join(IMAGE_DIR, file);


            if (
                !sharp ||
                !IMAGE_WIDTHS.includes(width) ||
                !isImageFile(file) ||
                !source.startsWith(IMAGE_DIR + path.sep) ||
                !fs.existsSync(source)
            ) {
                return next();
            }


            const cached =
                path.join(CACHE_DIR, String(width), `${file}.webp`);


            try {

                if (!fs.existsSync(cached)) {

                    fs.mkdirSync(path.dirname(cached), { recursive: true });

                    await sharp(source)
                        .rotate()
                        .resize({ width, withoutEnlargement: true })
                        .webp({ quality: 78 })
                        .toFile(cached);

                }


                res.set("Cache-Control", "public, max-age=2592000, immutable");

                res.type("image/webp").sendFile(cached, { dotfiles: "allow" });

            } catch (error) {

                console.error("Image resize error:", file, error.message);

                res.sendFile(source);

            }

        }
    );


    app.get(
        "/sitemap.xml",
        async (req, res) => {

            const data = await apiGet("/api/charities");

            sitemapCharities = (data && data.charities) || [];

            res.set("Cache-Control", "public, max-age=3600");

            res.type("application/xml").send(sitemapXml(getArticles()));

        }
    );


    app.get(
        "/news-sitemap.xml",
        (req, res) => {

            res.set("Cache-Control", "public, max-age=600");

            res.type("application/xml").send(newsSitemapXml(getArticles()));

        }
    );


    app.get(
        "/robots.txt",
        (req, res) => {

            res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/news-sitemap.xml
`
            );

        }
    );


    /* Listing pages rendered on the server */

    const sendPage = (res, html) => {

        res.set("Cache-Control", "public, max-age=300");

        res.type("html").send(html);

    };


    app.get(
        ["/", "/index.html"],
        async (req, res, next) => {

            try {
                sendPage(res, await renderHomePage());
            } catch (error) {
                console.error("Home render error:", error.message);
                next();
            }

        }
    );


    app.get(
        "/navpages/:file",
        async (req, res, next) => {

            const file = String(req.params.file);

            if (!SECTION_TITLES[file]) {
                return next();
            }

            try {
                sendPage(res, await renderSectionPage(file, Math.max(1, Number(req.query.page) || 1)));
            } catch (error) {
                console.error("Section render error:", error.message);
                next();
            }

        }
    );


    app.get(
        "/charityEvent/charityEvents.html",
        async (req, res, next) => {

            try {
                sendPage(res, await renderCharityHome());
            } catch (error) {
                console.error("Charity render error:", error.message);
                next();
            }

        }
    );


    app.get(
        ["/charityEvent/upcomingWork.html", "/charityEvent/latestWork.html"],
        async (req, res, next) => {

            try {

                const html =
                    await renderCharityDetail(path.basename(req.path), req.query.id);

                return html ? sendPage(res, html) : next();

            } catch (error) {
                console.error("Charity detail render error:", error.message);
                next();
            }

        }
    );


    /* Everything else: the static frontend */

    app.use(
        express.static(FRONTEND_DIR, {
            extensions: ["html"],
            maxAge: "1h"
        })
    );

}


module.exports = {
    registerSsr,
    articlePath,
    slugify
};

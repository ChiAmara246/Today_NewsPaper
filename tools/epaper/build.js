#!/usr/bin/env node
/* =====================================================
   TODAY NEWSPAPER — DAILY ePAPER

   Builds the ePaper of one day from backend/data/index.json:
     frontend/images/ePaper/<day>.pdf   the edition (A4)
     frontend/images/ePaper/<day>.jpg   its front page (cover)

   <day> is the news day (Lagos time). The edition is dated
   the next morning, like a printed paper: the stories of
   20 October make the edition of Wednesday 21 October.

   Usage:
     node tools/epaper/build.js            (yesterday, Lagos time)
     node tools/epaper/build.js 2026-10-20

   Editorial choices (optional): tools/epaper/editions/<day>.json
     { "lead": 6672, "front": [6680, 6675], "include": [6650], "exclude": [6690] }
   ("include": stories dated another day; the lead is always included;
    "openers": { "Politics": 6679 } picks the first story of a section page)
   Without it, the front page is chosen by importance.

   Needs Google Chrome (CHROME=/path/to/chrome to override).
===================================================== */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const IMAGES = path.join(ROOT, "frontend", "images");
const OUT_DIR = path.join(IMAGES, "ePaper");

const LAGOS_OFFSET_MS = 60 * 60 * 1000;   /* UTC+1, no summer time */

/* Numbering continues the printed mock-ups (Vol. 6, No. 2214 on 9 August 2026) */
const NUMBER_BASE = { date: "2026-08-09", number: 2214, volume: 6 };

/* Section pages, in the order of the paper */
const SECTIONS = [
    { key: "Trending", label: "Nation" },
    { key: "Politics", label: "Politics" },
    { key: "Economy", label: "Economy" },
    { key: "Education", label: "Education" },
    { key: "Entertainment", label: "Entertainment" },
    { key: "Announces", label: "Jobs & Opportunities" }
];

const SECTION_OF = { Society: "Trending" };

/* Weight of each section when choosing the front page */
const FRONT_WEIGHT = { Trending: 3, Politics: 3, Economy: 2, Education: 2, Entertainment: 1, Announces: 0 };


/* ---------- dates ---------- */

function lagosDay(value) {
    const time = Date.parse(value);
    if (Number.isNaN(time)) return "";
    return new Date(time + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(day, count) {
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
}

function ordinal(n) {
    const rest = n % 100;
    if (rest >= 11 && rest <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

function longDate(day) {
    const date = new Date(`${day}T12:00:00Z`);
    const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    const month = date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
    return `${weekday}, ${ordinal(date.getUTCDate())} ${month} ${date.getUTCFullYear()}`;
}

function editionNumber(editionDay) {
    const days = Math.round(
        (Date.parse(`${editionDay}T12:00:00Z`) - Date.parse(`${NUMBER_BASE.date}T12:00:00Z`)) / 86400000
    );
    return NUMBER_BASE.number + days;
}


/* ---------- text ---------- */

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function paragraphs(story) {
    return String(story || "")
        .split(/\n{2,}/)
        .map(part => part.trim())
        .filter(Boolean);
}

/* "ABUJA — Text" : dateline in bold */
function paragraphHtml(text, first) {
    const safe = escapeHtml(text);
    if (first) {
        const match = safe.match(/^([A-Z][A-Z .'-]{1,40}) — (.*)$/s);
        if (match) return `<p><b>${match[1]} —</b> ${match[2]}</p>`;
    }
    return `<p>${safe}</p>`;
}

function shorten(text, max) {
    const clean = String(text || "").trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max).replace(/[\s,;:.]+\S*$/, "")}…`;
}

function photoUrl(article) {
    const img = String(article.img || "").trim();
    if (!img || /^(https?:)?\/\//.test(img)) return "";
    const file = path.join(IMAGES, img);
    return fs.existsSync(file) ? `file://${encodeURI(file)}` : "";
}


/* ---------- choosing the stories ---------- */

function importance(article) {
    let score = 0;
    if (article.breaking) score += 20;
    if (article.featured) score += 15;
    score += (FRONT_WEIGHT[article.section] || 0) * 3;
    score += Math.min(String(article.fullStory || "").length / 400, 6);
    if (photoUrl(article)) score += 2;
    return score;
}

function chooseFront(stories, choices) {
    const byId = new Map(stories.map(story => [String(story.id), story]));
    const ranked = [...stories].sort((a, b) => importance(b) - importance(a));

    const lead = byId.get(String(choices.lead)) || ranked[0];
    const picked = [lead];

    (choices.front || []).forEach(id => {
        const story = byId.get(String(id));
        if (story && !picked.includes(story)) picked.push(story);
    });

    /* Then the most important stories, varying the sections */
    const rest = ranked.filter(story => !picked.includes(story));
    const seen = new Set(picked.map(story => story.section));
    rest.filter(story => !seen.has(story.section) && seen.add(story.section)).forEach(story => picked.push(story));
    rest.filter(story => !picked.includes(story)).forEach(story => picked.push(story));

    return { lead, others: picked.slice(1, 11) };
}


/* ---------- HTML ---------- */

function pageHeader(edition, pageNumber, label) {
    return `
    <header class="page-head">
      <span>TODAY NEWSPAPER</span>
      <span>${escapeHtml(edition.dateText)}</span>
      <span>Page ${pageNumber}</span>
    </header>
    <div class="section-bar"><span>${escapeHtml(label)}</span></div>`;
}

function teaserHtml(story, size) {
    const photo = photoUrl(story);
    return `
      <div class="teaser teaser-${size}">
        <span class="label">${escapeHtml(story.sectionLabel)}</span>
        <h3>${escapeHtml(story.headline)}</h3>
        ${photo ? `<img src="${photo}" alt="">` : ""}
        ${size === "top" ? `<p>${escapeHtml(shorten(story.summary, 80))}</p>` : ""}
        <span class="page-ref">PAGE ${story.page}</span>
      </div>`;
}

function frontPageHtml(edition, lead, others) {
    const top = others.slice(0, 3);
    const more = others.slice(3, 6);
    const bottom = others.slice(6, 10);
    const leadPhoto = photoUrl(lead);
    const headlineSize =
        lead.headline.length > 70 ? "lead-long" : lead.headline.length > 45 ? "lead-mid" : "lead-short";

    return `
  <section class="page front">
    <div class="strip">
      <span class="slogan">…INFORMED TODAY, EMPOWERED TOMORROW</span>
      <span class="date">${escapeHtml(edition.dateText.toUpperCase())}</span>
    </div>
    <img class="masthead" src="file://${encodeURI(path.join(IMAGES, "logoDefaultMode.jpg"))}" alt="Today Newspaper">
    <div class="vol-line">
      <span>VOL. ${edition.volume} &nbsp; NO. ${edition.number}</span>
      <span>www.todaynewspaperng.com</span>
      <span>FREE DIGITAL EDITION</span>
    </div>

    ${top.length ? `<div class="top-row">${top.map(story => teaserHtml(story, "top")).join("")}</div>` : ""}

    <div class="front-main">
      <article class="lead">
        <span class="label">${escapeHtml(lead.sectionLabel)}</span>
        <h1 class="${headlineSize}">${escapeHtml(lead.headline)}</h1>
        <p class="standfirst">${escapeHtml(lead.summary)}</p>
        <div class="lead-body">
          ${leadPhoto ? `<figure><img src="${leadPhoto}" alt=""></figure>` : ""}
          <div class="lead-text" id="leadText">
            <p class="byline">By Today Newspaper Staff</p>
            ${paragraphs(lead.fullStory).map((text, i) => paragraphHtml(text, i === 0)).join("")}
          </div>
        </div>
        <p class="continues" id="leadContinues">Continues on page ${lead.page}</p>
      </article>
      ${more.length ? `
      <aside class="more">
        <h2>MORE TOP STORIES</h2>
        ${more.map(story => teaserHtml(story, "more")).join("")}
      </aside>` : ""}
    </div>

    ${bottom.length ? `<div class="bottom-row">${bottom.map(story => teaserHtml(story, "bottom")).join("")}</div>` : ""}

    <div class="foot-strip">Read every story in full at todaynewspaperng.com &nbsp;·&nbsp; infos@todaynewspaperng.com &nbsp;·&nbsp; +234 707 625 4498</div>
  </section>`;
}

function storyHtml(story, opening) {
    const photo = photoUrl(story);
    return `
        <article class="story${opening ? " opening" : ""}" data-summary="${escapeHtml(story.summary)}">
          <div class="story-head">
            <h2>${escapeHtml(story.headline)}</h2>
            ${photo ? `<img src="${photo}" alt="">` : ""}
          </div>
          <div class="text">
            ${paragraphs(story.fullStory).map((text, i) => paragraphHtml(text, i === 0)).join("")}
          </div>
        </article>`;
}

function sectionPageHtml(edition, section, pageNumber, stories, lead, isLast) {
    const continuation = lead && lead.section === section.key ? `
        <article class="story continued" id="leadContinued">
          <p class="from">Continued from page 1</p>
          <h2>${escapeHtml(lead.headline)}</h2>
          <div class="text" id="leadContinuedText"></div>
        </article>` : "";

    return `
  <section class="page inside">
    ${pageHeader(edition, pageNumber, section.label)}
    <div class="columns">
      ${continuation}
      ${stories.map((story, i) => storyHtml(story, i === 0 && !continuation)).join("")}
    </div>
    ${isLast ? `
    <div class="imprint">
      <b>TODAY NEWSPAPER</b> is published by Today Newspaper, Lekki, Lagos, Nigeria.
      Office: +234 707 625 4498 &nbsp;·&nbsp; Email: infos@todaynewspaperng.com &nbsp;·&nbsp; www.todaynewspaperng.com.
      © ${edition.year} Today Newspaper. All rights reserved.
    </div>` : ""}
  </section>`;
}


/* In the browser, before printing: fit every page on one sheet.
   - the front-page lead keeps what fits; the rest moves inside
   - on an inside page, the last full stories become briefs
     (their summary) until the page fits, then are dropped */
const FIT_SCRIPT = `
(function () {
  function overflows(box) {
    return box.scrollWidth > box.clientWidth + 2 || box.scrollHeight > box.clientHeight + 2;
  }

  var leadText = document.getElementById("leadText");
  var continued = document.getElementById("leadContinuedText");
  var moved = [];
  while (leadText && overflows(leadText) && leadText.querySelectorAll("p:not(.byline)").length > 1) {
    var last = leadText.querySelector("p:last-child");
    moved.unshift(last);
    last.remove();
  }
  if (!moved.length) {
    var note = document.getElementById("leadContinues");
    if (note) note.remove();
    var block = document.getElementById("leadContinued");
    if (block) block.remove();
  } else if (continued) {
    moved.forEach(function (p) { continued.appendChild(p); });
  }

  /* Short: the first paragraph only */
  function makeShort(story) {
    story.setAttribute("data-full", story.innerHTML);
    story.classList.add("short");
    var paras = story.querySelectorAll(".text p");
    for (var i = 1; i < paras.length; i++) paras[i].remove();
  }

  /* Brief: the summary only, no photo */
  function makeBrief(story) {
    if (!story.hasAttribute("data-full")) story.setAttribute("data-full", story.innerHTML);
    story.classList.remove("short");
    story.classList.add("brief");
    story.querySelector(".text").innerHTML = "<p>" + story.getAttribute("data-summary") + "</p>";
    var img = story.querySelector("img");
    if (img) img.remove();
  }

  function makeFull(story) {
    story.innerHTML = story.getAttribute("data-full");
    story.classList.remove("brief", "short");
  }

  document.querySelectorAll(".page.inside .columns").forEach(function (box) {
    var guard = 0;
    while (overflows(box) && guard++ < 60) {
      var full = Array.prototype.slice.call(box.querySelectorAll(".story:not(.brief):not(.short):not(.continued):not(.opening)")).pop();
      if (full) {
        makeShort(full);
        continue;
      }
      var short = Array.prototype.slice.call(box.querySelectorAll(".story.short")).pop();
      if (short) {
        makeBrief(short);
        continue;
      }
      var stories = box.querySelectorAll(".story:not(.continued):not(.opening)");
      if (stories.length) { stories[stories.length - 1].remove(); continue; }
      var paras = box.querySelectorAll(".text p");
      if (paras.length > 1) { paras[paras.length - 1].remove(); continue; }
      break;
    }

    /* Space left: give the most important stories more text back */
    Array.prototype.slice.call(box.querySelectorAll(".story.brief, .story.short")).forEach(function (story) {
      var before = story.innerHTML;
      var cls = story.className;
      makeFull(story);
      if (!overflows(box)) return;
      makeShort(story);
      if (!overflows(box)) return;
      story.innerHTML = before;
      story.className = cls;
    });
  });

  /* Preview one page: file.html?page=3 */
  var only = (location.search.match(/page=([0-9]+)/) || [])[1];
  if (only) {
    document.querySelectorAll(".page").forEach(function (page, i) {
      if (i + 1 !== Number(only)) page.style.display = "none";
    });
  }

  document.body.setAttribute("data-ready", "1");
})();
`;

const STYLE = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: "Source Serif 4", Georgia, serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { display: block; width: 100%; object-fit: cover; }

.page { width: 210mm; height: 297mm; padding: 9mm 10mm; overflow: hidden; page-break-after: always; break-after: page; display: flex; flex-direction: column; }
.page:last-child { page-break-after: auto; break-after: auto; }

.label { display: inline-block; background: #c4161c; color: #fff; font: 700 7.5pt "Oswald", Arial, sans-serif; letter-spacing: .06em; padding: .6mm 1.8mm; text-transform: uppercase; }
.page-ref { display: block; text-align: right; font: 700 7pt "Oswald", Arial, sans-serif; margin-top: 1mm; }

/* front page */
.strip { display: flex; justify-content: space-between; gap: 3mm; }
.strip span { font: 600 10pt "Oswald", Arial, sans-serif; color: #fff; padding: 1.2mm 3mm; letter-spacing: .04em; }
.strip .slogan { background: #032456; flex: 1; }
.strip .date { background: #c4161c; }
.masthead { width: 150mm; height: 38mm; object-fit: contain; margin: 1mm auto 0; }
.vol-line { display: flex; justify-content: space-between; border-top: 2.5px solid #032456; border-bottom: 1px solid #032456; padding: 1mm 1mm; font: 600 8pt "Oswald", Arial, sans-serif; color: #032456; }

.top-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 3mm; height: 44mm; }
.teaser-top { display: grid; grid-template-columns: 1fr 26mm; grid-template-rows: auto auto 1fr auto; column-gap: 2mm; border: 1px solid #d9d9d9; padding: 2mm; overflow: hidden; }
.teaser-top .label { grid-column: 1; justify-self: start; }
.teaser-top h3 { grid-column: 1; margin: 1.2mm 0 0; font: 700 9.5pt/1.15 "Oswald", Arial, sans-serif; text-transform: uppercase; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.teaser-top img { grid-column: 2; grid-row: 1 / 5; height: 100%; }
.teaser-top p { grid-column: 1; margin: 1mm 0 0; font-size: 7.5pt; line-height: 1.25; }
.teaser-top .page-ref { grid-column: 1; text-align: left; align-self: end; }

.front-main { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 58mm; gap: 4mm; margin-top: 3mm; }
.lead { display: flex; flex-direction: column; min-height: 0; }
.lead .label { align-self: flex-start; }
.lead h1 { font-family: "Anton", Impact, sans-serif; font-weight: 400; text-transform: uppercase; line-height: 1.02; margin: 1.5mm 0 1.5mm; color: #111; }
.lead h1.lead-short { font-size: 38pt; }
.lead h1.lead-mid { font-size: 31pt; }
.lead h1.lead-long { font-size: 25pt; }
.standfirst { margin: 0 0 2mm; font: 500 11pt/1.3 "Source Serif 4", Georgia, serif; padding-left: 3mm; border-left: 3px solid #c4161c; }
.lead-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1.15fr; gap: 4mm; }
.lead-body:not(:has(figure)) { grid-template-columns: 1fr; }
.lead-body figure { margin: 0; order: 2; min-height: 0; }
.lead-body figure img { height: 100%; }
.lead-text { order: 1; min-height: 0; overflow: hidden; font-size: 9.2pt; line-height: 1.38; text-align: justify; hyphens: auto; }
.lead-text p { margin: 0 0 1.6mm; }
.byline { font-weight: 700; font-family: "Oswald", Arial, sans-serif; font-size: 8pt; color: #032456; }
.continues { margin: 1mm 0 0; font: 700 8pt "Oswald", Arial, sans-serif; }

.more { border-left: 1px solid #d9d9d9; padding-left: 3mm; display: flex; flex-direction: column; gap: 2mm; min-height: 0; overflow: hidden; }
.more h2 { margin: 0; background: #c4161c; color: #fff; text-align: center; font: 700 10pt "Oswald", Arial, sans-serif; padding: 1mm; letter-spacing: .05em; }
.teaser-more { flex: 1; min-height: 0; display: flex; flex-direction: column; border-bottom: 1px solid #e3e3e3; padding-bottom: 1.5mm; overflow: hidden; }
.teaser-more .label { display: none; }
.teaser-more h3 { margin: 0 0 1mm; font: 700 10.5pt/1.15 "Source Serif 4", Georgia, serif; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.teaser-more img { flex: 1; min-height: 0; }

.bottom-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 3mm; height: 40mm; border-top: 2px solid #032456; padding-top: 2mm; }
.teaser-bottom { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.teaser-bottom .label { background: none; color: #c4161c; padding: 0; align-self: flex-start; }
.teaser-bottom h3 { margin: .5mm 0 1mm; font: 700 9pt/1.15 "Source Serif 4", Georgia, serif; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.teaser-bottom img { flex: 1; min-height: 0; }

.foot-strip { margin-top: 3mm; background: #032456; color: #fff; text-align: center; font: 500 8pt "Oswald", Arial, sans-serif; padding: 1.5mm; letter-spacing: .03em; }

/* inside pages */
.page-head { display: flex; justify-content: space-between; font: 600 8pt "Oswald", Arial, sans-serif; color: #032456; border-bottom: 1px solid #032456; padding-bottom: 1mm; }
.section-bar { margin: 2mm 0 3mm; border-bottom: 3px solid #032456; }
.section-bar span { display: inline-block; background: #032456; color: #fff; font: 700 15pt "Oswald", Arial, sans-serif; letter-spacing: .06em; text-transform: uppercase; padding: 1mm 4mm; }
.columns { flex: 1; min-height: 0; column-count: 4; column-gap: 4.5mm; column-rule: 1px solid #e3e3e3; column-fill: auto; overflow: hidden; }
.story { margin: 0 0 4mm; }
.story-head { break-inside: avoid; }
.story h2 { margin: 0 0 1.5mm; font: 700 12.5pt/1.15 "Source Serif 4", Georgia, serif; }
.story img { height: 34mm; margin: 0 0 1.5mm; }
.story.brief, .story.short { break-inside: avoid; }
.story.short .text p::after { content: " (Full story at todaynewspaperng.com)"; font-style: italic; color: #555; }
.story .text { font-size: 8.6pt; line-height: 1.36; text-align: justify; hyphens: auto; }
.story .text p { margin: 0 0 1.4mm; }
.story.opening .story-head { display: contents; }
.story.opening { column-span: all; display: grid; grid-template-columns: 1.25fr 1fr; gap: 1mm 5mm; margin-bottom: 4mm; padding-bottom: 3mm; border-bottom: 1px solid #c9c9c9; }
.story.opening h2 { grid-column: 1 / -1; font: 400 24pt/1.05 "Anton", Impact, sans-serif; text-transform: uppercase; }
.story.opening img { height: 72mm; margin: 0; }
.story.opening .text { column-count: 2; column-gap: 4mm; font-size: 8.8pt; }
.story.brief h2 { font-size: 10.5pt; }
.story.brief .text { font-style: italic; }
.story.continued .from { margin: 0 0 1mm; font: 700 7.5pt "Oswald", Arial, sans-serif; color: #c4161c; text-transform: uppercase; }
.story.continued h2 { font-size: 11pt; }
.imprint { margin-top: 3mm; border-top: 2px solid #032456; padding-top: 2mm; font-size: 7.5pt; line-height: 1.4; color: #333; }
`;

function editionHtml(edition, frontPage, insidePages) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Today Newspaper — ${escapeHtml(edition.dateText)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,700;1,8..60,400&display=block" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>
${frontPage}
${insidePages.join("\n")}
<script>
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    ${FIT_SCRIPT}
  });
</script>
</body>
</html>`;
}


/* ---------- Chrome ---------- */

function chromePath() {
    if (process.env.CHROME) return process.env.CHROME;
    const candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser"
    ];
    const found = candidates.find(file => fs.existsSync(file));
    if (!found) throw new Error("Google Chrome not found (set CHROME=/path/to/chrome).");
    return found;
}

function runChrome(args) {
    execFileSync(chromePath(), [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--allow-file-access-from-files",
        "--virtual-time-budget=15000",
        ...args
    ], { stdio: "ignore", timeout: 120000 });
}

/* Front page as a JPEG (the cover shown on the site) */
function makeCover(htmlFile, jpgFile) {
    const png = jpgFile.replace(/\.jpg$/, ".png");
    runChrome([
        "--window-size=794,1123",
        "--force-device-scale-factor=1.4",
        `--screenshot=${png}`,
        `file://${htmlFile}`
    ]);
    try {
        if (process.platform === "darwin") {
            execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", png, "--out", jpgFile], { stdio: "ignore" });
        } else {
            execFileSync("convert", [png, "-quality", "82", jpgFile], { stdio: "ignore" });
        }
    } finally {
        fs.rmSync(png, { force: true });
    }
}


/* ---------- main ---------- */

function main() {
    const argDay = process.argv[2];
    const today = new Date(Date.now() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(argDay || "") ? argDay : addDays(today, -1);
    const editionDay = addDays(day, 1);

    const articles = JSON.parse(fs.readFileSync(path.join(ROOT, "backend", "data", "index.json"), "utf8"));

    let choices = {};
    const choicesFile = path.join(__dirname, "editions", `${day}.json`);
    if (fs.existsSync(choicesFile)) {
        choices = JSON.parse(fs.readFileSync(choicesFile, "utf8"));
    }
    const excluded = new Set((choices.exclude || []).map(String));
    const included = new Set([choices.lead, ...(choices.include || [])].filter(Boolean).map(String));

    const stories = articles
        .filter(article =>
            (lagosDay(article.date) === day || included.has(String(article.id))) &&
            !excluded.has(String(article.id))
        )
        .map(article => {
            const sectionKey = SECTION_OF[article.category] || article.category;
            const section = SECTIONS.find(item => item.key === sectionKey);
            return section ? { ...article, section: section.key, sectionLabel: section.label } : null;
        })
        .filter(Boolean);

    if (stories.length < 4) {
        console.log(`ePaper ${day}: only ${stories.length} stories, no edition built.`);
        return;
    }

    const edition = {
        day,
        dateText: longDate(editionDay),
        number: editionNumber(editionDay),
        volume: NUMBER_BASE.volume,
        year: editionDay.slice(0, 4)
    };

    const { lead, others } = chooseFront(stories, choices);

    /* One page per section that has stories; page 1 is the front */
    const pages = [];
    SECTIONS.forEach(section => {
        const opener = String((choices.openers || {})[section.key] || "");
        const list = stories
            .filter(story => story.section === section.key && story !== lead)
            .sort((a, b) =>
                (String(b.id) === opener) - (String(a.id) === opener) ||
                importance(b) - importance(a)
            );
        if (list.length || lead.section === section.key) {
            pages.push({ section, list, number: pages.length + 2 });
        }
    });
    stories.forEach(story => {
        const page = pages.find(item => item.section.key === story.section);
        story.page = page ? page.number : 1;
    });

    const html = editionHtml(
        edition,
        frontPageHtml(edition, lead, others),
        pages.map((page, i) => sectionPageHtml(edition, page.section, page.number, page.list, lead, i === pages.length - 1))
    );

    const work = fs.mkdtempSync(path.join(os.tmpdir(), "tnp-epaper-"));
    const htmlFile = path.join(work, `${day}.html`);
    fs.writeFileSync(htmlFile, html);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const pdfFile = path.join(OUT_DIR, `${day}.pdf`);
    const jpgFile = path.join(OUT_DIR, `${day}.jpg`);

    runChrome(["--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, `file://${htmlFile}`]);
    makeCover(htmlFile, jpgFile);

    if (process.env.KEEP_HTML) {
        console.log(`HTML kept: ${htmlFile}`);
    } else {
        fs.rmSync(work, { recursive: true, force: true });
    }

    console.log(`ePaper ${day} (edition of ${edition.dateText}, No. ${edition.number}): ${stories.length} stories, ${pages.length + 1} pages.`);
    console.log(`  ${path.relative(ROOT, pdfFile)}`);
    console.log(`  ${path.relative(ROOT, jpgFile)}`);
}

main();

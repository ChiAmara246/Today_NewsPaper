/* =====================================================
   VIEW GROWTH
   Articles published from START_DATE onwards start
   at 0 views and climb, at an irregular pace, to their
   target over GROWTH_DAYS. The target is the "view"
   value in index.json (kept between MIN_VIEWS and
   MAX_VIEWS). Views counted on the site are added
   on top.

   Nothing runs in the background: the number is
   computed from the publication date when read,
   so it survives restarts and redeploys.
===================================================== */

const START_DATE = Date.parse("2026-10-20T00:00:00+01:00");

const GROWTH_DAYS = 90;

const MIN_VIEWS = 7221;
const MAX_VIEWS = 16387;

const SLOT_MS = 60 * 60 * 1000;   /* one step per hour */

const SLOTS = GROWTH_DAYS * 24;


/* Small seeded random generator (same article, same curve) */

function seededRandom(seed) {

    let state = seed >>> 0;

    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

}


/* Cumulative share of the target reached after each hour.
   Some hours add nothing, others jump; early days weigh more. */

function buildCurve(seed) {

    const random = seededRandom(seed);
    const curve = new Float64Array(SLOTS);
    let total = 0;

    for (let slot = 0; slot < SLOTS; slot++) {

        const roll = random();
        const decay = Math.pow(1 - slot / SLOTS, 1.5) + 0.05;
        const weight = roll < 0.35 ? 0 : Math.pow(roll, 3) * decay;

        total += weight;
        curve[slot] = total;

    }

    for (let slot = 0; slot < SLOTS; slot++) {
        curve[slot] /= total;
    }

    return curve;

}


function targetFor(article, random) {

    const value = Number(article.view);

    if (value >= MIN_VIEWS && value <= MAX_VIEWS) {
        return Math.round(value);
    }

    return MIN_VIEWS + Math.floor(random() * (MAX_VIEWS - MIN_VIEWS + 1));

}


/* "view" becomes computed: grown views + views counted on the site.
   Assigning to it (a new site view) only changes the counted part. */

function applyViewGrowth(article, siteViews) {

    const published = Date.parse(article.date);

    if (!(published >= START_DATE)) {
        return false;
    }

    const seed = Number(article.id) || 1;
    const target = targetFor(article, seededRandom(seed * 7919));
    let curve = null;
    let counted = Number(siteViews) || 0;

    const grown = () => {

        const slot = Math.floor((Date.now() - published) / SLOT_MS);

        if (slot < 1) return 0;
        if (slot >= SLOTS) return target;

        curve = curve || buildCurve(seed);

        return Math.floor(target * curve[slot - 1]);

    };

    Object.defineProperty(article, "view", {
        enumerable: true,
        configurable: true,
        get: () => grown() + counted,
        set: (value) => {
            counted = Math.max(0, (Number(value) || 0) - grown());
        }
    });

    return true;

}


module.exports = {
    applyViewGrowth
};

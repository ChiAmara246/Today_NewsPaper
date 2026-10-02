require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const webpush = require("web-push");

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const app = express();


app.use(cors());
app.use(express.json());

const PORT =
    process.env.PORT || 3000;

app.get("/api/push/public-key", (req, res) => {
    res.json({
        publicKey: process.env.VAPID_PUBLIC_KEY
    });
});

/* =====================================================
   LOAD ARTICLES ONCE
===================================================== */

const articlesPath =
    path.join(
        __dirname,
        "data",
        "index.json"
    );

const articles =
    JSON.parse(
        fs.readFileSync(
            articlesPath,
            "utf8"
        )
    );

console.log(
    `Loaded ${articles.length} articles.`
);


/* =====================================================
   LOAD CHARITY DATA ONCE
===================================================== */

const charityPath =
    path.join(
        __dirname,
        "data",
        "charity.json"
    );

const charities =
    JSON.parse(
        fs.readFileSync(
            charityPath,
            "utf8"
        )
    );

console.log(
    `Loaded ${charities.length} charity activities.`
);


/* =====================================================
   LOAD DONATION DATA ONCE
===================================================== */

const donationsPath =
    path.join(
        __dirname,
        "data",
        "donations.json"
    );

let donations =
    JSON.parse(
        fs.readFileSync(
            donationsPath,
            "utf8"
        )
    );

console.log(
    `Loaded ${donations.length} donations.`
);


/* =====================================================
   FLUTTERWAVE
===================================================== */

const FLW_API_URL =
    "https://api.flutterwave.com/v3";


const FLW_CURRENCIES = [

    "NGN",
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "GHS",
    "KES",
    "UGX",
    "TZS",
    "RWF",
    "ZAR",
    "XAF",
    "XOF",
    "ZMW",
    "MWK",
    "EGP"

];


const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "http://127.0.0.1:5501/frontend";


function saveDonations() {

    fs.writeFileSync(
        donationsPath,
        JSON.stringify(
            donations,
            null,
            2
        ),
        "utf8"
    );

}


async function flutterwaveRequest(
    endpoint,
    options = {}
) {

    if (!process.env.FLW_SECRET_KEY) {

        throw new Error(
            "FLW_SECRET_KEY is missing in .env"
        );

    }


    const response =
        await fetch(
            `${FLW_API_URL}${endpoint}`,
            {
                ...options,

                headers: {
                    Authorization:
                        `Bearer ${process.env.FLW_SECRET_KEY}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );


    const data =
        await response.json();


    if (
        !response.ok ||
        data.status !== "success"
    ) {

        throw new Error(
            data.message ||
            `Flutterwave error (${response.status})`
        );

    }


    return data.data;

}


/*
 * Creates a Flutterwave hosted payment link
 * for a pending donation.
 */

async function createFlutterwaveCheckout(donation) {

    const payment =
        await flutterwaveRequest(
            "/payments",
            {
                method: "POST",

                body: JSON.stringify({

                    tx_ref:
                        donation.reference,

                    amount:
                        donation.amount,

                    currency:
                        donation.currency,

                    redirect_url:
                        `${FRONTEND_URL}/charityEvent/charityEvents.html`,

                    customer: {
                        email:
                            donation.email,

                        name:
                            donation.donorName,

                        phonenumber:
                            donation.phone
                    },

                    customizations: {
                        title:
                            "Today Newspaper Donation",

                        description:
                            donation.activityHeadline
                    }

                })
            }
        );


    return payment.link;

}


/*
 * Asks Flutterwave for the real transaction.
 * Never trust the status sent by the browser.
 */

async function fetchFlutterwaveTransaction(
    reference,
    transactionId
) {

    if (transactionId) {

        return flutterwaveRequest(
            `/transactions/${encodeURIComponent(transactionId)}/verify`
        );

    }


    return flutterwaveRequest(
        `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`
    );

}


/*
 * Checks the transaction against the donation
 * and marks the donation as completed.
 *
 * Returns "completed", "pending" or "failed".
 */

function applyFlutterwaveTransaction(
    donation,
    transaction
) {

    if (
        donation.status ===
        "completed"
    ) {

        return "completed";

    }


    const matches =
        transaction.tx_ref ===
            donation.reference &&
        transaction.currency ===
            donation.currency &&
        Number(transaction.amount) >=
            Number(donation.amount);


    if (!matches) {

        console.error(
            `Flutterwave transaction does not match donation: ${donation.reference}`
        );

        return "failed";

    }


    if (
        transaction.status ===
        "successful"
    ) {

        donation.status =
            "completed";

        donation.donationStage =
            "completed";

        donation.verifiedAt =
            new Date().toISOString();

        donation.transactionId =
            transaction.id;

        saveDonations();


        /*
         * The donor has given:
         * stop their reminders for this activity.
         */

        if (
            donation.pushSubscription &&
            donation.pushSubscription.endpoint
        ) {

            removeCharityReminder(
                donation.charityId,
                donation.pushSubscription.endpoint
            );

        }

        return "completed";

    }


    if (
        transaction.status ===
        "pending"
    ) {

        donation.donationStage =
            "verification";

        saveDonations();

        return "pending";

    }


    return "failed";

}


/* =====================================================
   HELPERS
===================================================== */

/*
 * Article lists never show the full story,
 * so it is removed to make responses lighter.
 * Only GET /api/articles/:id sends it.
 */

function withoutFullStory(article) {

    if (!article) {
        return article;
    }

    const { fullStory, ...rest } =
        article;

    return rest;

}


app.use(
    [
        "/api/articles",
        "/api/top-news",
        "/api/most-read",
        "/api/editors-picks",
        "/api/search",
        "/api/breaking"
    ],
    (req, res, next) => {

        const json =
            res.json.bind(res);

        res.json = body => {

            if (
                body &&
                Array.isArray(body.articles)
            ) {

                body = {
                    ...body,
                    articles:
                        body.articles.map(
                            withoutFullStory
                        )
                };

            }

            if (body && body.hero) {

                body = {
                    ...body,
                    hero:
                        withoutFullStory(body.hero),
                    side:
                        (body.side || []).map(
                            withoutFullStory
                        )
                };

            }

            return json(body);

        };

        next();

    }
);


function sortedArticles(data) {

    return [...data].sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );

}


/* =====================================================
   GENERAL ARTICLES
===================================================== */

app.get(
    "/api/articles",
    (req, res) => {

        const category =
            req.query.category;

        const page =
            Math.max(
                1,
                Number(req.query.page) || 1
            );

        const limit =
            Math.max(
                1,
                Number(req.query.limit) || 6
            );


        let data =
            [...articles];


        /* FILTER CATEGORY */

        if (category) {

            data =
                data.filter(
                    article =>
                        article.category ===
                        category
                );

        }


        /* SORT */

        data =
            sortedArticles(data);


        /* TOTAL */

        const totalArticles =
            data.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalArticles /
                    limit
                )
            );


        /* PAGINATION */

        const start =
            (page - 1) *
            limit;


        const paginated =
            data.slice(
                start,
                start + limit
            );


        res.json({

            articles:
                paginated,

            page,

            limit,

            totalArticles,

            totalPages

        });

    }
);


/* =====================================================
   BREAKING NEWS (homepage slider)
   Articles marked "breaking": true in index.json,
   newest first, 4 maximum.
===================================================== */

app.get(
    "/api/breaking",
    (req, res) => {

        const breaking =
            sortedArticles(
                articles.filter(
                    article =>
                        article.breaking === true
                )
            ).slice(
                0,
                4
            );


        res.json({
            articles:
                breaking
        });

    }
);


/* =====================================================
   TOP NEWS
===================================================== */

app.get(
    "/api/top-news",
    (req, res) => {

        const sorted =
            sortedArticles(
                articles
            );


        /* NEWEST 8 */

        const latestEight =
            sorted.slice(
                0,
                8
            );


        if (!latestEight.length) {

            return res.json({

                hero: null,

                side: []

            });

        }


        /* RANDOM HERO */

        const hero =
            latestEight[
                Math.floor(
                    Math.random() *
                    latestEight.length
                )
            ];


        /* SIDE CATEGORIES */

        const categories = [

            "Education",
            "Politics",
            "Trending",
            "Entertainment"

        ];


        /* TWO SIDE ARTICLES */

        const side =
            categories
                .map(
                    category =>
                        sorted.find(
                            article =>
                                article.category ===
                                    category &&
                                article.id !==
                                    hero.id
                        )
                )
                .filter(Boolean)
                .slice(
                    0,
                    2
                );


        res.json({

            hero,

            side

        });

    }
);


/* =====================================================
   CATEGORY TOP NEWS
===================================================== */

app.get(
    "/api/top-news/category",
    (req, res) => {

        const category =
            req.query.category;


        if (!category) {

            return res.status(400).json({

                error:
                    "Category is required."

            });

        }


        /* CATEGORY ARTICLES */

        const candidates =
            articles
                .filter(
                    article => {

                        return (
                            article.category ===
                            category
                        );

                    }
                )
                .filter(
                    article => {

                        const date =
                            new Date(
                                article.date
                            );

                        return !Number.isNaN(
                            date.getTime()
                        );

                    }
                )
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                );


        /* SELECT 3 MOST RECENT */

        const selected =
            candidates.slice(
                0,
                3
            );


        res.json({

            articles:
                selected,

            usedIds:
                selected.map(
                    article =>
                        article.id
                )

        });

    }
);


/* =====================================================
   MOST READ
===================================================== */

app.get(
    "/api/most-read",
    (req, res) => {

        const mostRead =
            [...articles]
                .filter(
                    article =>
                        typeof article.fullStory ===
                            "string" &&
                        article.fullStory.trim() !==
                            ""
                )
                .sort(
                    (a, b) =>
                        (b.view || 0) -
                        (a.view || 0)
                )
                .slice(
                    0,
                    4
                );


        res.json({

            articles:
                mostRead

        });

    }
);


/* =====================================================
   EDITOR'S PICKS
===================================================== */

let editorsPicksCache = {

    ids: [],

    expires: 0

};


const EDITORS_CACHE_TIME =
    7 *
    24 *
    60 *
    60 *
    1000;


app.get(
    "/api/editors-picks",
    (req, res) => {

        /* =============================================
           RETURN EXISTING SELECTION
        ============================================= */

        if (
            editorsPicksCache.expires >
                Date.now() &&
            editorsPicksCache.ids.length ===
                4
        ) {

            const selected =
                editorsPicksCache.ids
                    .map(
                        id =>
                            articles.find(
                                article =>
                                    String(
                                        article.id
                                    ) ===
                                    String(id)
                            )
                    )
                    .filter(Boolean);


            if (
                selected.length ===
                4
            ) {

                return res.json({

                    articles:
                        selected,

                    expires:
                        editorsPicksCache.expires

                });

            }

        }


        /* =============================================
           ARTICLES FROM LAST 10 DAYS
        ============================================= */

        const now =
            Date.now();


        const tenDays =
            10 *
            24 *
            60 *
            60 *
            1000;


        const eligible =
            articles.filter(
                article => {

                    const time =
                        new Date(
                            article.date
                        ).getTime();


                    if (
                        Number.isNaN(
                            time
                        )
                    ) {

                        return false;

                    }


                    const age =
                        now - time;


                    return (
                        age >= 0 &&
                        age <= tenDays
                    );

                }
            );


        /* =============================================
           GROUP BY CATEGORY
        ============================================= */

        const categoryGroups = {};


        eligible.forEach(
            article => {

                const category =
                    article.category;


                if (!category) {

                    return;

                }


                if (
                    !categoryGroups[
                        category
                    ]
                ) {

                    categoryGroups[
                        category
                    ] = [];

                }


                categoryGroups[
                    category
                ].push(
                    article
                );

            }
        );


        const categories =
            Object.keys(
                categoryGroups
            );


        if (
            categories.length <
            4
        ) {

            editorsPicksCache = {

                ids: [],

                expires: 0

            };


            return res.json({

                articles: [],

                expires: 0

            });

        }


        /* =============================================
           RANDOM FOUR CATEGORIES
        ============================================= */

        const selectedCategories =
            [...categories]
                .sort(
                    () =>
                        Math.random() -
                        0.5
                )
                .slice(
                    0,
                    4
                );


        /* =============================================
           RANDOM ARTICLE FROM EACH CATEGORY
        ============================================= */

        const selected =
            selectedCategories.map(
                category => {

                    const categoryArticles =
                        categoryGroups[
                            category
                        ];


                    const randomIndex =
                        Math.floor(
                            Math.random() *
                            categoryArticles.length
                        );


                    return categoryArticles[
                        randomIndex
                    ];

                }
            );


        /* =============================================
           SAVE SELECTION
        ============================================= */

        editorsPicksCache = {

            ids:
                selected.map(
                    article =>
                        article.id
                ),

            expires:
                Date.now() +
                EDITORS_CACHE_TIME

        };


        res.json({

            articles:
                selected,

            expires:
                editorsPicksCache.expires

        });

    }
);


/* =====================================================
   RELATED ARTICLES
===================================================== */

app.get(
    "/api/articles/:id/related",
    (req, res) => {

        const articleId =
            req.params.id;


        const currentArticle =
            articles.find(
                article =>
                    String(article.id) ===
                    String(articleId)
            );


        if (!currentArticle) {

            return res.status(404).json({

                error:
                    "Article not found."

            });

        }


        /* =============================================
           SAME CATEGORY
        ============================================= */

        let related =
            articles.filter(
                article =>
                    String(article.id) !==
                        String(articleId) &&
                    article.category ===
                        currentArticle.category &&
                    typeof article.fullStory ===
                        "string" &&
                    article.fullStory.trim() !==
                        ""
            );


        /* =============================================
           FILL REMAINING SLOTS
        ============================================= */

        if (
            related.length <
            4
        ) {

            const extra =
                articles.filter(
                    article =>
                        String(article.id) !==
                            String(articleId) &&
                        !related.some(
                            item =>
                                String(item.id) ===
                                String(article.id)
                        ) &&
                        typeof article.fullStory ===
                            "string" &&
                        article.fullStory.trim() !==
                            ""
                );


            related = [

                ...related,

                ...extra

            ];

        }


        /* =============================================
           LIMIT
        ============================================= */

        related =
            related.slice(
                0,
                4
            );


        res.json({

            articles:
                related

        });

    }
);


/* =====================================================
   SEARCH
===================================================== */

app.get(
    "/api/search",
    (req, res) => {

        const query =
            String(
                req.query.q || ""
            )
                .trim()
                .toLowerCase();


        const page =
            Math.max(
                1,
                Number(req.query.page) || 1
            );


        const limit =
            6;


        /* =============================================
           EMPTY SEARCH
        ============================================= */

        if (!query) {

            return res.json({

                articles: [],

                page,

                limit,

                totalArticles: 0,

                totalPages: 0

            });

        }


        /* =============================================
           SEARCH
        ============================================= */

        const results =
            articles.filter(
                article => {

                    const headline =
                        String(
                            article.headline || ""
                        )
                            .toLowerCase();


                    const summary =
                        String(
                            article.summary || ""
                        )
                            .toLowerCase();


                    const category =
                        String(
                            article.category || ""
                        )
                            .toLowerCase();


                    const fullStory =
                        String(
                            article.fullStory || ""
                        )
                            .toLowerCase();


                    return (
                        headline.includes(
                            query
                        ) ||
                        summary.includes(
                            query
                        ) ||
                        category.includes(
                            query
                        ) ||
                        fullStory.includes(
                            query
                        )
                    );

                }
            );


        /* =============================================
           SORT NEWEST → OLDEST
        ============================================= */

        const sorted =
            [...results].sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


        /* =============================================
           TOTAL
           Includes ALL matching articles
        ============================================= */

        const totalArticles =
            sorted.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalArticles /
                    limit
                )
            );


        /* =============================================
           VALID ARTICLES FOR DISPLAY
        ============================================= */

        const validArticles =
            sorted.filter(
                article =>
                    typeof article.fullStory ===
                        "string" &&
                    article.fullStory.trim() !==
                        ""
            );


        /* =============================================
           PAGINATION
        ============================================= */

        const start =
            (page - 1) *
            limit;


        const paginated =
            validArticles.slice(
                start,
                start + limit
            );


        /* =============================================
           RESPONSE
        ============================================= */

        res.json({

            articles:
                paginated,

            page,

            limit,

            totalArticles,

            totalPages

        });

    }
);


/* =====================================================
   SINGLE ARTICLE
===================================================== */

app.get(
    "/api/articles/:id",
    (req, res) => {

        const articleId =
            req.params.id;


        const article =
            articles.find(
                item =>
                    String(item.id) ===
                    String(articleId)
            );


        if (!article) {

            return res.status(404).json({

                error:
                    "Article not found."

            });

        }


        res.json({

            article

        });

    }
);


/* =====================================================
   ARTICLE VIEWS
   +1 on "view" in index.json when someone opens
   an article, only once per device.
   Each device sends its own visitorId (saved in
   its browser). Devices already counted are kept
   in data/views.json.
===================================================== */

const viewsPath =
    path.join(
        __dirname,
        "data",
        "views.json"
    );


let articleViews =
    fs.existsSync(viewsPath)
        ? JSON.parse(
            fs.readFileSync(
                viewsPath,
                "utf8"
            )
        )
        : {};


/*
 * index.json is large: save at most every 5 seconds
 * instead of on every single view.
 */

let viewsSaveTimer = null;

function scheduleViewsSave() {

    if (viewsSaveTimer) {
        return;
    }


    viewsSaveTimer =
        setTimeout(
            () => {

                viewsSaveTimer = null;

                try {

                    fs.writeFileSync(
                        articlesPath,
                        JSON.stringify(
                            articles,
                            null,
                            2
                        ),
                        "utf8"
                    );

                    fs.writeFileSync(
                        viewsPath,
                        JSON.stringify(
                            articleViews
                        ),
                        "utf8"
                    );

                } catch (error) {

                    console.error(
                        "Unable to save article views:",
                        error
                    );

                }

            },
            5000
        );

}


app.post(
    "/api/articles/:id/view",
    (req, res) => {

        const article =
            articles.find(
                item =>
                    String(item.id) ===
                    String(req.params.id)
            );


        if (!article) {

            return res.status(404).json({
                error:
                    "Article not found."
            });

        }


        const visitorId =
            String(
                (req.body || {}).visitorId || ""
            );


        if (
            !/^[A-Za-z0-9-]{8,64}$/.test(
                visitorId
            )
        ) {

            return res.status(400).json({
                error:
                    "A valid visitorId is required."
            });

        }


        const key =
            String(article.id);


        if (!articleViews[key]) {
            articleViews[key] = [];
        }


        const alreadyCounted =
            articleViews[key].includes(
                visitorId
            );


        if (!alreadyCounted) {

            articleViews[key].push(
                visitorId
            );

            article.view =
                (Number(article.view) || 0) + 1;

            scheduleViewsSave();

        }


        res.json({
            views:
                Number(article.view) || 0,
            counted:
                !alreadyCounted
        });

    }
);


/* =====================================================
   CHARITY
===================================================== */

app.get(
    "/api/charities",
    (req, res) => {

        res.json({

            charities

        });

    }
);


/* =====================================================
   PUBLIC DONOR WALL
   Completed donations only. Never exposes email,
   phone or payment details.
===================================================== */

app.get(
    "/api/charities/:id/donors",
    (req, res) => {

        const charityId =
            String(req.params.id);


        const donors =
            donations
                .filter(donation =>
                    String(donation.charityId) === charityId &&
                    donation.status === "completed"
                )
                .map(donation => {

                    const anonymous =
                        donation.showName === false;

                    return {
                        name:
                            anonymous ? "" : donation.donorName,
                        anonymous,
                        amount:
                            Number(donation.amount) || 0,
                        currency:
                            donation.currency,
                        thanks:
                            donation.thanks &&
                            donation.thanks.text
                                ? {
                                    text: String(donation.thanks.text),
                                    from: String(donation.thanks.from || ""),
                                    age: String(donation.thanks.age || "")
                                }
                                : null
                    };

                });


        res.json({
            donors
        });

    }
);


/* =====================================================
   SINGLE CHARITY
===================================================== */

app.get(
    "/api/charities/:id",
    (req, res) => {

        const charityId =
            req.params.id;


        const charity =
            charities.find(
                item =>
                    String(item.id) ===
                    String(charityId)
            );


        if (!charity) {

            return res.status(404).json({

                error:
                    "Charity activity not found."

            });

        }


        res.json({

            charity

        });

    }
);


/* =====================================================
   CREATE DONATION
===================================================== */
app.get("/api/donations/pending", (req, res) => {

    const email =
        String(req.query.email || "")
            .trim()
            .toLowerCase();

    const charityId =
        String(req.query.charityId || "")
            .trim();

    if (!email || !charityId) {
        return res.status(400).json({
            error: "Email and charityId are required."
        });
    }

    const now = Date.now();

    const donation =
        donations.find(donation => {

            if (
                donation.status !== "pending"
            ) {
                return false;
            }

            if (
                String(donation.email || "")
                    .trim()
                    .toLowerCase() !== email
            ) {
                return false;
            }

            if (
                String(donation.charityId) !==
                charityId
            ) {
                return false;
            }

            const expiresAt =
                new Date(
                    donation.expiresAt
                ).getTime();

            return (
                !Number.isNaN(expiresAt) &&
                expiresAt > now
            );

        });

    if (!donation) {

        return res.json({
            exists: false
        });

    }

    res.json({
        exists: true,
        donation
    });

});
app.get("/api/donations/reference/:reference", (req, res) => {

    const { reference } = req.params;

    const donation =
        donations.find(
            donation =>
                donation.reference === reference
        );

    if (!donation) {

        return res.json({
            exists: false
        });

    }

    /*
     * Only an active pending donation
     * should be returned.
     */

    if (
        donation.status !== "pending"
    ) {

        return res.json({
            exists: false
        });

    }

    const expiresAt =
        new Date(
            donation.expiresAt
        ).getTime();

    if (
        Number.isNaN(expiresAt) ||
        expiresAt <= Date.now()
    ) {

        return res.json({
            exists: false
        });

    }

    res.json({
        exists: true,
        donation
    });

});

app.post(
    "/api/donations",
    async (req, res) => {

        try {

            const {
                charityId,
                donorName,
                email,
                phone,
                message,
                showName,
                amount,
                currency
            } = req.body;


            /* =========================================
               VALIDATE REQUIRED INFORMATION
            ========================================= */

            if (
                !donorName ||
                !String(
                    donorName
                ).trim()
            ) {

                return res.status(400).json({

                    error:
                        "Full name is required."

                });

            }


            if (
                !email ||
                !String(
                    email
                ).trim()
            ) {

                return res.status(400).json({

                    error:
                        "Email address is required."

                });

            }


            if (
                amount === undefined ||
                amount === null ||
                !Number.isFinite(
                    Number(amount)
                ) ||
                Number(amount) <= 0
            ) {

                return res.status(400).json({

                    error:
                        "A valid donation amount is required."

                });

            }


            if (
                !currency ||
                !String(
                    currency
                ).trim()
            ) {

                return res.status(400).json({

                    error:
                        "Currency is required."

                });

            }


            if (
                !FLW_CURRENCIES.includes(
                    String(
                        currency
                    ).trim().toUpperCase()
                )
            ) {

                return res.status(400).json({

                    error:
                        "This currency is not supported."

                });

            }


            /* =========================================
               FIND CHARITY ACTIVITY
            ========================================= */

            const charity =
                charities.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            charityId
                        )
                );


            if (!charity) {

                return res.status(404).json({

                    error:
                        "Charity activity not found."

                });

            }


            /* =========================================
               CREATE UNIQUE REFERENCE
            ========================================= */

            const reference =
                `TNP-DON-${Date.now()}`;


            /* =========================================
               CREATE DONATION TIMES
            ========================================= */

            const createdAt =
                new Date();

            const expiresAt =
                new Date(
                    createdAt.getTime() +
                    30 *
                    60 *
                    1000
                );


            /* =========================================
               CREATE DONATION
            ========================================= */

            const donation = {

                id:
                    Date.now(),

                reference:
                    reference,

                charityId:
                    charity.id,

                activityHeadline:
                    charity.activityHeadline,

                donorName:
                    String(
                        donorName
                    ).trim(),

                email:
                    String(
                        email
                    ).trim(),

                phone:
                    String(
                        phone || ""
                    ).trim(),

                message:
                    String(
                        message || ""
                    ).trim(),

                /* Name shown on the thank-you wall unless unticked */
                showName:
                    showName !== false,

                /* Thank-you note added after the campaign:
                   { text, from, age } */
                thanks:
                    null,

                amount:
                    Number(
                        amount
                    ),

                currency:
                    String(
                        currency
                    ).trim().toUpperCase(),

                status:
                    "pending",

                donationStage:
                    "payment",

                createdAt:
                    createdAt.toISOString(),

                expiresAt:
                    expiresAt.toISOString(),

                verifiedAt:
                    null,

                reminders: {

                    tenMinutes:
                        false,

                    twentyMinutes:
                        false,

                    twentyFiveMinutes:
                        false

                }

            };


            /* =========================================
               CREATE FLUTTERWAVE CHECKOUT
            ========================================= */

            try {

                donation.checkoutUrl =
                    await createFlutterwaveCheckout(
                        donation
                    );

            } catch (error) {

                console.error(
                    "Flutterwave checkout error:",
                    error.message
                );


                return res.status(502).json({

                    error:
                        "Unable to start the payment. Please try again."

                });

            }


            /* =========================================
               SAVE DONATION
            ========================================= */

            donations.push(
                donation
            );


            saveDonations();


            /* =========================================
               RESPONSE
            ========================================= */

            return res.status(201).json({

                success:
                    true,

                donation:
                    donation

            });

        } catch (error) {

            console.error(
                "Donation creation error:",
                error
            );


            return res.status(500).json({

                error:
                    "Unable to create donation."

            });

        }

    }
);

app.patch(
    "/api/donations/:reference/stage",
    (req, res) => {

        try {

            const { reference } =
                req.params;

            const {
                donationStage
            } = req.body;


            /* =========================================
               VALIDATE STAGE
            ========================================= */

            /*
             * "completed" is not allowed here.
             * Only a verified Flutterwave payment
             * can complete a donation.
             */

            const allowedStages = [

                "payment",
                "verification"

            ];


            if (
                !allowedStages.includes(
                    donationStage
                )
            ) {

                return res.status(400).json({

                    error:
                        "Invalid donation stage."

                });

            }


            /* =========================================
               FIND DONATION
            ========================================= */

            const donation =
                donations.find(
                    item =>
                        item.reference ===
                        reference
                );


            if (!donation) {

                return res.status(404).json({

                    error:
                        "Donation not found."

                });

            }


            /* =========================================
               ONLY PENDING DONATIONS CAN CHANGE STAGE
            ========================================= */

            if (
                donation.status !==
                "pending"
            ) {

                return res.status(400).json({

                    error:
                        "This donation is no longer pending."

                });

            }


            /* =========================================
               CHECK EXPIRATION
            ========================================= */

            const expiresAt =
                new Date(
                    donation.expiresAt
                ).getTime();


            if (
                Number.isNaN(expiresAt) ||
                expiresAt <= Date.now()
            ) {

                return res.status(400).json({

                    error:
                        "This donation has expired."

                });

            }


            /* =========================================
               UPDATE DONATION STAGE
            ========================================= */

            donation.donationStage =
                donationStage;


            /* =========================================
               SAVE DONATION
            ========================================= */

            fs.writeFileSync(
                donationsPath,
                JSON.stringify(
                    donations,
                    null,
                    2
                ),
                "utf8"
            );


            /* =========================================
               RESPONSE
            ========================================= */

            return res.json({

                success:
                    true,

                donation:
                    donation

            });

        } catch (error) {

            console.error(
                "Donation stage update error:",
                error
            );


            return res.status(500).json({

                error:
                    "Unable to update donation stage."

            });

        }

    }
);
/* =====================================================
   VERIFY FLUTTERWAVE PAYMENT
   Called by the page after Flutterwave redirects back.
===================================================== */

app.post(
    "/api/donations/:reference/verify",
    async (req, res) => {

        const { reference } =
            req.params;

        const { transactionId } =
            req.body || {};


        const donation =
            donations.find(
                item =>
                    item.reference ===
                    reference
            );


        if (!donation) {

            return res.status(404).json({

                error:
                    "Donation not found."

            });

        }


        if (
            donation.status ===
            "completed"
        ) {

            return res.json({

                paymentStatus:
                    "completed",

                donation

            });

        }


        try {

            const transaction =
                await fetchFlutterwaveTransaction(
                    reference,
                    transactionId
                );


            const paymentStatus =
                applyFlutterwaveTransaction(
                    donation,
                    transaction
                );


            return res.json({

                paymentStatus,

                donation

            });

        } catch (error) {

            console.error(
                "Flutterwave verification error:",
                error.message
            );


            /*
             * No transaction found yet:
             * the donor has not paid.
             */

            return res.json({

                paymentStatus:
                    "failed",

                donation

            });

        }

    }
);


/* =====================================================
   FLUTTERWAVE WEBHOOK
   Flutterwave calls this when a payment finishes,
   even if the donor closes the page.
===================================================== */

app.post(
    "/api/payments/flutterwave/webhook",
    async (req, res) => {

        if (
            !process.env.FLW_SECRET_HASH ||
            req.headers["verif-hash"] !==
                process.env.FLW_SECRET_HASH
        ) {

            return res.status(401).end();

        }


        /*
         * Answer quickly so Flutterwave
         * does not retry.
         */

        res.status(200).end();


        const event =
            req.body || {};


        if (
            event.event !==
                "charge.completed" ||
            !event.data ||
            !event.data.id
        ) {

            return;

        }


        const donation =
            donations.find(
                item =>
                    item.reference ===
                    event.data.tx_ref
            );


        if (!donation) {

            console.log(
                `Webhook: donation not found for ${event.data.tx_ref}`
            );

            return;

        }


        try {

            const transaction =
                await fetchFlutterwaveTransaction(
                    donation.reference,
                    event.data.id
                );


            const paymentStatus =
                applyFlutterwaveTransaction(
                    donation,
                    transaction
                );


            console.log(
                `Webhook: ${donation.reference} → ${paymentStatus}`
            );

        } catch (error) {

            console.error(
                "Webhook verification error:",
                error.message
            );

        }

    }
);


app.post("/api/donations/:reference/push-subscription", (req, res) => {

    const { reference } = req.params;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({
            error: "Valid push subscription is required."
        });
    }

    const donation = donations.find(
        donation => donation.reference === reference
    );

    if (!donation) {
        return res.status(404).json({
            error: "Donation not found."
        });
    }

    if (donation.status !== "pending") {
        return res.status(400).json({
            error: "This donation is no longer pending."
        });
    }

    donation.pushSubscription = subscription;

    try {

        fs.writeFileSync(
            donationsPath,
            JSON.stringify(
                donations,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            `Push subscription attached: ${reference}`
        );

        res.json({
            success: true
        });

    } catch (error) {

        console.error(
            "Failed to save push subscription:",
            error
        );

        res.status(500).json({
            error: "Unable to save push subscription."
        });

    }

});

/* =====================================================
   CHARITY REMINDERS
   A visitor asks to be reminded about an activity
   and chooses how often. Reminders stop when
   donations close (4 hours before the activity)
   or when the visitor donates.
===================================================== */

const remindersPath =
    path.join(
        __dirname,
        "data",
        "reminders.json"
    );


let charityReminders =
    fs.existsSync(remindersPath)
        ? JSON.parse(
            fs.readFileSync(
                remindersPath,
                "utf8"
            )
        )
        : [];


function saveCharityReminders() {

    fs.writeFileSync(
        remindersPath,
        JSON.stringify(
            charityReminders,
            null,
            2
        ),
        "utf8"
    );

}


const HOUR =
    60 * 60 * 1000;

const DAY =
    24 * HOUR;


const REMINDER_INTERVALS = {

    month: 30 * DAY,
    week: 7 * DAY,
    day: DAY,
    "12h": 12 * HOUR,
    hour: HOUR

};


function getDonationCloseTime(charity) {

    return (
        new Date(charity.date).getTime() -
        4 * HOUR
    );

}


/*
 * Frequencies offered depend on how much
 * time is left before donations close.
 * Keep in sync with charity.js.
 */

function getAllowedReminderFrequencies(
    remaining
) {

    if (remaining >= 30 * DAY) {
        return ["month", "week", "day", "12h"];
    }

    if (remaining >= 7 * DAY) {
        return ["week", "day", "12h"];
    }

    if (remaining >= DAY) {
        return ["day", "12h", "hour"];
    }

    if (remaining > 0) {
        return ["hour"];
    }

    return [];

}


function removeCharityReminder(
    charityId,
    endpoint
) {

    const before =
        charityReminders.length;


    charityReminders =
        charityReminders.filter(
            reminder =>
                !(
                    String(reminder.charityId) ===
                        String(charityId) &&
                    reminder.subscription.endpoint ===
                        endpoint
                )
        );


    if (
        charityReminders.length !==
        before
    ) {

        saveCharityReminders();

    }

}


function formatTimeLeft(ms) {

    const days =
        Math.floor(ms / DAY);

    const hours =
        Math.floor((ms % DAY) / HOUR);


    if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""}`;
    }

    if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    return "less than an hour";

}


/* =========================================
   CREATE OR UPDATE A REMINDER
========================================= */

app.post(
    "/api/charities/:id/reminders",
    (req, res) => {

        const charity =
            charities.find(
                item =>
                    String(item.id) ===
                    String(req.params.id)
            );


        if (!charity) {

            return res.status(404).json({
                error: "Charity activity not found."
            });

        }


        const {
            subscription,
            frequency
        } = req.body || {};


        if (
            !subscription ||
            !subscription.endpoint
        ) {

            return res.status(400).json({
                error: "Valid push subscription is required."
            });

        }


        const remaining =
            getDonationCloseTime(charity) -
            Date.now();


        const allowed =
            getAllowedReminderFrequencies(
                remaining
            );


        if (!allowed.length) {

            return res.status(400).json({
                error: "Donations for this activity are closed."
            });

        }


        if (!allowed.includes(frequency)) {

            return res.status(400).json({
                error: "This reminder frequency is not available."
            });

        }


        const now =
            Date.now();


        let reminder =
            charityReminders.find(
                item =>
                    String(item.charityId) ===
                        String(charity.id) &&
                    item.subscription.endpoint ===
                        subscription.endpoint
            );


        if (!reminder) {

            reminder = {
                charityId:
                    charity.id,
                subscription,
                createdAt:
                    new Date(now).toISOString()
            };

            charityReminders.push(
                reminder
            );

        }


        reminder.subscription =
            subscription;

        reminder.frequency =
            frequency;

        reminder.nextAt =
            new Date(
                now +
                REMINDER_INTERVALS[frequency]
            ).toISOString();


        saveCharityReminders();


        res.json({
            success: true,
            frequency,
            nextAt: reminder.nextAt
        });

    }
);


/* =========================================
   DELETE A REMINDER
========================================= */

app.delete(
    "/api/charities/:id/reminders",
    (req, res) => {

        const { endpoint } =
            req.body || {};


        if (!endpoint) {

            return res.status(400).json({
                error: "Subscription endpoint is required."
            });

        }


        removeCharityReminder(
            req.params.id,
            endpoint
        );


        res.json({
            success: true
        });

    }
);


/* =========================================
   SEND DUE REMINDERS
========================================= */

async function processCharityReminders() {

    const now =
        Date.now();

    let changed =
        false;


    for (const reminder of [...charityReminders]) {

        const charity =
            charities.find(
                item =>
                    String(item.id) ===
                    String(reminder.charityId)
            );


        const closeTime =
            charity
                ? getDonationCloseTime(charity)
                : 0;


        /* Donations closed: stop */

        if (now >= closeTime) {

            charityReminders =
                charityReminders.filter(
                    item => item !== reminder
                );

            changed = true;

            continue;

        }


        if (
            new Date(reminder.nextAt).getTime() >
            now
        ) {

            continue;

        }


        /* Schedule the next one first */

        const interval =
            REMINDER_INTERVALS[reminder.frequency] ||
            DAY;

        let nextAt =
            new Date(reminder.nextAt).getTime();

        while (nextAt <= now) {
            nextAt += interval;
        }

        reminder.nextAt =
            new Date(nextAt).toISOString();

        changed = true;


        try {

            await webpush.sendNotification(
                reminder.subscription,
                JSON.stringify({
                    title:
                        charity.activityHeadline,
                    body:
                        `Donations close in ${formatTimeLeft(closeTime - now)}. Your support makes a difference.`,
                    icon:
                        "/images/logoDefaultMode.PNG",
                    badge:
                        "/images/tnp-icon.png",
                    url:
                        "/charityEvent/charityEvents.html"
                })
            );

            console.log(
                `Charity reminder sent: ${charity.id} (${reminder.frequency})`
            );

        } catch (error) {

            console.error(
                "Charity reminder failed:",
                error.message
            );


            /* Browser unsubscribed: forget it */

            if (
                error.statusCode === 404 ||
                error.statusCode === 410
            ) {

                charityReminders =
                    charityReminders.filter(
                        item => item !== reminder
                    );

            }

        }

    }


    if (changed) {

        saveCharityReminders();

    }

}

/* =====================================================
   DONATION CLEANUP + REMINDER SYSTEM
===================================================== */
async function sendDonationReminder(
    donation,
    reminderType
) {

    if (
        !donation.pushSubscription
    ) {
        console.log(
            `No push subscription for donation: ${donation.reference}`
        );

        return;
    }


    const messages = {

        tenMinutes: {
            title:
                "Donation Reminder",
            body:
                "Your donation is still pending. You have 20 minutes remaining to complete it."
        },

        twentyMinutes: {
            title:
                "Donation Reminder",
            body:
                "Your donation is still pending. You have 10 minutes remaining to complete it."
        },

        twentyFiveMinutes: {
            title:
                "Final Donation Reminder",
            body:
                "Your donation will expire in 5 minutes if payment is not completed."
        }

    };


    const message =
        messages[reminderType];


    if (!message) {
        return;
    }


    try {

        await webpush.sendNotification(
            donation.pushSubscription,
            JSON.stringify({

                title:
                    message.title,

                body:
                    message.body,

                icon:
                    "/images/logoDefaultMode.PNG",

                badge:
                    "/images/tnp-icon.png",

                url:
                    `/charityEvent/charityEvents.html`

            })
        );


        console.log(
            `Push notification sent: ${donation.reference} - ${reminderType}`
        );


    } catch (error) {

        console.error(
            `Push notification failed for ${donation.reference}:`,
            error.message
        );


        /*
         * 404 / 410 means the browser subscription
         * is no longer valid.
         */

        if (
            error.statusCode === 404 ||
            error.statusCode === 410
        ) {

            donation.pushSubscription =
                null;

        }

    }

}

async function processDonations() {

    const now =
        Date.now();


    let changed =
        false;


    const activeDonations =
        [];


    donations.forEach(
        donation => {

            /* =========================================
               COMPLETED DONATIONS
               STOP ALL REMINDERS
            ========================================= */

            if (
                donation.status ===
                "completed"
            ) {

                activeDonations.push(
                    donation
                );

                return;

            }


            /* =========================================
               KEEP OTHER NON-PENDING DONATIONS
            ========================================= */

            if (
                donation.status !==
                "pending"
            ) {

                activeDonations.push(
                    donation
                );

                return;

            }


            /* =========================================
               CHECK EXPIRATION
            ========================================= */

            const createdAt =
                new Date(
                    donation.createdAt
                ).getTime();


            const expiresAt =
                new Date(
                    donation.expiresAt
                ).getTime();


            if (
                Number.isNaN(
                    createdAt
                ) ||
                Number.isNaN(
                    expiresAt
                )
            ) {

                activeDonations.push(
                    donation
                );

                return;

            }


            /* =========================================
               EXPIRE DONATION
            ========================================= */

            if (
                now >=
                expiresAt
            ) {

                console.log(
                    `Donation expired: ${donation.reference}`
                );

                changed =
                    true;

                return;

            }


            /* =========================================
               MAKE SURE REMINDER OBJECT EXISTS
            ========================================= */

            if (
                !donation.reminders
            ) {

                donation.reminders = {

                    tenMinutes:
                        false,

                    twentyMinutes:
                        false,

                    twentyFiveMinutes:
                        false

                };

                changed =
                    true;

            }


            const elapsed =
                now -
                createdAt;


            const tenMinutes =
                10 *
                60 *
                1000;


            const twentyMinutes =
                20 *
                60 *
                1000;


            const twentyFiveMinutes =
                25 *
                60 *
                1000;


            /* =========================================
               10 MINUTE REMINDER
            ========================================= */

            if (
                elapsed >=
                    tenMinutes &&
                !donation.reminders
                    .tenMinutes
            ) {

                console.log(
                    `Donation reminder 1: ${donation.reference}`
                );


                donation.reminders
                    .tenMinutes =
                    true;


                changed =
                    true;


                sendDonationReminder(
                    donation,
                    "tenMinutes"
                );

            }


            /* =========================================
               20 MINUTE REMINDER
            ========================================= */

            if (
                elapsed >=
                    twentyMinutes &&
                !donation.reminders
                    .twentyMinutes
            ) {

                console.log(
                    `Donation reminder 2: ${donation.reference}`
                );


                donation.reminders
                    .twentyMinutes =
                    true;


                changed =
                    true;


                sendDonationReminder(
                    donation,
                    "twentyMinutes"
                );

            }


            /* =========================================
               25 MINUTE FINAL REMINDER
            ========================================= */

            if (
                elapsed >=
                    twentyFiveMinutes &&
                !donation.reminders
                    .twentyFiveMinutes
            ) {

                console.log(
                    `Donation final reminder: ${donation.reference}`
                );


                donation.reminders
                    .twentyFiveMinutes =
                    true;


                changed =
                    true;


                sendDonationReminder(
                    donation,
                    "twentyFiveMinutes"
                );

            }


            activeDonations.push(
                donation
            );

        }
    );


    /* ===============================================
       UPDATE DONATIONS ARRAY
    =============================================== */

    if (
        activeDonations.length !==
        donations.length
    ) {

        donations =
            activeDonations;

        changed =
            true;

    }


    /* ===============================================
       SAVE ONLY WHEN NECESSARY
    =============================================== */

    if (changed) {

        fs.writeFileSync(
            donationsPath,
            JSON.stringify(
                donations,
                null,
                2
            ),
            "utf8"
        );

    }

}


/* =====================================================
   RUN DONATION PROCESS EVERY MINUTE
===================================================== */

setInterval(
    () => {
        processDonations();
        processCharityReminders();
    },
    60 *
    1000
);


/* =====================================================
   RUN ON SERVER START
===================================================== */

processDonations();

processCharityReminders();


/* =====================================================
   SERVER
===================================================== */

const server =
    app.listen(
        PORT,
        () => {

            console.log(
                `Backend running on port ${PORT}`
            );

            console.log(
                "Server address:",
                server.address()
            );

        }
    );


server.on(
    "close",
    () => {

        console.log(
            "SERVER CLOSED"
        );

    }
);


server.on(
    "error",
    err => {

        console.error(
            "SERVER ERROR:",
            err
        );

    }
);
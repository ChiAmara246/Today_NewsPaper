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
   HELPERS
===================================================== */

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
    (req, res) => {

        try {

            const {
                charityId,
                donorName,
                email,
                phone,
                message,
                paymentMethod
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
                !paymentMethod ||
                !String(
                    paymentMethod
                ).trim()
            ) {

                return res.status(400).json({

                    error:
                        "Payment method is required."

                });

            }


            /* =========================================
               VALIDATE PAYMENT METHOD
            ========================================= */

            const allowedPaymentMethods = [

                "bank_transfer",
                "card"

            ];


            if (
                !allowedPaymentMethods.includes(
                    String(
                        paymentMethod
                    ).trim()
                )
            ) {

                return res.status(400).json({

                    error:
                        "Invalid payment method."

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

                paymentMethod:
                    String(
                        paymentMethod
                    ).trim(),

                amount:
                    null,

                currency:
                    null,

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
               SAVE DONATION
            ========================================= */

            donations.push(
                donation
            );


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

            const allowedStages = [

                "payment",
                "verification",
                "completed"

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
    processDonations,
    60 *
    1000
);


/* =====================================================
   RUN ON SERVER START
===================================================== */

processDonations();


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
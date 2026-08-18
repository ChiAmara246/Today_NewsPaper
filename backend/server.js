const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;


/* =====================================================
   LOAD ARTICLES ONCE
===================================================== */

const articlesPath = path.join(
    __dirname,
    "data",
    "index.json"
);

const articles = JSON.parse(
    fs.readFileSync(
        articlesPath,
        "utf8"
    )
);

console.log(
    `Loaded ${articles.length} articles.`
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

app.get("/api/articles", (req, res) => {

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

});


/* =====================================================
   TOP NEWS
===================================================== */

app.get("/api/top-news", (req, res) => {

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

});


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
                .filter(article => {

                    return (
                        article.category ===
                        category
                    );

                })
                .filter(article => {

                    const date =
                        new Date(
                            article.date
                        );

                    return !Number.isNaN(
                        date.getTime()
                    );

                })
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
                        currentArticle.category
            );


        /* =============================================
           FILL REMAINING SLOTS
        ============================================= */

        if (related.length < 4) {

            const extra =
                articles.filter(
                    article =>
                        String(article.id) !==
                            String(articleId) &&
                        !related.some(
                            item =>
                                String(item.id) ===
                                String(article.id)
                        )
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
            Math.max(
                1,
                Number(req.query.limit) || 10
            );


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
                        headline.includes(query) ||
                        summary.includes(query) ||
                        category.includes(query) ||
                        fullStory.includes(query)
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
           PAGINATION
        ============================================= */

        const start =
            (page - 1) *
            limit;


        const paginated =
            sorted.slice(
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
/* =====================================================
   DATA STORAGE
   Data written by the site (donations, reminders,
   ideas, idea votes, article views) is kept in
   MongoDB when MONGODB_URI is set, so it survives
   redeploys on Render.

   Without MONGODB_URI (local development) the same
   data stays in backend/data/*.json like before.

   Articles (index.json) and charities (charity.json)
   are content written by hand: they stay in git and
   are only read.
===================================================== */

const fs = require("fs");
const path = require("path");

const DATA_DIR =
    path.join(__dirname, "data");

let db = null;


async function init() {

    if (!process.env.MONGODB_URI) {

        console.log(
            "Storage: JSON files (MONGODB_URI not set)."
        );

        return;

    }


    const { MongoClient } =
        require("mongodb");

    const client =
        new MongoClient(
            process.env.MONGODB_URI
        );

    await client.connect();

    db =
        client.db(
            process.env.MONGODB_DB ||
            "today-newspaper"
        );

    console.log(
        `Storage: MongoDB (${db.databaseName}).`
    );

}


function isMongo() {

    return Boolean(db);

}


function readJsonFile(file, fallback) {

    try {

        return JSON.parse(
            fs.readFileSync(
                path.join(DATA_DIR, file),
                "utf8"
            )
        );

    } catch {

        return fallback;

    }

}


function writeJsonFile(file, value) {

    fs.writeFileSync(
        path.join(DATA_DIR, file),
        JSON.stringify(value, null, 2),
        "utf8"
    );

}


/* =====================================================
   LISTS (donations, reminders, ideas, idea votes)
   The server keeps each list in memory and calls
   saveList() after a change. Each item is stored
   as one document, identified by keyOf(item).
===================================================== */

async function loadList(name, file) {

    if (!db) {
        return readJsonFile(file, []);
    }


    const docs =
        await db
            .collection(name)
            .find({})
            .toArray();


    return docs.map(
        ({ _id, ...item }) => item
    );

}


/*
 * Saves run one at a time per list. If several
 * changes happen during a save, only the latest
 * version is written afterwards.
 */

const saveState = {};


function saveList(name, file, items, keyOf) {

    if (!db) {

        writeJsonFile(file, items);

        return;

    }


    const state =
        saveState[name] ||
        (saveState[name] = {
            running: false,
            next: null
        });


    state.next = {
        items,
        keyOf
    };


    if (!state.running) {
        runSave(name, state);
    }

}


async function runSave(name, state) {

    state.running = true;


    while (state.next) {

        const { items, keyOf } =
            state.next;

        state.next = null;


        try {

            const collection =
                db.collection(name);

            const ids =
                items.map(item =>
                    String(keyOf(item))
                );


            if (items.length) {

                await collection.bulkWrite(
                    items.map((item, i) => ({
                        replaceOne: {
                            filter: { _id: ids[i] },
                            replacement: {
                                _id: ids[i],
                                ...JSON.parse(JSON.stringify(item))
                            },
                            upsert: true
                        }
                    })),
                    { ordered: false }
                );

            }


            /* Remove items deleted from the list */

            await collection.deleteMany({
                _id: { $nin: ids }
            });

        } catch (error) {

            console.error(
                `Unable to save ${name}:`,
                error.message
            );

        }

    }


    state.running = false;

}


/* =====================================================
   ARTICLE VIEWS
   viewers: one document per (article, device)
   viewCounts: number of new views per article
   The total shown is index.json "view" + viewCounts.
===================================================== */

let fileViews = null;


function getFileViews() {

    if (!fileViews) {

        const saved =
            readJsonFile("views.json", {});

        /* Older format: { articleId: [visitorIds] } */

        fileViews =
            saved.viewers
                ? saved
                : {
                    viewers: saved,
                    counts: {}
                };

    }

    return fileViews;

}


async function loadViewCounts() {

    if (!db) {
        return { ...getFileViews().counts };
    }


    const docs =
        await db
            .collection("viewCounts")
            .find({})
            .toArray();


    return Object.fromEntries(
        docs.map(doc => [
            String(doc._id),
            Number(doc.count) || 0
        ])
    );

}


/*
 * Returns true if this device had not seen
 * the article yet (the view is counted).
 */

async function addView(articleId, visitorId) {

    const key =
        String(articleId);


    if (!db) {

        const views =
            getFileViews();

        const seen =
            views.viewers[key] ||
            (views.viewers[key] = []);

        if (seen.includes(visitorId)) {
            return false;
        }

        seen.push(visitorId);

        views.counts[key] =
            (views.counts[key] || 0) + 1;

        writeJsonFile("views.json", views);

        return true;

    }


    try {

        await db
            .collection("viewers")
            .insertOne({
                _id: `${key}:${visitorId}`,
                articleId: key,
                visitorId,
                createdAt: new Date()
            });

    } catch (error) {

        /* Duplicate key: already counted */

        if (error.code === 11000) {
            return false;
        }

        throw error;

    }


    await db
        .collection("viewCounts")
        .updateOne(
            { _id: key },
            { $inc: { count: 1 } },
            { upsert: true }
        );


    return true;

}


module.exports = {
    init,
    isMongo,
    loadList,
    saveList,
    loadViewCounts,
    addView,
    readJsonFile
};

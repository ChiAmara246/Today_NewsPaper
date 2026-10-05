/* =====================================================
   ONE-TIME MIGRATION: backend/data/*.json -> MongoDB
   Run once from the backend folder:
       node scripts/migrate-to-mongo.js
   A collection that already has data is skipped,
   so running it twice changes nothing.
===================================================== */

require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const DATA_DIR =
    path.join(__dirname, "..", "data");


function read(file, fallback) {

    try {
        return JSON.parse(
            fs.readFileSync(path.join(DATA_DIR, file), "utf8")
        );
    } catch {
        return fallback;
    }

}


const lists = [
    {
        name: "donations",
        file: "donations.json",
        keyOf: item => item.reference
    },
    {
        name: "reminders",
        file: "reminders.json",
        keyOf: item => `${item.charityId}|${item.subscription.endpoint}`
    },
    {
        name: "ideas",
        file: "ideas.json",
        keyOf: item => item.id
    },
    {
        name: "ideaVotes",
        file: "idea-votes.json",
        keyOf: item => `${item.ideaId}|${item.deviceId}`
    }
];


async function main() {

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing in .env");
    }


    const client =
        new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    const db =
        client.db(process.env.MONGODB_DB || "today-newspaper");


    for (const { name, file, keyOf } of lists) {

        const collection = db.collection(name);

        if (await collection.countDocuments() > 0) {
            console.log(`${name}: already has data, skipped.`);
            continue;
        }

        const items = read(file, []);

        if (items.length) {
            await collection.insertMany(
                items.map(item => ({
                    _id: String(keyOf(item)),
                    ...item
                }))
            );
        }

        console.log(`${name}: ${items.length} copied.`);

    }


    /*
     * Devices that already viewed an article.
     * Their views are already included in index.json,
     * so viewCounts starts at zero.
     */

    const viewers = db.collection("viewers");

    if (await viewers.countDocuments() > 0) {

        console.log("viewers: already has data, skipped.");

    } else {

        const saved = read("views.json", {});
        const map = saved.viewers || saved;

        const docs = Object.entries(map).flatMap(
            ([articleId, visitorIds]) =>
                visitorIds.map(visitorId => ({
                    _id: `${articleId}:${visitorId}`,
                    articleId,
                    visitorId,
                    createdAt: new Date()
                }))
        );

        if (docs.length) {
            await viewers.insertMany(docs);
        }

        console.log(`viewers: ${docs.length} copied.`);

    }


    await client.close();

    console.log("Migration done.");

}


main().catch(error => {

    console.error("Migration failed:", error.message);

    process.exit(1);

});

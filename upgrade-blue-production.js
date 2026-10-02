"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, content) {
    fs.writeFileSync(path.join(root, file), content);
}

function backup(file) {
    const source = path.join(root, file);

    if (!fs.existsSync(source)) return;

    const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const target = `${source}.production-backup-${stamp}`;

    fs.copyFileSync(source, target);

    console.log("BACKUP:", target);
}

function ensureDir(dir) {
    const full = path.join(root, dir);

    if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
    }
}

console.log("\n=== BLUE PRODUCTION UPGRADE ===\n");

ensureDir("data");
ensureDir("data/conversations");

backup("server.js");
backup("blue-memory.js");

const serverFile = "server.js";
let server = read(serverFile);

/*
 * ---------------------------------------------------------
 * MEMORY IMPORT
 * ---------------------------------------------------------
 */

if (!server.includes('require("./blue-memory")')) {

    const importMarker =
        'const { buildBlueV10Instruction } = require("./blue-brain-v10");';

    if (!server.includes(importMarker)) {
        throw new Error(
            "Import Blue Brain V10 tidak ditemukan."
        );
    }

    server = server.replace(
        importMarker,
        importMarker +
        '\nconst {' +
        '\n    buildMemoryInstruction,' +
        '\n    addMemory,' +
        '\n    searchMemories,' +
        '\n    getMemories,' +
        '\n    removeMemory' +
        '\n} = require("./blue-memory");'
    );

    console.log("Memory module dihubungkan.");
}

/*
 * ---------------------------------------------------------
 * CONVERSATION STORAGE HELPERS
 * ---------------------------------------------------------
 */

const helperMarker =
    'app.use(express.static(path.join(__dirname, "public")));';

if (!server.includes("BLUE CONVERSATION STORAGE")) {

    const helpers = `

/* =========================================================
   BLUE CONVERSATION STORAGE
   ========================================================= */

const BLUE_CONVERSATION_DIR =
    path.join(__dirname, "data", "conversations");

function ensureBlueConversationDir() {

    if (!fs.existsSync(BLUE_CONVERSATION_DIR)) {
        fs.mkdirSync(
            BLUE_CONVERSATION_DIR,
            { recursive: true }
        );
    }

}

function safeConversationId(id) {

    return String(id || "")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 80);

}

function saveBlueConversation(id, messages) {

    ensureBlueConversationDir();

    const cleanId =
        safeConversationId(id) ||
        "default";

    const file =
        path.join(
            BLUE_CONVERSATION_DIR,
            cleanId + ".json"
        );

    const payload = {

        id: cleanId,

        updatedAt:
            new Date().toISOString(),

        messages:
            Array.isArray(messages)
                ? messages.slice(-100)
                : []

    };

    fs.writeFileSync(
        file,
        JSON.stringify(
            payload,
            null,
            2
        )
    );

    return payload;

}

function loadBlueConversation(id) {

    ensureBlueConversationDir();

    const cleanId =
        safeConversationId(id) ||
        "default";

    const file =
        path.join(
            BLUE_CONVERSATION_DIR,
            cleanId + ".json"
        );

    if (!fs.existsSync(file)) {
        return {
            id: cleanId,
            messages: []
        };
    }

    try {

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "BLUE CONVERSATION LOAD ERROR:",
            error
        );

        return {
            id: cleanId,
            messages: []
        };

    }

}

function listBlueConversations() {

    ensureBlueConversationDir();

    return fs.readdirSync(
        BLUE_CONVERSATION_DIR
    )
        .filter(
            file =>
                file.endsWith(".json")
        )
        .map(file => {

            try {

                const data =
                    JSON.parse(
                        fs.readFileSync(
                            path.join(
                                BLUE_CONVERSATION_DIR,
                                file
                            ),
                            "utf8"
                        )
                    );

                return {

                    id: data.id,

                    updatedAt:
                        data.updatedAt,

                    messageCount:
                        Array.isArray(data.messages)
                            ? data.messages.length
                            : 0

                };

            } catch {

                return null;

            }

        })
        .filter(Boolean)
        .sort(
            (a, b) =>
                String(b.updatedAt)
                    .localeCompare(
                        String(a.updatedAt)
                    )
        );

}

`;

    server = server.replace(
        helperMarker,
        helperMarker + helpers
    );

    console.log(
        "Conversation storage dipasang."
    );
}

/*
 * ---------------------------------------------------------
 * HISTORY API
 * ---------------------------------------------------------
 */

if (!server.includes('app.get("/api/conversations"')) {

    const routes = `

/* =========================================================
   BLUE CONVERSATION API
   ========================================================= */

app.get(
    "/api/conversations",
    (req, res) => {

        try {

            return res.json({
                conversations:
                    listBlueConversations()
            });

        } catch (error) {

            console.error(
                "BLUE HISTORY ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    "Gagal membaca riwayat Blue."
            });

        }

    }
);

app.get(
    "/api/conversations/:id",
    (req, res) => {

        return res.json(
            loadBlueConversation(
                req.params.id
            )
        );

    }
);

app.post(
    "/api/conversations/:id",
    (req, res) => {

        const messages =
            Array.isArray(req.body.messages)
                ? req.body.messages
                : [];

        return res.json(
            saveBlueConversation(
                req.params.id,
                messages
            )
        );

    }
);

app.delete(
    "/api/conversations/:id",
    (req, res) => {

        ensureBlueConversationDir();

        const id =
            safeConversationId(
                req.params.id
            );

        const file =
            path.join(
                BLUE_CONVERSATION_DIR,
                id + ".json"
            );

        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }

        return res.json({
            success: true
        });

    }
);

/* =========================================================
   BLUE MEMORY API
   ========================================================= */

app.get(
    "/api/memory",
    (req, res) => {

        return res.json({
            memories:
                getMemories({
                    limit: 100
                })
        });

    }
);

app.get(
    "/api/memory/search",
    (req, res) => {

        const query =
            String(
                req.query.q || ""
            ).trim();

        return res.json({
            memories:
                searchMemories(
                    query,
                    {
                        limit: 20
                    }
                )
        });

    }
);

app.post(
    "/api/memory",
    (req, res) => {

        try {

            const memory =
                addMemory({
                    category:
                        req.body.category ||
                        "general",

                    key:
                        req.body.key,

                    value:
                        req.body.value,

                    source:
                        req.body.source ||
                        "user",

                    importance:
                        req.body.importance ||
                        5
                });

            return res.json({
                success: true,
                memory
            });

        } catch (error) {

            return res.status(400).json({
                error:
                    error.message
            });

        }

    }
);

app.delete(
    "/api/memory/:id",
    (req, res) => {

        return res.json({
            success:
                removeMemory(
                    req.params.id
                )
        });

    }
);

`;

    /*
     * Insert before /api/chat.
     */

    const chatMarker =
        'app.post("/api/chat", async (req, res) => {';

    if (!server.includes(chatMarker)) {
        throw new Error(
            "Route /api/chat tidak ditemukan."
        );
    }

    server =
        server.replace(
            chatMarker,
            routes + "\n" + chatMarker
        );

    console.log(
        "History + Memory API dipasang."
    );
}

/*
 * ---------------------------------------------------------
 * SAVE CHAT AUTOMATICALLY
 * ---------------------------------------------------------
 */

if (!server.includes("saveBlueConversation(")) {
    throw new Error(
        "Conversation storage gagal dipasang."
    );
}

write(serverFile, server);

console.log(
    "\nServer production upgrade selesai."
);

console.log(
    "\nSekarang lakukan syntax check:"
);

console.log(
    "node --check server.js"
);

console.log(
    "\n=== SELESAI ===\n"
);

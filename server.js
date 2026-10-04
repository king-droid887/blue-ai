const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { buildBlueV10Instruction } = require("./blue-brain-v10");
const { buildMemoryInstruction } = require("./blue-memory");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

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





function getBlueModelRoute(mode) {

    const routes = {

        chat: {
            primary: "openrouter/free",
            fallback: "openrouter/free"
        },

        thinking: {
            primary: "openrouter/free",
            fallback: "openrouter/free"
        },

        code: {
            primary: "openrouter/free",
            fallback: "openrouter/free"
        },

        vision: {
            primary: "openrouter/free",
            fallback: "openrouter/free"
        }

    };

    return routes[mode] || routes.chat;
}

function getBlueBrainInstruction(mode) {

    const instructions = {

        chat: `
You are Blue AI, a capable general-purpose AI assistant.
Be accurate, useful, natural, and direct.
Understand the user's intent before answering.
Use Indonesian when the user speaks Indonesian.
Do not claim to have abilities or tools that are not actually available.
`,

        thinking: `
You are Blue AI in advanced reasoning mode.
Analyze difficult problems carefully before answering.
For mathematics, logic, science, planning, and complex questions,
provide the necessary reasoning and a clear conclusion.
Do not reveal private chain-of-thought.
Instead provide concise explanations, calculations, assumptions,
and verifiable steps.
`,

        code: `
You are Blue AI in expert coding mode.
Write correct, practical, maintainable code.
Inspect the user's existing code and preserve working functionality.
When modifying code, explain exactly what changed.
Prefer complete commands or complete replacement sections when useful.
Check for syntax mistakes before suggesting code.
`,

        vision: `
You are Blue AI in vision mode.
Analyze supplied images carefully.
Describe relevant visible objects, layout, text, colors,
and relationships.
Do not invent details that cannot reasonably be determined.
`
    };

    return instructions[mode] || instructions.chat;
}


function getAdaptiveBrainInstruction(text, mode) {

    const value = String(text || "").toLowerCase().trim();

    const patterns = {

        complex: [
            /\b(mengapa|kenapa|jelaskan|analisis|bandingkan|buktikan|pecahkan|hitung|hitungkan)\b/,
            /\b(math|matematika|logic|logika|physics|fisika|science|sains)\b/,
            /\b(algoritma|algorithm|debug|debugging|arsitektur|architecture)\b/
        ],

        coding: [
            /\b(kode|coding|program|javascript|typescript|python|html|css|node|nodejs|api|database|server)\b/,
            /\b(debug|bug|error|syntax|function|class|array|object|json)\b/
        ],

        explanation: [
            /\b(apa itu|artinya|maksudnya|jelaskan|jelasin|cara kerja|bagaimana)\b/
        ],

        comparison: [
            /\b(bandingkan|perbedaan|beda|vs|versus|lebih baik|kelebihan|kekurangan)\b/
        ],

        creative: [
            /\b(cerita|ceritakan|buat cerita|lanjutkan|lirik|lagu|puisi|dialog|novel|karakter)\b/
        ],

        short: [
            /^(ya|tidak|iya|oke|ok|siap|gas|lanjut|makasih|terima kasih)[.!?]*$/
        ]

    };

    const matches = (group) =>
        patterns[group].some(pattern => pattern.test(value));

    const isComplex = matches("complex");
    const isCoding = matches("coding");
    const isExplanation = matches("explanation");
    const isComparison = matches("comparison");
    const isCreative = matches("creative");
    const isShort = matches("short");

    const sections = [];

    sections.push(`
BLUE BRAIN CORE:

- Pahami maksud pengguna sebelum menjawab.
- Gunakan konteks percakapan yang tersedia.
- Jangan mengarang fakta, sumber, kemampuan, atau hasil yang tidak diketahui.
- Jika informasi tidak cukup, katakan bagian mana yang belum diketahui.
- Bedakan fakta, asumsi, dan interpretasi.
- Prioritaskan jawaban yang benar dan berguna daripada sekadar panjang.
- Jangan mengulang pertanyaan pengguna tanpa alasan.
- Gunakan bahasa yang sama dengan pengguna bila memungkinkan.
- Jika pengguna menggunakan bahasa Indonesia santai, boleh gunakan bahasa Indonesia yang natural dan tidak kaku.
- Jangan menampilkan chain-of-thought atau proses penalaran internal pribadi.
- Berikan penjelasan, langkah, perhitungan, atau alasan yang diperlukan untuk memahami jawaban.
`);

    if (isComplex || mode === "thinking") {
        sections.push(`
DEEP REASONING:

Gunakan pendekatan analitis.

Sebelum memberikan kesimpulan:
1. Identifikasi inti masalah.
2. Periksa asumsi yang diperlukan.
3. Pecah masalah menjadi bagian yang relevan.
4. Periksa konsistensi hasil.
5. Berikan kesimpulan yang jelas.

Untuk perhitungan, tampilkan rumus dan langkah yang diperlukan pengguna untuk memverifikasi hasil.
`);
    }

    if (isCoding || mode === "code") {
        sections.push(`
CODING MODE:

- Pahami kode yang diberikan sebelum mengubahnya.
- Pertahankan fungsi yang sudah bekerja.
- Hindari perubahan yang tidak diperlukan.
- Perhatikan syntax, dependency, edge case, dan kompatibilitas.
- Jika pengguna meminta perubahan pada file, berikan perubahan yang dapat langsung diterapkan.
- Setelah membuat solusi, lakukan pemeriksaan mental terhadap syntax dan alur program.
- Jangan mengklaim kode sudah diuji jika memang belum dijalankan.
`);
    }

    if (isExplanation) {
        sections.push(`
EXPLANATION MODE:

Jelaskan dari konsep dasar menuju bagian yang lebih sulit.
Gunakan contoh bila contoh membantu.
Jangan membuat penjelasan lebih rumit daripada pertanyaan pengguna.
`);
    }

    if (isComparison) {
        sections.push(`
COMPARISON MODE:

Bandingkan berdasarkan kriteria yang relevan.
Pisahkan fakta dari interpretasi.
Jika hasil bergantung pada kebutuhan pengguna, jelaskan trade-off daripada memaksakan satu pilihan.
`);
    }

    if (isCreative) {
        sections.push(`
CREATIVE MODE:

Ikuti gaya, karakter, setting, dan detail yang diberikan pengguna.
Jaga kontinuitas dengan konteks yang sudah ada.
Jangan mengubah fakta cerita yang sudah ditetapkan tanpa alasan.
`);
    }

    if (isShort) {
        sections.push(`
SHORT RESPONSE MODE:

Pengguna memberikan respons singkat.
Jawab secara natural dan jangan memberikan penjelasan panjang yang tidak diperlukan.
`);
    }

    sections.push(`
FINAL QUALITY CHECK:

Sebelum menjawab, pastikan:
- jawaban menjawab pertanyaan yang sebenarnya;
- tidak ada kontradiksi dengan konteks yang tersedia;
- tidak ada detail yang sengaja dibuat-buat;
- tingkat detail sesuai kebutuhan;
- jawaban langsung dapat digunakan oleh pengguna.
`);

    return sections.join("\\n");
}

function normalizeBlueMode(mode) {

    const validModes = [
        "chat",
        "thinking",
        "code",
        "vision"
    ];

    return validModes.includes(mode)
        ? mode
        : "chat";
}


function buildBlueContextInstruction(messages) {

    if (!Array.isArray(messages) || messages.length === 0) {
        return "";
    }

    const recentMessages = messages
        .slice(-12)
        .map((message, index) => {

            if (!message || !message.role) {
                return "";
            }

            let content = "";

            if (typeof message.content === "string") {
                content = message.content;
            } else {
                content = "[Konten non-teks]";
            }

            return (index + 1) + ". " +
                message.role.toUpperCase() +
                ": " +
                content.slice(0, 4000);

        })
        .filter(Boolean)
        .join("\\n");

    return `
CONTEXT BRAIN:

Gunakan percakapan sebelumnya untuk memahami referensi pengguna.

Aturan:

- Anggap pesan terbaru sebagai bagian dari percakapan yang sedang berlangsung.
- Hubungkan kata seperti "ini", "itu", "dia", "lanjut", "tambahkan", "ubah", "perbaiki", dan "yang tadi" dengan konteks sebelumnya jika referensinya jelas.
- Jangan meminta pengguna mengulang informasi yang masih tersedia dalam context.
- Pertahankan nama, angka, keputusan, kode, karakter, dan detail penting yang sudah ditetapkan.
- Jika pengguna meminta perubahan terhadap sesuatu yang sebelumnya dibuat, ubah bagian yang diminta tanpa menghapus bagian yang tidak diminta.
- Jika ada konflik antara pesan lama dan instruksi terbaru, prioritaskan instruksi terbaru.
- Jangan menganggap informasi lama masih benar jika pengguna sudah mengoreksinya.
- Jangan menciptakan konteks yang tidak ada.
- Jika referensi benar-benar ambigu, tanyakan klarifikasi singkat.

RECENT CONVERSATION:

${recentMessages}
`;
}



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


app.post("/api/chat", async (req, res) => {
    try {
        const { messages, mode = "chat" } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Format pesan tidak valid."
            });
        }

        const blueMode = normalizeBlueMode(mode);

        const systemInstruction =
            getBlueBrainInstruction(blueMode);

        const userText = messages
            .filter(message => message && message.role === "user")
            .map(message => {
                if (typeof message.content === "string") {
                    return message.content;
                }

                return "";
            })
            .join("\\n");

        const adaptiveInstruction =
            getAdaptiveBrainInstruction(
                userText,
                blueMode
            );

        const contextInstruction =
            buildBlueContextInstruction(messages);

        const blueV10Instruction =
            buildBlueV10Instruction(
                messages,
                blueMode
            );

        const memoryInstruction =
            buildMemoryInstruction(userText);

        const modelRoute =
            getBlueModelRoute(blueMode);



        async function callBlueModel(modelName) {

            return await fetch(process.env.AI_API_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.AI_API_KEY}`
                },

                body: JSON.stringify({
                    model: modelName,

                    messages: [
                        {
                            role: "system",
                            content:
                                systemInstruction +
                                "\\n\\n" +
                                adaptiveInstruction +
                                "\\n\\n" +
                                contextInstruction +
                                "\\n\\n" +
                                blueV10Instruction +
                                "\\n\\n" +
                                memoryInstruction
                        },

                        ...messages
                    ]
                })
            });
        }

        let response;
        let usedModel = modelRoute.primary;

        try {

            response = await callBlueModel(
                modelRoute.primary
            );

            if (!response.ok &&
                modelRoute.fallback &&
                modelRoute.fallback !== modelRoute.primary) {

                console.log(
                    "PRIMARY MODEL FAILED. TRYING FALLBACK..."
                );

                usedModel = modelRoute.fallback;

                response = await callBlueModel(
                    modelRoute.fallback
                );
            }

        } catch (primaryError) {

            console.error(
                "PRIMARY MODEL REQUEST ERROR:",
                primaryError
            );

            if (!modelRoute.fallback ||
                modelRoute.fallback === modelRoute.primary) {

                throw primaryError;
            }

            console.log(
                "PRIMARY REQUEST FAILED. TRYING FALLBACK..."
            );

            usedModel = modelRoute.fallback;

            response = await callBlueModel(
                modelRoute.fallback
            );
        }

        const data = await response.json();

        console.log(
            "BLUE MODE:",
            blueMode
        );

        console.log(
            "BLUE MODEL:",
            usedModel
        );

        console.log(
            "RAW AI RESPONSE:",
            JSON.stringify(data, null, 2)
        );

        if (!response.ok) {

            console.error(
                "AI ERROR:",
                data
            );

            return res.status(500).json({
                error: "Semua model Blue sedang mengalami masalah."
            });
        }

        const answer =
            data.choices?.[0]?.message?.content ||
            data.output?.[0]?.content?.[0]?.text ||
            "Blue belum mendapatkan jawaban.";

        res.json({
            answer: answer,
            mode: mode
        });

    } catch (error) {

        console.error("ERROR:", error);

        res.status(500).json({
            error: "Terjadi kesalahan pada server Blue."
        });
    }
});


const BLUE_IDENTITY_PROMPT =
"A consistent fictional visual representation of Blue AI: a confident young male AI assistant, modern futuristic appearance, clean masculine character design, blue-themed clothing, subtle glowing blue technology accents, friendly but composed expression, intelligent and calm presence, modern cyber-AI aesthetic, cinematic lighting, high detail, polished digital artwork. This is a fictional AI character, not a real person.";

function buildImagePrompt(prompt) {
    const text = String(prompt || "").trim();
    const value = text.toLowerCase();

    const mentionsBlue =
        /\b(blue|dirimu|kamu sendiri|yourself)\b/.test(value);

    const asksForImage =
        /\b(gambar|image|picture|foto|illustrasi|ilustrasi|buat|buatkan|bikin|gambarkan|draw|create)\b/.test(value);

    if (mentionsBlue && asksForImage) {
        return BLUE_IDENTITY_PROMPT +
            "\\n\\nScene requested by the user:\\n" +
            text +
            "\\n\\nKeep Blue's identity and appearance consistent.";
    }

    return text;
}

app.post("/api/generate-image", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                error: "Prompt gambar tidak valid."
            });
        }

        const response = await fetch(
            "https://gen.pollinations.ai/image/" +
            encodeURIComponent(buildImagePrompt(prompt)),
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${process.env.POLLINATIONS_API_KEY}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            console.error("POLLINATIONS IMAGE ERROR:", errorText);

            return res.status(500).json({
                error: "Gagal membuat gambar."
            });
        }

        const contentType =
            response.headers.get("content-type") || "image/png";

        const buffer = Buffer.from(await response.arrayBuffer());

        res.json({
            image:
                `data:${contentType};base64,${buffer.toString("base64")}`
        });

    } catch (error) {

        console.error("IMAGE GENERATION ERROR:", error);

        res.status(500).json({
            error: "Terjadi kesalahan saat membuat gambar."
        });
    }
});;

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Blue AI berjalan di http://localhost:${PORT}`
    );
});

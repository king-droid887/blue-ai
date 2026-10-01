const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Format pesan tidak valid."
            });
        }

        const response = await fetch(process.env.AI_API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.AI_API_KEY}`
            },

            body: JSON.stringify({
                model: "openrouter/free",
                messages: [
                    {
                        role: "system",
                        content:
                            "Kamu adalah Blue, asisten AI yang ramah, membantu, dan menjawab dalam bahasa pengguna."
                    },
                    ...messages
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error(errorText);

            return res.status(500).json({
                error: "Server AI mengalami masalah."
            });
        }

        const data = await response.json();

        /*
          Sesuaikan bagian ini dengan format
          respons API AI yang kamu gunakan.
        */

        const answer =
            data.choices?.[0]?.message?.content ||
            data.output?.[0]?.content?.[0]?.text ||
            "Blue tidak menerima jawaban dari server AI.";

        res.json({
            answer: answer
        });

    } catch (error) {

        console.error("ERROR:", error);

        res.status(500).json({
            error: "Terjadi kesalahan pada server Blue."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Blue AI berjalan di http://localhost:${PORT}`);
});
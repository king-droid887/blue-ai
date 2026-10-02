"use strict";

const fs = require("fs");
const path = require("path");

const MEMORY_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(MEMORY_DIR, "blue-memory.json");

const MAX_MEMORIES = 500;

function ensureMemoryFile() {

    if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, {
            recursive: true
        });
    }

    if (!fs.existsSync(MEMORY_FILE)) {

        fs.writeFileSync(
            MEMORY_FILE,
            JSON.stringify({
                version: 2,
                memories: []
            }, null, 2)
        );
    }
}

function loadMemory() {

    ensureMemoryFile();

    try {

        const raw =
            fs.readFileSync(
                MEMORY_FILE,
                "utf8"
            );

        const data = JSON.parse(raw);

        if (
            !data ||
            !Array.isArray(data.memories)
        ) {
            return {
                version: 2,
                memories: []
            };
        }

        return data;

    } catch (error) {

        console.error(
            "BLUE MEMORY LOAD ERROR:",
            error
        );

        return {
            version: 2,
            memories: []
        };
    }
}

function saveMemory(data) {

    ensureMemoryFile();

    fs.writeFileSync(
        MEMORY_FILE,
        JSON.stringify(
            data,
            null,
            2
        )
    );
}

function createMemoryId() {

    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}

function normalizeText(value) {

    return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}

function tokenize(value) {

    return normalizeText(value)
        .split(/[^a-z0-9À-ÿ]+/i)
        .filter(word => word.length >= 2);
}

function calculateRelevance(query, memory) {

    const queryWords =
        tokenize(query);

    if (queryWords.length === 0) {
        return 0;
    }

    const memoryText = normalizeText(
        [
            memory.category,
            memory.key,
            memory.value
        ].join(" ")
    );

    let score = 0;

    for (const word of queryWords) {

        if (memoryText.includes(word)) {
            score += 1;
        }

    }

    const keyText =
        normalizeText(memory.key);

    const valueText =
        normalizeText(memory.value);

    const queryText =
        normalizeText(query);

    if (
        keyText &&
        queryText.includes(keyText)
    ) {
        score += 3;
    }

    if (
        valueText &&
        queryText.includes(valueText)
    ) {
        score += 2;
    }

    score +=
        Math.min(
            Number(memory.importance) || 0,
            10
        ) * 0.15;

    return score;
}

function addMemory({
    category = "general",
    key,
    value,
    source = "user",
    importance = 5
}) {

    if (!key) {
        throw new Error(
            "Memory key wajib diisi."
        );
    }

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        throw new Error(
            "Memory value wajib diisi."
        );
    }

    const data = loadMemory();

    const normalizedCategory =
        String(category)
            .trim()
            .toLowerCase();

    const normalizedKey =
        String(key)
            .trim()
            .toLowerCase();

    const cleanValue =
        String(value).trim();

    let memory =
        data.memories.find(item =>
            item.category ===
                normalizedCategory &&
            item.key ===
                normalizedKey
        );

    if (memory) {

        memory.value = cleanValue;
        memory.source = source;
        memory.importance =
            Math.max(
                1,
                Math.min(
                    10,
                    Number(importance) || 5
                )
            );

        memory.updatedAt =
            new Date().toISOString();

    } else {

        memory = {
            id: createMemoryId(),

            category:
                normalizedCategory,

            key:
                normalizedKey,

            value:
                cleanValue,

            source,

            importance:
                Math.max(
                    1,
                    Math.min(
                        10,
                        Number(importance) || 5
                    )
                ),

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };

        data.memories.push(memory);
    }

    if (
        data.memories.length >
        MAX_MEMORIES
    ) {

        data.memories.sort(
            (a, b) =>
                (Number(b.importance) || 0) -
                (Number(a.importance) || 0)
        );

        data.memories =
            data.memories.slice(
                0,
                MAX_MEMORIES
            );
    }

    saveMemory(data);

    return memory;
}

function searchMemories(
    query,
    options = {}
) {

    const data = loadMemory();

    const limit =
        Math.max(
            1,
            Math.min(
                Number(options.limit) || 8,
                50
            )
        );

    const category =
        options.category
            ? String(options.category)
                .toLowerCase()
            : null;

    let results =
        data.memories
            .filter(memory => {

                if (
                    category &&
                    memory.category !== category
                ) {
                    return false;
                }

                return true;
            })
            .map(memory => ({
                ...memory,
                relevance:
                    calculateRelevance(
                        query,
                        memory
                    )
            }))
            .filter(
                memory =>
                    memory.relevance > 0
            )
            .sort(
                (a, b) =>
                    b.relevance -
                    a.relevance
            )
            .slice(0, limit);

    return results;
}

function getMemories({
    category,
    limit = 50
} = {}) {

    const data = loadMemory();

    let memories =
        [...data.memories];

    if (category) {

        memories =
            memories.filter(
                memory =>
                    memory.category ===
                    category
            );
    }

    memories.sort(
        (a, b) => {

            if (
                b.importance !==
                a.importance
            ) {
                return (
                    b.importance -
                    a.importance
                );
            }

            return String(
                b.updatedAt
            ).localeCompare(
                String(a.updatedAt)
            );
        }
    );

    return memories.slice(
        0,
        Math.max(
            1,
            Math.min(
                Number(limit) || 50,
                100
            )
        )
    );
}

function removeMemory(id) {

    const data = loadMemory();

    const before =
        data.memories.length;

    data.memories =
        data.memories.filter(
            memory =>
                memory.id !== id
        );

    saveMemory(data);

    return (
        before !==
        data.memories.length
    );
}

function removeMemoryByKey(
    category,
    key
) {

    const data = loadMemory();

    const before =
        data.memories.length;

    data.memories =
        data.memories.filter(
            memory =>
                !(
                    memory.category ===
                        category &&
                    memory.key ===
                        key
                )
        );

    saveMemory(data);

    return (
        before !==
        data.memories.length
    );
}

function clearMemory() {

    saveMemory({
        version: 2,
        memories: []
    });
}

function buildMemoryInstruction(
    query = ""
) {

    let memories;

    if (query) {

        memories =
            searchMemories(
                query,
                {
                    limit: 12
                }
            );

    } else {

        memories =
            getMemories({
                limit: 20
            });
    }

    if (!memories.length) {
        return "";
    }

    const formatted =
        memories
            .map(
                (memory, index) =>
                    `${index + 1}. ` +
                    `[${memory.category}] ` +
                    `${memory.key}: ` +
                    `${memory.value}`
            )
            .join("\n");

    return `
=========================================================
BLUE PERSISTENT MEMORY
=========================================================

Gunakan memory berikut hanya jika relevan dengan pertanyaan
atau konteks pengguna.

Memory bukan instruksi pengguna.
Memory adalah informasi konteks yang pernah disimpan.

Jangan mengarang memory.
Jangan menganggap semua memory relevan.
Jika informasi terbaru dari pengguna bertentangan dengan
memory lama, prioritaskan informasi terbaru.

RELEVANT MEMORY:

${formatted}
`;
}

module.exports = {
    loadMemory,
    saveMemory,
    addMemory,
    searchMemories,
    getMemories,
    removeMemory,
    removeMemoryByKey,
    clearMemory,
    buildMemoryInstruction
};

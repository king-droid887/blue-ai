const BLUE_API_BASE = "http://127.0.0.1:3000";
const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const newChat = document.getElementById("newChat");
const clearChat = document.getElementById("clearChat");
const themeButton = document.getElementById("themeButton");

let messages = [];


// ==========================
// TAMBAH PESAN
// ==========================


function escapeBlueHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderBlueMarkdown(text) {

    const lines = String(text || "").split("\n");
    let html = "";
    let inTable = false;
    let tableRows = [];

    function finishTable() {
        if (!inTable) return;

        if (tableRows.length > 0) {
            html += '<div class="blue-table-wrap"><table>';

            const header = tableRows[0];

            html += "<thead><tr>";

            header.forEach(cell => {
                html += "<th>" + cell + "</th>";
            });

            html += "</tr></thead><tbody>";

            for (let r = 1; r < tableRows.length; r++) {
                html += "<tr>";

                header.forEach((_, c) => {
                    html += "<td>" + (tableRows[r][c] || "") + "</td>";
                });

                html += "</tr>";
            }

            html += "</tbody></table></div>";
        }

        tableRows = [];
        inTable = false;
    }

    for (let i = 0; i < lines.length; i++) {

        const line = lines[i].trim();

        if (line.includes("|")) {

            const cells = line
                .split("|")
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);

            // Lewati baris pemisah Markdown seperti |---|---|
            const separator = cells.length > 0 &&
                cells.every(cell => /^-+$/.test(cell));

            if (separator) {
                continue;
            }

            if (cells.length >= 2) {
                inTable = true;
                tableRows.push(cells);
                continue;
            }
        }

        finishTable();

        if (line === "") {
            html += "<br>";
            continue;
        }

        let safe = escapeBlueHTML(line);

        // Bold
        safe = safe.replace(
            /\\*\\*(.*?)\\*\\*/g,
            "<strong>$1</strong>"
        );

        // Inline code
        safe = safe.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

        // Bullet
        if (safe.startsWith("- ")) {
            safe = "• " + safe.substring(2);
        }

        html += safe + "<br>";
    }

    finishTable();

    return html;
}


function formatBlueMessageTime(date = new Date()) {

    const today = new Date();

    const sameDay =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

    const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });

    if (sameDay) {
        return "Hari ini, " + time;
    }

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }) + ", " + time;
}

function formatBlueMessageTime(date = new Date()) {
    const today = new Date();

    const sameDay =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

    const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });

    if (sameDay) {
        return "Hari ini, " + time;
    }

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }) + ", " + time;
}

let editingMessage = null;
let editingHistoryIndex = -1;

function closeMessageMenus() {
    document
        .querySelectorAll(".message.context-open")
        .forEach(item => item.classList.remove("context-open"));
}

function createMessageAction(label, icon) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "message-context-action";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon;

    return button;
}

function addMessage(text, sender, historyIndex = -1) {

    const message = document.createElement("div");
    message.className = "message " + sender;

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = renderBlueMarkdown(text);

    message.appendChild(content);

    const actions = document.createElement("div");
    actions.className = "message-actions";

    /*
     * Waktu berada DI DALAM popup.
     * Tidak tampil sebelum popup dibuka.
     */
    const timestamp = document.createElement("div");
    timestamp.className = "message-popup-time";
    timestamp.textContent = formatBlueMessageTime();

    actions.appendChild(timestamp);

    function createAction(label, svg) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "message-action";

        button.innerHTML =
            '<span class="message-action-icon">' +
                svg +
            '</span>' +
            '<span class="message-action-label">' +
                label +
            '</span>';

        return button;
    }

    /*
     * SALIN
     */
    const copyButton = createAction(
        "Salin",
        `<svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2"></rect>
            <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>
        </svg>`
    );

    copyButton.addEventListener("click", async (event) => {

        event.stopPropagation();

        try {

            await navigator.clipboard.writeText(String(text));

            const label =
                copyButton.querySelector(".message-action-label");

            if (label) {
                label.textContent = "Tersalin";
            }

            setTimeout(() => {

                if (label) {
                    label.textContent = "Salin";
                }

            }, 1200);

        } catch (error) {

            console.error("Gagal menyalin pesan:", error);

        }

    });

    actions.appendChild(copyButton);


    /*
     * PILIH TEKS
     */
    const selectButton = createAction(
        "Pilih teks",
        `<svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4h12"></path>
            <path d="M6 20h12"></path>
            <path d="M5 4v16"></path>
            <path d="M19 4v16"></path>
            <path d="M9 8h6"></path>
            <path d="M9 12h6"></path>
            <path d="M9 16h6"></path>
        </svg>`
    );

    selectButton.addEventListener("click", (event) => {

        event.stopPropagation();

        const range = document.createRange();
        range.selectNodeContents(content);

        const selection = window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);

    });

    actions.appendChild(selectButton);


    /*
     * EDIT PESAN
     */
    if (sender === "user") {

        const editButton = createAction(
            "Edit pesan",
            `<svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>`
        );

        editButton.addEventListener("click", (event) => {

            event.stopPropagation();

            /*
             * Masukkan kembali teks ke input.
             */
            input.value = String(text);
            input.focus();

            input.setSelectionRange(
                input.value.length,
                input.value.length
            );

            /*
             * Hapus pesan ini dan seluruh riwayat setelahnya.
             */
            if (historyIndex >= 0) {

                messages.splice(historyIndex);

            }

            /*
             * Hapus pesan ini dan semua pesan setelahnya
             * dari tampilan.
             */
            let current = message;

            while (current) {

                const next = current.nextElementSibling;

                current.remove();

                current = next;

            }

        });

        actions.appendChild(editButton);
    }

    message.appendChild(actions);

    chat.appendChild(message);

    /*
     * Long press / tekan lama.
     */
    let pressTimer = null;
    let longPressTriggered = false;

    function closeOtherMessageMenus() {

        document
            .querySelectorAll(".message.actions-visible")
            .forEach(item => {

                if (item !== message) {
                    item.classList.remove("actions-visible");
                }

            });

    }

    function openMessageMenu() {

        closeOtherMessageMenus();

        message.classList.add("actions-visible");

    }

    function closeMessageMenu() {

        message.classList.remove("actions-visible");

    }


    /*
     * TAP / CLICK
     *
     * Di Android tap sekali membuka popup.
     */
    message.addEventListener("click", (event) => {

        if (event.target.closest(".message-action")) {
            return;
        }

        if (longPressTriggered) {
            longPressTriggered = false;
            return;
        }

        if (message.classList.contains("actions-visible")) {
            closeMessageMenu();
        } else {
            openMessageMenu();
        }

    });


    /*
     * LONG PRESS
     *
     * Tetap didukung untuk pengalaman seperti ChatGPT.
     */
    message.addEventListener("pointerdown", (event) => {

        if (event.target.closest(".message-action")) {
            return;
        }

        longPressTriggered = false;

        clearTimeout(pressTimer);

        pressTimer = setTimeout(() => {

            longPressTriggered = true;

            openMessageMenu();

        }, 500);

    });


    message.addEventListener("pointerup", () => {

        clearTimeout(pressTimer);

    });


    message.addEventListener("pointercancel", () => {

        clearTimeout(pressTimer);

    });


    /*
     * Jangan gunakan pointerleave untuk membatalkan timer.
     * Pada beberapa browser Android event ini bisa muncul
     * ketika jari masih berinteraksi dengan elemen.
     */

    chat.scrollTop = chat.scrollHeight;
}

function addLoading() {

    const message = document.createElement("div");

    message.className = "message blue";
    message.id = "loading";

    const content = document.createElement("div");

    content.className = "message-content";

    content.textContent = "Blue sedang berpikir...";

    message.appendChild(content);

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


function removeLoading() {

    const loading = document.getElementById("loading");

    if (loading) {
        loading.remove();
    }
}



// ==========================
// BLUE AI ROUTER V2
// ==========================

function detectBlueMode(text, hasImage = false) {

    const value = (text || "").toLowerCase().trim();

    if (hasImage) {
        return "vision";
    }

    if (/\b(buat|buatkan|bikin|generate|gambarkan|gambar|draw|create)\b/.test(value) &&
        /\b(gambar|image|picture|ilustrasi|illustration|foto|photo)\b/.test(value)) {
        return "image";
    }

    if (/\b(kode|coding|program|javascript|python|html|css|debug|error code|programming)\b/.test(value)) {
        return "code";
    }

    if (/\b(terbaru|hari ini|sekarang|berita|news|update|harga|cuaca)\b/.test(value)) {
        return "web";
    }

    if (/\b(jelaskan|analisis|hitung|mengapa|kenapa|buktikan|bandingkan|pecahkan)\b/.test(value)) {
        return "thinking";
    }

    return "chat";
}

function getBlueModeLabel(mode) {

    const labels = {
        chat: "Chat",
        thinking: "Thinking",
        vision: "Vision",
        image: "Image",
        code: "Code",
        web: "Web"
    };

    return labels[mode] || "Chat";
}

// ==========================
// KIRIM PESAN
// ==========================

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const text = input.value.trim();

    if (!text && !selectedImage) return;

    /* ==========================
       EDIT MESSAGE
       ========================== */

    if (editingMessage &&
        editingHistoryIndex >= 0 &&
        !selectedImage) {

        const editedText = text;

        messages[editingHistoryIndex] = {
            role: "user",
            content: editedText
        };

        /* Remove conversation after edited user message */
        messages.splice(editingHistoryIndex + 1);

        /* Remove rendered messages after edited message */
        let current = editingMessage.nextElementSibling;

        while (current) {
            const next = current.nextElementSibling;
            current.remove();
            current = next;
        }

        const editedContent =
            editingMessage.querySelector(".message-content");

        if (editedContent) {
            let rendered = renderBlueMarkdown(editedText);

            rendered = rendered
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");

            editedContent.innerHTML = rendered;
        }

        input.value = "";

        editingMessage = null;
        editingHistoryIndex = -1;

        input.classList.remove("editing-input");

        const cancelEdit =
            document.getElementById("cancelEditButton");

        if (cancelEdit) {
            cancelEdit.remove();
        }

        addLoading();

        try {

            const response = await fetch(BLUE_API_BASE + "/api/chat", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    messages: messages,
                    mode: blueMode
                })
            });

            const data = await response.json();

            removeLoading();

            if (!response.ok) {
                addMessage(
                    data.error || "Terjadi kesalahan.",
                    "blue"
                );

                return;
            }

            addMessage(data.answer, "blue");

            messages.push({
                role: "assistant",
                content: data.answer
            });

        } catch (error) {

            removeLoading();

            addMessage(
                "Blue tidak dapat terhubung ke server.",
                "blue"
            );

            console.error(error);
        }

        return;
    }

    /*
     * BLUE AI ROUTER V2
     * Semua pesan melewati router utama.
     */
    const blueMode = detectBlueMode(
        text,
        !!selectedImage
    );

    const wantsImage =
        blueMode === "image";

    // ==========================
    // TEXT → IMAGE
    // ==========================

    if (wantsImage) {

        addMessage(text, "user");

        input.value = "";

        addLoading();

        try {

            const response = await fetch(BLUE_API_BASE + "/api/generate-image", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt: text
                })

            });

            const data = await response.json();

            removeLoading();

            if (!response.ok || !data.image) {

                addMessage(
                    data.error || "Blue gagal membuat gambar.",
                    "blue"
                );

                return;
            }

            const imageMessage = document.createElement("div");

            imageMessage.className = "message blue";

            imageMessage.innerHTML = `
                <div class="message-content">

                    <div style="margin-bottom:8px;">
                        Gambar yang dibuat Blue
                    </div>

                    <img
                        src="${data.image}"
                        alt="Gambar yang dibuat Blue"
                        style="
                            max-width:100%;
                            width:520px;
                            border-radius:14px;
                            display:block;
                        "
                    >

                </div>
            `;

            chat.appendChild(imageMessage);

            chat.scrollTop = chat.scrollHeight;

            messages.push({
                role: "user",
                content: text
            });

            messages.push({
                role: "assistant",
                content: "[Blue membuat sebuah gambar]"
            });

            return;

        } catch (error) {

            removeLoading();

            addMessage(
                "Blue tidak dapat membuat gambar saat ini.",
                "blue"
            );

            console.error("IMAGE ROUTER ERROR:", error);

            return;
        }
    }

    // ==========================
    // CHAT / IMAGE ANALYSIS
    // ==========================

    let userContent = text;

    if (selectedImage) {

        userContent = [
            {
                type: "text",
                text: text || "Tolong analisis gambar ini."
            },
            {
                type: "image_url",
                image_url: {
                    url: selectedImage.data
                }
            }
        ];
    }

    if (text) {
        addMessage(text, "user", messages.length);
    }

    if (selectedImage) {

        const imageMessage = document.createElement("div");

        imageMessage.className = "message user";

        imageMessage.innerHTML = `
            <div class="message-content">

                <img
                    src="${selectedImage.data}"
                    style="
                        max-width:220px;
                        max-height:220px;
                        border-radius:12px;
                        display:block;
                    "
                    alt="Gambar yang dikirim"
                >

                ${text ? `<div style="margin-top:8px;">${text}</div>` : ""}

            </div>
        `;

        chat.appendChild(imageMessage);
        chat.scrollTop = chat.scrollHeight;
    }

    messages.push({
        role: "user",
        content: userContent
    });

    input.value = "";

    selectedImage = null;

    if (imageInput) {
        imageInput.value = "";
    }

    const preview = document.getElementById("imagePreview");

    if (preview) {
        preview.remove();
    }

    addLoading();

    try {

        const response = await fetch(BLUE_API_BASE + "/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: messages,
                mode: blueMode
            })

        });

        const data = await response.json();

        removeLoading();

        if (!response.ok) {

            addMessage(
                data.error || "Terjadi kesalahan.",
                "blue"
            );

            return;
        }

        addMessage(data.answer, "blue");

        messages.push({
            role: "assistant",
            content: data.answer
        });

    } catch (error) {

        removeLoading();

        addMessage(
            "Blue tidak dapat terhubung ke server.",
            "blue"
        );

        console.error(error);
    }

});

// ==========================
// CHAT BARU
// ==========================

newChat.addEventListener("click", () => {

    messages = [];

    chat.innerHTML = `
        <div class="welcome">

            <div class="big-logo">
                B
            </div>

            <h2>Halo, aku Blue 👋</h2>

            <p>
                Chat baru telah dibuat.
            </p>

        </div>
    `;

    input.focus();

});


// ==========================
// HAPUS CHAT
// ==========================

clearChat.addEventListener("click", () => {

    messages = [];

    chat.innerHTML = "";

    addMessage(
        "Percakapan telah dihapus. Ada yang bisa Blue bantu?",
        "blue"
    );

});


// ==========================
// SARAN
// ==========================

document.querySelectorAll(".suggestions button")
    .forEach(button => {

        button.addEventListener("click", () => {

            input.value = button.textContent;

            input.focus();

        });

    });


// ==========================
// DARK / LIGHT
// ==========================

let lightMode = false;

themeButton.addEventListener("click", () => {

    lightMode = !lightMode;

    if (lightMode) {

        document.documentElement.style.setProperty(
            "--bg",
            "#f3f6fb"
        );

        document.documentElement.style.setProperty(
            "--panel",
            "#ffffff"
        );

        document.documentElement.style.setProperty(
            "--panel2",
            "#eef2f8"
        );

        document.documentElement.style.setProperty(
            "--border",
            "#d7deea"
        );

        document.documentElement.style.setProperty(
            "--text",
            "#101828"
        );

        themeButton.textContent = "🌙";

    } else {

        document.documentElement.style.setProperty(
            "--bg",
            "#080d18"
        );

        document.documentElement.style.setProperty(
            "--panel",
            "#101827"
        );

        document.documentElement.style.setProperty(
            "--panel2",
            "#151f32"
        );

        document.documentElement.style.setProperty(
            "--border",
            "#243149"
        );

        document.documentElement.style.setProperty(
            "--text",
            "#ffffff"
        );

        themeButton.textContent = "☀️";

    }

});
/* ==========================
   BLUE CHAT HISTORY v1
   ========================== */

let blueChats = JSON.parse(
    localStorage.getItem("blueChats") || "[]"
);

let activeChatId = null;

function saveBlueChats() {
    localStorage.setItem(
        "blueChats",
        JSON.stringify(blueChats)
    );
}

function createBlueChat() {

    const chatData = {
        id: Date.now().toString(),
        title: "Chat Baru",
        messages: [],
        pinned: false
    };

    blueChats.unshift(chatData);
    activeChatId = chatData.id;

    saveBlueChats();
    renderBlueHistory();
}

function renderBlueHistory() {

    const history = document.getElementById("chatHistory");
    const pinned = document.getElementById("pinnedChats");

    if (!history || !pinned) return;

    history.innerHTML = "";
    pinned.innerHTML = "";

    const pinnedChats = blueChats.filter(c => c.pinned);
    const normalChats = blueChats.filter(c => !c.pinned);

    if (pinnedChats.length === 0) {
        pinned.innerHTML =
            '<div class="empty-history">Belum ada chat disematkan</div>';
    }

    if (normalChats.length === 0) {
        history.innerHTML =
            '<div class="empty-history">Belum ada riwayat</div>';
    }

    function addChatButton(chat, container) {

        const row = document.createElement("div");

        row.className = "chat-history-row";

        const button = document.createElement("button");

        button.className = "chat-history-item";

        if (chat.id === activeChatId) {
            button.classList.add("active");
        }

        button.innerHTML = `
            ${chat.pinned ? '<span class="chat-history-pin">📌</span>' : ""}
            <span class="chat-history-title"></span>
        `;

        button.querySelector(".chat-history-title")
            .textContent = chat.title;

        button.addEventListener("click", () => {
            openBlueChat(chat.id);
        });


        const menuButton = document.createElement("button");

        menuButton.className = "chat-menu-button";
        menuButton.textContent = "⋮";
        menuButton.setAttribute("aria-label", "Menu chat");


        menuButton.addEventListener("click", (event) => {

            event.stopPropagation();

            document.querySelectorAll(".chat-action-menu")
                .forEach(menu => menu.remove());


            const menu = document.createElement("div");

            menu.className = "chat-action-menu";


            const pinButton = document.createElement("button");

            pinButton.textContent =
                chat.pinned
                    ? "📌 Lepas sematan"
                    : "📌 Sematkan";

            pinButton.addEventListener("click", () => {

                chat.pinned = !chat.pinned;

                saveBlueChats();
                renderBlueHistory();

            });


            const renameButton = document.createElement("button");

            renameButton.textContent = "✏️ Ganti nama";

            renameButton.addEventListener("click", () => {

                const newName =
                    prompt("Nama chat baru:", chat.title);

                if (newName && newName.trim()) {

                    chat.title = newName.trim();

                    saveBlueChats();
                    renderBlueHistory();

                }

            });


            const deleteButton = document.createElement("button");

            deleteButton.textContent = "🗑️ Hapus";

            deleteButton.addEventListener("click", () => {

                if (!confirm("Hapus percakapan ini?")) {
                    return;
                }

                blueChats = blueChats.filter(
                    item => item.id !== chat.id
                );

                if (activeChatId === chat.id) {

                    activeChatId = null;
                    messages = [];

                    chat.innerHTML = `
                        <div class="welcome">
                            <div class="big-logo">B</div>
                            <h2>Halo, aku Blue 👋</h2>
                            <p>Mulai percakapan baru.</p>
                        </div>
                    `;

                }

                saveBlueChats();
                renderBlueHistory();

            });


            menu.appendChild(pinButton);
            menu.appendChild(renameButton);
            menu.appendChild(deleteButton);

            row.appendChild(menu);

        });


        row.appendChild(button);
        row.appendChild(menuButton);

        container.appendChild(row);
    }

    pinnedChats.forEach(chat =>
        addChatButton(chat, pinned)
    );

    normalChats.forEach(chat =>
        addChatButton(chat, history)
    );
}

function openBlueChat(id) {

    const selected = blueChats.find(
        chat => chat.id === id
    );

    if (!selected) return;

    activeChatId = id;

    messages = selected.messages.map(message => ({
        role: message.role,
        content: message.content
    }));

    chat.innerHTML = "";

    messages.forEach(message => {

        addMessage(
            message.content,
            message.role === "user" ? "user" : "blue"
        );

    });

    renderBlueHistory();

    input.focus();
}

function updateCurrentBlueChat() {

    if (!activeChatId) {
        createBlueChat();
    }

    const current = blueChats.find(
        chat => chat.id === activeChatId
    );

    if (!current) return;

    current.messages = messages;

    if (
        current.title === "Chat Baru" &&
        messages.length > 0
    ) {
        const firstUserMessage =
            messages.find(message => message.role === "user");

        if (firstUserMessage) {
            current.title =
                firstUserMessage.content.slice(0, 35);
        }
    }

    saveBlueChats();
    renderBlueHistory();
}

/* Simpan setiap kali user mengirim pesan */
const originalSubmitHandler = form.onsubmit;

form.addEventListener("submit", () => {

    setTimeout(() => {
        updateCurrentBlueChat();
    }, 500);

});

/* Ganti fungsi Chat Baru agar membuat riwayat */
newChat.addEventListener("click", () => {

    createBlueChat();

});

/* Tampilkan riwayat saat aplikasi dibuka */
renderBlueHistory();


/* ==========================
   BLUE MOBILE DRAWER
   ========================== */

const mobileMenu = document.getElementById("mobileMenu");
const blueSidebar = document.getElementById("blueSidebar");
const drawerOverlay = document.getElementById("drawerOverlay");

function openBlueDrawer() {
    if (!blueSidebar || !drawerOverlay) return;

    blueSidebar.classList.add("drawer-open");
    drawerOverlay.classList.add("active");
}

function closeBlueDrawer() {
    if (!blueSidebar || !drawerOverlay) return;

    blueSidebar.classList.remove("drawer-open");
    drawerOverlay.classList.remove("active");
}

if (mobileMenu) {
    mobileMenu.addEventListener("click", openBlueDrawer);
}

if (drawerOverlay) {
    drawerOverlay.addEventListener("click", closeBlueDrawer);
}

/* Tutup drawer setelah memilih chat */
document.addEventListener("click", (event) => {
    if (
        event.target.closest(".chat-history-item") ||
        event.target.closest("#newChat")
    ) {
        closeBlueDrawer();
    }
});


/* ==========================
   BLUE IMAGE PICKER
   ========================== */

const imageButton = document.getElementById("imageButton");
const imageInput = document.getElementById("imageInput");

let selectedImage = null;

if (imageButton && imageInput) {

    imageButton.addEventListener("click", () => {
        imageInput.click();
    });

    imageInput.addEventListener("change", () => {

        const file = imageInput.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("File yang dipilih bukan gambar.");
            imageInput.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {

            selectedImage = {
                name: file.name,
                type: file.type,
                data: reader.result
            };

            showImagePreview(selectedImage);
        };

        reader.readAsDataURL(file);
    });
}


function showImagePreview(image) {

    let preview = document.getElementById("imagePreview");

    if (!preview) {

        preview = document.createElement("div");

        preview.id = "imagePreview";
        preview.className = "image-preview";

        const form = document.getElementById("chatForm");

        form.parentNode.insertBefore(preview, form);
    }

    preview.innerHTML = `
        <div class="image-preview-card">

            <img
                src="${image.data}"
                alt="Preview gambar"
            >

            <button
                type="button"
                id="removeImage"
                title="Hapus gambar"
            >
                ×
            </button>

        </div>
    `;

    document.getElementById("removeImage")
        .addEventListener("click", () => {

            selectedImage = null;
            imageInput.value = "";
            preview.remove();

        });
}


/* ==========================
   BLUE ATTACHMENT MENU
   ========================== */

const attachmentMenu = document.getElementById("attachmentMenu");
const photoOption = document.getElementById("photoOption");
const generateImageOption =
    document.getElementById("generateImageOption");

if (imageButton && attachmentMenu) {

    imageButton.addEventListener("click", (event) => {

        event.stopPropagation();

        attachmentMenu.classList.toggle("open");

    });

}

if (photoOption && imageInput) {

    photoOption.addEventListener("click", () => {

        attachmentMenu.classList.remove("open");

        imageInput.click();

    });

}

if (generateImageOption) {

    generateImageOption.addEventListener("click", () => {

        attachmentMenu.classList.remove("open");

        alert("Fitur Buat Gambar sedang disiapkan.");

    });

}

document.addEventListener("click", (event) => {

    if (
        attachmentMenu &&
        !event.target.closest(".attachment-wrapper")
    ) {
        attachmentMenu.classList.remove("open");
    }

});


/* ==========================
   BLUE IMAGE GENERATION
   ========================== */

async function generateBlueImage(prompt) {

    if (!prompt || !prompt.trim()) return;

    addMessage(prompt, "user");

    addLoading();

    try {

        const response = await fetch(BLUE_API_BASE + "/api/generate-image", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                prompt: prompt.trim()
            })

        });

        const data = await response.json();

        removeLoading();

        if (!response.ok) {

            addMessage(
                data.error || "Blue gagal membuat gambar.",
                "blue"
            );

            return;
        }

        const message = document.createElement("div");

        message.className = "message blue";

        const content = document.createElement("div");

        content.className = "message-content";

        const image = document.createElement("img");

        image.src = data.image;
        image.alt = "Gambar yang dibuat Blue";
        image.className = "generated-image";

        content.appendChild(image);
        message.appendChild(content);
        chat.appendChild(message);

        chat.scrollTop = chat.scrollHeight;

    } catch (error) {

        removeLoading();

        console.error("GENERATE IMAGE ERROR:", error);

        addMessage(
            "Blue tidak dapat membuat gambar.",
            "blue"
        );
    }
}


/* Tombol Buat Gambar */

if (generateImageOption) {

    generateImageOption.addEventListener("click", async () => {

        attachmentMenu.classList.remove("open");

        const prompt = window.prompt(
            "Apa yang ingin Blue buat?"
        );

        if (!prompt || !prompt.trim()) return;

        await generateBlueImage(prompt);

    });

}

/* ==========================
   MESSAGE ACTION TOUCH
   ========================== */

document.addEventListener("click", (event) => {

    const message = event.target.closest(".message");

    if (!message) {
        document
            .querySelectorAll(".message.actions-visible")
            .forEach(item => item.classList.remove("actions-visible"));

        return;
    }

    document
        .querySelectorAll(".message.actions-visible")
        .forEach(item => {
            if (item !== message) {
                item.classList.remove("actions-visible");
            }
        });

    message.classList.toggle("actions-visible");
});


document.addEventListener("pointerdown", (event) => {

    if (event.target.closest(".message")) {
        return;
    }

    document
        .querySelectorAll(".message.actions-visible")
        .forEach(message => {
            message.classList.remove("actions-visible");
        });

});


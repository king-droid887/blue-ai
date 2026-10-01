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

function addMessage(text, sender) {

    const message = document.createElement("div");

    message.className = `message ${sender}`;

    const content = document.createElement("div");

    content.className = "message-content";

    content.textContent = text;

    message.appendChild(content);

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


// ==========================
// LOADING
// ==========================

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
// KIRIM PESAN
// ==========================

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const text = input.value.trim();

    if (!text) return;


    // Tambahkan pesan user
    addMessage(text, "user");

    messages.push({
        role: "user",
        content: text
    });

    input.value = "";

    addLoading();


    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: messages
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
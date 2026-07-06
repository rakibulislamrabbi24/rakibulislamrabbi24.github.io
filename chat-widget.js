/*
  AI Assistant Chat Widget — Rakibul Islam Rabbi Portfolio
  ----------------------------------------------------------
  USAGE:
  1. Upload this file to your site (e.g. /assets/chat-widget.js)
  2. Add this before </body> in every page:
       <script src="chat-widget.js"></script>
  3. Update WORKER_URL below to your deployed Cloudflare Worker URL.
*/

(function () {
  const WORKER_URL = "https://your-worker-name.your-subdomain.workers.dev"; // <-- CHANGE THIS

  // ---------- Styles ----------
  const style = document.createElement("style");
  style.textContent = `
    #rr-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #00e5ff, #ffd700);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 20px rgba(0,229,255,0.4);
      transition: transform 0.2s ease;
      border: none;
    }
    #rr-chat-btn:hover { transform: scale(1.08); }
    #rr-chat-btn svg { width: 26px; height: 26px; fill: #0a0a0a; }

    #rr-chat-window {
      position: fixed; bottom: 96px; right: 24px; z-index: 9999;
      width: 340px; max-width: 90vw; height: 460px; max-height: 70vh;
      background: #0d0d0d; border: 1px solid #1f1f1f;
      border-radius: 16px; display: none; flex-direction: column;
      overflow: hidden; font-family: 'Space Mono', monospace;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }
    #rr-chat-window.open { display: flex; }

    #rr-chat-header {
      background: #111; padding: 14px 16px; display: flex;
      align-items: center; justify-content: space-between;
      border-bottom: 1px solid #1f1f1f;
      font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px;
    }
    #rr-chat-header span { color: #00e5ff; font-size: 18px; }
    #rr-chat-close { cursor: pointer; color: #ffd700; font-size: 20px; background:none; border:none; }

    #rr-chat-body {
      flex: 1; overflow-y: auto; padding: 14px; display: flex;
      flex-direction: column; gap: 10px;
    }
    .rr-msg { max-width: 85%; padding: 9px 12px; border-radius: 10px; font-size: 13.5px; line-height: 1.4; }
    .rr-msg.bot { background: #17171a; color: #e6e6e6; align-self: flex-start; border: 1px solid #232323; }
    .rr-msg.user { background: #00e5ff1a; color: #fff; align-self: flex-end; border: 1px solid #00e5ff55; }

    .rr-lang-btns { display: flex; gap: 8px; padding: 4px; }
    .rr-lang-btn {
      flex: 1; padding: 10px; border-radius: 8px; cursor: pointer;
      background: #141414; border: 1px solid #ffd70055; color: #ffd700;
      font-family: 'Space Mono', monospace; font-size: 13px; text-align: center;
    }
    .rr-lang-btn:hover { background: #ffd70022; }

    #rr-chat-input-row {
      display: flex; border-top: 1px solid #1f1f1f; padding: 8px;
      gap: 6px;
    }
    #rr-chat-input {
      flex: 1; background: #141414; border: 1px solid #232323;
      color: #fff; border-radius: 8px; padding: 9px 10px; font-size: 13px;
      font-family: 'Space Mono', monospace; outline: none;
    }
    #rr-chat-send {
      background: #00e5ff; border: none; border-radius: 8px;
      padding: 0 14px; cursor: pointer; color: #0a0a0a; font-weight: bold;
    }
    .rr-typing { color: #888; font-size: 12px; font-style: italic; padding-left: 4px; }
  `;
  document.head.appendChild(style);

  // ---------- Markup ----------
  const btn = document.createElement("button");
  btn.id = "rr-chat-btn";
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>`;
  document.body.appendChild(btn);

  const win = document.createElement("div");
  win.id = "rr-chat-window";
  win.innerHTML = `
    <div id="rr-chat-header">
      <span>RABBI // ASSISTANT</span>
      <button id="rr-chat-close">&times;</button>
    </div>
    <div id="rr-chat-body"></div>
    <div id="rr-chat-input-row" style="display:none;">
      <input id="rr-chat-input" type="text" placeholder="Type a message..." />
      <button id="rr-chat-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  const body = win.querySelector("#rr-chat-body");
  const inputRow = win.querySelector("#rr-chat-input-row");
  const input = win.querySelector("#rr-chat-input");

  let lang = null;
  let history = []; // {role, content}

  function addMsg(text, who) {
    const div = document.createElement("div");
    div.className = "rr-msg " + who;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function showLangPicker() {
    const wrap = document.createElement("div");
    wrap.className = "rr-lang-btns";
    wrap.innerHTML = `
      <div class="rr-lang-btn" data-lang="bn">বাংলা</div>
      <div class="rr-lang-btn" data-lang="en">English</div>
    `;
    body.appendChild(wrap);
    wrap.querySelectorAll(".rr-lang-btn").forEach((b) => {
      b.addEventListener("click", () => {
        lang = b.dataset.lang;
        wrap.remove();
        const greeting =
          lang === "bn"
            ? "হ্যালো! আমি রাব্বির AI অ্যাসিস্ট্যান্ট। গ্রাফিক ডিজাইন, ভিডিও এডিটিং বা সার্ভিস নিয়ে যা জানতে চাও জিজ্ঞেস করো।"
            : "Hi! I'm Rabbi's AI assistant. Ask me anything about his graphic design, video editing, or services.";
        addMsg(greeting, "bot");
        inputRow.style.display = "flex";
        input.focus();
      });
    });
  }

  btn.addEventListener("click", () => {
    win.classList.toggle("open");
    if (win.classList.contains("open") && body.children.length === 0) {
      const askLang = document.createElement("div");
      askLang.className = "rr-msg bot";
      askLang.textContent = "ভাষা বেছে নিন / Choose your language:";
      body.appendChild(askLang);
      showLangPicker();
    }
  });

  win.querySelector("#rr-chat-close").addEventListener("click", () => {
    win.classList.remove("open");
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || !lang) return;
    addMsg(text, "user");
    history.push({ role: "user", content: text });
    input.value = "";

    const typing = document.createElement("div");
    typing.className = "rr-typing";
    typing.textContent = lang === "bn" ? "টাইপ করছে..." : "typing...";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lang }),
      });
      const data = await res.json();
      typing.remove();
      const reply = data.reply || (lang === "bn" ? "দুঃখিত, একটু সমস্যা হয়েছে।" : "Sorry, something went wrong.");
      addMsg(reply, "bot");
      history.push({ role: "assistant", content: reply });
    } catch (e) {
      typing.remove();
      addMsg(lang === "bn" ? "সংযোগে সমস্যা হয়েছে।" : "Connection error.", "bot");
    }
  }

  win.querySelector("#rr-chat-send").addEventListener("click", sendMessage);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();

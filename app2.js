function uploadChatImage(event) {
    const file = event.target.files[0]; if (!file || !CURRENT_CHAT) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = img.width; let height = img.height;
            if (width > 600) { height = height * (600 / width); width = 600; }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const base64Img = canvas.toDataURL('image/jpeg', 0.7);

            if (CURRENT_CHAT === "999") {
                botMessages.push({ from: MY_PHONE, to: CURRENT_CHAT, text: base64Img, time: getTime(), date: getDate(), isImage: true });
                updateChat(); botReply("Вау, какая крутая картинка!");
            } else {
                await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ from: MY_PHONE, to: CURRENT_CHAT, text: base64Img, isImage: true, secret: IS_SECRET_MODE }) });
                updateChat();
            }
            document.getElementById('file-upload').value = '';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function selectUser(phone, name, isBot) {
    CURRENT_CHAT = phone; IS_SECRET_MODE = false;
    document.getElementById('chat-with').innerText = name;
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('secret-btn').style.display = isBot ? 'none' : 'block';
    document.getElementById('secret-btn').innerText = "🔥 Секретный чат";
    lastMsgCount = 0;
    if (isBot) { if(botMessages.length === 0) botReply("Привет! Я Fluxx Bot. Напиши мне что-нибудь!"); }
    updateChat();
}

function toggleSecret() {
    IS_SECRET_MODE = !IS_SECRET_MODE;
    document.getElementById('secret-btn').innerText = IS_SECRET_MODE ? "❌ Выйти из секрета" : "🔥 Секретный чат";
    alert(IS_SECRET_MODE ? "Включен режим секретного чата! Сообщения удалятся через 5 секунд." : "Секретный чат выключен.");
}

function getTime() { return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); }
function getDate() { return new Date().toLocaleDateString(); }

async function sendMessage() {
    const text = document.getElementById('msgInput').value.trim();
    if (!text || !CURRENT_CHAT) return;
    
    if (CURRENT_CHAT === "999") {
        botMessages.push({ from: MY_PHONE, to: "999", text: text, time: getTime(), date: getDate() });
        document.getElementById('msgInput').value = '';
        updateChat();
        setTimeout(() => {
            const lowerText = text.toLowerCase();
            if (lowerText.includes("привет") || lowerText.includes("здарова")) botReply("Привет-привет! 👋");
            else if (lowerText.includes("как дела")) botReply("У меня всё отлично! А у тебя?");
            else if (lowerText.includes("?")) botReply("Хороший вопрос! Но я пока маленький бот.");
            else botReply("Интересно! Расскажи еще.");
        }, 1000);
    } else {
        const res = await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ from: MY_PHONE, to: CURRENT_CHAT, text: text, secret: IS_SECRET_MODE }) });
        const data = await res.json();
        document.getElementById('msgInput').value = '';
        updateChat();
        
        if (IS_SECRET_MODE && data.id) {
            setTimeout(async () => {
                await fetch('/deleteMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: data.id }) });
            }, 5000);
        }
    }
}

async function sendGift() {
    if (!CURRENT_CHAT) return;
    const gifts = ["🧸 Мишка", "🌹 Роза", "💎 Алмаз", "👑 Корона"];
    const gift = gifts[Math.floor(Math.random() * gifts.length)];
    if (CURRENT_CHAT === "999") {
        botMessages.push({ from: MY_PHONE, to: "999", text: gift, time: getTime(), date: getDate(), isGift: true });
        updateChat(); botReply("Ого, спасибо за подарок! 🎉");
    } else {
        await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ from: MY_PHONE, to: CURRENT_CHAT, text: gift, isGift: true }) });
        updateChat();
    }
}

function botReply(text) {
    setTimeout(() => {
        botMessages.push({ from: "999", to: MY_PHONE, text: text, time: getTime(), date: getDate() });
        if (CURRENT_CHAT === "999") { updateChat(); playNotification(); }
    }, 800);
}

// ТУТ ТЕПЕРЬ РАБОТАЕТ ЗВУК
function handleKeyPress(e) { 
    if (e.key === 'Enter') {
        sendMessage(); 
    } else {
        playTypingSound(); 
    }
}

function toggleEmoji() { const picker = document.getElementById('emoji-picker'); picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex'; }
function addEmoji(emoji) { const input = document.getElementById('msgInput'); input.value += emoji; input.focus(); }

async function checkNewMessages() { if (CURRENT_CHAT && CURRENT_CHAT !== "999") updateChat(); }
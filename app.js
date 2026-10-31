let MY_PHONE = "", MY_NAME = "", MY_STATUS = "user", MY_AVATAR = "blue";
let CURRENT_CHAT = "", lastMsgCount = 0;
let audioCtx = null, botMessages = [], IS_SECRET_MODE = false, SOUND_ENABLED = true;
let ALL_USERS = {}; 

window.onload = function() {
    const savedPhone = localStorage.getItem("fluxx_phone");
    const savedName = localStorage.getItem("fluxx_name");
    if (savedPhone && savedName) {
        document.getElementById('regPhone').value = savedPhone;
        document.getElementById('regName').value = savedName;
        login(); 
    }
}

function logout() {
    fetch('/logout', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: MY_PHONE })});
    localStorage.removeItem("fluxx_phone");
    localStorage.removeItem("fluxx_name");
    location.reload();
}

function playNotification() {
    if (!SOUND_ENABLED) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function playTypingSound() {
    if (!SOUND_ENABLED) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

function switchTab(tab) {
    document.getElementById('nav-chats').classList.remove('active');
    document.getElementById('nav-profile').classList.remove('active');
    document.getElementById('nav-settings').classList.remove('active');
    document.getElementById('chats-panel').style.display = 'none';
    document.getElementById('profile-panel').style.display = 'none';
    document.getElementById('settings-panel').style.display = 'none';

    if (tab === 'chats') {
        document.getElementById('nav-chats').classList.add('active');
        document.getElementById('chats-panel').style.display = 'flex';
    } else if (tab === 'profile') {
        document.getElementById('nav-profile').classList.add('active');
        document.getElementById('profile-panel').style.display = 'flex';
        updateProfileTab();
    } else if (tab === 'settings') {
        document.getElementById('nav-settings').classList.add('active');
        document.getElementById('settings-panel').style.display = 'flex';
    }
}

async function login() {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    if (!name || !phone) return alert("Заполни поля!");

    try {
        const res = await fetch('/login', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name, phone: phone })
        });
        const data = await res.json();
        
        if (data.status === 'ok') {
            MY_PHONE = phone; MY_NAME = data.user.name; MY_STATUS = data.user.status; MY_AVATAR = data.user.avatar;
            localStorage.setItem("fluxx_phone", MY_PHONE);
            localStorage.setItem("fluxx_name", MY_NAME);

            if(data.user.theme === 'light') { document.body.classList.add('light'); document.getElementById('theme-checkbox').checked = true; }
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'flex';
            loadUsers(); setInterval(checkNewMessages, 1000);
        }
    } catch (e) { alert("Сервер выключен! Запусти 'node server.js' в терминале."); }
}

function updateProfileTab() {
    document.getElementById('profile-name').innerText = MY_NAME;
    document.getElementById('profile-phone').innerText = MY_PHONE;
    document.getElementById('profile-status').innerText = MY_STATUS === 'premium' ? '⭐ Premium' : MY_STATUS === 'vip' ? '👑 VIP' : 'Обычный';
    
    const av = document.getElementById('profile-avatar');
    if (MY_AVATAR && MY_AVATAR.startsWith('data:')) {
        av.style.backgroundImage = `url(${MY_AVATAR})`; av.innerText = "";
    } else {
        av.style.backgroundImage = 'none'; 
        av.style.background = MY_AVATAR === 'blue' ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)' : MY_AVATAR === 'green' ? 'linear-gradient(135deg, #064e3b, #10b981)' : 'linear-gradient(135deg, #7f1d1d, #ef4444)';
        av.innerText = MY_NAME[0].toUpperCase();
    }
}

async function loadUsers() {
    try {
        const res = await fetch('/getUsers');
        ALL_USERS = await res.json();
        const list = document.getElementById('users-list');
        list.innerHTML = '';
        
        const botDiv = document.createElement('div');
        botDiv.className = 'user-item';
        botDiv.innerHTML = `<div class="avatar bot">🤖<div class="online-dot"></div></div><div><div class="nickname" style="color: #fbbf24;">Fluxx Bot</div><div style="font-size:12px; color:var(--text-sub);">Всегда онлайн</div></div>`;
        botDiv.onclick = () => selectUser("999", "Fluxx Bot", true);
        list.appendChild(botDiv);
        
        for (const phone in ALL_USERS) {
            if (phone === MY_PHONE) continue;
            const u = ALL_USERS[phone];
            const div = document.createElement('div');
            div.className = 'user-item';
            let crown = u.status === 'premium' ? '⭐' : u.status === 'vip' ? '👑' : '';
            let statusColor = u.status === 'premium' ? 'status-premium' : u.status === 'vip' ? 'status-vip' : '';
            let avatarStyle = (u.avatar && u.avatar.startsWith('data:')) ? `background-image: url(${u.avatar});` : '';
            let avatarClass = (u.avatar && u.avatar.startsWith('data:')) ? 'avatar' : `avatar ${u.avatar || 'blue'}`;
            let avatarText = (u.avatar && u.avatar.startsWith('data:')) ? '' : u.name[0].toUpperCase();
            let dot = '<div class="online-dot"></div>';
            
            div.innerHTML = `<div class="${avatarClass}" style="${avatarStyle}">${avatarText}${dot}</div><div><div class="nickname ${statusColor}">${u.name} ${crown}</div><div style="font-size:12px; color:var(--text-sub);">${phone}</div></div>`;
            
            // КЛИК ПО ЧЕЛОВЕКУ ОТКРЫВАЕТ ЧАТ
            div.onclick = () => selectUser(phone, u.name, false);
            
            // ДВОЙНОЙ КЛИК ПОЛЬЗОВАТЕЛЮ ОТКРЫВАЕТ ПРОФИЛЬ
            div.ondblclick = () => openInfo(phone);
            
            list.appendChild(div);
        }
    } catch (e) { console.log("Сервер не отвечает"); }
}

// ФУНКЦИЯ ОТКРЫТИЯ ПРОФИЛЯ
function openInfo(phone) {
    if (phone === "999") return;
    const u = ALL_USERS[phone];
    if (!u) return;
    
    document.getElementById('info-name').innerText = u.name;
    document.getElementById('info-phone').innerText = phone;
    document.getElementById('info-status').innerText = u.status === 'premium' ? '⭐ Premium' : u.status === 'vip' ? '👑 VIP' : 'Обычный';
    
    const av = document.getElementById('info-avatar');
    av.innerText = "";
    if (u.avatar && u.avatar.startsWith('data:')) {
        av.style.backgroundImage = `url(${u.avatar})`;
    } else {
        av.style.backgroundImage = 'none';
        av.style.background = u.avatar === 'blue' ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)' : u.avatar === 'green' ? 'linear-gradient(135deg, #064e3b, #10b981)' : 'linear-gradient(135deg, #7f1d1d, #ef4444)';
        av.innerText = u.name[0].toUpperCase();
    }
    document.getElementById('info-modal').style.display = 'flex';
}

function closeInfo() {
    document.getElementById('info-modal').style.display = 'none';
}

function selectUser(phone, name, isBot) {
    CURRENT_CHAT = phone; IS_SECRET_MODE = false;
    document.getElementById('chat-with').innerText = name;
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('secret-btn').style.display = isBot ? 'none' : 'block';
    document.getElementById('secret-btn').innerText = "🔥 Секретный чат";
    
    // Показываем кнопку инфо в шапке для реальных людей
    document.getElementById('info-btn').style.display = (isBot || phone === MY_PHONE) ? 'none' : 'block';
    document.getElementById('info-btn').onclick = () => openInfo(phone);
    
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

function handleKeyPress(e) { 
    if (e.key === 'Enter') { sendMessage(); } 
    else { playTypingSound(); }
}

function toggleEmoji() { const picker = document.getElementById('emoji-picker'); picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex'; }
function addEmoji(emoji) { const input = document.getElementById('msgInput'); input.value += emoji; input.focus(); }

async function updateChat() {
    if (!CURRENT_CHAT) return;
    let messages = [];
    if (CURRENT_CHAT === "999") { messages = botMessages; } 
    else {
        try {
            const res = await fetch(`/getMessages?user1=${MY_PHONE}&user2=${CURRENT_CHAT}`);
            messages = await res.json();
        } catch(e) { return; }
    }
    
    if (messages.length !== lastMsgCount) {
        if (messages.length > lastMsgCount && lastMsgCount !== 0) playNotification();
        lastMsgCount = messages.length;
        const box = document.getElementById('chat-messages');
        box.innerHTML = '';
        let lastDate = "";
        
        messages.forEach(msg => {
            if (msg.date !== lastDate) {
                lastDate = msg.date;
                const dateDiv = document.createElement('div');
                dateDiv.style.cssText = "text-align:center; font-size:12px; color:var(--text-sub); margin: 15px 0; font-weight: 600;";
                dateDiv.innerText = msg.date;
                box.appendChild(dateDiv);
            }
            const div = document.createElement('div');
            div.className = 'message ' + (msg.from === MY_PHONE ? 'my-msg' : 'other-msg');
            if (msg.isGift) div.classList.add('gift-msg');
            if (msg.secret) div.classList.add('secret-msg');
            
            if (msg.isImage) {
                div.innerHTML = `<img src="${msg.text}" class="msg-image"><span class="msg-time">${msg.time}</span>`;
            } else {
                div.innerHTML = `${msg.text} <span class="msg-time">${msg.time}</span>`;
            }
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    }
}

async function checkNewMessages() { if (CURRENT_CHAT && CURRENT_CHAT !== "999") updateChat(); }

let MY_PHONE = "", MY_NAME = "", MY_STATUS = "user", MY_AVATAR = "blue";
let CURRENT_CHAT = "", lastMsgCount = 0;
let audioCtx = null, botMessages = [], IS_SECRET_MODE = false, SOUND_ENABLED = true;
let ALL_USERS = {}; 

window.onload = function() {
    const savedPhone = localStorage.getItem("fluxx_phone");
    if (savedPhone) { 
        document.getElementById('regPhone').value = savedPhone;
        document.getElementById('regName').value = localStorage.getItem("fluxx_name");
    }
}

function logout() {
    localStorage.clear();
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
    const password = document.getElementById('regPassword').value;
    if (!name || !phone || !password) return alert("Заполни все поля!");

    try {
        const res = await fetch('/login', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name, phone: phone, password: password })
        });
        const data = await res.json();
        
        if (data.status === 'ok') {
            MY_PHONE = phone; MY_NAME = data.user.name; MY_STATUS = data.user.status; MY_AVATAR = data.user.avatar;
            localStorage.setItem("fluxx_phone", MY_PHONE);
            localStorage.setItem("fluxx_name", MY_NAME);

            if(data.user.theme === 'light') { document.body.classList.add('light'); }
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'flex';
            loadUsers(); setInterval(checkNewMessages, 1000);
        } else {
            alert(data.message);
        }
    } catch(e) { alert("Ошибка сети"); }
}

function updateProfileTab() {
    document.getElementById('profile-name').innerText = MY_NAME;
    document.getElementById('profile-phone').innerText = MY_PHONE;
    const av = document.getElementById('profile-avatar');
    av.innerText = MY_NAME[0].toUpperCase();
}

async function loadUsers() {
    try {
        const res = await fetch('/getUsers');
        ALL_USERS = await res.json();
        const list = document.getElementById('users-list');
        list.innerHTML = '';
        
        const botDiv = document.createElement('div');
        botDiv.className = 'user-item';
        botDiv.innerHTML = `<div class="avatar bot">🤖</div><div><div class="nickname">Fluxx Bot</div></div>`;
        botDiv.onclick = () => selectUser("999", "Fluxx Bot");
        list.appendChild(botDiv);
        
        for (const phone in ALL_USERS) {
            if (phone === MY_PHONE) continue;
            const u = ALL_USERS[phone];
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `<div class="avatar">${u.name[0].toUpperCase()}</div><div><div class="nickname">${u.name}</div><div style="font-size:12px; color:#888;">${phone}</div></div>`;
            div.onclick = () => selectUser(phone, u.name);
            list.appendChild(div);
        }
    } catch(e) {}
}

function selectUser(phone, name) {
    CURRENT_CHAT = phone;
    document.getElementById('chat-with').innerText = name;
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('chat-messages').innerHTML = '';
    lastMsgCount = 0;
    if (phone === "999" && botMessages.length === 0) {
        botMessages.push({ from: "999", to: MY_PHONE, text: "Привет! Я Fluxx Bot!", time: getTime(), date: getDate() });
    }
    updateChat();
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
        setTimeout(() => { botMessages.push({ from: "999", to: MY_PHONE, text: "Интересно!", time: getTime(), date: getDate() }); updateChat(); }, 1000);
    } else {
        await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ from: MY_PHONE, to: CURRENT_CHAT, text: text }) });
        document.getElementById('msgInput').value = '';
        updateChat();
    }
}

async function addReaction(id, emoji) {
    if (CURRENT_CHAT === "999") return;
    await fetch('/addReaction', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: id, reaction: emoji }) });
    updateChat();
}

function handleKeyPress(e) { 
    if (e.key === 'Enter') sendMessage(); 
    else playTypingSound();
}

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
        lastMsgCount = messages.length;
        const box = document.getElementById('chat-messages');
        box.innerHTML = '';
        
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message ' + (msg.from === MY_PHONE ? 'my-msg' : 'other-msg');
            const reactionsHTML = `
                <div class="reactions ${msg.reaction ? 'active-reaction' : ''}">
                    <span onclick="addReaction(${msg.id}, '❤️')">❤️</span>
                    <span onclick="addReaction(${msg.id}, '🔥')">🔥</span>
                    <span onclick="addReaction(${msg.id}, '😂')">😂</span>
                    ${msg.reaction ? `<span style="margin-left:5px;">${msg.reaction}</span>` : ''}
                </div>
            `;
            div.innerHTML = `${msg.text} <span class="msg-time">${msg.time}</span> ${reactionsHTML}`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    }
}

async function checkNewMessages() { updateChat(); }

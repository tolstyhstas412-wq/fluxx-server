let MY_PHONE = "", MY_NAME = "", MY_STATUS = "user", MY_AVATAR = "blue";
let CURRENT_CHAT = "", lastMsgCount = 0;
let audioCtx = null, botMessages = [], IS_SECRET_MODE = false, SOUND_ENABLED = true;

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

// ЗВУК ПЕЧАТИ
function playTypingSound() {
    if (!SOUND_ENABLED) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Громкость
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
        const users = await res.json();
        const onlineRes = await fetch('/getOnline');
        const online = await onlineRes.json();
        
        const list = document.getElementById('users-list');
        list.innerHTML = '';
        
        const botDiv = document.createElement('div');
        botDiv.className = 'user-item';
        botDiv.innerHTML = `<div class="avatar bot">🤖<div class="online-dot"></div></div><div class="nickname" style="color: #fbbf24;">Fluxx Bot</div>`;
        botDiv.onclick = () => selectUser("999", "Fluxx Bot", true);
        list.appendChild(botDiv);
        
        for (const phone in users) {
            if (phone === MY_PHONE) continue;
            const u = users[phone];
            const isOnline = online.includes(phone);
            
            const div = document.createElement('div');
            div.className = 'user-item';
            let crown = u.status === 'premium' ? '⭐' : u.status === 'vip' ? '👑' : '';
            let statusColor = u.status === 'premium' ? 'status-premium' : u.status === 'vip' ? 'status-vip' : '';
            let avatarStyle = (u.avatar && u.avatar.startsWith('data:')) ? `background-image: url(${u.avatar});` : '';
            let avatarClass = (u.avatar && u.avatar.startsWith('data:')) ? 'avatar' : `avatar ${u.avatar || 'blue'}`;
            let avatarText = (u.avatar && u.avatar.startsWith('data:')) ? '' : u.name[0].toUpperCase();
            let dot = isOnline ? '<div class="online-dot"></div>' : '';
            
            div.innerHTML = `<div class="${avatarClass}" style="${avatarStyle}">${avatarText}${dot}</div><div class="nickname ${statusColor}">${u.name} ${crown}</div>`;
            div.onclick = () => selectUser(phone, u.name, false);
            list.appendChild(div);
        }
    } catch (e) { console.log("Сервер не отвечает"); }
}

async function setStatus(status) {
    MY_STATUS = status;
    await fetch('/updateProfile', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: MY_PHONE, status: status }) });
    updateProfileTab(); loadUsers();
}

function toggleTheme() {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    fetch('/updateProfile', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: MY_PHONE, theme: isLight ? 'light' : 'dark' }) });
}

function toggleSound() { SOUND_ENABLED = document.getElementById('sound-checkbox').checked; }

function uploadAvatar(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 150; canvas.height = 150;
            ctx.drawImage(img, 0, 0, 150, 150);
            MY_AVATAR = canvas.toDataURL('image/jpeg', 0.8);
            fetch('/updateProfile', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: MY_PHONE, avatar: MY_AVATAR }) });
            updateProfileTab(); loadUsers();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
        if (messages.length > lastMsgCount && lastMsgCount !== 0) playNotification();
        lastMsgCount = messages.length;
        const box = document.getElementById('chat-messages');
        box.innerHTML = '';
        let lastDate = "";
        
        messages.forEach(msg => {
            if (msg.date !== lastDate) {
                lastDate = msg.date;
                const dateDiv = document.createElement('div');
                dateDiv.style.cssText = "text-align:center; font-size:12px; color:var(--text-sub); margin: 10px 0;";
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
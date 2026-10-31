let MY_PHONE = "", MY_NAME = "", MY_STATUS = "user", MY_AVATAR = "blue";
let CURRENT_CHAT = "", lastMsgCount = 0;
let ALL_USERS = {}; 

window.onload = function() {
    const savedPhone = localStorage.getItem("fluxx_phone");
    if (savedPhone) { 
        document.getElementById('regPhone').value = savedPhone;
        document.getElementById('regName').value = localStorage.getItem("fluxx_name");
        // Пароль придется ввести заново
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
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'flex';
            loadUsers(); setInterval(checkNewMessages, 1000);
        } else {
            alert(data.message);
        }
    } catch(e) { alert("Ошибка сети"); }
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
        document.getElementById('profile-name').innerText = MY_NAME;
        document.getElementById('profile-phone').innerText = MY_PHONE;
    } else if (tab === 'settings') {
        document.getElementById('nav-settings').classList.add('active');
        document.getElementById('settings-panel').style.display = 'flex';
    }
}

async function loadUsers() {
    try {
        const res = await fetch('/getUsers');
        ALL_USERS = await res.json();
        const list = document.getElementById('users-list');
        list.innerHTML = '';
        
        for (const phone in ALL_USERS) {
            if (phone === MY_PHONE) continue;
            const u = ALL_USERS[phone];
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `<div class="avatar">${u.name[0].toUpperCase()}</div><div><div class="nickname">${u.name}</div><div style="font-size:12px; color:#888;">${phone}</div></div>`;
            div.onclick = () => selectUser(phone, u.name);
            list.appendChild(div);
        }
    } catch (e) { console.log("Сервер не отвечает"); }
}

function selectUser(phone, name) {
    CURRENT_CHAT = phone;
    document.getElementById('chat-with').innerText = name;
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('chat-messages').innerHTML = '';
    lastMsgCount = 0;
    updateChat();
}

async function sendMessage() {
    const text = document.getElementById('msgInput').value.trim();
    if (!text || !CURRENT_CHAT) return;
    await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ from: MY_PHONE, to: CURRENT_CHAT, text: text }) });
    document.getElementById('msgInput').value = '';
    updateChat();
}

async function addReaction(id, emoji) {
    await fetch('/addReaction', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: id, reaction: emoji }) });
    updateChat();
}

function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

async function updateChat() {
    if (!CURRENT_CHAT) return;
    try {
        const res = await fetch(`/getMessages?user1=${MY_PHONE}&user2=${CURRENT_CHAT}`);
        const messages = await res.json();
        
        if (messages.length !== lastMsgCount) {
            lastMsgCount = messages.length;
            const box = document.getElementById('chat-messages');
            box.innerHTML = '';
            
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message ' + (msg.from === MY_PHONE ? 'my-msg' : 'other-msg');
                
                // БЛОК РЕАКЦИЙ
                const reactionsHTML = `
                    <div class="reactions ${msg.reaction ? 'active-reaction' : ''}">
                        <span onclick="addReaction(${msg.id}, '❤️')">❤️</span>
                        <span onclick="addReaction(${msg.id}, '🔥')">🔥</span>
                        <span onclick="addReaction(${msg.id}, '😂')">😂</span>
                        ${msg.reaction ? `<span style="margin-left:5px; border-left:1px solid #555; padding-left:5px;">${msg.reaction}</span>` : ''}
                    </div>
                `;
                
                div.innerHTML = `${msg.text} <span class="msg-time">${msg.time}</span> ${reactionsHTML}`;
                box.appendChild(div);
            });
            box.scrollTop = box.scrollHeight;
        }
    } catch(e) {}
}

async function checkNewMessages() { updateChat(); }

// Заглушки для кнопок
function openInfo() { alert("Профиль откроется тут (следующее обновление)"); }
function closeInfo() { }
function logout() { localStorage.clear(); location.reload(); }
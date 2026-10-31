let MY_PHONE = "", MY_NAME = "", MY_STATUS = "user", MY_AVATAR = "blue";
let CURRENT_CHAT = "", lastMsgCount = 0;
let ALL_USERS = {}; 

window.onload = function() {
    const savedPhone = localStorage.getItem("fluxx_phone");
    if (savedPhone) { login(); }
}

async function login() {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    
    if (!name || !phone || !password) return alert("Заполни поля!");

    const res = await fetch('/login', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: name, phone: phone, password: password })
    });
    const data = await res.json();
    
    if (data.status === 'ok') {
        MY_PHONE = phone; MY_NAME = data.user.name;
        localStorage.setItem("fluxx_phone", MY_PHONE);
        localStorage.setItem("fluxx_name", MY_NAME);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        loadUsers(); setInterval(checkNewMessages, 1000);
    } else {
        alert(data.message);
    }
}

// ... (Функции switchTab, loadUsers, openInfo из прошлого кода) ...

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

async function updateChat() {
    if (!CURRENT_CHAT) return;
    const res = await fetch(`/getMessages?user1=${MY_PHONE}&user2=${CURRENT_CHAT}`);
    const messages = await res.json();
    
    if (messages.length !== lastMsgCount) {
        lastMsgCount = messages.length;
        const box = document.getElementById('chat-messages');
        box.innerHTML = '';
        
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message ' + (msg.from === MY_PHONE ? 'my-msg' : 'other-msg');
            
            // РЕАКЦИИ
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
}
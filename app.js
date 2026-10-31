let MY_PHONE = "", MY_NAME = "", CURRENT_CHAT = "", ALL_USERS = {};

function getTime() { return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); }

async function doLogin() {
    const n = document.getElementById('name').value;
    const p = document.getElementById('phone').value;
    const pass = document.getElementById('pass').value;
    if (!n || !p || !pass) return alert("Заполни поля!");

    const res = await fetch('/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name:n, phone:p, password:pass}) });
    const data = await res.json();
    
    if (data.status === 'ok') {
        MY_PHONE = p; MY_NAME = n;
        document.getElementById('login').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        document.getElementById('myName').innerText = n;
        document.getElementById('myPhone').innerText = p;
        document.getElementById('myAvatar').innerText = n[0].toUpperCase();
        loadUsers(); 
        setInterval(() => { if (CURRENT_CHAT && CURRENT_CHAT !== "999") checkMsgs(); }, 1000);
    } else { alert(data.message); }
}

async function loadUsers() {
    const res = await fetch('/getUsers');
    ALL_USERS = await res.json();
    const list = document.getElementById('usersList');
    list.innerHTML = `<div class="user-item" onclick="openChat('999', 'Бот')"><div class="user-avatar" style="background:#ff00ff;">🤖</div><div>Fluxx Bot</div></div>`;
    
    for (const phone in ALL_USERS) {
        if (phone === MY_PHONE) continue;
        const u = ALL_USERS[phone];
        let avStyle = u.avatar ? `background-image: url(${u.avatar});` : '';
        list.innerHTML += `<div class="user-item" onclick="openChat('${phone}', '${u.name}')"><div class="user-avatar" style="${avStyle}">${u.avatar ? '' : u.name[0].toUpperCase()}</div><div>${u.name}</div></div>`;
    }
}

function openChat(phone, name) {
    CURRENT_CHAT = phone;
    document.getElementById('chatTitle').innerText = name;
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('msgBox').innerHTML = '';
    checkMsgs();
}

async function sendMsg() {
    const text = document.getElementById('msgInput').value.trim();
    if (!text || !CURRENT_CHAT) return;
    
    await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({from:MY_PHONE, to:CURRENT_CHAT, text:text}) });
    document.getElementById('msgInput').value = '';
    checkMsgs();
}

async function checkMsgs() {
    if (!CURRENT_CHAT || CURRENT_CHAT === "999") return;
    const res = await fetch(`/getMessages?user1=${MY_PHONE}&user2=${CURRENT_CHAT}`);
    const msgs = await res.json();
    const box = document.getElementById('msgBox');
    box.innerHTML = '';
    msgs.forEach(m => {
        box.innerHTML += `<div class="message ${m.from === MY_PHONE ? 'my-msg' : 'other-msg'}">${m.text}</div>`;
    });
    box.scrollTop = box.scrollHeight;
}

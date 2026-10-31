let MY_PHONE = "", MY_NAME = "", MY_AVATAR = null, CURRENT_CHAT = "", ALL_USERS = {}, chatInterval = null;

async function doLogin() {
    const n = document.getElementById('name').value;
    const p = document.getElementById('phone').value;
    const pass = document.getElementById('pass').value;
    if (!n || !p || !pass) return alert("Заполни поля!");

    const res = await fetch('/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name:n, phone:p, password:pass}) });
    const data = await res.json();
    
    if (data.status === 'ok') {
        MY_PHONE = p; MY_NAME = n; MY_AVATAR = data.user.avatar;
        document.getElementById('login').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        updateMyUI();
        loadUsers(); 
    } else { alert(data.message); }
}

function logout() { location.reload(); }

function updateMyUI() {
    document.getElementById('myName').innerText = MY_NAME;
    document.getElementById('myPhone').innerText = "+" + MY_PHONE;
    const av = document.getElementById('myAvatar');
    if (MY_AVATAR) { av.style.backgroundImage = `url(${MY_AVATAR})`; av.innerText = ""; }
    else { av.style.backgroundImage = 'none'; av.innerText = MY_NAME[0].toUpperCase(); }
}

async function loadUsers() {
    const res = await fetch('/getUsers');
    ALL_USERS = await res.json();
    renderUsers();
}

function renderUsers(filter = "") {
    const list = document.getElementById('usersList');
    list.innerHTML = `<div class="user-item" onclick="openChat('999', 'Fluxx Bot')"><div class="avatar" style="background:#ff00ff;">🤖</div><div>Fluxx Bot</div></div>`;
    
    for (const phone in ALL_USERS) {
        if (phone === MY_PHONE) continue;
        const u = ALL_USERS[phone];
        if (filter && !u.name.toLowerCase().includes(filter.toLowerCase())) continue;
        
        let avStyle = u.avatar ? `background-image: url(${u.avatar});` : '';
        let online = u.online ? '<div class="online-dot"></div>' : '';
        list.innerHTML += `<div class="user-item" onclick="openChat('${phone}', '${u.name}')"><div class="avatar" style="${avStyle}">${u.avatar ? '' : u.name[0].toUpperCase()}${online}</div><div>${u.name}</div></div>`;
    }
}

function filterUsers() {
    const query = document.getElementById('searchInput').value;
    renderUsers(query);
}

function openChat(phone, name) {
    CURRENT_CHAT = phone;
    document.getElementById('chatTitle').innerText = name;
    document.getElementById('profileBtn').style.display = phone === "999" ? 'none' : 'block';
    document.getElementById('msgBox').innerHTML = '';
    
    if (chatInterval) clearInterval(chatInterval);
    checkMsgs();
    chatInterval = setInterval(checkMsgs, 1000);
}

async function sendMsg() {
    const text = document.getElementById('msgInput').value.trim();
    if (!text || !CURRENT_CHAT) return;

    if (CURRENT_CHAT === "999") {
        addMsgToScreen({from: MY_PHONE, text: text, time: getTime()});
        document.getElementById('msgInput').value = '';
        setTimeout(() => {
            let reply = "Интересно! Расскажи еще.";
            if (text.toLowerCase().includes("привет")) reply = "Привет-привет! 👋";
            if (text.toLowerCase().includes("как дела")) reply = "У меня всё отлично!";
            addMsgToScreen({from: "999", text: reply, time: getTime()});
            playSound();
        }, 1000);
    } else {
        await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({from:MY_PHONE, to:CURRENT_CHAT, text:text}) });
        document.getElementById('msgInput').value = '';
        checkMsgs();
    }
}

function sendImage(event) {
    const file = event.target.files[0]; if (!file || !CURRENT_CHAT || CURRENT_CHAT === "999") return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        await fetch('/sendMessage', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({from:MY_PHONE, to:CURRENT_CHAT, text: "", image: e.target.result}) });
        checkMsgs();
    };
    reader.readAsDataURL(file);
}

async function checkMsgs() {
    if (!CURRENT_CHAT || CURRENT_CHAT === "999") return;
    const res = await fetch(`/getMessages?user1=${MY_PHONE}&user2=${CURRENT_CHAT}`);
    const msgs = await res.json();
    
    const box = document.getElementById('msgBox');
    box.innerHTML = '';
    
    msgs.forEach(m => {
        let content = m.text || '';
        if (m.image) content += `<img src="${m.image}" class="msg-img">`;
        box.innerHTML += `
            <div class="message ${m.from === MY_PHONE ? 'my-msg' : 'other-msg'}">
                ${content}<span class="msg-time">${m.time}</span>
                <div class="reactions">
                    <span onclick="addReaction(${m.id}, '❤️')">❤️</span>
                    <span onclick="addReaction(${m.id}, '🔥')">🔥</span>
                    <span onclick="addReaction(${m.id}, '😂')">😂</span>
                    ${m.reaction ? m.reaction : ''}
                </div>
            </div>
        `;
    });
    box.scrollTop = box.scrollHeight;
}

function addMsgToScreen(m) {
    const box = document.getElementById('msgBox');
    box.innerHTML += `<div class="message ${m.from === MY_PHONE ? 'my-msg' : 'other-msg'}">${m.text}<span class="msg-time">${m.time}</span></div>`;
    box.scrollTop = box.scrollHeight;
}

async function addReaction(id, emoji) {
    await fetch('/addReaction', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({from: MY_PHONE, to: CURRENT_CHAT, id: id, reaction: emoji}) });
    checkMsgs();
}

function getTime() { return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); }

function openModal(id) {
    if (id === 'myProfile') {
        document.getElementById('modalMyName').innerText = MY_NAME;
        document.getElementById('modalMyPhone').innerText = "+" + MY_PHONE;
        const av = document.getElementById('modalMyAvatar');
        if (MY_AVATAR) { av.style.backgroundImage = `url(${MY_AVATAR})`; av.innerText = ""; }
        else { av.innerText = MY_NAME[0].toUpperCase(); }
    }
    if (id === 'otherProfile') {
        if (!CURRENT_CHAT || CURRENT_CHAT === "999") return;
        const u = ALL_USERS[CURRENT_CHAT];
        document.getElementById('modalOtherName').innerText = u.name;
        document.getElementById('modalOtherPhone').innerText = "+" + CURRENT_CHAT;
        document.getElementById('modalOtherBio').innerText = u.bio || "Привет!";
        const av = document.getElementById('modalOtherAvatar');
        if (u.avatar) { av.style.backgroundImage = `url(${u.avatar})`; av.innerText = ""; }
        else { av.innerText = u.name[0].toUpperCase(); }
    }
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function uploadAvatar(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        MY_AVATAR = e.target.result;
        await fetch('/updateProfile', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({phone: MY_PHONE, avatar: MY_AVATAR}) });
        updateMyUI();
        openModal('myProfile');
    };
    reader.readAsDataURL(file);
}

async function clearChat() {
    if (!confirm("Удалить историю?")) return;
    await fetch('/clearChat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({user1: MY_PHONE, user2: CURRENT_CHAT}) });
    document.getElementById('msgBox').innerHTML = '';
    closeModal('otherProfile');
}

async function createGroup() {
    const name = document.getElementById('groupName').value;
    if (!name) return alert("Введи название");
    await fetch('/createGroup', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: name, phone: MY_PHONE}) });
    closeModal('createGroup');
    alert("Группа создана!");
}

function playSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
}

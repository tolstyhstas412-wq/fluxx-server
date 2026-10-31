const http = require('http');
const fs = require('fs');

let users = {};
let messages = [];

if (fs.existsSync('data.json')) {
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        users = data.users || {};
        messages = data.messages || [];
    } catch (e) { console.log("Ошибка базы."); }
}

function saveDB() {
    fs.writeFileSync('data.json', JSON.stringify({ users, messages }, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/' || req.url.endsWith('.html')) {
        fs.readFile('index.html', (err, data) => {
            if (err) { res.writeHead(404); res.end('Not found'); } 
            else { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(data); }
        });
    } 
    else if (req.url === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            if (!users[data.phone]) {
                users[data.phone] = { 
                    name: data.name, password: data.password, avatar: null,
                    username: "@" + data.name.toLowerCase().replace(/\s/g, ''),
                    bio: "Привет, я использую Fluxx!", birthday: "01.01.2000", status: "user"
                };
                saveDB();
            }
            if (users[data.phone].password === data.password) {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({status: 'ok', user: users[data.phone]}));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({status: 'error', message: 'Неверный пароль!'}));
            }
        });
    }
    else if (req.url === '/getUsers') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(users));
    }
    else if (req.url === '/updateProfile' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            if (users[data.phone]) {
                if(data.avatar !== undefined) users[data.phone].avatar = data.avatar;
                if(data.username) users[data.phone].username = data.username;
                if(data.bio) users[data.phone].bio = data.bio;
                if(data.birthday) users[data.phone].birthday = data.birthday;
                if(data.status) users[data.phone].status = data.status;
                saveDB();
            }
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/changePassword' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            if (users[data.phone] && users[data.phone].password === data.oldPass) {
                users[data.phone].password = data.newPass;
                saveDB();
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({status: 'ok'}));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({status: 'error', message: 'Неверный старый пароль!'}));
            }
        });
    }
    else if (req.url === '/clearHistory' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            messages = messages.filter(m => m.from !== data.phone && m.to !== data.phone);
            saveDB();
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/sendMessage' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            messages.push({ id: Date.now(), from: data.from, to: data.to, text: data.text, reaction: null });
            saveDB();
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/addReaction' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const msg = messages.find(m => String(m.id) === String(data.id));
            if (msg) { msg.reaction = data.reaction; saveDB(); }
            res.writeHead(200); res.end();
        });
    }
    else if (req.url.startsWith('/getMessages')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const u1 = urlParams.get('user1'); const u2 = urlParams.get('user2');
        const dialog = messages.filter(m => (m.from === u1 && m.to === u2) || (m.from === u2 && m.to === u1));
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(dialog));
    } else { res.writeHead(404); res.end(); }
});

server.listen(3000, () => console.log('Fluxx запущен!'));

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
                users[data.phone] = { name: data.name, password: data.password, avatar: null };
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
    else if (req.url === '/updateAvatar' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            if (users[data.phone]) {
                users[data.phone].avatar = data.avatar;
                saveDB();
            }
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/sendMessage' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const now = new Date();
            messages.push({
                id: Date.now(), from: data.from, to: data.to, text: data.text,
                time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                reaction: null
            });
            saveDB();
            res.writeHead(200); res.end();
        });
    }
    // --- РЕАКЦИИ ---
    else if (req.url === '/addReaction' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            console.log("Пришла реакция:", data); // Для отладки
            const msg = messages.find(m => m.id === data.id);
            if (msg) { 
                msg.reaction = data.reaction; 
                saveDB(); 
            }
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

server.listen(3000, () => console.log('Сервер запущен!'));

const http = require('http');
const fs = require('fs');

let users = {}, messages = {}, typingUsers = {};

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

    if (req.url === '/' || req.url.endsWith('.html') || req.url.endsWith('.css') || req.url.endsWith('.js')) {
        let filePath = req.url === '/' ? 'index.html' : req.url.substring(1);
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end('Not found'); } 
            else {
                let type = 'text/html';
                if (filePath.endsWith('.css')) type = 'text/css';
                if (filePath.endsWith('.js')) type = 'application/javascript';
                res.writeHead(200, {'Content-Type': type + '; charset=utf-8'});
                res.end(data);
            }
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
    else if (req.url === '/sendMessage' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            messages.push({ id: Date.now(), from: data.from, to: data.to, text: data.text });
            saveDB();
            res.writeHead(200); res.end();
        });
    }
    else if (req.url.startsWith('/getMessages')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const u1 = urlParams.get('user1'), u2 = urlParams.get('user2');
        const dialog = messages.filter(m => (m.from === u1 && m.to === u2) || (m.from === u2 && m.to === u1));
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(dialog));
    } else { res.writeHead(404); res.end(); }
});

server.listen(3000, () => console.log('Fluxx запущен!'));

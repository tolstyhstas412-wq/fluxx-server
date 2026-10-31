const http = require('http');
const fs = require('fs');

let users = {};
let messages = {};
let groups = {};

if (fs.existsSync('data.json')) {
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        users = data.users || {};
        messages = data.messages || {};
        groups = data.groups || {};
    } catch (e) { console.log("Ошибка базы."); }
}

function saveDB() {
    fs.writeFileSync('data.json', JSON.stringify({ users, messages, groups }, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/' || req.url.endsWith('.html') || req.url.endsWith('.js')) {
        let filePath = req.url === '/' ? 'index.html' : req.url.substring(1);
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end('Not found'); } 
            else {
                let type = 'text/html';
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
                users[data.phone] = { name: data.name, password: data.password, avatar: null, bio: "Привет, я в Fluxx!", online: true };
                saveDB();
            }
            if (users[data.phone].password === data.password) {
                users[data.phone].online = true;
                saveDB();
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
                if(data.avatar) users[data.phone].avatar = data.avatar;
                if(data.bio) users[data.phone].bio = data.bio;
                saveDB();
            }
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/createGroup' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const groupId = "group_" + Date.now();
            groups[groupId] = { name: data.name, admin: data.phone, members: [data.phone] };
            saveDB();
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({status: 'ok', groupId}));
        });
    }
    else if (req.url === '/sendMessage' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const chatId = [data.from, data.to].sort().join('-');
            if (!messages[chatId]) messages[chatId] = [];
            messages[chatId].push({ 
                id: Date.now(), from: data.from, text: data.text, 
                image: data.image, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                reaction: null
            });
            saveDB();
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/addReaction' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const chatId = [data.from, data.to].sort().join('-');
            const msg = messages[chatId]?.find(m => m.id === data.id);
            if (msg) { msg.reaction = data.reaction; saveDB(); }
            res.writeHead(200); res.end();
        });
    }
    else if (req.url === '/clearChat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body);
            const chatId = [data.user1, data.user2].sort().join('-');
            messages[chatId] = [];
            saveDB();
            res.writeHead(200); res.end();
        });
    }
    else if (req.url.startsWith('/getMessages')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const chatId = [urlParams.get('user1'), urlParams.get('user2')].sort().join('-');
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(messages[chatId] || []));
    } else { res.writeHead(404); res.end(); }
});

server.listen(3000, () => console.log('Fluxx 4.0 запущен!'));

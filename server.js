const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

const PORT = 3000;
const rooms = {};

app.use(express.static('public'));

io.on('connection', socket => {

    socket.on('createRoom', (name, cb) => {
        const code = Math.random().toString(36).substr(2,5).toUpperCase();
        rooms[code] = {
            letter: String.fromCharCode(65 + Math.floor(Math.random()*26)),
            players: [{ id: socket.id, name }],
            answers: [],
            scores: {}
        };
        socket.join(code);
        cb(code);
        io.to(code).emit('playerList', rooms[code].players);
    });

    socket.on('joinRoom', (code, name, cb) => {
        if (!rooms[code]) return cb(false);
        rooms[code].players.push({ id: socket.id, name });
        socket.join(code);
        cb(true);
        io.to(code).emit('playerList', rooms[code].players);
    });

    socket.on('startGame', code => {
        io.to(code).emit('gameStarted', rooms[code].letter);
    });

    socket.on('submitAnswers', (code, answers) => {
        const room = rooms[code];
        room.answers.push({ playerId: socket.id, ...answers });
        if (room.answers.length === room.players.length) {
            io.to(code).emit('goToScoring', room.answers);
        }
    });

    socket.on('submitScores', (code, playerScores) => {
        const room = rooms[code];
        room.scores[socket.id] = playerScores;

        if (Object.keys(room.scores).length === room.players.length) {
            const totals = {};
            for (const voter in room.scores) {
                for (const pid in room.scores[voter]) {
                    totals[pid] = (totals[pid] || 0) + room.scores[voter][pid];
                }
            }

            const leaderboard = room.players.map(p => ({
                name: p.name,
                score: totals[p.id] || 0
            }));

            io.to(code).emit('finalResults', leaderboard);
        }
    });
});

http.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 4000;

// ====== Helpers (Cards) ======
const SUITS = ["S", "H", "D", "C"]; // Spades, Hearts, Diamonds, Clubs
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ s, r });
  return deck;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function deal2Players() {
  const deck = shuffle(makeDeck());
  const p1 = deck.slice(0, 13);
  const p2 = deck.slice(13, 26);
  return { deck: deck.slice(26), hands: [p1, p2] };
}

// ====== Rooms ======
const rooms = new Map(); // roomCode -> room object
let quickQueue = null;  // socket.id waiting

function code() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getRoomPublic(room) {
  return {
    roomCode: room.roomCode,
    players: room.players.map(p => ({ id: p.id, name: p.name })),
    started: room.started,
    turnIndex: room.turnIndex,
    tableCard: room.tableCard || null
  };
}

function startGame(room) {
  const { hands } = deal2Players();
  room.started = true;
  room.turnIndex = 0; // player 1 starts
  room.tableCard = null;

  // send each player their own hand privately
  room.players.forEach((p, idx) => {
    io.to(p.id).emit("hand", { hand: hands[idx], yourIndex: idx });
  });

  io.to(room.roomCode).emit("roomUpdate", getRoomPublic(room));
  io.to(room.roomCode).emit("gameStart");
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }) => {
    const roomCode = code();
    const room = {
      roomCode,
      players: [{ id: socket.id, name: name || "Player 1" }],
      started: false,
      turnIndex: 0,
      tableCard: null
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    io.to(roomCode).emit("roomUpdate", getRoomPublic(room));
    socket.emit("roomCreated", { roomCode });
  });

  socket.on("joinRoom", ({ name, roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return socket.emit("errorMsg", "Room not found");

    if (room.players.length >= 2) return socket.emit("errorMsg", "Room full");

    room.players.push({ id: socket.id, name: name || "Player 2" });
    socket.join(roomCode);
    io.to(roomCode).emit("roomUpdate", getRoomPublic(room));

    if (room.players.length === 2) startGame(room);
  });

  socket.on("quickMatch", ({ name }) => {
    if (!quickQueue) {
      quickQueue = { id: socket.id, name: name || "Player 1" };
      socket.emit("queue", "Waiting for another player...");
      return;
    }
    // create room for two
    const roomCode = code();
    const room = {
      roomCode,
      players: [
        { id: quickQueue.id, name: quickQueue.name },
        { id: socket.id, name: name || "Player 2" }
      ],
      started: false,
      turnIndex: 0,
      tableCard: null
    };
    rooms.set(roomCode, room);

    io.sockets.sockets.get(quickQueue.id)?.join(roomCode);
    socket.join(roomCode);

    quickQueue = null;

    io.to(roomCode).emit("roomUpdate", getRoomPublic(room));
    startGame(room);
  });

  // play a card
  socket.on("playCard", ({ roomCode, card }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.started) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== room.turnIndex) return; // not your turn

    room.tableCard = { ...card, by: playerIndex };
    room.turnIndex = room.turnIndex === 0 ? 1 : 0;

    io.to(roomCode).emit("tableUpdate", { tableCard: room.tableCard, turnIndex: room.turnIndex });
  });

  socket.on("disconnect", () => {
    // cleanup queue
    if (quickQueue?.id === socket.id) quickQueue = null;

    // remove from any room
    for (const [roomCode, room] of rooms.entries()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(roomCode).emit("roomUpdate", getRoomPublic(room));
        room.started = false;
        room.tableCard = null;
        // if empty remove
        if (room.players.length === 0) rooms.delete(roomCode);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

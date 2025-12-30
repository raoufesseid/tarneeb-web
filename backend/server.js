const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

function makeRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("createRoom", ({ name }, cb) => {
    const roomCode = makeRoomCode();
    rooms.set(roomCode, { players: [{ id: socket.id, name }] });
    socket.join(roomCode);
    cb({ roomCode });
  });

  socket.on("joinRoom", ({ name, roomCode }, cb) => {
    const room = rooms.get(roomCode);
    if (!room) return cb({ error: "Room not found" });
    if (room.players.length >= 2) return cb({ error: "Room full" });

    room.players.push({ id: socket.id, name });
    socket.join(roomCode);
    io.to(roomCode).emit("gameStart");
    cb({ ok: true });
  });

  socket.on("quickMatch", ({ name }, cb) => {
    for (const [code, room] of rooms) {
      if (room.players.length === 1) {
        room.players.push({ id: socket.id, name });
        socket.join(code);
        io.to(code).emit("gameStart");
        return cb({ roomCode: code });
      }
    }
    const roomCode = makeRoomCode();
    rooms.set(roomCode, { players: [{ id: socket.id, name }] });
    socket.join(roomCode);
    cb({ roomCode });
  });

  socket.on("disconnect", () => {
    for (const [code, room] of rooms) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) rooms.delete(code);
    }
  });
});

app.get("/", (req, res) => {
  res.send("Tarneeb backend running");
});

server.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});

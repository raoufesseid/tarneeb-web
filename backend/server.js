const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://tarneeb-frontend.onrender.com"
  ],
  methods: ["GET", "POST"],
}));

app.get("/", (req, res) => res.send("Tarneeb backend is running ✅"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://tarneeb-frontend.onrender.com"
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = {}; // roomCode -> { roomCode, players: [{id,name}], status }

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }) => {
    if (!name) return socket.emit("errorMsg", "Enter name first");

    let code = makeCode();
    while (rooms[code]) code = makeCode();

    rooms[code] = { roomCode: code, players: [{ id: socket.id, name }], status: "waiting" };
    socket.join(code);

    socket.emit("roomCreated", { roomCode: code });
    io.to(code).emit("roomUpdate", rooms[code]);
  });

  socket.on("joinRoom", ({ name, roomCode }) => {
    const code = (roomCode || "").toUpperCase();
    if (!name) return socket.emit("errorMsg", "Enter name first");
    if (!rooms[code]) return socket.emit("errorMsg", "Room not found");

    const room = rooms[code];
    if (room.players.length >= 2) return socket.emit("errorMsg", "Room is full");

    room.players.push({ id: socket.id, name });
    socket.join(code);

    io.to(code).emit("roomUpdate", room);
    if (room.players.length === 2) io.to(code).emit("gameStart");
  });

  socket.on("quickMatch", ({ name }) => {
    if (!name) return socket.emit("errorMsg", "Enter name first");

    // find waiting room
    const code = Object.keys(rooms).find(c => rooms[c].players.length === 1);
    if (!code) {
      // create new room
      let newCode = makeCode();
      while (rooms[newCode]) newCode = makeCode();

      rooms[newCode] = { roomCode: newCode, players: [{ id: socket.id, name }], status: "waiting" };
      socket.join(newCode);

      socket.emit("roomCreated", { roomCode: newCode });
      io.to(newCode).emit("roomUpdate", rooms[newCode]);
      return;
    }

    // join existing room
    const room = rooms[code];
    room.players.push({ id: socket.id, name });
    socket.join(code);

    io.to(code).emit("roomUpdate", room);
    io.to(code).emit("gameStart");
  });

  socket.on("disconnect", () => {
    // remove player from any room
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const before = room.players.length;
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length !== before) {
        if (room.players.length === 0) delete rooms[code];
        else io.to(code).emit("roomUpdate", room);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Backend running on port", PORT));

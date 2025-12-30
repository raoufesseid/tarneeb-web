import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function App() {
  const socket = useMemo(
    () =>
      io(BACKEND_URL, {
        transports: ["websocket", "polling"],
      }),
    []
  );

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [room, setRoom] = useState(null);

  useEffect(() => {
    socket.on("connect", () => setStatus("Connected ✅"));
    socket.on("disconnect", () => setStatus("Disconnected ❌"));

    socket.on("roomCreated", ({ roomCode }) => {
      setRoomCode(roomCode);
      setStatus(`Room created: ${roomCode}`);
    });

    socket.on("roomUpdate", (r) => setRoom(r));

    socket.on("gameStart", () => setStatus("Game Ready 🎮"));

    socket.on("errorMsg", (msg) => alert(msg));

    return () => socket.disconnect();
  }, [socket]);

  const canPlay = room?.players?.length === 2;

  return (
    <div className="page">
      <div className="card">
        <h2>Tarneeb (2 Players)</h2>
        <p className="muted">
          Status: <b>{status}</b>
        </p>

        <div className="row">
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={() => socket.emit("login", { name })}
            disabled={!name.trim()}
          >
            Login
          </button>
        </div>

        <div className="row">
          <button
            onClick={() => socket.emit("quickMatch", { name })}
            disabled={!name.trim()}
          >
            🎲 Random Match
          </button>

          <button
            onClick={() => socket.emit("createRoom", { name })}
            disabled={!name.trim()}
          >
            ➕ Create Room
          </button>
        </div>

        <div className="row">
          <input
            placeholder="ROOM CODE"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={() => socket.emit("joinRoom", { name, roomCode })}
            disabled={!name.trim() || !roomCode.trim()}
          >
            Join
          </button>
        </div>

        <div className="section">
          <div>
            <b>Room:</b> {room?.roomCode || "-"}
          </div>
          <div>
            Player 1: {room?.players?.[0]?.name || "waiting"}
          </div>
          <div>
            Player 2: {room?.players?.[1]?.name || "waiting"}
          </div>
        </div>

        {/* ✅ SCORE / النتيجة */}
        <div className="scoreBox">
          <b>Score</b>
          <div className="scoreRow">
            <span>{room?.players?.[0]?.name || "P1"}</span>
            <span>{room?.score?.p1 ?? 0}</span>
          </div>
          <div className="scoreRow">
            <span>{room?.players?.[1]?.name || "P2"}</span>
            <span>{room?.score?.p2 ?? 0}</span>
          </div>
        </div>

        {/* ✅ منطقة الكروت (إذا عندك room.hand من الباك اند) */}
        {canPlay && (
          <div className="hand">
            <h3>Your Cards</h3>
            <div className="cards">
              {(room?.hands?.[socket.id] || []).map((c, idx) => (
                <button
                  key={idx}
                  className="cardBtn"
                  onClick={() => socket.emit("playCard", { roomCode: room.roomCode, card: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

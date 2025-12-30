import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

export default function App() {
  const socket = useMemo(() => io("http://localhost:4000"), []);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [room, setRoom] = useState(null);

  useEffect(() => {
    socket.on("connect", () => setStatus("Connected"));
    socket.on("roomUpdate", (r) => setRoom(r));
    socket.on("gameStart", () => setStatus("Game Ready"));
    return () => socket.disconnect();
  }, [socket]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420 }}>
        <h2>Tarneeb (2 Players)</h2>
        <p>{status}</p>

        <input
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <button style={{ width: "100%", padding: 10, marginBottom: 8 }}
          onClick={() => socket.emit("quickMatch", { name })}>
          🎲 Random Match
        </button>

        <button style={{ width: "100%", padding: 10, marginBottom: 8 }}
          onClick={() => socket.emit("createRoom", { name })}>
          ➕ Create Room
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="ROOM CODE"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            style={{ flex: 1, padding: 10 }}
          />
          <button
            onClick={() => socket.emit("joinRoom", { name, roomCode })}
            style={{ padding: 10 }}>
            Join
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <b>Room:</b> {room?.roomCode || "-"}
          <div>
            Player 1: {room?.players?.[0]?.name || "waiting"}
          </div>
          <div>
            Player 2: {room?.players?.[1]?.name || "waiting"}
          </div>
        </div>
      </div>
    </div>
  );
}

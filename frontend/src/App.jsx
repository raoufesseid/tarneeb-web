import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

function Card({ c, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 60,
        height: 90,
        borderRadius: 10,
        border: "1px solid #334",
        background: "rgba(255,255,255,0.08)",
        color: "white",
        fontWeight: "bold",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {c.r}{c.s}
    </button>
  );
}

export default function App() {
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const socket = useMemo(
    () => io(BACKEND, { transports: ["websocket"] }),
    [BACKEND]
  );

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [room, setRoom] = useState(null);

  const [hand, setHand] = useState([]);
  const [yourIndex, setYourIndex] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [tableCard, setTableCard] = useState(null);

  const [score, setScore] = useState({ p1: 0, p2: 0 });

  useEffect(() => {
    socket.on("connect", () => setStatus("Connected"));
    socket.on("gameStart", () => setStatus("Game Ready 🎮"));

    socket.on("roomCreated", ({ roomCode }) => setRoomCode(roomCode));
    socket.on("roomUpdate", (r) => {
      setRoom(r);
      if (typeof r.turnIndex === "number") setTurnIndex(r.turnIndex);
      if (r.score) setScore(r.score);
    });

    socket.on("hand", ({ hand, yourIndex }) => {
      setHand(hand);
      setYourIndex(yourIndex);
    });

    socket.on("tableUpdate", ({ tableCard, turnIndex }) => {
      setTableCard(tableCard);
      setTurnIndex(turnIndex);
    });

    socket.on("scoreUpdate", (s) => setScore(s));

    return () => socket.disconnect();
  }, [socket]);

  const canPlay = yourIndex !== null && yourIndex === turnIndex;

  function play(card) {
    if (!canPlay || !room?.roomCode) return;
    setHand((h) => h.filter((c) => !(c.r === card.r && c.s === card.s)));
    socket.emit("playCard", { roomCode: room.roomCode, card });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#0b1220",
        color: "white",
        display: "flex",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 1000 }}>
        <h1>Tarneeb (2 Players)</h1>
        <p>{status}</p>

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10 }}
          />

          <button onClick={() => socket.emit("randomMatch", { name })}>
            🎲 Random Match
          </button>

          <button onClick={() => socket.emit("createRoom", { name })}>
            ➕ Create Room
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              style={{ flex: 1, padding: 10 }}
            />
            <button onClick={() => socket.emit("joinRoom", { name, roomCode })}>
              Join
            </button>
          </div>
        </div>

        {/* Room Info */}
        <div style={{ marginTop: 20, padding: 12, background: "#111827", borderRadius: 10 }}>
          <b>Room:</b> {room?.roomCode || "-"} <br />
          <b>Players:</b>{" "}
          {room?.players?.map((p) => p.name).join(" vs ") || "-"} <br />
          <b>Your turn:</b> {canPlay ? "✅ Yes" : "⏳ No"}
        </div>

        {/* Score */}
        <div style={{ marginTop: 10, padding: 12, background: "#020617", borderRadius: 10 }}>
          <b>Score</b>
          <div>{room?.players?.[0]?.name || "P1"}: {score.p1}</div>
          <div>{room?.players?.[1]?.name || "P2"}: {score.p2}</div>
        </div>

        {/* Table */}
        <h3 style={{ marginTop: 20 }}>Table</h3>
        <div
          style={{
            height: 120,
            background: "#020617",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {tableCard ? (
            <Card c={tableCard} disabled />
          ) : (
            <span>No card played yet</span>
          )}
        </div>

        {/* Hand */}
        <h3 style={{ marginTop: 20 }}>Your Hand</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {hand.map((c, i) => (
            <Card
              key={i}
              c={c}
              disabled={!canPlay}
              onClick={() => play(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

function Card({ c, onClick, disabled }) {
  const label = `${c.r}${c.s}`;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 58,
        height: 82,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700
      }}
      title={label}
    >
      {label}
    </button>
  );
}

export default function App() {
  // ✅ مهم: في Render لازم تستخدم رابط الباك اند الحقيقي
  // حاليا خليته يقرأ من ENV وإذا مو موجود يرجع لـ localhost
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const socket = useMemo(() => io(BACKEND, { transports: ["websocket"] }), [BACKEND]);

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [room, setRoom] = useState(null);

  const [hand, setHand] = useState([]);
  const [yourIndex, setYourIndex] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [tableCard, setTableCard] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    socket.on("connect", () => setStatus("Connected"));
    socket.on("errorMsg", (m) => setMsg(m));

    socket.on("roomUpdate", (r) => {
      setRoom(r);
      if (typeof r.turnIndex === "number") setTurnIndex(r.turnIndex);
    });

    socket.on("roomCreated", ({ roomCode }) => {
      setRoomCode(roomCode);
      setMsg(`Room code: ${roomCode}`);
    });

    socket.on("hand", ({ hand, yourIndex }) => {
      setHand(hand);
      setYourIndex(yourIndex);
    });

    socket.on("tableUpdate", ({ tableCard, turnIndex }) => {
      setTableCard(tableCard);
      setTurnIndex(turnIndex);
    });

    socket.on("gameStart", () => setStatus("Game Ready"));

    return () => socket.disconnect();
  }, [socket]);

  const canPlay = yourIndex !== null && turnIndex === yourIndex;

  function play(c) {
    if (!room?.roomCode) return;
    if (!canPlay) return;
    // remove from local hand
    setHand((h) => h.filter((x, i) => !(x.r === c.r && x.s === c.s)));
    socket.emit("playCard", { roomCode: room.roomCode, card: c });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 520 }}>
        <h2 style={{ margin: 0 }}>Tarneeb (2 Players)</h2>
        <p style={{ opacity: 0.8, marginTop: 6 }}>{status} • Backend: {BACKEND}</p>
        {msg && <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 10, marginBottom: 10 }}>{msg}</div>}

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "white" }}
          />

          <button style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: "#1f6feb", color: "white", fontWeight: 700 }}
            onClick={() => socket.emit("quickMatch", { name })}>
            🎲 Random Match
          </button>

          <button style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.10)", color: "white", fontWeight: 700 }}
            onClick={() => socket.emit("createRoom", { name })}>
            ➕ Create Room
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "white" }}
            />
            <button
              onClick={() => socket.emit("joinRoom", { name, roomCode })}
              style={{ padding: 10, borderRadius: 10, border: "none", background: "#22c55e", color: "white", fontWeight: 800 }}>
              Join
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.06)" }}>
          <b>Room:</b> {room?.roomCode || "-"} <br />
          <b>Players:</b> {room?.players?.map(p => p.name).join(" vs ") || "-"} <br />
          <b>Your turn?</b> {canPlay ? "✅ Yes" : "⏳ No"}
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Table</h3>
          <div style={{ opacity: 0.8 }}>Turn: Player {turnIndex + 1}</div>
        </div>

        <div style={{ marginTop: 8, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110 }}>
          {tableCard ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.8, marginBottom: 6 }}>Played by Player {tableCard.by + 1}</div>
              <Card c={tableCard} disabled />
            </div>
          ) : (
            <div style={{ opacity: 0.7 }}>No card played yet</div>
          )}
        </div>

        <h3 style={{ marginTop: 16 }}>Your Hand (13)</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {hand.map((c, idx) => (
            <Card key={idx} c={c} disabled={!canPlay} onClick={() => play(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}

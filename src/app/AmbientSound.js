"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const YT_VIDEOS = {
  natureza: "vgqQSVFch44",
  chuva: "y4h_4NIOxuY",
  foco_432hz: "JaB7SW_WCYI",
  foco_ruido: "nMfPqeZjc2c",
  urbano_cafe: "Mckcmh-OU5M",
  urbano_noturno: "wAPCSnAhhC8",
};

const CATEGORIES = [
  { id: "natureza", label: "🌿 Natureza" },
  { id: "chuva", label: "🌧️ Chuva" },
  {
    id: "foco",
    label: "🎯 Foco",
    subs: [
      { id: "foco_432hz", label: "🔔 432Hz" },
      { id: "foco_ruido", label: "〰️ R. Branco" },
    ],
  },
  {
    id: "urbano",
    label: "🏙️ Urbano",
    subs: [
      { id: "urbano_cafe", label: "☕ Lo-fi Café" },
      { id: "urbano_noturno", label: "🌙 Lo-fi Not." },
    ],
  },
];

function getTrackLabel(trackId) {
  if (!trackId) return "";
  const flat = CATEGORIES.flatMap((c) => c.subs || [{ id: c.id, label: c.label }]);
  return flat.find((t) => t.id === trackId)?.label || trackId;
}

const btnCat = {
  border: "none",
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  outline: "none",
  whiteSpace: "nowrap",
};

const btnSub = {
  border: "none",
  borderRadius: 6,
  padding: "3px 8px",
  fontSize: 10,
  fontWeight: 500,
  cursor: "pointer",
  outline: "none",
  whiteSpace: "nowrap",
};

export default function AmbientSound() {
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [playerReady, setPlayerReady] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const apiLoadedRef = useRef(false);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const getTrackId = useCallback(() => {
    if (!category) return null;
    if (category === "natureza" || category === "chuva") return category;
    if ((category === "foco" || category === "urbano") && subcategory) return subcategory;
    return null;
  }, [category, subcategory]);

  // Carregar YouTube IFrame API
  useEffect(() => {
    if (typeof window.YT === "undefined" && !apiLoadedRef.current) {
      apiLoadedRef.current = true;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // Criar/destruir player ao trocar de faixa
  useEffect(() => {
    const trackId = getTrackId();
    if (!trackId) return;
    const videoId = YT_VIDEOS[trackId];
    if (!videoId) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setPlayerReady(false);
    setPlaying(false);
    setPendingPlay(false);

    let cancelled = false;

    const tryCreate = () => {
      if (cancelled) return;
      if (typeof window.YT === "undefined" || !window.YT.Player) {
        setTimeout(tryCreate, 300);
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-sound-" + trackId + "-" + Date.now();
      container.appendChild(div);

      playerRef.current = new window.YT.Player(div.id, {
        videoId,
        height: "0",
        width: "0",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          modestbranding: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current?.setVolume(volumeRef.current);
            setPlayerReady(true);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
            else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) setPlaying(false);
          },
        },
      });
    };

    tryCreate();
    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [getTrackId]);

  // Pending play auto-trigger quando player ficar pronto
  useEffect(() => {
    if (pendingPlay && playerReady && playerRef.current) {
      setPendingPlay(false);
      playerRef.current.playVideo();
    }
  }, [pendingPlay, playerReady]);

  // Sincronizar volume
  useEffect(() => {
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(volume);
    }
  }, [volume, playerReady]);

  const handlePlay = () => {
    if (playerRef.current && playerReady) {
      playerRef.current.playVideo();
    } else {
      setPendingPlay(true);
    }
  };

  const handlePause = () => {
    if (playerRef.current && playerReady) {
      playerRef.current.pauseVideo();
    }
  };

  const selectCategory = (catId) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    if (cat.subs) {
      setCategory((prev) => (prev === catId ? null : catId));
      setSubcategory(null);
    } else {
      setCategory((prev) => (prev === catId ? null : catId));
      setSubcategory(null);
    }
  };

  const selectSub = (subId) => {
    setSubcategory(subId);
  };

  const trackId = getTrackId();
  const resolvedCat = CATEGORIES.find((c) => c.id === category);
  const needsSub = resolvedCat?.subs && !subcategory;
  const showPlayback = !!trackId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {/* Labels */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#60a5fa", fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
          🔊 SOM AMBIENTE
        </span>
        {!category && (
          <span style={{ color: "#475569", fontSize: 10, fontWeight: 400 }}>
            — escolha uma categoria para ouvir
          </span>
        )}
      </div>

      {/* Categorias */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              className="btn-hover"
              style={{
                ...btnCat,
                background: isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
                border: isActive ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                color: isActive ? "#93c5fd" : "#64748b",
              }}
            >
              {cat.label}
              {cat.subs && (
                <span style={{ marginLeft: 3, fontSize: 8, color: isActive ? "#60a5fa" : "#475569" }}>
                  {isActive ? "▼" : "▸"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subcategorias (Foco / Urbano) */}
      {needsSub && (
        <div style={{ display: "flex", gap: 6, paddingLeft: 4 }}>
          {resolvedCat.subs.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSub(s.id)}
              className="btn-hover"
              style={{
                ...btnSub,
                background: subcategory === s.id ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                border: subcategory === s.id ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent",
                color: subcategory === s.id ? "#93c5fd" : "#64748b",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Playback controls (aparece quando uma faixa esta selecionada) */}
      {showPlayback && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 2 }}>
          <button
            onClick={playing ? handlePause : handlePlay}
            className="btn-hover"
            style={{
              ...btnCat,
              background: playing ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              border: playing ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.2)",
              color: playing ? "#f87171" : "#4ade80",
              fontSize: 10,
              padding: "4px 10px",
            }}
          >
            {playing ? "⏸ Pausar" : pendingPlay ? "⏳ Preparando..." : "▶ Tocar"}
          </button>

          <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
            {getTrackLabel(trackId)}
          </span>

          {playing && (
            <span style={{ color: "#22c55e", fontSize: 9, fontWeight: 600, letterSpacing: 0.5, animation: "pulse 1.5s ease-in-out infinite" }}>
              ●
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <span style={{ color: "#64748b", fontSize: 9 }}>🔉</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ width: 56, height: 4, cursor: "pointer", accentColor: "#3b82f6" }}
            />
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ display: "none" }} />
    </div>
  );
}

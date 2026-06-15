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
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [ytReady, setYtReady] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (typeof window.YT !== "undefined" && window.YT.Player) {
      setYtReady(true);
      return;
    }
    window.onYouTubeIframeAPIReady = () => {
      setYtReady(true);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  const destroyPlayer = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    setPlaying(false);
  }, []);

  const getTrackId = useCallback(() => {
    if (!category) return null;
    if (category === "natureza" || category === "chuva") return category;
    if ((category === "foco" || category === "urbano") && subcategory) return subcategory;
    return null;
  }, [category, subcategory]);

  const handlePlay = () => {
    const trackId = getTrackId();
    if (!trackId) return;
    const videoId = YT_VIDEOS[trackId];
    if (!videoId) return;

    if (playerRef.current && playerRef.current.__trackId === trackId) {
      try { playerRef.current.playVideo(); } catch {}
      setPlaying(true);
      return;
    }

    destroyPlayer();

    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    const divId = "yt-player-" + trackId + "-" + Date.now();
    const div = document.createElement("div");
    div.id = divId;
    container.appendChild(div);

    // Player criado sincronamente dentro do click handler (autoplay permitido)
    const p = new window.YT.Player(divId, {
      videoId,
      height: "0",
      width: "0",
      playerVars: {
        autoplay: 1,
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
          p.setVolume(volumeRef.current);
          setPlaying(true);
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
          else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) setPlaying(false);
        },
      },
    });
    p.__trackId = trackId;
    playerRef.current = p;
  };

  const handlePause = () => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
      playerRef.current.pauseVideo();
    }
  };

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const selectCategory = (catId) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    if (category === catId) {
      setCategory(null);
      destroyPlayer();
    } else {
      destroyPlayer();
      setCategory(catId);
      setSubcategory(null);
    }
  };

  const selectSub = (subId) => {
    destroyPlayer();
    setSubcategory(subId);
  };

  const trackId = getTrackId();
  const resolvedCat = CATEGORIES.find((c) => c.id === category);
  const needsSub = resolvedCat?.subs && !subcategory;
  const showPlayback = !!trackId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {/* Cabecalho colapsavel */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="btn-hover"
        style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          userSelect: "none", padding: "2px 0",
        }}
      >
        <span style={{ color: "#64748b", fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
          🔊 SOM AMBIENTE
        </span>
        {playing && (
          <span style={{ color: "#22c55e", fontSize: 9, fontWeight: 600, letterSpacing: 0.5, animation: "pulse 1.5s ease-in-out infinite" }}>
            ● Tocando
          </span>
        )}
        <span style={{ color: "#475569", fontSize: 9, marginLeft: "auto" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <>
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
                    background: isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.04)",
                    color: isActive ? "#f1f5f9" : "#64748b",
                  }}
                >
                  {cat.label}
                  {cat.subs && (
                    <span style={{ marginLeft: 3, fontSize: 8 }}>
                      {isActive ? "▼" : "▸"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subcategorias */}
          {needsSub && (
            <div style={{ display: "flex", gap: 6, paddingLeft: 4 }}>
              {resolvedCat.subs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSub(s.id)}
                  className="btn-hover"
                  style={{
                    ...btnSub,
                    background: subcategory === s.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border: subcategory === s.id ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                    color: subcategory === s.id ? "#f1f5f9" : "#64748b",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Playback */}
          {showPlayback && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={playing ? handlePause : handlePlay}
                disabled={!ytReady}
                className="btn-hover"
                style={{
                  ...btnCat,
                  opacity: ytReady ? 1 : 0.5,
                  background: playing ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                  border: playing ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.25)",
                  color: playing ? "#f87171" : "#4ade80",
                  fontSize: 10,
                  padding: "4px 10px",
                }}
              >
                {!ytReady ? "⏳" : playing ? "⏸ Pausar" : "▶ Tocar"}
              </button>

              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
                {getTrackLabel(trackId)}
              </span>

              {!ytReady && (
                <span style={{ color: "#f59e0b", fontSize: 9, fontWeight: 500 }}>
                  Carregando player...
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
        </>
      )}

      <div ref={containerRef} style={{ display: "none" }} />
    </div>
  );
}

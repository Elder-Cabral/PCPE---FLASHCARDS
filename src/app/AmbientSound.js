"use client";
import { useState, useEffect, useRef } from "react";

const YT_VIDEOS = {
  natureza: "Xv2NElOHo-0",
  chuva: "mPZkdNFkNps",
  foco_432hz: "RYcaG64JkqM",
  foco_ruido: "nMfPqeZjc2c",
  urbano_cafe: "Y9mRoCerrpY",
  urbano_noturno: "s6XIt0vUq6A",
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

export default function AmbientSound({ isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [playerMode, setPlayerMode] = useState(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const volumeRef = useRef(volume);
  const playerModeRef = useRef(playerMode);
  volumeRef.current = volume;
  playerModeRef.current = playerMode;

  function getTrackId() {
    if (!category) return null;
    if (category === "natureza" || category === "chuva") return category;
    if ((category === "foco" || category === "urbano") && subcategory) return subcategory;
    return null;
  }

  // ── Carrega YouTube IFrame API com fallback para embed ──
  useEffect(() => {
    let cancelled = false;
    let poll;
    const timeout = setTimeout(() => {
      if (poll) clearInterval(poll);
      if (!cancelled && !playerModeRef.current) setPlayerMode("embed");
    }, 10000);

    function onApiReady() {
      if (!cancelled) setPlayerMode("api");
    }

    if (typeof window.YT !== "undefined" && typeof window.YT.Player === "function") {
      clearTimeout(timeout);
      onApiReady();
      return;
    }

    window.onYouTubeIframeAPIReady = onApiReady;

    poll = setInterval(() => {
      if (typeof window.YT !== "undefined" && typeof window.YT.Player === "function") {
        clearInterval(poll);
        clearTimeout(timeout);
        onApiReady();
      }
    }, 300);

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cria player via YT.Player ──
  function createApiPlayer(trackId, videoId) {
    const container = containerRef.current;
    if (!container) return null;
    container.innerHTML = "";
    const divId = "yt-player-" + trackId + "-" + Date.now();
    const div = document.createElement("div");
    div.id = divId;
    container.appendChild(div);

    const p = new window.YT.Player(divId, {
      videoId,
      height: "0",
      width: "0",
      host: "https://www.youtube.com",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        modestbranding: 1,
        loop: 1,
        playlist: videoId,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
      },
      events: {
        onReady: () => {
          p.setVolume(volumeRef.current);
          try { p.playVideo(); } catch (err) {}
          setPlaying(true);
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
          else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) setPlaying(false);
        },
      },
    });
    p.__trackId = trackId;
    return p;
  }

  // ── Cria player via iframe embed (fallback sem API) ──
  function createEmbedPlayer(trackId, videoId) {
    const container = containerRef.current;
    if (!container) return null;
    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src =
      "https://www.youtube.com/embed/" +
      videoId +
      "?autoplay=1&controls=0&loop=1&playlist=" +
      videoId +
      "&modestbranding=1&fs=0" +
      "&origin=" + encodeURIComponent(window.location.origin);
    iframe.allow = "autoplay; encrypted-media";
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.__trackId = trackId;
    container.appendChild(iframe);
    return iframe;
  }

  function destroyPlayer() {
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.destroy === "function") playerRef.current.destroy();
        else playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
    setPlaying(false);
  }

  function handlePlay() {
    const trackId = getTrackId();
    if (!trackId) return;
    const videoId = YT_VIDEOS[trackId];
    if (!videoId) return;

    if (playerRef.current && playerRef.current.__trackId === trackId) {
      if (typeof playerRef.current.playVideo === "function") {
        try { playerRef.current.playVideo(); } catch {}
      } else {
        destroyPlayer();
        playerRef.current = null;
      }
      setPlaying(true);
      return;
    }

    destroyPlayer();

    let p;
    if (playerMode === "api") {
      p = createApiPlayer(trackId, videoId);
    } else {
      p = createEmbedPlayer(trackId, videoId);
    }

    if (p) {
      playerRef.current = p;
      if (playerMode !== "api") setPlaying(true);
    }
  }

  function handlePause() {
    if (!playerRef.current) return;
    if (typeof playerRef.current.pauseVideo === "function") {
      try { playerRef.current.pauseVideo(); } catch {}
    } else if (playerRef.current.remove) {
      playerRef.current.remove();
      playerRef.current = null;
    }
    setPlaying(false);
  }

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  function selectCategory(catId) {
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
  }

  function selectSub(subId) {
    destroyPlayer();
    setSubcategory(subId);
  }

  const trackId = getTrackId();
  const resolvedCat = CATEGORIES.find((c) => c.id === category);
  const needsSub = resolvedCat?.subs && !subcategory;
  const showPlayback = !!trackId;
  const loading = playerMode === null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", position: "relative" }}>
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
                    fontSize: isMobile ? 10 : 11,
                    padding: isMobile ? "4px 8px" : "5px 10px",
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

          {needsSub && (
            <div style={{ display: "flex", gap: 6, paddingLeft: 4 }}>
              {resolvedCat.subs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSub(s.id)}
                  className="btn-hover"
                  style={{
                    ...btnSub,
                    fontSize: isMobile ? 9 : 10,
                    padding: isMobile ? "2px 6px" : "3px 8px",
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

          {showPlayback && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={playing ? handlePause : handlePlay}
                disabled={loading}
                className="btn-hover"
                style={{
                  ...btnCat,
                  opacity: loading ? 0.5 : 1,
                  background: playing ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                  border: playing ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.25)",
                  color: playing ? "#f87171" : "#4ade80",
                  fontSize: 10,
                  padding: "4px 10px",
                }}
              >
                {loading ? "⏳" : playing ? "⏸ Pausar" : "▶ Tocar"}
              </button>

              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
                {getTrackLabel(trackId)}
              </span>

              {loading && (
                <span style={{ color: "#f59e0b", fontSize: 9, fontWeight: 500 }}>
                  Carregando player...
                </span>
              )}

              {playerMode === "embed" && !loading && (
                <span style={{ color: "#64748b", fontSize: 8, fontWeight: 400 }}>
                  (embed)
                </span>
              )}

              {playerMode === "api" && (
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
              )}
            </div>
          )}
        </>
      )}

      <div ref={containerRef} style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

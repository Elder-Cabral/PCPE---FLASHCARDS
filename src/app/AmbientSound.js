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
  { id: "natureza", label: "🌿  Natureza" },
  { id: "chuva", label: "🌧️  Chuva" },
  {
    id: "foco",
    label: "🎯  Foco",
    subs: [
      { id: "foco_432hz", label: "🔔  432Hz" },
      { id: "foco_ruido", label: "〰️  R. Branco" },
    ],
  },
  {
    id: "urbano",
    label: "🏙️  Urbano",
    subs: [
      { id: "urbano_cafe", label: "☕  Lo-fi Café" },
      { id: "urbano_noturno", label: "🌙  Lo-fi Not." },
    ],
  },
];

const btnBase = {
  border: "none",
  borderRadius: 8,
  padding: "4px 9px",
  fontSize: 10,
  fontWeight: 600,
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
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const apiLoadedRef = useRef(false);
  const currentTrackRef = useRef(null);

  const getTrackId = useCallback(() => {
    if (!category) return null;
    if (category === "natureza" || category === "chuva") return category;
    if ((category === "foco" || category === "urbano") && subcategory) return subcategory;
    return null;
  }, [category, subcategory]);

  // Carregar YouTube IFrame API uma vez
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
      setPlayerReady(false);
      setPlaying(false);
    }

    let cancelled = false;
    currentTrackRef.current = trackId;

    const tryCreate = () => {
      if (cancelled) return;
      if (typeof window.YT === "undefined" || !window.YT.Player) {
        setTimeout(tryCreate, 300);
        return;
      }

      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = "";

      const divId = "yt-player-" + trackId + "-" + Date.now();
      const div = document.createElement("div");
      div.id = divId;
      container.appendChild(div);

      playerRef.current = new window.YT.Player(divId, {
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
            if (!cancelled) {
              playerRef.current?.setVolume(volume);
              setPlayerReady(true);
            }
          },
          onStateChange: (e) => {
            if (!cancelled) {
              if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
              else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) setPlaying(false);
            }
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

  // Sincronizar volume
  useEffect(() => {
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(volume);
    }
  }, [volume, playerReady]);

  const handlePlay = () => {
    if (playerRef.current && playerReady) {
      playerRef.current.playVideo();
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
      if (category === catId) {
        setCategory(null);
        setSubcategory(null);
      } else {
        setCategory(catId);
        setSubcategory(null);
      }
    } else {
      if (category === catId) {
        setCategory(null);
      } else {
        setCategory(catId);
        setSubcategory(null);
      }
    }
  };

  const selectSub = (subId) => {
    setSubcategory(subId);
  };

  const trackId = getTrackId();
  const hasSelection = !!trackId;

  return (
    <>
      <span
        style={{
          color: "#64748b",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: 0.5,
          userSelect: "none",
        }}
      >
        🔊
      </span>

      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => selectCategory(cat.id)}
          className="btn-hover"
          style={{
            ...btnBase,
            background:
              category === cat.id
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.02)",
            border:
              category === cat.id
                ? "1px solid rgba(255,255,255,0.15)"
                : "1px solid rgba(255,255,255,0.04)",
            color: category === cat.id ? "#f1f5f9" : "#64748b",
          }}
        >
          {cat.label}
        </button>
      ))}

      {/* Subcategorias de Foco */}
      {category === "foco" && (
        <>
          {CATEGORIES.find((c) => c.id === "foco").subs.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSub(s.id)}
              className="btn-hover"
              style={{
                ...btnBase,
                padding: "2px 7px",
                fontSize: 9,
                background:
                  subcategory === s.id
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.02)",
                border:
                  subcategory === s.id
                    ? "1px solid rgba(255,255,255,0.15)"
                    : "1px solid transparent",
                color: subcategory === s.id ? "#f1f5f9" : "#64748b",
              }}
            >
              {s.label}
            </button>
          ))}
        </>
      )}

      {/* Subcategorias de Urbano */}
      {category === "urbano" && (
        <>
          {CATEGORIES.find((c) => c.id === "urbano").subs.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSub(s.id)}
              className="btn-hover"
              style={{
                ...btnBase,
                padding: "2px 7px",
                fontSize: 9,
                background:
                  subcategory === s.id
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.02)",
                border:
                  subcategory === s.id
                    ? "1px solid rgba(255,255,255,0.15)"
                    : "1px solid transparent",
                color: subcategory === s.id ? "#f1f5f9" : "#64748b",
              }}
            >
              {s.label}
            </button>
          ))}
        </>
      )}

      {/* Play/Pause + Volume */}
      {hasSelection && (
        <>
          <button
            onClick={playing ? handlePause : handlePlay}
            className="btn-hover"
            style={{
              ...btnBase,
              background: playing
                ? "rgba(239,68,68,0.12)"
                : playerReady
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(255,255,255,0.04)",
              border: playing
                ? "1px solid rgba(239,68,68,0.2)"
                : "1px solid rgba(255,255,255,0.08)",
              color: playing ? "#f87171" : playerReady ? "#4ade80" : "#475569",
            }}
          >
            {playing ? "⏸" : playerReady ? "▶" : "⏳"}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              width: 48,
              height: 4,
              cursor: "pointer",
              accentColor: "#3b82f6",
            }}
            title={`Volume: ${volume}%`}
          />

          {!playerReady && (
            <span
              style={{
                color: "#f59e0b",
                fontSize: 9,
                fontWeight: 500,
              }}
            >
              ▶ Clique para iniciar
            </span>
          )}
        </>
      )}

      <div ref={containerRef} style={{ display: "none" }} />
    </>
  );
}

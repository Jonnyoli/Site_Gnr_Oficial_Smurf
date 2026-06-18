import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ExternalLink,
  History,
  Library,
  Link2,
  Loader2,
  Minimize2,
  Music2,
  Pause,
  Play,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from "lucide-react";

import {
  AUDIO_SOURCES,
  type AudioSource,
  type SpotifyAudioSource,
  type YoutubeAudioSource,
} from "@/config/audioSources";

const STORAGE_KEY =
  "gnr-global-audio-player:v10.3";

const SPOTIFY_HISTORY_KEY =
  "gnr-player-spotify-history-v10.3";

type PlayerTab =
  | "library"
  | "youtube"
  | "spotify";

type StoredState = {
  sourceId?: string;
  volume?: number;
  muted?: boolean;
};

type YoutubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
};

type ParsedSpotifyLink = {
  type: string;
  id: string;
  embedUrl: string;
  externalUrl: string;
};

function readStoredState(): StoredState {
  try {
    return JSON.parse(
      window.localStorage.getItem(
        STORAGE_KEY,
      ) || "{}",
    );
  } catch {
    return {};
  }
}

function writeStoredState(
  value: StoredState,
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {
    // ignore
  }
}

function readSpotifyHistory(): SpotifyAudioSource[] {
  try {
    return JSON.parse(
      window.localStorage.getItem(
        SPOTIFY_HISTORY_KEY,
      ) || "[]",
    );
  } catch {
    return [];
  }
}

function saveSpotifyHistory(
  source: SpotifyAudioSource,
) {
  const next =
    [
      source,
      ...readSpotifyHistory().filter(
        (item) =>
          item.externalUrl !==
          source.externalUrl,
      ),
    ].slice(0, 10);

  try {
    window.localStorage.setItem(
      SPOTIFY_HISTORY_KEY,
      JSON.stringify(next),
    );
  } catch {
    // ignore
  }

  return next;
}

function spotifyLinkToEmbed(
  rawValue: string,
): ParsedSpotifyLink | null {
  const value =
    rawValue.trim();

  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(value);

    if (
      !url.hostname.includes(
        "spotify.com",
      )
    ) {
      return null;
    }

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    let type =
      parts[0];

    let id =
      parts[1];

    if (
      parts[0] === "embed" &&
      parts.length >= 3
    ) {
      type =
        parts[1];

      id =
        parts[2];
    }

    const allowed =
      new Set([
        "track",
        "album",
        "playlist",
        "artist",
        "show",
        "episode",
      ]);

    if (
      !type ||
      !id ||
      !allowed.has(type)
    ) {
      return null;
    }

    const cleanId =
      id.split("?")[0];

    return {
      type,
      id:
        cleanId,
      embedUrl:
        `https://open.spotify.com/embed/${type}/${cleanId}?utm_source=generator`,
      externalUrl:
        `https://open.spotify.com/${type}/${cleanId}`,
    };
  } catch {
    return null;
  }
}

function spotifyTypeLabel(
  type: string,
) {
  switch (type) {
    case "track":
      return "Música Spotify";
    case "album":
      return "Álbum Spotify";
    case "playlist":
      return "Playlist Spotify";
    case "artist":
      return "Artista Spotify";
    case "show":
      return "Podcast Spotify";
    case "episode":
      return "Episódio Spotify";
    default:
      return "Spotify";
  }
}

function youtubeSourceFromResult(
  result: YoutubeSearchResult,
): YoutubeAudioSource {
  return {
    id:
      `youtube-${result.videoId}`,
    type:
      "youtube",
    title:
      result.title,
    subtitle:
      result.channelTitle,
    videoId:
      result.videoId,
    externalUrl:
      `https://www.youtube.com/watch?v=${result.videoId}`,
    artwork:
      result.thumbnail,
  };
}

function sourceIcon(
  source: AudioSource,
) {
  if (source.type === "youtube") {
    return Youtube;
  }

  if (source.type === "spotify") {
    return Music2;
  }

  return Radio;
}

function sourceArtwork(
  source: AudioSource,
) {
  if (
    source.type === "youtube" ||
    source.type === "spotify"
  ) {
    return source.artwork;
  }

  return "/gnr_logo.png";
}

function Equalizer({
  active,
}: {
  active: boolean;
}) {
  return (
    <div className="flex h-4 items-end gap-[2px]">
      {[0, 1, 2, 3].map(
        (bar) => (
          <span
            key={bar}
            className={`w-[2px] rounded-full bg-primary ${
              active
                ? "animate-pulse"
                : "h-1 opacity-25"
            }`}
            style={
              active
                ? {
                    height:
                      `${6 + bar * 2}px`,
                    animationDelay:
                      `${bar * 120}ms`,
                  }
                : undefined
            }
          />
        ),
      )}
    </div>
  );
}

export default function GlobalAudioPlayer() {
  const stored =
    useMemo(
      () =>
        typeof window !== "undefined"
          ? readStoredState()
          : {},
      [],
    );

  const [
    library,
    setLibrary,
  ] =
    useState<AudioSource[]>(() => {
      const spotifyHistory =
        typeof window !== "undefined"
          ? readSpotifyHistory()
          : [];

      const combined = [
        ...spotifyHistory,
        ...AUDIO_SOURCES,
      ];

      const unique =
        new Map<string, AudioSource>();

      combined.forEach((source) =>
        unique.set(
          source.id,
          source,
        ),
      );

      return Array.from(
        unique.values(),
      );
    });

  const [
    sourceIndex,
    setSourceIndex,
  ] =
    useState(() => {
      const index =
        AUDIO_SOURCES.findIndex(
          (source) =>
            source.id ===
            stored.sourceId,
        );

      return index >= 0
        ? index
        : 0;
    });

  const [
    expanded,
    setExpanded,
  ] =
    useState(false);

  const [
    minimized,
    setMinimized,
  ] =
    useState(false);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<PlayerTab>("library");

  const [
    playing,
    setPlaying,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    frameReady,
    setFrameReady,
  ] =
    useState(false);

  const [
    muted,
    setMuted,
  ] =
    useState(
      stored.muted === true,
    );

  const [
    volume,
    setVolume,
  ] =
    useState(
      typeof stored.volume === "number"
        ? stored.volume
        : 0.45,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    youtubeQuery,
    setYoutubeQuery,
  ] =
    useState("");

  const [
    youtubeResults,
    setYoutubeResults,
  ] =
    useState<YoutubeSearchResult[]>(
      [],
    );

  const [
    searchingYoutube,
    setSearchingYoutube,
  ] =
    useState(false);

  const [
    spotifyInput,
    setSpotifyInput,
  ] =
    useState("");

  const [
    spotifyError,
    setSpotifyError,
  ] =
    useState("");

  const [
    spotifyHistory,
    setSpotifyHistory,
  ] =
    useState<SpotifyAudioSource[]>(() =>
      typeof window !== "undefined"
        ? readSpotifyHistory()
        : [],
    );

  const [
    iframeKey,
    setIframeKey,
  ] =
    useState(0);

  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const youtubeFrameRef =
    useRef<HTMLIFrameElement | null>(
      null,
    );

  const currentSource =
    library[sourceIndex] ||
    library[0] ||
    AUDIO_SOURCES[0];

  const CurrentIcon =
    sourceIcon(currentSource);

  const isRadio =
    currentSource.type === "radio";

  const isYoutube =
    currentSource.type === "youtube";

  const isSpotify =
    currentSource.type === "spotify";

  const artwork =
    sourceArtwork(currentSource);

  const youtubeEmbedUrl =
    isYoutube
      ? [
          `https://www.youtube.com/embed/${currentSource.videoId}`,
          "?enablejsapi=1",
          "&playsinline=1",
          "&controls=1",
          "&rel=0",
          "&modestbranding=1",
          `&origin=${encodeURIComponent(window.location.origin)}`,
        ].join("")
      : "";

  const spotifyEmbedUrl =
    isSpotify
      ? currentSource.embedUrl
      : "";

  useEffect(() => {
    const audio =
      new Audio();

    audio.preload =
      "none";

    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
      setError("");
    };

    const onPause = () => {
      setPlaying(false);
      setLoading(false);
    };

    const onWaiting = () => {
      setLoading(true);
    };

    const onCanPlay = () => {
      setLoading(false);
    };

    const onError = () => {
      setPlaying(false);
      setLoading(false);
      setError(
        "Não foi possível carregar esta rádio.",
      );
    };

    audio.addEventListener(
      "play",
      onPlay,
    );

    audio.addEventListener(
      "pause",
      onPause,
    );

    audio.addEventListener(
      "waiting",
      onWaiting,
    );

    audio.addEventListener(
      "canplay",
      onCanPlay,
    );

    audio.addEventListener(
      "error",
      onError,
    );

    audioRef.current =
      audio;

    return () => {
      audio.pause();
      audio.src = "";

      audio.removeEventListener(
        "play",
        onPlay,
      );

      audio.removeEventListener(
        "pause",
        onPause,
      );

      audio.removeEventListener(
        "waiting",
        onWaiting,
      );

      audio.removeEventListener(
        "canplay",
        onCanPlay,
      );

      audio.removeEventListener(
        "error",
        onError,
      );

      audioRef.current =
        null;
    };
  }, []);

  useEffect(() => {
    writeStoredState({
      sourceId:
        currentSource?.id,
      volume,
      muted,
    });
  }, [
    currentSource?.id,
    volume,
    muted,
  ]);

  useEffect(() => {
    const audio =
      audioRef.current;

    if (audio) {
      audio.volume =
        Math.min(
          1,
          Math.max(
            0,
            volume,
          ),
        );

      audio.muted =
        muted;
    }

    if (isYoutube) {
      sendYoutubeCommand(
        "setVolume",
        [
          Math.round(
            volume * 100,
          ),
        ],
      );

      sendYoutubeCommand(
        muted
          ? "mute"
          : "unMute",
      );
    }
  }, [
    volume,
    muted,
    isYoutube,
    frameReady,
  ]);

  function openPlayer(
    tab?: PlayerTab,
  ) {
    setExpanded(true);
    setMinimized(false);

    if (tab) {
      setActiveTab(tab);
    }
  }

  function compactPlayer() {
    setExpanded(false);
    setMinimized(false);
  }

  function minimizePlayer() {
    setExpanded(false);
    setMinimized(true);
  }

  function sendYoutubeCommand(
    command: string,
    args: unknown[] = [],
  ) {
    const frame =
      youtubeFrameRef.current;

    if (
      !frame?.contentWindow
    ) {
      return;
    }

    frame.contentWindow.postMessage(
      JSON.stringify({
        event:
          "command",
        func:
          command,
        args,
      }),
      "*",
    );
  }

  function stopAll() {
    audioRef.current?.pause();

    sendYoutubeCommand(
      "pauseVideo",
    );

    setPlaying(false);
    setLoading(false);
  }

  async function playRadio() {
    if (!isRadio) {
      return;
    }

    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    if (!currentSource.src) {
      openPlayer("library");
      setError(
        "O stream direto desta rádio ainda não está configurado.",
      );
      return;
    }

    try {
      setLoading(true);

      if (
        audio.src !==
        currentSource.src
      ) {
        audio.src =
          currentSource.src;

        audio.load();
      }

      await audio.play();
    } catch {
      setLoading(false);
      setError(
        "O navegador bloqueou ou não conseguiu carregar esta rádio.",
      );
    }
  }

  function playYoutube() {
    if (!isYoutube) {
      return;
    }

    setError("");

    if (!frameReady) {
      setLoading(true);
      setIframeKey(
        (previous) =>
          previous + 1,
      );
      return;
    }

    sendYoutubeCommand(
      "playVideo",
    );

    setPlaying(true);
    setLoading(false);
  }

  function handleYoutubeLoad() {
    setFrameReady(true);
    setLoading(false);

    window.setTimeout(
      () => {
        sendYoutubeCommand(
          "setVolume",
          [
            Math.round(
              volume * 100,
            ),
          ],
        );

        sendYoutubeCommand(
          muted
            ? "mute"
            : "unMute",
        );
      },
      250,
    );
  }

  function togglePlayback() {
    if (playing) {
      stopAll();
      return;
    }

    if (isYoutube) {
      playYoutube();
      return;
    }

    if (isSpotify) {
      openPlayer("spotify");
      setPlaying(true);
      setLoading(false);
      setError("");
      setSpotifyError("");
      return;
    }

    void playRadio();
  }

  function selectSourceByIndex(
    nextIndex: number,
    autoPlay = false,
  ) {
    const nextSource =
      library[nextIndex];

    if (!nextSource) {
      return;
    }

    stopAll();
    setError("");
    setSpotifyError("");
    setSourceIndex(nextIndex);

    if (
      nextSource.type === "youtube"
    ) {
      setFrameReady(false);
      setIframeKey(
        (previous) =>
          previous + 1,
      );
    }

    if (
      nextSource.type === "spotify"
    ) {
      setActiveTab("spotify");
    }

    if (autoPlay) {
      window.setTimeout(
        () => {
          if (
            nextSource.type === "radio"
          ) {
            void playRadio();
          } else if (
            nextSource.type === "youtube"
          ) {
            playYoutube();
          } else {
            setPlaying(true);
          }
        },
        120,
      );
    }
  }

  function changeSource(
    direction: -1 | 1,
  ) {
    const nextIndex =
      (
        sourceIndex +
        direction +
        library.length
      ) %
      library.length;

    selectSourceByIndex(
      nextIndex,
      playing,
    );
  }

  function setSource(
    source: AudioSource,
    autoPlay = true,
  ) {
    setLibrary((previous) => {
      const existingIndex =
        previous.findIndex(
          (item) =>
            item.id === source.id,
        );

      if (existingIndex >= 0) {
        window.setTimeout(
          () =>
            selectSourceByIndex(
              existingIndex,
              autoPlay,
            ),
          0,
        );
        return previous;
      }

      const next = [
        source,
        ...previous,
      ];

      window.setTimeout(
        () =>
          selectSourceByIndex(
            0,
            autoPlay,
          ),
        0,
      );

      return next;
    });
  }

  function loadSpotifyLink(
    value = spotifyInput,
  ) {
    const parsed =
      spotifyLinkToEmbed(value);

    if (!parsed) {
      setSpotifyError(
        "Link Spotify inválido. Cola um link de música, álbum, playlist, artista, podcast ou episódio.",
      );
      return;
    }

    const source: SpotifyAudioSource = {
      id:
        `spotify-${parsed.type}-${parsed.id}`,
      type:
        "spotify",
      title:
        spotifyTypeLabel(parsed.type),
      subtitle:
        "Carregado por link Spotify",
      embedUrl:
        parsed.embedUrl,
      externalUrl:
        parsed.externalUrl,
      artwork:
        "/gnr_logo.png",
    };

    setSpotifyError("");
    setSpotifyInput(value);
    setSpotifyHistory(
      saveSpotifyHistory(source),
    );
    openPlayer("spotify");
    setSource(source, true);
  }

  async function searchYoutube(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    const query =
      youtubeQuery.trim();

    if (!query) {
      return;
    }

    const spotify =
      spotifyLinkToEmbed(query);

    if (spotify) {
      setSpotifyInput(query);
      loadSpotifyLink(query);
      return;
    }

    setSearchingYoutube(true);
    setError("");
    setSpotifyError("");
    setYoutubeResults([]);

    try {
      const response =
        await fetch(
          `/api/youtube/search?q=${encodeURIComponent(query)}`,
          {
            method:
              "GET",
            credentials:
              "include",
            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) || "";

      const rawBody =
        await response.text();

      if (
        !contentType.includes(
          "application/json",
        )
      ) {
        throw new Error(
          rawBody.trim().startsWith("<")
            ? "A rota /api/youtube/search ainda não está ligada ao backend."
            : `O backend devolveu uma resposta inválida (${response.status}).`,
        );
      }

      const payload =
        JSON.parse(rawBody) as {
          error?: string;
          items?: YoutubeSearchResult[];
        };

      if (!response.ok) {
        throw new Error(
          payload.error ||
            `Pesquisa recusada pelo backend (${response.status}).`,
        );
      }

      const items =
        Array.isArray(payload.items)
          ? payload.items
          : [];

      setYoutubeResults(items);

      if (items.length === 0) {
        setError(
          "Não foram encontrados vídeos incorporáveis para esta pesquisa.",
        );
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Não foi possível pesquisar no YouTube.",
      );
    } finally {
      setSearchingYoutube(false);
    }
  }

  function playSearchResult(
    result: YoutubeSearchResult,
  ) {
    const source =
      youtubeSourceFromResult(result);

    openPlayer("library");
    setSource(source, true);
  }

  function openExternal() {
    if (!currentSource?.externalUrl) {
      return;
    }

    window.open(
      currentSource.externalUrl,
      "_blank",
      "noopener",
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9990] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {minimized && (
        <div className="group relative">
          <button
            type="button"
            onClick={() =>
              openPlayer(
                isSpotify
                  ? "spotify"
                  : "library",
              )
            }
            className="theme-player relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] border shadow-[0_20px_65px_rgba(0,0,0,.65)] backdrop-blur-2xl transition duration-300 hover:scale-[1.06]"
            aria-label="Abrir mini-player"
          >
            <img
              src={artwork}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-black/50" />

            {playing ? (
              <Equalizer active />
            ) : (
              <CurrentIcon className="relative h-5 w-5 text-white" />
            )}

            <span
              className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
                playing
                  ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/.8)]"
                  : "bg-white/25"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={togglePlayback}
            disabled={loading}
            className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(0,0,0,.45)] transition hover:scale-110 disabled:opacity-60"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : playing ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
          </button>
        </div>
      )}

      <section
        aria-hidden={!expanded || minimized}
        className={`theme-player overflow-hidden border shadow-[0_35px_120px_rgba(0,0,0,.72)] backdrop-blur-2xl ${
          expanded && !minimized
            ? "relative max-h-[calc(100vh-2rem)] w-[460px] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-[2rem] opacity-100"
            : "pointer-events-none absolute bottom-0 right-0 h-[200px] w-[200px] opacity-[0.001]"
        }`}
      >
        <div className="relative overflow-hidden">
          {isYoutube ? (
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <iframe
                key={`${currentSource.videoId}-${iframeKey}`}
                ref={youtubeFrameRef}
                src={youtubeEmbedUrl}
                title={`${currentSource.title} — ${currentSource.subtitle}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                tabIndex={expanded && !minimized ? 0 : -1}
                allowFullScreen
                onLoad={handleYoutubeLoad}
                className="absolute inset-0 h-full w-full border-0"
              />

              {!frameReady && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <span className="text-[8px] font-black uppercase tracking-[.18em] text-white/30">
                    A preparar o vídeo
                  </span>
                </div>
              )}
            </div>
          ) : isSpotify ? (
            <div className="relative h-[315px] max-h-[42vh] min-h-[250px] w-full overflow-hidden bg-black">
              <iframe
                src={spotifyEmbedUrl}
                title={`${currentSource.title} — Spotify`}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                tabIndex={expanded && !minimized ? 0 : -1}
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="relative h-44 overflow-hidden sm:h-52">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,hsl(var(--primary)/.30),transparent_30%),linear-gradient(145deg,rgba(3,20,14,.95),rgba(1,5,4,.98))]" />

              <img
                src="/gnr_logo.png"
                alt=""
                className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-contain opacity-25 blur-[1px]"
              />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-primary/20 bg-black/35 text-primary backdrop-blur-xl">
                  <Radio className="h-9 w-9" />
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.16em] text-white/65 backdrop-blur-md">
              {isYoutube ? (
                <>
                  <Youtube className="h-3.5 w-3.5" />
                  YouTube
                </>
              ) : isSpotify ? (
                <>
                  <Music2 className="h-3.5 w-3.5" />
                  Spotify
                </>
              ) : (
                <>
                  <Radio className="h-3.5 w-3.5" />
                  Emissão em direto
                </>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openExternal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/55 backdrop-blur-md transition hover:border-white/20 hover:text-white"
                aria-label="Abrir fonte oficial"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={minimizePlayer}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/55 backdrop-blur-md transition hover:border-primary/25 hover:text-primary"
                aria-label="Minimizar player"
              >
                <Minimize2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={compactPlayer}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/55 backdrop-blur-md transition hover:border-white/20 hover:text-white"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 p-4 sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/.13),transparent_35%)]" />

          <div className="relative">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                <img
                  src={artwork}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <CurrentIcon className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black tracking-tight text-white">
                  {currentSource.title}
                </p>

                <p className="mt-1 truncate text-xs text-white/40">
                  {currentSource.subtitle}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <Equalizer active={playing} />
                  <span className="text-[8px] font-black uppercase tracking-[.15em] text-white/25">
                    {isSpotify
                      ? "Play dentro do Spotify"
                      : playing
                        ? "A reproduzir"
                        : "Em pausa"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => changeSource(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[.03] text-white/45 transition hover:border-white/20 hover:text-white"
                aria-label="Fonte anterior"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={togglePlayback}
                disabled={loading}
                className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_55px_hsl(var(--primary)/.25)] transition hover:scale-[1.04] disabled:cursor-wait disabled:opacity-70"
                aria-label={playing ? "Pausar" : "Reproduzir"}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : playing ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="h-6 w-6 fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={() => changeSource(1)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[.03] text-white/45 transition hover:border-white/20 hover:text-white"
                aria-label="Fonte seguinte"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <button
                type="button"
                onClick={() =>
                  setMuted(
                    (previous) =>
                      !previous,
                  )
                }
                className="text-white/45 transition hover:text-white"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) =>
                  setVolume(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="h-1.5 flex-1 cursor-pointer accent-[hsl(var(--primary))]"
                aria-label="Volume"
              />

              <span className="w-9 text-right text-[9px] font-black text-white/30">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
              <TabButton
                active={activeTab === "library"}
                icon={Library}
                label="Biblioteca"
                onClick={() => setActiveTab("library")}
              />
              <TabButton
                active={activeTab === "youtube"}
                icon={Youtube}
                label="YouTube"
                onClick={() => setActiveTab("youtube")}
              />
              <TabButton
                active={activeTab === "spotify"}
                icon={Music2}
                label="Spotify"
                onClick={() => setActiveTab("spotify")}
              />
            </div>

            {activeTab === "youtube" && (
              <div className="mt-4">
                <form
                  onSubmit={searchYoutube}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2"
                >
                  <Search className="ml-2 h-4 w-4 shrink-0 text-white/25" />

                  <input
                    value={youtubeQuery}
                    onChange={(event) =>
                      setYoutubeQuery(
                        event.target.value,
                      )
                    }
                    placeholder="Pesquisar YouTube ou colar link Spotify..."
                    className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white outline-none placeholder:text-white/20"
                  />

                  <button
                    type="submit"
                    disabled={searchingYoutube || !youtubeQuery.trim()}
                    className="flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-[9px] font-black uppercase tracking-[.12em] text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {searchingYoutube ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : spotifyLinkToEmbed(youtubeQuery) ? (
                      "Carregar"
                    ) : (
                      "Pesquisar"
                    )}
                  </button>
                </form>

                {youtubeResults.length > 0 && (
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {youtubeResults.map((result) => (
                      <button
                        key={result.videoId}
                        type="button"
                        onClick={() =>
                          playSearchResult(result)
                        }
                        className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-3 text-left transition hover:border-primary/20 hover:bg-primary/[.05]"
                      >
                        <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl">
                          <img
                            src={result.thumbnail}
                            alt=""
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </div>
                        </div>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-black text-white/75">
                            {result.title}
                          </span>
                          <span className="mt-1 block truncate text-[10px] text-white/30">
                            {result.channelTitle}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "spotify" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-primary">
                    <Music2 className="h-4 w-4" />
                    Spotify no player
                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-white/36">
                    Cola um link Spotify de música, álbum, playlist, artista, podcast ou episódio.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={spotifyInput}
                      onChange={(event) =>
                        setSpotifyInput(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          loadSpotifyLink();
                        }
                      }}
                      placeholder="https://open.spotify.com/album/..."
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white outline-none placeholder:text-white/22 focus:border-primary/35"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        loadSpotifyLink()
                      }
                      className="rounded-2xl bg-primary px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] text-primary-foreground"
                    >
                      Carregar
                    </button>
                  </div>

                  {spotifyError && (
                    <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[.08] px-3 py-2 text-[11px] text-red-200/80">
                      {spotifyError}
                    </p>
                  )}
                </div>

                <SourceList
                  title="Playlists oficiais"
                  sources={library.filter(
                    (source) =>
                      source.type === "spotify",
                  )}
                  currentSource={currentSource}
                  playing={playing}
                  onPick={(source) =>
                    setSource(source, true)
                  }
                />

                {spotifyHistory.length > 0 && (
                  <SourceList
                    title="Últimos links"
                    sources={spotifyHistory}
                    currentSource={currentSource}
                    playing={playing}
                    onPick={(source) =>
                      setSource(source, true)
                    }
                  />
                )}
              </div>
            )}

            {activeTab === "library" && (
              <div className="mt-4 max-h-[32vh] space-y-2 overflow-y-auto pr-1">
                <div className="mb-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Rádio · YouTube · Spotify
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-white/32">
                    Todos os links Spotify carregados ficam guardados no histórico deste navegador.
                  </p>
                </div>

                <SourceList
                  sources={library.slice(0, 14)}
                  currentSource={currentSource}
                  playing={playing}
                  onPick={(source) =>
                    setSource(source, true)
                  }
                />
              </div>
            )}

            {isSpotify && (
              <a
                href={currentSource.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-2 text-[9px] font-black uppercase tracking-[.14em] text-white/45 transition hover:border-primary/25 hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Spotify
              </a>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/[.07] p-3 text-xs leading-5 text-amber-100/75">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {!expanded && !minimized && (
        <section className="theme-player group flex w-[350px] max-w-full items-center gap-3 overflow-hidden rounded-[1.5rem] border p-2.5 shadow-[0_22px_70px_rgba(0,0,0,.62)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() =>
              openPlayer(
                isSpotify
                  ? "spotify"
                  : "library",
              )
            }
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30"
            aria-label="Abrir player"
          >
            <img
              src={artwork}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <CurrentIcon className="h-4 w-4 text-white" />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              openPlayer(
                isSpotify
                  ? "spotify"
                  : "library",
              )
            }
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-xs font-black text-white/85">
              {currentSource.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate text-[10px] text-white/30">
                {currentSource.subtitle}
              </p>
              <Equalizer active={playing} />
            </div>
          </button>

          <button
            type="button"
            onClick={togglePlayback}
            disabled={loading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary text-primary-foreground shadow-[0_12px_38px_hsl(var(--primary)/.22)] transition hover:scale-[1.04] disabled:cursor-wait disabled:opacity-70"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : playing ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              openPlayer("youtube")
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/30 transition hover:bg-white/[.04] hover:text-white"
            aria-label="Abrir pesquisa"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={minimizePlayer}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/30 transition hover:bg-white/[.04] hover:text-white"
            aria-label="Minimizar player"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[8px] font-black uppercase tracking-[.12em] transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-white/35 hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function SourceList({
  title,
  sources,
  currentSource,
  playing,
  onPick,
}: {
  title?: string;
  sources: AudioSource[];
  currentSource: AudioSource;
  playing: boolean;
  onPick: (source: AudioSource) => void;
}) {
  return (
    <div className="space-y-2">
      {title && (
        <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/28">
          {title}
        </p>
      )}

      {sources.map((source) => {
        const Icon =
          sourceIcon(source);

        const active =
          source.id ===
          currentSource.id;

        return (
          <button
            key={source.id}
            type="button"
            onClick={() =>
              onPick(source)
            }
            className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition duration-300 ${
              active
                ? "border-primary/30 bg-primary/[.09]"
                : "border-white/10 bg-white/[.02] hover:border-white/20 hover:bg-white/[.04]"
            }`}
          >
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <img
                src={sourceArtwork(source)}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black text-white/80">
                {source.title}
              </span>
              <span className="mt-1 block truncate text-[10px] text-white/30">
                {source.subtitle}
              </span>
            </span>

            {active && (
              <Equalizer active={playing} />
            )}
          </button>
        );
      })}
    </div>
  );
}

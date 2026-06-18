export type RadioAudioSource = {
  id: string;
  type: "radio";
  title: string;
  subtitle: string;
  src: string;
  externalUrl: string;
};

export type YoutubeAudioSource = {
  id: string;
  type: "youtube";
  title: string;
  subtitle: string;
  videoId: string;
  externalUrl: string;
  artwork: string;
};

export type SpotifyAudioSource = {
  id: string;
  type: "spotify";
  title: string;
  subtitle: string;
  embedUrl: string;
  externalUrl: string;
  artwork: string;
};

export type AudioSource =
  | RadioAudioSource
  | YoutubeAudioSource
  | SpotifyAudioSource;

export const AUDIO_SOURCES: AudioSource[] = [
  {
    id: "radio-comercial",
    type: "radio",
    title: "Rádio Comercial",
    subtitle: "Emissão portuguesa em direto",
    src:
      import.meta.env
        .VITE_RADIO_COMERCIAL_STREAM_URL ||
      "",
    externalUrl:
      "https://radiocomercial.pt/player/emissaofm",
  },
  {
    id: "rfm",
    type: "radio",
    title: "RFM",
    subtitle: "Só grandes músicas",
    src:
      import.meta.env
        .VITE_RFM_STREAM_URL ||
      "",
    externalUrl:
      "https://rfm.pt/ouvir-emissao-rfm",
  },
  {
    id: "spotify-patrulha-noturna",
    type: "spotify",
    title: "Patrulha Noturna",
    subtitle: "Playlist Spotify — ambiente operacional",
    embedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DX4WYpdgoIcn6?utm_source=generator",
    externalUrl:
      "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6",
    artwork:
      "/gnr_logo.png",
  },
  {
    id: "spotify-sala-comando",
    type: "spotify",
    title: "Sala de Comando",
    subtitle: "Playlist Spotify — foco e concentração",
    embedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6?utm_source=generator",
    externalUrl:
      "https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6",
    artwork:
      "/gnr_logo.png",
  },
  {
    id: "shakira-waka-waka",
    type: "youtube",
    title: "Waka Waka",
    subtitle: "Shakira",
    videoId:
      "pRpeEdMmmQ0",
    externalUrl:
      "https://www.youtube.com/watch?v=pRpeEdMmmQ0",
    artwork:
      "https://i.ytimg.com/vi/pRpeEdMmmQ0/hqdefault.jpg",
  },
  {
    id: "shakira-burna-boy-dai-dai",
    type: "youtube",
    title: "Dai Dai",
    subtitle: "Shakira, Burna Boy",
    videoId:
      "fcnDmrtj6Sk",
    externalUrl:
      "https://www.youtube.com/watch?v=fcnDmrtj6Sk",
    artwork:
      "https://i.ytimg.com/vi/fcnDmrtj6Sk/hqdefault.jpg",
  },
];

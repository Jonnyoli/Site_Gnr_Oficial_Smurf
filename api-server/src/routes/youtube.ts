import express from "express";

const router =
  express.Router();

router.get(
  "/search",
  async (req, res) => {
    try {
      const query =
        String(
          req.query.q ||
          "",
        ).trim();

      if (
        query.length <
        2
      ) {
        res.status(400).json({
          error:
            "Escreve pelo menos dois caracteres para pesquisar.",
        });

        return;
      }

      const apiKey =
        process.env
          .YOUTUBE_API_KEY;

      if (!apiKey) {
        res.status(500).json({
          error:
            "YOUTUBE_API_KEY não está configurado no backend.",
        });

        return;
      }

      const url =
        new URL(
          "https://www.googleapis.com/youtube/v3/search",
        );

      url.searchParams.set(
        "part",
        "snippet",
      );

      url.searchParams.set(
        "type",
        "video",
      );

      url.searchParams.set(
        "videoEmbeddable",
        "true",
      );

      url.searchParams.set(
        "safeSearch",
        "moderate",
      );

      url.searchParams.set(
        "maxResults",
        "8",
      );

      url.searchParams.set(
        "q",
        query,
      );

      url.searchParams.set(
        "key",
        apiKey,
      );

      const response =
        await fetch(
          url,
          {
            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        console.error(
          "[YOUTUBE-SEARCH]",
          response.status,
          payload,
        );

        res.status(502).json({
          error:
            payload?.error
              ?.message ||
            "O YouTube não respondeu à pesquisa.",
        });

        return;
      }

      const items =
        Array.isArray(
          payload?.items,
        )
          ? payload.items
              .map(
                (item: any) => ({
                  videoId:
                    String(
                      item?.id
                        ?.videoId ||
                      "",
                    ),
                  title:
                    String(
                      item?.snippet
                        ?.title ||
                      "Vídeo do YouTube",
                    ),
                  channelTitle:
                    String(
                      item?.snippet
                        ?.channelTitle ||
                      "YouTube",
                    ),
                  thumbnail:
                    String(
                      item?.snippet
                        ?.thumbnails
                        ?.medium
                        ?.url ||
                      item?.snippet
                        ?.thumbnails
                        ?.default
                        ?.url ||
                      "",
                    ),
                }),
              )
              .filter(
                (
                  item: {
                    videoId:
                      string;
                  },
                ) =>
                  Boolean(
                    item.videoId,
                  ),
              )
          : [];

      res.json({
        ok: true,
        items,
      });
    } catch (error) {
      console.error(
        "[YOUTUBE-SEARCH-ERROR]",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível pesquisar músicas no YouTube.",
      });
    }
  },
);

export default router;

import { get, put } from '@vercel/blob';

const BLOB_PATH = 'rank-duel/current.json';

function emptyRank() {
  return {
    schemaVersion: 1,
    seasonNumber: null,
    seasonName: 'Rank Duel',
    seasonStartedUtc: null,
    updatedUtc: null,
    generatedUtc: new Date().toISOString(),
    players: [],
  };
}

function normalizeBody(body) {
  if (body == null) return null;

  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString('utf8'));
  }

  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  return body;
}

function normalizePlayers(players) {
  return players
    .filter((player) => Number(player?.wins) > 0)
    .map((player) => ({
      userId: String(player.userId || ''),
      userName: String(player.userName || 'viewer'),
      wins: Number(player.wins || 0),
      totalPotWon: Number(player.totalPotWon || 0),
      dataPadBonusWins: Number(player.dataPadBonusWins || 0),
      lastWinUtc: player.lastWinUtc || null,
    }))
    .sort((a, b) => {
      const byWins = b.wins - a.wins;

      if (byWins !== 0) {
        return byWins;
      }

      const timeA = a.lastWinUtc
        ? new Date(a.lastWinUtc).getTime()
        : Number.MAX_SAFE_INTEGER;

      const timeB = b.lastWinUtc
        ? new Date(b.lastWinUtc).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      return a.userName.localeCompare(
        b.userName,
        undefined,
        {
          sensitivity: 'base',
        }
      );
    });
}

export default async function handler(request, response) {
  response.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate'
  );

  // =========================================================
  // GET
  // Used by the public Rank Duel webpage.
  // =========================================================

  if (request.method === 'GET') {
    try {
      const result = await get(
        BLOB_PATH,
        {
          access: 'private',
          useCache: false,
        }
      );

      if (
        !result ||
        result.statusCode !== 200 ||
        !result.stream
      ) {
        return response
          .status(200)
          .json(
            emptyRank()
          );
      }

      const text =
        await new Response(
          result.stream
        ).text();

      if (!text.trim()) {
        return response
          .status(200)
          .json(
            emptyRank()
          );
      }

      const payload =
        JSON.parse(
          text
        );

      return response
        .status(200)
        .json(
          payload
        );
    }
    catch (error) {
      console.error(
        '[RANK DUEL API] GET error:',
        error
      );

      return response
        .status(500)
        .json({
          error: 'rank_read_failed',
        });
    }
  }

  // =========================================================
  // POST
  // Used only by Streamer.bot.
  // Protected with RANK_UPDATE_SECRET.
  // =========================================================

  if (request.method === 'POST') {
    const configuredSecret =
      process.env.RANK_UPDATE_SECRET ||
      '';

    const receivedSecret =
      request.headers['x-rank-secret'] ||
      '';

    if (
      !configuredSecret ||
      receivedSecret !== configuredSecret
    ) {
      return response
        .status(401)
        .json({
          error: 'unauthorized',
        });
    }

    try {
      const body =
        normalizeBody(
          request.body
        );

      if (
        !body ||
        !Array.isArray(
          body.players
        )
      ) {
        return response
          .status(400)
          .json({
            error: 'invalid_payload',
          });
      }

      const payload = {
        schemaVersion: 1,

        seasonNumber:
          body.seasonNumber ??
          null,

        seasonName:
          body.seasonName ||
          'Rank Duel',

        seasonStartedUtc:
          body.seasonStartedUtc ||
          null,

        updatedUtc:
          body.updatedUtc ||
          new Date().toISOString(),

        generatedUtc:
          new Date().toISOString(),

        players:
          normalizePlayers(
            body.players
          ),
      };

      await put(
        BLOB_PATH,
        JSON.stringify(
          payload
        ),
        {
          access: 'private',
          allowOverwrite: true,
          contentType: 'application/json',
        }
      );

      return response
        .status(200)
        .json({
          ok: true,
          players: payload.players.length,
          updatedUtc: payload.updatedUtc,
        });
    }
    catch (error) {
      console.error(
        '[RANK DUEL API] POST error:',
        error
      );

      return response
        .status(500)
        .json({
          error: 'rank_write_failed',
        });
    }
  }

  response.setHeader(
    'Allow',
    'GET, POST'
  );

  return response
    .status(405)
    .json({
      error: 'method_not_allowed',
    });
}

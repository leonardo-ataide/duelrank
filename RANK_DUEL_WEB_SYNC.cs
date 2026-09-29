using System;
using System.IO;
using System.Text;
using System.Net.Http;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public class CPHInline
{
    private readonly string leaderboardPath =
        @"C:\Streamer.bot-x64-1.0.4\data\buddy_arena_leaderboard.json";

    private const string RankApiUrl =
        "https://SEU-PROJETO.vercel.app/api/rank";

    private const string RankApiSecret =
        "COLOQUE_AQUI_O_MESMO_RANK_UPDATE_SECRET_DO_VERCEL";

    public bool Execute()
    {
        try
        {
            if (!File.Exists(leaderboardPath))
            {
                CPH.LogError("[RANK DUEL WEB] leaderboard não encontrado.");
                return false;
            }

            if (RankApiUrl.Contains("SEU-PROJETO") || RankApiSecret.Contains("COLOQUE_AQUI"))
            {
                CPH.LogError("[RANK DUEL WEB] Configure RankApiUrl e RankApiSecret.");
                return false;
            }

            JObject leaderboard =
                JObject.Parse(File.ReadAllText(leaderboardPath, Encoding.UTF8));

            JObject players =
                leaderboard["players"] as JObject;

            List<JObject> ranking =
                new List<JObject>();

            if (players != null)
            {
                foreach (JProperty property in players.Properties())
                {
                    JObject player = property.Value as JObject;
                    if (player == null)
                        continue;

                    if (GetLong(player, "wins", 0) <= 0)
                        continue;

                    ranking.Add(player);
                }
            }

            ranking.Sort(
                (a, b) =>
                {
                    long winsA = GetLong(a, "wins", 0);
                    long winsB = GetLong(b, "wins", 0);

                    int byWins = winsB.CompareTo(winsA);
                    if (byWins != 0)
                        return byWins;

                    DateTimeOffset timeA =
                        GetDate(a, "lastWinUtc", DateTimeOffset.MaxValue);

                    DateTimeOffset timeB =
                        GetDate(b, "lastWinUtc", DateTimeOffset.MaxValue);

                    int byReachedFirst =
                        timeA.CompareTo(timeB);

                    if (byReachedFirst != 0)
                        return byReachedFirst;

                    return string.Compare(
                        GetString(a, "userName", ""),
                        GetString(b, "userName", ""),
                        StringComparison.OrdinalIgnoreCase
                    );
                }
            );

            JArray publicPlayers = new JArray();

            for (int i = 0; i < ranking.Count; i++)
            {
                JObject p = ranking[i];

                publicPlayers.Add(
                    new JObject
                    {
                        ["rank"] = i + 1,
                        ["userId"] = GetString(p, "userId", ""),
                        ["userName"] = GetString(p, "userName", "viewer"),
                        ["wins"] = GetLong(p, "wins", 0),
                        ["totalPotWon"] = GetLong(p, "totalPotWon", 0),
                        ["dataPadBonusWins"] = GetLong(p, "dataPadBonusWins", 0),
                        ["lastWinUtc"] = GetString(p, "lastWinUtc", "")
                    }
                );
            }

            JObject payload =
                new JObject
                {
                    ["schemaVersion"] = 1,
                    ["seasonNumber"] = GetLong(leaderboard, "seasonNumber", 0),
                    ["seasonName"] = GetString(leaderboard, "seasonName", "Rank Duel"),
                    ["seasonStartedUtc"] = GetString(leaderboard, "seasonStartedUtc", ""),
                    ["updatedUtc"] = GetString(leaderboard, "lastUpdatedUtc", DateTimeOffset.UtcNow.ToString("o")),
                    ["players"] = publicPlayers
                };

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(15);
                client.DefaultRequestHeaders.Add("x-rank-secret", RankApiSecret);

                using (StringContent content =
                    new StringContent(payload.ToString(Formatting.None), Encoding.UTF8, "application/json"))
                {
                    HttpResponseMessage response =
                        client.PostAsync(RankApiUrl, content).GetAwaiter().GetResult();

                    string responseText =
                        response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

                    if (!response.IsSuccessStatusCode)
                    {
                        CPH.LogError("[RANK DUEL WEB] HTTP " +
                            ((int)response.StatusCode).ToString() + " | " + responseText);
                        return false;
                    }
                }
            }

            CPH.LogInfo("[RANK DUEL WEB] Sync OK | Players=" + publicPlayers.Count.ToString());
            return true;
        }
        catch (Exception ex)
        {
            CPH.LogError("[RANK DUEL WEB] ERROR | " + ex.ToString());
            return false;
        }
    }

    private string GetString(JObject obj, string key, string fallback)
    {
        if (obj == null || obj[key] == null || obj[key].Type == JTokenType.Null)
            return fallback;

        string value = obj[key].ToString();
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }

    private long GetLong(JObject obj, string key, long fallback)
    {
        if (obj == null || obj[key] == null || obj[key].Type == JTokenType.Null)
            return fallback;

        long value;
        return long.TryParse(obj[key].ToString(), out value) ? value : fallback;
    }

    private DateTimeOffset GetDate(JObject obj, string key, DateTimeOffset fallback)
    {
        DateTimeOffset value;
        return DateTimeOffset.TryParse(GetString(obj, key, ""), out value) ? value : fallback;
    }
}

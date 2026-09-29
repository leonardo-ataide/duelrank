RUSHBUD RANK DUEL — LIVE RANK

O ranking pode ser praticamente em tempo real.

VERCEL
1. Faça deploy desta pasta.
2. No projeto, conecte/crie um Vercel Blob PRIVATE store.
3. Crie um Environment Variable do tipo Secret:
   RANK_UPDATE_SECRET
4. Use uma senha aleatória longa.

STREAMER.BOT
Arquivo separado: RANK_DUEL_WEB_SYNC.cs

Edite no topo:
RankApiUrl = https://SEU-PROJETO.vercel.app/api/rank
RankApiSecret = o mesmo RANK_UPDATE_SECRET do Vercel

Crie a Action:
Rank Duel - Web Sync

Chame essa Action depois de:
- Buddy Arena - Rank Update
- Buddy Arena - Rank DataPad Bonus
- Buddy Arena - Rank Reset

Opcional:
- também no Auto End BOT para uma sincronização final.

A página consulta /api/rank a cada 10 segundos.
Ela mostra TODOS os jogadores com Wins > 0.

Ordem:
1) mais Wins
2) empate: lastWinUtc mais antigo
3) nome em ordem alfabética


PLUSHIE IMAGE
- File included: assets/scorpion-plushie.webp
- This is the image displayed in the Final Prize / Prêmio final / Premio final section.
- Do not rename it unless you also update index.html.

VIDEO
- Put the explainer video at:
  media/rank-duel-guide.mp4

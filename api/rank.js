import { get, put } from '@vercel/blob';
const PATH='rank-duel/current.json';
const empty=()=>({schemaVersion:1,seasonNumber:null,seasonName:'Rank Duel',updatedUtc:null,generatedUtc:new Date().toISOString(),players:[]});
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
  if(req.method==='GET'){
    try{
      const r=await get(PATH,{access:'private',useCache:false});
      if(!r)return res.status(200).json(empty());
      const txt=await new Response(r.stream).text();
      return res.status(200).json(txt.trim()?JSON.parse(txt):empty());
    }catch(e){
      if(e?.status===404||e?.statusCode===404||String(e?.message||'').toLowerCase().includes('not found'))return res.status(200).json(empty());
      console.error(e);return res.status(500).json({error:'rank_read_failed'});
    }
  }
  if(req.method==='POST'){
    const secret=process.env.RANK_UPDATE_SECRET||'';
    if(!secret||req.headers['x-rank-secret']!==secret)return res.status(401).json({error:'unauthorized'});
    try{
      const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!b||!Array.isArray(b.players))return res.status(400).json({error:'invalid_payload'});
      const payload={schemaVersion:1,seasonNumber:b.seasonNumber??null,seasonName:b.seasonName||'Rank Duel',seasonStartedUtc:b.seasonStartedUtc||null,updatedUtc:b.updatedUtc||new Date().toISOString(),generatedUtc:new Date().toISOString(),players:b.players.filter(p=>Number(p?.wins)>0).map(p=>({userId:String(p.userId||''),userName:String(p.userName||'viewer'),wins:Number(p.wins||0),totalPotWon:Number(p.totalPotWon||0),dataPadBonusWins:Number(p.dataPadBonusWins||0),lastWinUtc:p.lastWinUtc||null}))};
      await put(PATH,JSON.stringify(payload),{access:'private',allowOverwrite:true,contentType:'application/json'});
      return res.status(200).json({ok:true,players:payload.players.length,updatedUtc:payload.updatedUtc});
    }catch(e){console.error(e);return res.status(500).json({error:'rank_write_failed'});}
  }
  res.setHeader('Allow','GET, POST');return res.status(405).json({error:'method_not_allowed'});
}

import fs from 'node:fs';
import path from 'node:path';

const state=process.env.WORKROOM_STATE_DIR;
if(!state||!path.isAbsolute(state))throw Error('Explicit private state required');
const lines=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
const files=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const ledger=files(path.join(state,'data/usage')).filter(f=>path.dirname(f)===path.join(state,'data/usage')&&f.endsWith('.jsonl')).flatMap(lines);
const team=JSON.parse(fs.readFileSync(path.join(state,'team.json'),'utf8'));
const selected=ledger.filter(row=>Object.values(team).some(bot=>bot.id===row.botId));
const counters={input:0,output:0,cachedInput:0};
const native=[];
for(const file of files(path.join(state,'codex-home/sessions')).filter(f=>f.endsWith('.jsonl'))){
 const records=lines(file);
 const meta=records.find(r=>r.type==='session_meta')?.payload;
 const events=records.filter(r=>r.type==='event_msg'&&r.payload?.type==='token_count'&&r.payload.info);
 if(!events.length)continue;
 const contexts=records.filter(r=>r.type==='turn_context').map(r=>({turnId:r.payload.turn_id,model:r.payload.model,effort:r.payload.effort}));
 if(native.some(r=>r.sessionId===meta?.id))throw Error('Duplicate native session export; inspect before summing');
 let previous={input_tokens:0,output_tokens:0,cached_input_tokens:0};
 const calls=[];
 for(const record of events){
  const total=record.payload.info.total_token_usage;
  if(!total)throw Error('Missing native cumulative counter');
  const delta=Object.fromEntries(Object.keys(previous).map(k=>[k,total[k]-previous[k]]));
  if(Object.values(delta).some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Native cumulative counter reset; inspect before summing');
  previous=total;
  if(Object.values(delta).some(v=>v>0))calls.push({at:record.timestamp,...delta});
 }
 const row={sessionId:meta?.id,cliVersion:meta?.cli_version,contexts,cumulative:previous,calls};
 native.push(row);
 counters.input+=previous.input_tokens;counters.output+=previous.output_tokens;counters.cachedInput+=previous.cached_input_tokens;
}
const add=rows=>rows.reduce((sum,r)=>({input:sum.input+(r.input??0),output:sum.output+(r.output??0),cachedInput:sum.cachedInput+(r.cachedInput??0)}),{input:0,output:0,cachedInput:0});
const foreground=selected.filter(r=>!r.threadId?.startsWith('memory-'));
const background=selected.filter(r=>r.threadId?.startsWith('memory-'));
const duplicateTurnIds=foreground.filter((r,i)=>r.turnId&&foreground.findIndex(other=>other.turnId===r.turnId)!==i).map(r=>r.turnId);
const foregroundTotal=add(foreground);
const sumMatches=Object.keys(counters).every(k=>counters[k]===foregroundTotal[k]);
const result={
 recordedAt:new Date().toISOString(),modelCallsIssuedByAudit:0,
 semantics:{inputIncludesCache:true,cacheAddedAgain:false,outputIncludesReasoning:true,cumulativeCountedOnce:true,nativeProcessScope:'foreground app-server; ephemeral memory calls have native ledger evidence only'},
 foreground:{turns:foreground.map(r=>({turnId:r.turnId,botId:r.botId,threadId:r.threadId,model:r.model,input:r.input,output:r.output,cachedInput:r.cachedInput,startedAt:r.startedAt,endedAt:r.endedAt,engineOutcome:r.outcome,toolErrors:r.toolErrors})),total:foregroundTotal,observedCallDeltas:native.reduce((n,r)=>n+r.calls.length,0),native,nativeMatchesLedger:sumMatches,duplicateTurnIds},
 background:{calls:background.length,total:add(background),evidence:'OM native usage ledger only; ephemeral Codex exec does not retain a rollout',actualModelIndependentlyVerified:false},
 total:add(selected),billing:{actualAdditionalApiSpendUsd:0,source:'existing Codex subscription; no API key or paid service added',subscriptionQuotaUnits:null,apiEquivalentUsd:null,unpricedModels:[...new Set(selected.filter(r=>r.costUsd===null).map(r=>r.model))]},
 acceptance:sumMatches&&duplicateTurnIds.length===0?'counter reconciliation passed; task completion requires separate evidence':'counter reconciliation needs investigation'
};
fs.writeFileSync(path.join(state,'usage-reconciliation.json'),JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify({foreground:foregroundTotal,background:result.background,total:result.total,nativeMatchesLedger:sumMatches,duplicateTurnIds,billing:result.billing}));
if(!sumMatches||duplicateTurnIds.length)process.exitCode=1;

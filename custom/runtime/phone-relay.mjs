import fs from 'node:fs';
import path from 'node:path';
import {createControlPlaneClient} from '../../electron/control-plane-client.mjs';
import {resolveCompanionControlPlaneURL} from '../../electron/companion-account-service.mjs';
import {createRelayTokenService} from '../../electron/relay-token.mjs';

const state=process.argv[2];
if(!state||!path.isAbsolute(state))throw Error('Explicit WORKROOM state directory required');
const home=path.join(state,'companion'),record=path.join(home,'relay-status.json');
const owner=JSON.parse(fs.readFileSync(path.join(home,'running.json'),'utf8'));
const baseURL=resolveCompanionControlPlaneURL({isPackaged:true,environment:{}});
const client=createControlPlaneClient({baseURL});
let applying=Promise.resolve(),lastGrant=null,problem=null,stopping=false;
const save=()=>fs.writeFileSync(record,JSON.stringify({pid:process.pid,companionPid:owner.pid,at:new Date().toISOString(),renewal:tokens.status,expiresAt:lastGrant?.expiresAt??null,refreshAfter:lastGrant?.refreshAfter??null,problem},null,2),{mode:0o600});
async function control(route='/state',body){
 const token=fs.readFileSync(path.join(home,'control-token'),'utf8').trim();
 const r=await fetch('http://127.0.0.1:8811'+route,{method:body===undefined?'GET':'PUT',headers:{'x-openmausbot-control-token':token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('Companion control unavailable');
 const s=await r.json();if(s.pid!==owner.pid)throw Error('Companion generation changed');return s;
}
const tokens=createRelayTokenService({
 fetchGrant:async()=>{
  const s=await control();
  const document=JSON.parse(fs.readFileSync(path.join(state,'data/tunnel-account.json'),'utf8'));
  if(!document.companionInstallationCredential)throw Object.assign(Error('OpenMausBot sign-in required'),{code:'signed_out'});
  return client.relayToken(document.companionInstallationCredential,{appVersion:'0.1.166',kind:'server',devices:{e2e:s.devices.filter(d=>d.e2eAt).length,legacy:s.devices.filter(d=>!d.e2eAt).length}});
 },
 onGrant:grant=>{
  lastGrant=grant;
  applying=applying.then(async()=>{await control('/e2e/relay',grant?{hostId:grant.hostId,nodes:grant.nodes,relayToken:grant.token}:null);problem=null;save();}).catch(()=>{problem='companion_control_unavailable';save();});
 },
 log:()=>save(),
});
async function shutdown(){
 if(stopping)return;stopping=true;clearInterval(keepAlive);tokens.stop();await applying;save();process.exit(0);
}
const keepAlive=setInterval(()=>{
 if(stopping)return;
 void control().then(s=>{save();if(s.e2e?.relayProblem==='token_refused')void tokens.refreshNow();}).catch(()=>void shutdown());
},30000);
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
tokens.start();save();

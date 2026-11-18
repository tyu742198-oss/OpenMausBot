import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import qr from 'qrcode-terminal';
import {wifiPhoneInvite} from './phone-invite.ts';

export async function runPhone(action,{state,repo,runtime}){
 const home=path.join(state,'companion');
 const record=path.join(home,'running.json'),secret=path.join(home,'control-token');
 const entry=path.join(repo,'companion/src/index.ts');
 const devicePort=8810,controlPort=8811;
 fs.mkdirSync(home,{recursive:true,mode:0o700});
 const saved=()=>{try{return JSON.parse(fs.readFileSync(record,'utf8'));}catch{return null;}};
 const identity=pid=>{try{return execFileSync('/bin/ps',['-p',String(pid),'-o','lstart=,command='],{encoding:'utf8'}).trim();}catch{return '';}};
 async function control(route='/state',method='GET'){
  const token=fs.readFileSync(secret,'utf8').trim();
  const r=await fetch(`http://127.0.0.1:${controlPort}${route}`,{method,headers:{'x-openmausbot-control-token':token},signal:AbortSignal.timeout(4000)});
  if(!r.ok)throw Error(`Companion control returned ${r.status}`);
  const s=await r.json(),owner=saved();
  if(route==='/state'&&(!owner||s.pid!==owner.pid||identity(owner.pid)!==owner.identity))throw Error('Companion ownership differs; inspect before controlling it');
  return s;
 }
 async function status(){try{return await control();}catch{return null;}}
 const relayRecord=path.join(home,'relay-running.json'),relayFlag=path.join(home,'relay-enabled');
 async function relayStart(){
  await control();
  let owner;try{owner=JSON.parse(fs.readFileSync(relayRecord,'utf8'));}catch{}
  if(owner&&identity(owner.pid)===owner.identity)return;
  const doc=JSON.parse(fs.readFileSync(path.join(state,'data/tunnel-account.json'),'utf8'));
  if(!doc.companionInstallationCredential)throw Error('First sign in with the official login --relay command');
  const log=fs.openSync(path.join(home,'relay-errors.log'),'a',0o600);
  const env={HOME:path.join(state,'home'),PATH:path.dirname(runtime.node)+':/usr/bin:/bin',...runtime.networkEnvironment};
  const child=spawn(runtime.node,['--experimental-strip-types',path.join(repo,'custom/runtime/phone-relay.mjs'),state],{cwd:repo,env,detached:true,stdio:['ignore','ignore',log]});child.unref();fs.closeSync(log);
  fs.writeFileSync(relayRecord,JSON.stringify({pid:child.pid,identity:identity(child.pid)}),{mode:0o600});
  fs.writeFileSync(relayFlag,'1',{mode:0o600});
 }
 async function relayStop(disable=false){
  let owner;try{owner=JSON.parse(fs.readFileSync(relayRecord,'utf8'));}catch{}
  if(owner&&identity(owner.pid)===owner.identity){
   process.kill(owner.pid,'SIGTERM');
   for(let n=0;n<80&&identity(owner.pid)===owner.identity;n++)await new Promise(r=>setTimeout(r,100));
   if(identity(owner.pid)===owner.identity)throw Error('Relay renewer is still stopping');
  }
  if(fs.existsSync(relayRecord))fs.unlinkSync(relayRecord);
  if(disable&&fs.existsSync(relayFlag))fs.unlinkSync(relayFlag);
 }
 const summary=s=>({running:!!s,port:devicePort,controlUrl:`http://127.0.0.1:${controlPort}/`,addresses:s?.addresses??[],routes:s?.directRoutes??{},e2e:s?.e2e?.enabled??false,relay:s?.e2e?.relay??'off',devices:s?.devices??[],pairingOpen:!!s?.pairing});
 if(action==='phone-start'){
  const existing=await status();
  if(existing){if(fs.existsSync(relayFlag))await relayStart();console.log(JSON.stringify(summary(existing),null,2));return;}
  const owner=saved();if(owner&&identity(owner.pid)===owner.identity)throw Error('Owned Companion exists but is not ready; inspect before starting another');
  const net=await import('node:net');
  for(const port of [devicePort,controlPort])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'0.0.0.0',()=>server.close(resolve));});
  await (await fetch(`http://127.0.0.1:${runtime.port}/api/health`,{signal:AbortSignal.timeout(3000)})).json();
  fs.writeFileSync(secret,randomBytes(32).toString('base64url'),{mode:0o600});
  const env={HOME:path.join(state,'home'),PATH:path.dirname(runtime.node)+':/usr/bin:/bin',LANG:'zh_CN.UTF-8',OMB_PORT:String(runtime.port),OMB_WEBHOOK_PORT:String(runtime.port+1),OMB_COMPANION_PORT:String(devicePort),OMB_CONTROL_PORT:String(controlPort),OMB_COMPANION_DIR:home,OMB_COMPANION_NAME:'WORKROOM',OMB_APP_VERSION:'0.1.166',OMB_COMPANION_ROUTES:'wifi',OMB_COMPANION_E2E:'1',OMB_CONTROL_TOKEN:fs.readFileSync(secret,'utf8')};
  const log=fs.openSync(path.join(home,'errors.log'),'a',0o600);
  const child=spawn(runtime.node,['--experimental-strip-types',entry],{cwd:repo,env,detached:true,stdio:['ignore','ignore',log]});child.unref();fs.closeSync(log);
  fs.writeFileSync(record,JSON.stringify({pid:child.pid,identity:identity(child.pid),startedAt:new Date().toISOString()},null,2),{mode:0o600});
  let s;
  for(let n=0;n<60;n++){s=await status();if(s)break;await new Promise(r=>setTimeout(r,250));}
  if(!s)throw Error('Companion is not ready; inspect private companion/errors.log');
  if(fs.existsSync(relayFlag))await relayStart();
  console.log(JSON.stringify(summary(s),null,2));
 }else if(action==='phone-status'){
  console.log(JSON.stringify(summary(await status()),null,2));
 }else if(action==='phone-relay-start'){
  await relayStart();console.log(JSON.stringify({renewalStarted:true,...summary(await control())},null,2));
 }else if(action==='phone-relay-stop'){
  await relayStop(true);await control();
  const token=fs.readFileSync(secret,'utf8').trim();
  const r=await fetch(`http://127.0.0.1:${controlPort}/e2e/relay`,{method:'PUT',headers:{'x-openmausbot-control-token':token,'Content-Type':'application/json'},body:'null'});
  if(!r.ok)throw Error('Relay stop was refused');
  console.log(JSON.stringify({relayStopped:true,wifiPreserved:true}));
 }else if(action==='phone-stop'){
  const s=await control();await relayStop();process.kill(s.pid,'SIGTERM');
  for(let n=0;n<40&&await status();n++)await new Promise(r=>setTimeout(r,100));
  if(await status())throw Error('Companion has not stopped');
  fs.unlinkSync(record);console.log(JSON.stringify({stopped:true,workroomPreserved:true}));
 }else if(action==='phone-pair'){
  const s=await control();
  const ip=s.addresses.find(a=>/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(a));
  if(!ip)throw Error('No private Wi-Fi address is available');
  const p=await control('/pairing','POST');
  const link=wifiPhoneInvite({address:ip,port:devicePort,token:p.token,code:p.code,e2e:s.e2e?.descriptor});
  console.log(`iPhone address: ${ip}:${devicePort}\nOne-time phone code: ${p.code}\nExpires: ${new Date(p.pairing.expiresAt).toISOString()}\nNative phone link: ${link}\nMac control: http://127.0.0.1:${controlPort}/#token=${fs.readFileSync(secret,'utf8').trim()}`);
  qr.generate(link,{small:true});
 }else throw Error('Use phone-start, phone-stop, phone-status, phone-pair, phone-relay-start or phone-relay-stop');
}

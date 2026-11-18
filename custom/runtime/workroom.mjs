import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const state=process.env.WORKROOM_STATE_DIR??path.resolve(repo,'../.local/workroom');
const runtime=JSON.parse(fs.readFileSync(path.join(state,'runtime.json'),'utf8'));
const base=`http://127.0.0.1:${runtime.port}`;
const record=path.join(state,'running.json');
const docker=args=>execFileSync(runtime.docker,['--host',runtime.dockerHost,...args],{encoding:'utf8'});
function container(name,role){
 const c=JSON.parse(docker(['inspect',name]))[0],h=c.HostConfig,m=c.Mounts;
 if(c.Config.Labels?.['workroom.owner']!=='workroom-daily'||c.Config.Labels?.['workroom.role']!==role||h.NetworkMode!=='none'||!h.ReadonlyRootfs||h.Privileged||h.Memory!==268435456||h.MemorySwap!==268435456||h.NanoCpus!==1000000000||h.PidsLimit!==64||c.Config.User!=='501:20'||!h.CapDrop?.includes('ALL')||!h.SecurityOpt?.some(v=>v==='no-new-privileges'||v==='no-new-privileges=true')||m.length!==1||m[0].Source!==runtime.project||m[0].Destination!=='/workspace'||m[0].RW!==(role!=='reviewer'))throw Error('Daily container ownership or boundary differs; inspect before starting');
 return c;
}
async function health(){try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(2000)});return r.ok?await r.json():null;}catch{return null;}}
function owned(pid){try{return execFileSync('/bin/ps',['-p',String(pid),'-o','command='],{encoding:'utf8'}).includes(path.join(repo,'server/openmausbot.ts')+' serve --local --no-pair --port '+runtime.port+' --data-dir '+path.join(state,'data'));}catch{return false;}}
const action=process.argv[2]??'status';
if(action.startsWith('phone-')){
 const {runPhone}=await import('./phone.mjs');
 await runPhone(action,{state,repo,runtime});
}else if(action==='status'){
 const saved=fs.existsSync(record)?JSON.parse(fs.readFileSync(record,'utf8')):null;
 console.log(JSON.stringify({url:base,stateDir:state,running:!!await health(),ownedProcess:saved?owned(saved.pid):false,version:JSON.parse(fs.readFileSync(path.join(repo,'package.json'),'utf8')).version},null,2));
}else if(action==='start'){
 if(await health()){
  const saved=fs.existsSync(record)?JSON.parse(fs.readFileSync(record,'utf8')):null;
  if(!saved||!owned(saved.pid))throw Error('Port already serves another process');
  console.log(JSON.stringify({url:base,stateDir:state,running:true,alreadyRunning:true}));
 }else{
  await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(runtime.port,'127.0.0.1',()=>probe.close(resolve));});
  for(const [role,name] of Object.entries(runtime.containers)){container(name,role);docker(['start',name]);}
  const env={HOME:path.join(state,'home'),USER:process.env.USER??'macbook',PATH:path.dirname(runtime.node)+':/usr/bin:/bin',LANG:'zh_CN.UTF-8',TZ:'Asia/Taipei',TMPDIR:path.join(state,'data/tmp'),OMB_DATA_DIR:path.join(state,'data'),CODEX_HOME:path.join(state,'codex-home'),CODEX_SQLITE_HOME:path.join(state,'codex-home'),WORKROOM_STATE_DIR:state,WORKROOM_RESTRICT_CODEX_NATIVE:'1',WORKROOM_CODEX_WAIT_GUARD:'1',OMB_PORT:String(runtime.port),OMB_WEBHOOK_PORT:String(runtime.port+1),OMB_LOOPBACK_TRUST:'owner',OMB_DEV_TRUST_LOCAL_BROWSER:'0',OMB_WARM_SUMMARY:'0',OMB_AI_CHECKS:'0'};
  for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','NODE_USE_ENV_PROXY']){
   const value=runtime.networkEnvironment?.[key]??process.env[key];
   if(value)env[key]=value;
  }
  fs.mkdirSync(env.TMPDIR,{recursive:true,mode:0o700});
  const log=fs.openSync(path.join(state,'logs/server.log'),'a',0o600);
  const child=spawn(runtime.node,['--experimental-strip-types',path.join(repo,'server/openmausbot.ts'),'serve','--local','--no-pair','--port',String(runtime.port),'--data-dir',path.join(state,'data'),'--label','WORKROOM'],{cwd:repo,env,detached:true,stdio:['ignore',log,log]});
  child.unref();fs.closeSync(log);
  fs.writeFileSync(record,JSON.stringify({pid:child.pid,url:base,startedAt:new Date().toISOString(),stateDir:state},null,2),{mode:0o600});
  let ready=false;
  for(let n=0;n<240;n++){if(await health()){ready=true;break;}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw Error('Daily server not ready; inspect private logs/server.log');
  console.log(JSON.stringify({url:base,pid:child.pid,stateDir:state,persistent:true,fakeEngine:false,autostart:false}));
 }
}else if(action==='pair'){
 execFileSync(runtime.node,['--experimental-strip-types',path.join(repo,'server/openmausbot.ts'),'pair','--port',String(runtime.port),'--data-dir',path.join(state,'data'),'--client'],{cwd:repo,env:{...process.env,HOME:path.join(state,'home'),OMB_DATA_DIR:path.join(state,'data')},stdio:'inherit'});
}else if(action==='stop'){
 const saved=fs.existsSync(record)?JSON.parse(fs.readFileSync(record,'utf8')):null;
 if(await health()){
  if(!saved||!owned(saved.pid))throw Error('Refusing to stop an unowned process');
  const bots=await (await fetch(base+'/api/bots')).json();
  if(bots.bots.some(b=>b.busy||b.waitingForTeammates))throw Error('Stop the active task in OM before stopping the workspace');
  process.kill(saved.pid,'SIGTERM');
  for(let n=0;n<80&&await health();n++)await new Promise(r=>setTimeout(r,250));
  if(await health())throw Error('Server still running; containers left untouched');
 }
 for(const [role,name] of Object.entries(runtime.containers)){container(name,role);docker(['stop','--time','5',name]);}
 if(fs.existsSync(record))fs.unlinkSync(record);
 console.log(JSON.stringify({stopped:true,dataPreserved:true}));
}else throw Error('Use start, stop, status or pair');

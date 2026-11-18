import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verificationServerEnvironment,verificationServerArgs} from '../../scripts/control-omb.ts';

const state=process.env.WORKROOM_STATE_DIR;
if(!state||!path.isAbsolute(state))throw Error('Explicit private WORKROOM_STATE_DIR required');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=path.join(state,'data');
fs.mkdirSync(path.join(data,'tmp'),{recursive:true,mode:0o700});
const env=verificationServerEnvironment({LANG:'zh_CN.UTF-8',TZ:'Asia/Taipei',OMB_WARM_SUMMARY:'0'},data,28155);
Object.assign(env,{WORKROOM_STATE_DIR:state,WORKROOM_RESTRICT_CODEX_NATIVE:'1',CODEX_HOME:path.join(state,'codex-home'),CODEX_SQLITE_HOME:path.join(state,'codex-home'),OMB_STATIC_DIR:path.join(repo,'dist'),OMB_AI_CHECKS:'0',OMB_DISABLE_ANNOUNCEMENTS:'1'});
for(const k of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY'])if(process.env[k])env[k]=process.env[k];
const log=fs.openSync(path.join(state,'logs/server.log'),'a',0o600);
const child=spawn(process.execPath,verificationServerArgs(env),{cwd:repo,env,stdio:['ignore',log,log]});fs.closeSync(log);
const info={url:'http://127.0.0.1:28155',pid:child.pid,supervisorPid:process.pid,dataDir:data,version:'0.1.166',realEngine:true,automaticModelRequests:false};
fs.writeFileSync(path.join(state,'server-info.json'),JSON.stringify(info,null,2));
const deadline=Date.now()+120000;
let ready=false;
while(Date.now()<deadline){
 if(child.exitCode!==null)throw Error('Fixture exited before ready; inspect private server.log');
 try{if((await fetch(info.url+'/api/health')).ok){ready=true;console.log(JSON.stringify(info));break;}}catch{}
 await new Promise(r=>setTimeout(r,250));
}
if(!ready){child.kill('SIGTERM');throw Error('Fixture health deadline exceeded; inspect private server.log');}
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;child.kill('SIGTERM');};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
child.on('close',code=>process.exit(code??0));

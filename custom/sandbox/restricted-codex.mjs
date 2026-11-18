import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';

const args=process.argv.slice(2);
if(args.shift()!=='--role')throw Error('Explicit Codex role required');
const role=args.shift();
if(!['researcher','builder','reviewer'].includes(role))throw Error('Invalid role');
const state=process.env.WORKROOM_STATE_DIR;
if(!state||!path.isAbsolute(state))throw Error('Explicit private state required');
const runtime=JSON.parse(fs.readFileSync(path.join(state,'runtime.json')));
const audit=data=>fs.appendFileSync(path.join(state,'codex-protocol.jsonl'),JSON.stringify({at:Date.now(),role,...data})+'\n',{mode:0o600});
const disabled=['shell_tool','unified_exec','apply_patch_freeform','code_mode','code_mode_only','view_image','apps','plugins','hooks','multi_agent','multi_agent_v2','computer_use','browser_use','browser_use_external','image_generation','memories','skill_search','workspace_dependencies','skill_mcp_dependency_install','request_permissions_tool','shell_snapshot'];
const appServer=args[0]==='app-server';
if(!appServer&&JSON.stringify(args)!==JSON.stringify(['--version'])&&JSON.stringify(args)!==JSON.stringify(['login','status'])){
 audit({direction:'blocked-subcommand',subcommand:args[0]??null});
 throw Error('Restricted Codex supports app-server and read-only identity checks only; background exec is disabled');
}
const forced=appServer?['-c','sandbox_mode="read-only"','-c','approval_policy="on-request"','-c','web_search="disabled"','-c','notify=[]','-c','orchestrator.skills.enabled=false','-c','skills.bundled.enabled=false','-c','skills.include_instructions=false','-c','agents.enabled=false',...disabled.flatMap(k=>['-c',`features.${k}=false`])]:[];
const env={...process.env,HOME:path.join(state,'codex-home'),CODEX_HOME:path.join(state,'codex-home'),CODEX_SQLITE_HOME:path.join(state,'codex-home')};
for(const k of ['OPENAI_API_KEY','CODEX_API_KEY','DISCORD_BOT_TOKEN'])delete env[k];
const child=spawn(runtime.codex,[...args,...forced],{env,stdio:['pipe','pipe','pipe']});
child.stderr.pipe(process.stderr);
if(!appServer){process.stdin.pipe(child.stdin);child.stdout.pipe(process.stdout);}
else{
 let projectMountVerified=false;
 const methods=new Map();
 const incoming=readline.createInterface({input:process.stdin});
 incoming.on('line',line=>{
  let msg;try{msg=JSON.parse(line);}catch{return;}
  const p=msg.params??{};let invalid=false;
  if(msg.method==='thread/start'||msg.method==='thread/resume')invalid=p.sandbox!=='read-only'||p.approvalPolicy!=='on-request'||p.approvalsReviewer!=='user';
  if(msg.method==='turn/start')invalid=!projectMountVerified||p.sandboxPolicy?.type!=='readOnly'||p.approvalPolicy!=='on-request'||p.approvalsReviewer!=='user';
  if(/^(command\/|fs\/|process\/|config\/.*write)/.test(msg.method??''))invalid=true;
  audit({direction:'request',method:msg.method??'response',id:msg.id,blocked:invalid,...msg.method==='turn/start'?{sandbox:p.sandboxPolicy,approvalPolicy:p.approvalPolicy}: {}});
  if(invalid){process.stdout.write(JSON.stringify({id:msg.id,error:{code:-32602,message:'WORKROOM requires native read-only execution; project operations must use the restricted MCP sandbox'}})+'\n');return;}
  if(msg.method&&msg.id!==undefined)methods.set(msg.id,msg.method);
  child.stdin.write(line+'\n');
 });
 incoming.on('close',()=>child.stdin.end());
 const outgoing=readline.createInterface({input:child.stdout});
 outgoing.on('line',line=>{
  let msg;try{msg=JSON.parse(line);}catch{return;}
  if(methods.get(msg.id)==='config/read'&&msg.result?.config){
   const c=msg.result.config;
   const names=Object.entries(c.mcp_servers??{}).filter(([,s])=>s?.enabled!==false).map(([n])=>n);
   projectMountVerified=names.includes('project_'+role)&&names.every(n=>n==='project_'+role||role==='researcher'&&n==='agents')&&disabled.every(k=>c.features?.[k]===false)&&c.agents?.enabled===false&&c.sandbox_mode==='read-only';
   audit({direction:'effective-config',mcpNames:names,projectMountVerified,nativeSandbox:c.sandbox_mode});
  }
  if(msg.method==='thread/tokenUsage/updated')audit({direction:'usage',params:msg.params});
  else if(msg.method==='turn/completed')audit({direction:'completion',threadId:msg.params?.threadId,turn:msg.params?.turn});
  else if(msg.method&&msg.id!==undefined)audit({direction:'approval-request',method:msg.method,id:msg.id});
  process.stdout.write(line+'\n');
 });
}
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>child.kill(sig));
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
child.on('close',code=>{process.exit(code??1);});

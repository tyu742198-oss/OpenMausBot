import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const state=process.env.WORKROOM_STATE_DIR;
if(!state||!path.isAbsolute(state))throw Error('Explicit private state required');
const runtime=JSON.parse(fs.readFileSync(path.join(state,'runtime.json')));
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base='http://127.0.0.1:28155';
const api=async(method,p,body)=>{
 const res=await fetch(base+p,{method,headers:{origin:base,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const answer=await res.json();if(!res.ok)throw Error(p+' '+res.status+' '+JSON.stringify(answer));return answer;
};
const teamFile=path.join(state,'team.json');
const scope=role=>({allow:['native:*',`mcp:project_${role}:*`,...(role==='researcher'?['mcp:agents:list_bots','mcp:agents:coordinate_bots','mcp:agents:assignment_status']:[])]});
if(fs.existsSync(teamFile)){
 const existing=JSON.parse(fs.readFileSync(teamFile));const bots=(await api('GET','/api/bots')).bots;
 if(Object.keys(existing).sort().join(',')!=='builder,researcher,reviewer')throw Error('Incomplete saved team; inspect instead of recreating');
 if(!Object.values(existing).every(b=>bots.some(x=>x.id===b.id)))throw Error('Saved team differs; inspect instead of recreating');
 for(const [role,bot] of Object.entries(existing)){
  await api('PATCH','/api/bots/'+bot.id,{toolScope:scope(role),mcpServers:['project_'+role],cwd:runtime.project,helperModel:false,memoryEnabled:false,memoryUpkeep:false,browser:false,computer:'off'});
  await api('PATCH','/api/mcp/servers/project_'+role,{enabled:true});
 }
 console.log(JSON.stringify({reused:true,team:existing}));process.exit(0);
}
const bots=(await api('GET','/api/bots')).bots;
if(bots.some(bot=>['Researcher','Builder','Reviewer'].includes(bot.name)))throw Error('Existing role without saved identity; inspect instead of duplicating');
const team={};
for(const role of ['researcher','builder','reviewer']){
 const made=await api('POST','/api/bots',{name:role[0].toUpperCase()+role.slice(1),section:'WORKROOM · 受限编程',modelSelection:{instanceId:'codex_'+role,model:'gpt-6.1-sol',effort:'low'},settings:{approvalMode:'ask',cwd:runtime.project,computer:'off',browser:false,helperModel:false,memoryEnabled:false,memoryUpkeep:false,composio:false,toolScope:scope(role),soul:'只使用指定项目的 MCP 工具。原生 Codex 是只读，不能使用 Mac 终端、个人配置、浏览器、网络、其他项目或提升权限。Docker 工具的 /workspace 是本项目。Researcher 负责 PLAN.md 和委派；Builder 编码测试；Reviewer 只读独立验收，临时输入只能写 /tmp。不得重复派发成功任务。'}});
 const bot=made.bot??made;team[role]={id:bot.id,threadId:bot.threadId};
 await api('POST','/api/mcp/servers',{name:'project_'+role,command:runtime.node,args:[path.join(repo,'custom/sandbox/project-mcp.mjs'),role],env:{WORKROOM_STATE_DIR:state},apps:false,resultBudget:12000});
 await api('PATCH','/api/mcp/servers/project_'+role,{enabled:true});
 await api('PATCH','/api/bots/'+bot.id,{mcpServers:['project_'+role]});
}
fs.writeFileSync(teamFile,JSON.stringify(team,null,2),{mode:0o600});
console.log(JSON.stringify({team,modelCalls:0,loopback:base}));

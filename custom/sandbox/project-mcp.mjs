import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const role=process.argv[2];
if(!['researcher','builder','reviewer'].includes(role))throw Error('Unknown project role');
const state=process.env.WORKROOM_STATE_DIR;
if(!state||!path.isAbsolute(state))throw Error('Explicit private WORKROOM_STATE_DIR required');
const runtime=JSON.parse(fs.readFileSync(path.join(state,'runtime.json')));
const container=runtime.containers[role];
if(!/^om-workroom-[a-z0-9-]+$/.test(container))throw Error('Unexpected sandbox container');
const worker=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'fs_worker.py'),'utf8');
const schema=(properties,required)=>({type:'object',properties,required,additionalProperties:false});
const text={type:'string',maxLength:65536};
const tools=[
 {name:'project_list',description:'List a directory in the isolated /workspace project.',inputSchema:schema({path:{type:'string'}},[])},
 {name:'project_read',description:'Read a UTF-8 project file; returns its SHA256. Paths are relative to /workspace.',inputSchema:schema({path:{type:'string'}},['path'])},
 ...(role==='reviewer'?[]:[
  {name:'project_write',description:role==='researcher'?'Write only PLAN.md in the project.':'Create or replace a project file in the network-isolated container.',inputSchema:schema({path:{type:'string'},text},['path','text'])},
  ...(role==='builder'?[{name:'project_edit',description:'Replace a project file after reading and supplying its current SHA256.',inputSchema:schema({path:{type:'string'},text,expected_sha256:{type:'string'}},['path','text','expected_sha256'])}]:[])
 ]),
 ...(role==='researcher'?[]:[{name:'project_exec',description:'Run python3 argv inside the project-only container, never a Mac terminal. Reviewer project is read-only. Use /tmp for temporary tests. No network or dependency installation.',inputSchema:schema({argv:{type:'array',items:{type:'string'},minItems:1,maxItems:20},timeout_seconds:{type:'integer',minimum:1,maximum:30}},['argv'])}])
];
function execute(args,input){
 return new Promise((resolve,reject)=>{
  const child=spawn(runtime.docker,['--host',runtime.dockerHost,'exec','-i','--workdir','/workspace','--env','PYTHONDONTWRITEBYTECODE=1',container,...args],{env:{PATH:'/usr/bin:/bin',HOME:state},stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',exceeded=false;
  const collect=(chunk,isError)=>{if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>24576){exceeded=true;child.kill('SIGTERM');return;}if(isError)stderr+=chunk;else stdout+=chunk;};
  child.stdout.on('data',c=>collect(c.toString(),false));child.stderr.on('data',c=>collect(c.toString(),true));child.on('error',reject);
  const timer=setTimeout(()=>{exceeded=true;child.kill('SIGTERM');},35000);
  child.once('close',(code,signal)=>{clearTimeout(timer);resolve({exitCode:code,signal,stdout,stderr,outputOrTimeLimitExceeded:exceeded});});child.stdin.end(input??'');
 });
}
async function call(name,args){
 const definition=tools.find(t=>t.name===name);if(!definition)throw Error('Tool not granted to this role');
 if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!(k in definition.inputSchema.properties)))throw Error('Invalid tool arguments');
 if(definition.inputSchema.required.some(k=>!(k in args)))throw Error('Missing required tool argument');
 let result;
 if(name==='project_exec'){
  if(!Array.isArray(args.argv)||args.argv.length<1||args.argv.length>20||args.argv[0]!=='python3'||args.argv.some(s=>typeof s!=='string'||s.length>16384||s.includes('\0')))throw Error('Only bounded python3 argv is allowed inside the sandbox');
  const timeout=args.timeout_seconds??20;if(!Number.isInteger(timeout)||timeout<1||timeout>30)throw Error('Invalid timeout');
  result=await execute(['timeout','--signal=KILL',String(timeout),...args.argv]);
 }else{
  const action={project_list:'list',project_read:'read',project_write:'write',project_edit:'edit'}[name];
  result=await execute(['timeout','--signal=KILL','10','python3','-c',worker,JSON.stringify({...args,role,action})]);
 }
 fs.appendFileSync(path.join(state,'project-tools.jsonl'),JSON.stringify({at:Date.now(),role,tool:name,path:args.path??null,argv:name==='project_exec'?args.argv:null,...result})+'\n',{mode:0o600});
 return {content:[{type:'text',text:JSON.stringify(result)}],isError:result.exitCode!==0||result.outputOrTimeLimitExceeded};
}
const lines=readline.createInterface({input:process.stdin});
for await(const line of lines){
 if(Buffer.byteLength(line)>262144)continue;
 let msg;try{msg=JSON.parse(line);}catch{continue;}
 if(msg.id===undefined)continue;
 try{
  let result;
  if(msg.method==='initialize')result={protocolVersion:msg.params?.protocolVersion??'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'workroom-project-sandbox',version:'1.0.0'}};
  else if(msg.method==='ping')result={};
  else if(msg.method==='tools/list')result={tools};
  else if(msg.method==='tools/call')result=await call(msg.params?.name,msg.params?.arguments??{});
  else throw Error('Unsupported MCP method');
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result})+'\n');
 }catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result:{content:[{type:'text',text:e.message}],isError:true}})+'\n');}
}

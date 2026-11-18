import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';

function client(role){
 const proc=spawn(process.execPath,[fileURLToPath(new URL('./project-mcp.mjs',import.meta.url)),role],{env:process.env,stdio:['pipe','pipe','pipe']});
 const pending=new Map();let next=0;
 readline.createInterface({input:proc.stdout}).on('line',line=>{const msg=JSON.parse(line);pending.get(msg.id)?.(msg);pending.delete(msg.id);});
 return {async rpc(method,params={}){const id=++next;const answer=new Promise(resolve=>pending.set(id,resolve));proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');return (await answer).result;},close(){proc.stdin.end();}};
}
test('role MCP project boundaries, no host execution or personal mounts',async()=>{
 const builder=client('builder'),reviewer=client('reviewer'),researcher=client('researcher');
 const call=(c,name,args)=>c.rpc('tools/call',{name,arguments:args});
 try{
  for(const c of [builder,reviewer,researcher])await c.rpc('initialize',{protocolVersion:'2024-11-05'});
  const names=(await reviewer.rpc('tools/list')).tools.map(t=>t.name);
  assert.deepEqual(names,['project_list','project_read','project_exec']);
  for(const bad of ['../auth.json','/Users/macbook/.codex/auth.json','/etc/passwd'])assert.equal((await call(builder,'project_read',{path:bad})).isError,true);
  assert.equal((await call(reviewer,'project_write',{path:'forbidden.txt',text:'no'})).isError,true);
  assert.equal((await call(researcher,'project_write',{path:'forbidden.txt',text:'no'})).isError,true);
  assert.equal((await call(builder,'project_exec',{argv:['sh','-c','true']})).isError,true);
  assert.equal((await call(builder,'project_exec',{argv:['python3','-c','pass'],host:'gateway'})).isError,true);
  assert.equal((await call(builder,'project_write',{path:'.boundary-probe.txt',text:'one'})).isError,false);
  let read=await call(builder,'project_read',{path:'.boundary-probe.txt'});
  const file=JSON.parse(JSON.parse(read.content[0].text).stdout);
  assert.equal(file.text,'one');
  assert.equal((await call(builder,'project_edit',{path:'.boundary-probe.txt',text:'two',expected_sha256:'bad'})).isError,true);
  assert.equal((await call(builder,'project_edit',{path:'.boundary-probe.txt',text:'two',expected_sha256:file.sha256})).isError,false);
  const probe=String.raw`import pathlib,socket,os,json
c={'uid':os.getuid()==501,'personal_auth_unmounted':not pathlib.Path('/Users/macbook/.codex/auth.json').exists(),'docker_socket_unmounted':not pathlib.Path('/var/run/docker.sock').exists()}
for key,p in [('project_readonly','/workspace/.review-forbidden'),('root_readonly','/etc/workroom-forbidden')]:
 try:pathlib.Path(p).write_text('no');c[key]=False
 except OSError:c[key]=True
try:s=socket.create_connection(('1.1.1.1',443),timeout=1);s.close();c['network_blocked']=False
except OSError:c['network_blocked']=True
p=pathlib.Path('/tmp/workroom-test');p.write_text('ok');p.unlink();c['temporary_dir_writable']=True
print(json.dumps(c));assert all(c.values())`;
  const result=await call(reviewer,'project_exec',{argv:['python3','-c',probe],timeout_seconds:5});
  assert.equal(result.isError,false,JSON.stringify(result));
  const symlink=await call(builder,'project_exec',{argv:['python3','-c',"import pathlib;p=pathlib.Path('/workspace/.boundary-link');p.symlink_to('/etc/passwd')"]});assert.equal(symlink.isError,false);
  assert.equal((await call(builder,'project_read',{path:'.boundary-link'})).isError,true);
  assert.equal((await call(builder,'project_exec',{argv:['python3','-c',"from pathlib import Path;Path('/workspace/.boundary-probe.txt').unlink();Path('/workspace/.boundary-link').unlink()"]})).isError,false);
 }finally{builder.close();reviewer.close();researcher.close();}
});

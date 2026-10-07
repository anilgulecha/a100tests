// Synthetic transport + real published runtime, filesystem, shell, QuickJS, HTTP and Chromium.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm, watch } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import AdmZip from 'adm-zip';
import { chromium } from 'playwright';
import { createClient, VERSION } from '@kalviumjr/agent100/client';
import { startServer } from '@kalviumjr/agent100/host';

const expected = process.env.A100_VERSION ?? '1.5.1';
const root = dirname(import.meta.dirname);
const packageRoot = join(root, 'node_modules/@kalviumjr/agent100');
const policy = { schema: 'agent100.role-policy/v1', roles: Object.fromEntries(['teacher','work','evaluator'].map(role => [role, {model: `SYNTHETIC-${role}`, thinking:'off'}])), limits:{contextWindow:200000,maxTokens:8000} };
let id=0;
const chunk=(delta,finish=null)=>({id:'synthetic',object:'chat.completion.chunk',created:1,model:'synthetic',choices:[{index:0,delta,finish_reason:finish}]});
const say=content=>[chunk({role:'assistant',content:''}),chunk({content}),chunk({},'stop')];
const call=(name,args)=>[chunk({role:'assistant',tool_calls:[{index:0,id:`c${++id}`,type:'function',function:{name,arguments:''}}]}),chunk({tool_calls:[{index:0,function:{arguments:JSON.stringify(args)}}]}),chunk({},'tool_calls')];
const teacher=value=>say(JSON.stringify(value));
function zip() { const z=new AdmZip();z.addLocalFolder(join(root,'fixture'));return z.toBuffer(); }
async function untilFile(path) {
  if(existsSync(path))return;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try { for await(const event of watch(dirname(path),{signal:controller.signal})) { if(existsSync(path))return; } }
  finally {clearTimeout(timer);controller.abort();}
}
async function provider(queues) {
  const requests=[];
  const server=createServer(async(req,res)=>{
    let raw='';for await(const b of req)raw+=b;
    const body=JSON.parse(raw);requests.push(body);
    const step=queues[body.model]?.shift();
    if(!step){res.writeHead(400);res.end(JSON.stringify({error:{message:'No synthetic step'}}));return;}
    res.writeHead(200,{'content-type':'text/event-stream'});
    for(const frame of step)res.write(`data: ${JSON.stringify(frame)}\n\n`);
    res.end('data: [DONE]\n\n');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  return {requests,connection:{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,apiKey:'SYNTHETIC-NOT-A-SECRET'},close:()=>new Promise(resolve=>server.close(resolve))};
}
const deliver=()=>[teacher({message:'Synthetic: deliver.',decision:'deliver'}),teacher({message:'',action:'none'})];

 test('published VERSION and actual npx startup serve Chromium studio',async()=>{
  assert.equal(VERSION,expected);
  const state=await mkdtemp(join(tmpdir(),'a100 paths ü '));
  // npx launches the published installed executable, not repository runtime source.
  const child=spawn('npx',['--no-install','a100','--port','4321','--state-root',state],{cwd:root,detached:true,stdio:['ignore','pipe','pipe']});
  let output='';const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('CLI startup deadline')),20000);
    const inspect=b=>{output+=b.toString();if(output.includes('127.0.0.1:4321')){clearTimeout(timer);resolve();}};
    child.stdout.on('data',inspect);child.stderr.on('data',inspect);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(new Error(`CLI exited ${code}`));});
  });
  let browser;
  try{
    await ready;
    const host=await createClient({baseUrl:'http://127.0.0.1:4321'}).host();assert.equal(host.service.version,expected);assert.equal(host.schema,'agentlab.host/v3');
    browser=await chromium.launch({headless:true});const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto('http://127.0.0.1:4321');assert.equal(response.status(),200);
    await page.waitForSelector('body');assert.equal(errors.length,0);assert.ok((await page.locator('body').innerText()).trim().length>0);
  } finally {await browser?.close();const closed=once(child,'exit');
    const kill=signal=>{try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
    kill('SIGTERM');let timer;
    await Promise.race([closed,new Promise(resolve=>{timer=setTimeout(()=>{kill('SIGKILL');resolve();},2000);})]);clearTimeout(timer);
    child.stdout.destroy();child.stderr.destroy();await rm(state,{recursive:true,force:true});}
});

 test('real tools, codemode, best-effort Stop, continuation and restart',async()=>{
  const state=await mkdtemp(join(tmpdir(),'a100 state ü '));
  const toolSteps=[call('write',{path:'space ü.txt',content:'alpha beta\n'}),call('read',{path:'space ü.txt'}),call('edit',{path:'space ü.txt',edits:[{oldText:'alpha',newText:'gamma'}]}),call('ls',{path:'.'}),call('grep',{pattern:'gamma',path:'.'}),call('find',{pattern:'*.txt',path:'.'}),call('bash',{command:'cat "space ü.txt"'}),say('Synthetic: tools complete.')];
  const model=await provider({'SYNTHETIC-teacher':[...deliver(),...deliver(),...deliver(),...deliver()], 'SYNTHETIC-work':[...toolSteps,call('codemode',{code:'await tools.write({path:"nested.txt",content:"nested"}); return await tools.bash({command:"cat nested.txt"});'}),say('Synthetic: script complete.'),call('bash',{command:'echo $$ > running.pid.tmp && mv running.pid.tmp running.pid; exec sleep 60'}),say('Synthetic: continued.')]});
  let server;
  try { server=await startServer({stateRoot:state,port:0,log:()=>{}}); }
  catch(error) { await model.close();await rm(state,{recursive:true,force:true});throw error; }
  try{
    let api=createClient({baseUrl:server.url});
    const opened=await api.provision({binding:{schema:'agentlab.binding/v1',roomId:'SYNTHETIC',studentId:'SYNTHETIC',labRef:'synthetic-tally'},pin:{labRef:'synthetic-tally',version:1},policy,connection:model.connection,lab:zip()});
    let lab=opened.client;const workspace=join(state,'instances',opened.instance.instanceId,'run','workspace');
    assert.equal((await lab.agent('Synthetic: exercise tools.',{requestId:'tools'})).work.status,'done');
    assert.equal(await readFile(join(workspace,'space ü.txt'),'utf8'),'gamma beta\n');
    const results=(await lab.transcript('work')).filter(x=>x.kind==='tool-result');
    assert.equal(results.length,7);for(const x of results)assert.equal(x.isError,false,`${x.tool}: ${x.output}`);
    assert.equal((await lab.agent('Synthetic: script.',{requestId:'script'})).work.status,'done');assert.equal(await readFile(join(workspace,'nested.txt'),'utf8'),'nested');
    const running=lab.agent('Synthetic: sleep.',{requestId:'stop'});await untilFile(join(workspace,'running.pid'));
    assert.equal((await lab.stopAgent({requestId:'wrong'})).stopped,false);
    assert.equal((await lab.stopAgent({requestId:'stop'})).stopped,true);assert.equal((await running).work.status,'stopped');
    assert.equal((await lab.agent('Synthetic: continue.',{requestId:'continue'})).work.status,'done');
    await server.close();server=await startServer({stateRoot:state,port:0,log:()=>{}});api=createClient({baseUrl:server.url});lab=api.instance(opened.instance.instanceId);
    assert.equal(await readFile(join(workspace,'nested.txt'),'utf8'),'nested');assert.ok((await lab.transcript('work')).length>0);assert.equal((await api.host()).service.version,expected);
  }finally{await server.close();await model.close();await rm(state,{recursive:true,force:true});}
});

 test('missing search binaries yield clear errors without downloading',async()=>{
  const state=await mkdtemp(join(tmpdir(),'a100 missing '));
  const model=await provider({'SYNTHETIC-teacher':deliver(),'SYNTHETIC-work':[call('grep',{pattern:'x',path:'.'}),call('find',{pattern:'*.txt',path:'.'}),say('Synthetic: missing tools acknowledged.')]});
  const server=await startServer({stateRoot:state,port:0,search:{rg:join(state,'missing-rg'),fd:join(state,'missing-fd')},log:()=>{}});
  try{
    const opened=await createClient({baseUrl:server.url}).provision({binding:{schema:'agentlab.binding/v1',roomId:'SYNTHETIC',studentId:'SYNTHETIC',labRef:'synthetic-tally'},pin:{labRef:'synthetic-tally',version:1},policy,connection:model.connection,lab:zip()});
    await opened.client.agent('Synthetic: missing search.',{requestId:'missing'});
    const results=(await opened.client.transcript('work')).filter(x=>x.kind==='tool-result');assert.equal(results.length,2);for(const result of results)assert.equal(result.isError,true);
  }finally{await server.close();await model.close();await rm(state,{recursive:true,force:true});}
});

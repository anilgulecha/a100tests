// Real published service, owned by non-root Linux user; Windows controls via pipe, no background shell daemon.
import { startServer } from '@kalviumjr/agent100/host';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const stateRoot=join(homedir(),'a100 loopback ü');
await mkdir(stateRoot,{recursive:true});
const marker=join(stateRoot,'persist.txt');
let old='';try{old=await readFile(marker,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
await writeFile(marker,'synthetic persisted marker');
const server=await startServer({port:4321,stateRoot,staticDir:join(import.meta.dirname,'../node_modules/@kalviumjr/agent100/ui-dist'),log:()=>{}});
console.log(JSON.stringify({ready:true,url:server.url,uid:process.getuid(),persisted:old==='synthetic persisted marker'}));
process.stdin.resume();
let closing=false;
const close=async()=>{if(closing)return;closing=true;await server.close();process.stdin.pause();};
process.stdin.once('data',close);process.stdin.once('end',close);
process.once('SIGTERM',close);

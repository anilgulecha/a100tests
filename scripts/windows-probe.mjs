// Detection only. Never install WSL, a distribution or Node, and never reboot the host.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const run=args=>spawnSync('wsl.exe',args,{encoding:'utf16le',timeout:20000,windowsHide:true});
if(process.platform!=='win32')throw new Error('Run this probe from native Windows');
const status=run(['--status']);const list=run(['--list','--quiet']);
const distributions=(list.stdout??'').replaceAll('\0','').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const result={platform:'win32',wslStatusExit:status.status,wslListExit:list.status,distributions,ready:false,setupPerformed:false};
if(list.status===0&&distributions.length){
  const probe=spawnSync('wsl.exe',['--exec','sh','-lc','uname -s; command -v node; node --version'],{encoding:'utf8',timeout:30000,windowsHide:true});
  result.ready=probe.status===0;result.linuxProbeExit=probe.status;result.linuxProbeOutput=(probe.stdout??'').trim();
}
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/windows-probe.json',JSON.stringify(result,null,2)+'\n');
if(!result.ready){console.log('BLOCKED: no usable WSL distribution with Node. Native Windows execution is not the supported spike path.');console.log('Proposed interactive UX: "May we help set up WSL, install Node inside it, and launch Agent 100 there?"');console.log('This CI probe changes nothing. Setup/reboot needs separately approved real-machine testing.');process.exitCode=3;}
else console.log('PASS: WSL and Node detected; full WSL package journey still requires a separate job/manual run.');

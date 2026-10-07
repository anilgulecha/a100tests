// Proposed launcher decision model, NOT production installer or mocked OS evidence.
export function setupPlan({ platform, inWsl=false, hasWsl=false, distributions=[], chosenDistribution, consent=false, interactive=true, rebootRequired=false, nodeSupported=false }) {
  if(platform!=='win32'||inWsl)return {action:'run-local'};
  if(rebootRequired)return {action:'restart-required',autoReboot:false};
  if(!interactive)return {action:'fail',reason:'Use WSL or rerun interactively; no automatic setup'};
  if(!consent)return {action:'ask-consent',changes:[]};
  if(!hasWsl||distributions.length===0)return {action:'install-ubuntu',command:['wsl.exe','--install','-d','Ubuntu','--web-download','--no-launch']};
  if(distributions.length>1&&!chosenDistribution)return {action:'choose-distribution',options:distributions};
  const distribution=chosenDistribution??distributions[0];
  if(!distributions.includes(distribution))return {action:'fail',reason:'Chosen distribution not installed'};
  if(!nodeSupported)return {action:'offer-node-install',distribution};
  return {action:'launch-in-wsl',distribution};
}

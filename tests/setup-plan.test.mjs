import assert from 'node:assert/strict';
import test from 'node:test';
import {setupPlan} from '../scripts/setup-plan.mjs';
test('proposed setup decisions never mutate without consent or reboot automatically',()=>{
 const windows={platform:'win32'};
 assert.equal(setupPlan({platform:'linux',inWsl:true}).action,'run-local');
 assert.deepEqual(setupPlan(windows),{action:'ask-consent',changes:[]});
 assert.equal(setupPlan({...windows,interactive:false}).action,'fail');
 assert.deepEqual(setupPlan({...windows,consent:true,rebootRequired:true}),{action:'restart-required',autoReboot:false});
 assert.equal(setupPlan({...windows,consent:true}).action,'install-ubuntu');
 assert.equal(setupPlan({...windows,consent:true,hasWsl:true,distributions:['Ubuntu','Debian']}).action,'choose-distribution');
 assert.equal(setupPlan({...windows,consent:true,hasWsl:true,distributions:['Ubuntu']}).action,'offer-node-install');
 assert.equal(setupPlan({...windows,consent:true,hasWsl:true,distributions:['Ubuntu'],nodeSupported:true}).action,'launch-in-wsl');
 assert.equal(setupPlan({...windows,consent:true,hasWsl:true,distributions:['Ubuntu'],chosenDistribution:'missing'}).action,'fail');
});

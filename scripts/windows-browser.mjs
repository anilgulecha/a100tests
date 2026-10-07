import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto('http://127.0.0.1:4321');assert.equal(response.status(),200);
 const host=await page.evaluate(async()=>{const res=await fetch('/api/host');return await res.json();});
 assert.equal(host.service.version,process.env.A100_VERSION??'1.5.1');
 assert.equal(errors.length,0);assert.ok((await page.locator('body').innerText()).trim().length>0);
 console.log('PASS: native Windows Chromium loads the WSL-served studio and fetches host API over Windows localhost');
}finally{await browser.close();}

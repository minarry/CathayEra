// Local browser verification using the installed Chrome and its debugging API.
// No packages, remote services, or existing browser profile are used.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const tool=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(tool);
const output=path.resolve(process.argv[2]||path.join(tool,'验证输出'));
const browser=process.env.JIUZHOU_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
await fs.mkdir(output,{recursive:true});
const profile=path.join(output,`.browser-profile-${process.pid}`);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let browserLog='';
chrome.stderr.on('data',chunk=>{browserLog+=chunk.toString();});
chrome.on('error',error=>{browserLog+=String(error);});
let ws;
const checks=[];
const errors=[];
let nextId=0;
const pending=new Map();
const assert=(condition,name,detail='')=>{checks.push({name,pass:Boolean(condition),detail});if(!condition)throw new Error(`${name}: ${detail}`);};
try{
  let port;
  for(let i=0;i<100;i++){try{port=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(100);}}
  if(!port)throw new Error('Chrome did not open a debugging port. '+browserLog.slice(-3500));
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target=targets.find(t=>t.type==='page');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result);}}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.text+': '+JSON.stringify(response.exceptionDetails.exception));return response.result?.value;};
  const waitFor=async expression=>{for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(50);}throw new Error(`Timed out: ${expression}`);};
  const go=async hash=>{await evaluate(`location.hash=${JSON.stringify(hash)}`);await delay(90);};
  const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(90);};
  const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(shot.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  const network=[];
  ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.method==='Network.requestWillBeSent'&&/^https?:/.test(msg.params.request.url))network.push(msg.params.request.url);});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:pathToFileURL(path.join(root,'九州志资料库.html')).href});
  await waitFor('Boolean(window.__JIUZHOU__)');
  assert(await evaluate('__JIUZHOU__.markdownCount===13&&__JIUZHOU__.documentCount===16'),'All source documents and attachments loaded');
  assert(await evaluate('__JIUZHOU__.decisionCount===11&&__JIUZHOU__.taskCount===8&&__JIUZHOU__.impactCount===14'),'Decision, task, and impact extraction complete');
  await screenshot('资料库-总览');
  const data=await evaluate('JSON.parse(document.getElementById("library-data").textContent)');
  for(const d of data.documents){
    await go('#read?doc='+encodeURIComponent(d.id));
    await waitFor(`document.querySelector('.document-heading h1')?.textContent===${JSON.stringify(d.title)}`);
    if(d.format==='md'){
      const missing=await evaluate(`${JSON.stringify(d.sections)}.filter(s=>!document.getElementById(s.id)).map(s=>s.id)`);
      assert(!missing.length,`All anchors present: ${d.title}`,missing.join(','));
      assert(await evaluate('Boolean(document.querySelector(".prose"))'),`Document rendered: ${d.title}`);
    }
  }
  const rules=data.documents.find(d=>d.title==='规则与存在');
  await go('#read?doc='+encodeURIComponent(rules.id)+'&section=ont-04');
  assert(await evaluate('Math.abs(document.getElementById("ont-04").getBoundingClientRect().top-100)<45'),'Deep link scrolls to the requested section');
  await screenshot('资料库-设定阅读');
  assert(await evaluate('__JIUZHOU__.search("熵").some(h=>h.title==="规则与存在")'),'Full-text concept search');
  assert(await evaluate('__JIUZHOU__.search("D04").length>0'),'Decision identifier searchable');
  assert(await evaluate('__JIUZHOU__.search("重组前").every(h=>!h.id.startsWith("归档/"))'),'Archive excluded from default search');
  assert(await evaluate('__JIUZHOU__.search("重组前",true).some(h=>h.id.startsWith("归档/"))'),'Archive explicitly searchable');
  await click('[data-action="search"]');
  await evaluate('document.getElementById("search-input").value="熵";document.getElementById("search-input").dispatchEvent(new Event("input"))');
  assert(await evaluate('document.querySelectorAll(".search-hit").length>0'),'Search dialog renders matches');
  await evaluate('document.getElementById("search-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}))');
  await delay(120);
  assert(await evaluate('!document.getElementById("search-dialog").open&&location.hash.includes("ont-03")'),'Enter opens and locates search result');
  await go('#library?format=image');
  assert(await evaluate('document.querySelectorAll(".doc-card").length===2'),'Image format filter');
  await go('#library?group=world');
  assert(await evaluate('document.querySelectorAll(".doc-card").length===3'),'World collection filter');
  await click('[data-action="list"]');
  assert(await evaluate('document.querySelectorAll(".document-row").length===3'),'List view');
  await click('[data-action="grid"]');
  await go('#read?doc='+encodeURIComponent(rules.id));
  await click('[data-action="bookmark"]');
  assert(await evaluate('JSON.parse(localStorage.getItem("jiuzhou-bookmarks")).length===1'),'Bookmark saved locally');
  await send('Page.reload');await waitFor('Boolean(window.__JIUZHOU__)');
  assert(await evaluate('document.querySelector("[data-action=bookmark]")?.getAttribute("aria-pressed")==="true"'),'Bookmark survives reload');
  await go('#graph?mode=impact&focus='+encodeURIComponent(rules.id));
  assert(await evaluate('document.querySelectorAll(".graph-node").length>=10&&document.querySelectorAll(".graph-edge").length===14'),'Impact graph rendered');
  assert(await evaluate('document.querySelector("#graph-inspector").textContent.includes("直接需复查")'),'Graph has impact inspector');
  await screenshot('资料库-关联图谱');
  await click('[data-action="graph-clear"]');
  assert(await evaluate('document.querySelectorAll(".relation-row").length===14'),'All impact edges have traceable relation rows');
  await click('[data-action="graph-mode"][data-mode="source"]');
  assert(await evaluate('document.querySelectorAll(".relation-row").length>0'),'Source evidence graph');
  await click('[data-action="graph-mode"][data-mode="all"]');
  assert(await evaluate('document.querySelectorAll(".graph-node").length===14'),'Images included in citation graph');
  await go('#decisions');
  assert(await evaluate('document.querySelectorAll(".decision-card").length===11'),'Decision cards complete');
  await go('#decisions?tab=tasks');
  assert(await evaluate('document.querySelectorAll(".task-card").length===8'),'Task cards complete');
  const image=data.documents.find(d=>d.format==='png');
  await go('#read?doc='+encodeURIComponent(image.id));await click('[data-action="zoom-image"]');
  await waitFor('document.getElementById("zoom-image").naturalWidth>0');
  assert(await evaluate('document.getElementById("image-dialog").open'),'Original image zoom viewer');
  const before=await evaluate('document.getElementById("zoom-image").getBoundingClientRect().width');
  await click('[data-action="image-plus"]');
  assert(await evaluate('document.getElementById("zoom-image").getBoundingClientRect().width')>before,'Image zoom changes scale');
  await click('[data-action="close-image"]');
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await go('#home');assert(await evaluate('document.querySelectorAll(".reading-step").length===4'),'Offline navigation');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(350);
  await screenshot('资料库-手机总览');
  assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'No horizontal page overflow on mobile home');
  await click('[data-action="menu"]');assert(await evaluate('document.getElementById("sidebar").classList.contains("open")'),'Mobile navigation opens');
  await go('#read?doc='+encodeURIComponent(rules.id));await delay(300);
  assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'No horizontal page overflow on mobile document');
  await screenshot('资料库-手机阅读');
  assert(!network.length,'No remote asset requests',network.join(','));
  assert(!errors.length,'No browser runtime exceptions',JSON.stringify(errors));
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed:true,checks,network,errors,profile},null,2));
  console.log(`PASS: ${checks.length} browser checks. Screenshots: ${output}`);
  await send('Browser.close').catch(()=>{});
}catch(error){
  console.error(error.stack||error);
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed:false,checks,errors,error:String(error),profile},null,2));
  process.exitCode=1;
}finally{
  ws?.close();chrome.kill();
}

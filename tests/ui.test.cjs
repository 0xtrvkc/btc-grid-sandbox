const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function setup(){
  const elements=new Map();
  const element=()=>({children:[],textContent:'',replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}});
  const downloads=new Map();
  const document={getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element};
  const c=vm.createContext({document,Intl});
  vm.runInContext(html.match(/<script id="grid-engine">([\s\S]*?)<\/script>/)[1],c);
  const app=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
  vm.runInContext(app.replace("document.addEventListener('DOMContentLoaded',init,{once:true});",`globalThis.hooks={setResult:r=>result=r,renderBootstrap,makeQuantSummary,exportConfig,setDownload:fn=>download=fn};`),c);
  c.hooks.setDownload((name,content)=>downloads.set(name,content));
  return {c,elements,downloads};
}
const config={model:'binance',spacing:'arithmetic',granularity:'1d',initialBalance:1000,bottom:70,top:130,numGrids:20,feeRate:.001};
const bars=n=>Array.from({length:n},(_,i)=>({t:Date.UTC(2025,0,1)+i*86400000,p:100+20*Math.sin(i)}));
test('robustness panel, summary and JSON export use the same computed results',()=>{
  const {c,elements,downloads}=setup(),r=c.GridEngine.simulate(bars(60),config);
  r.dataInfo={};r.quantSummary=c.hooks.makeQuantSummary(r);c.hooks.setResult(r);c.hooks.renderBootstrap();c.hooks.exportConfig();
  assert.equal(elements.get('bootstrap-scorecard').children.length,6);
  assert.match(elements.get('bootstrap-note').textContent,/1000 reproducible resamples/);
  assert.match(r.quantSummary.text,/95% percentile Sharpe range/);
  const out=JSON.parse(downloads.get('btc-grid-run.json'));
  assert.equal(out.sandbox_version,'2.1');
  assert.equal(JSON.stringify(out.bootstrap),JSON.stringify(r.analytics.bootstrap));
  assert.equal(out.stats.roi,r.stats.roi);
});
test('a short rerun removes previous robustness values and explains unavailability',()=>{
  const {c,elements}=setup();
  c.hooks.setResult(c.GridEngine.simulate(bars(60),config));c.hooks.renderBootstrap();
  const short=c.GridEngine.simulate(bars(5),config);c.hooks.setResult(short);c.hooks.renderBootstrap();
  assert.equal(elements.get('bootstrap-scorecard').children.length,0);
  assert.match(elements.get('bootstrap-note').textContent,/At least 30/);
  assert.match(c.hooks.makeQuantSummary(short).text,/Bootstrap unavailable/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = html.match(/<script id="grid-engine">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(source, context);
const E = context.GridEngine;
const DAY = E.DAY;
const daily = returns => returns.map((ret, day) => ({ret, day}));
const near = (actual, expected, tolerance=1e-9) => assert.ok(Math.abs(actual-expected)<tolerance, `${actual} != ${expected}`);

test('bootstrap matches constant-return compound formula and zero drawdown', () => {
  const b = E.bootstrap(daily(Array(40).fill(.01)));
  assert.equal(b.available, true);
  assert.equal(b.sharpe, null);
  assert.equal(b.validSharpeSamples, 0);
  near(b.returnPercent.lower, ((1.01**40)-1)*100);
  near(b.returnPercent.upper, b.returnPercent.lower);
  near(b.drawdownPercent.p99, 0);
  assert.equal(b.positivePathsPercent, 100);
});
test('constant losses include the initial peak and never become positive paths', () => {
  const b = E.bootstrap(daily(Array(40).fill(-.01)));
  near(b.drawdownPercent.p95, (1-.99**40)*100);
  assert.equal(b.positivePathsPercent, 0);
});
test('sample guards and flat-return behavior', () => {
  assert.equal(E.bootstrap(daily(Array(29).fill(.01))).available, false);
  assert.equal(E.bootstrap(daily(Array(40).fill(0))).sharpe, null);
  const broken = daily(Array(40).fill(.01)).map(x => ({...x, day:x.day*2}));
  assert.equal(E.bootstrap(broken).available, false);
  assert.equal(E.bootstrap(daily(Array(40).fill(-1))).available, false);
  assert.equal(E.bootstrap(daily(Array(40).fill(NaN))).available, false);
});
test('blocks preserve daily adjacency and disclose isolated observations', () => {
  const rows = daily(Array(30).fill(.001));
  rows.push({day:40,ret:-.5});
  const b = E.bootstrap(rows);
  assert.equal(b.eligibleBlocks, 24);
  assert.equal(b.excludedDays, 1);
  near(b.returnPercent.lower, (1.001**31-1)*100);
});
test('fixed seed is repeatable and risk-free rate shifts Sharpe only', () => {
  const rows = daily(Array.from({length:100}, (_,i) => Math.sin(i)*.02+.001));
  const b = E.bootstrap(rows, 0), b2=E.bootstrap(rows, .1);
  assert.equal(JSON.stringify(b), JSON.stringify(E.bootstrap(rows, 0)));
  assert.equal(JSON.stringify(b.returnPercent),JSON.stringify(b2.returnPercent));
  assert.equal(JSON.stringify(b.drawdownPercent),JSON.stringify(b2.drawdownPercent));
  assert.ok(b2.sharpe.upper < b.sharpe.upper);
  assert.ok(b.returnPercent.lower<=b.returnPercent.median && b.returnPercent.median<=b.returnPercent.upper);
  assert.ok(b.drawdownPercent.median<=b.drawdownPercent.p95 && b.drawdownPercent.p95<=b.drawdownPercent.p99);
});
test('simulation reconciles fee-inclusive accounting across models and exit policies', () => {
  const bars = Array.from({length:120},(_,i)=>({t:Date.UTC(2025,0,1)+i*DAY,p:100+25*Math.sin(i*.7)}));
  for(const model of ['binance','legacy'])for(const spacing of ['arithmetic','geometric'])for(const endAction of ['mark','stop'])for(const sellOnStop of [true,false]){
    const r=E.simulate(bars,{model,spacing,endAction,sellOnStop,granularity:'1d',initialBalance:1000,bottom:70,top:130,numGrids:20,feeRate:.001});
    near(r.stats.fiat+r.stats.btc*bars.at(-1).p-1000,r.stats.pnl);
    near(r.stats.realized+r.stats.unrealized,r.stats.pnl);
    near(r.stats.gridProfit+r.stats.floating,r.stats.pnl);
    assert.equal(r.analytics.bootstrap.available,true);
    assert.ok(r.rows.every(x=>x.fiat>=0 && x.btc>=0));
  }
});
test('worker and direct simulation produce identical output', () => {
  const cfg={model:'binance',spacing:'geometric',granularity:'1d',initialBalance:1000,bottom:70,top:130,numGrids:20,feeRate:.001};
  const bars=Array.from({length:60},(_,i)=>({t:Date.UTC(2025,0,1)+i*DAY,p:100+20*Math.sin(i)}));
  let message;
  const worker=vm.createContext({self:{postMessage:x=>{message=x;}}});
  vm.runInContext(source+';self.onmessage=e=>self.postMessage(GridEngine.simulate(e.data.bars,e.data.cfg));',worker);
  worker.self.onmessage({data:{bars,cfg}});
  assert.equal(JSON.stringify(message),JSON.stringify(E.simulate(bars,cfg)));
});
test('all inline scripts parse and robustness UI/export hooks are present', () => {
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  assert.match(html,/id="bootstrap-scorecard"/);
  assert.match(html,/bootstrap:r.analytics.bootstrap/);
  assert.match(html,/text:bootstrapText\(r.analytics.bootstrap\)/);
});

test('bootstrap agrees with an independent array-based reference calculation', () => {
  const rows=daily(Array.from({length:40},(_,i)=>(i%9-4)*.006+.0003));
  const actual=E.bootstrap(rows,.04);
  let state=20261004;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const sharpe=[],ret=[],dd=[];
  for(let i=0;i<1000;i++){
    const path=[];
    while(path.length<40){const start=Math.floor(random()*34);for(let j=0;j<7&&path.length<40;j++)path.push(rows[start+j].ret);}
    const mean=path.reduce((s,x)=>s+x,0)/40;
    const sd=Math.sqrt(path.reduce((s,x)=>s+(x-mean)**2,0)/39);
    sharpe.push((mean-.04/365)/sd*Math.sqrt(365));
    let equity=1,peak=1,loss=0;
    for(const x of path){equity*=1+x;peak=Math.max(peak,equity);loss=Math.max(loss,(1-equity/peak)*100);}
    ret.push((equity-1)*100);dd.push(loss);
  }
  const quantile=(a,q)=>{a.sort((x,y)=>x-y);const k=(a.length-1)*q,j=Math.floor(k);return a[j]+(a[Math.min(j+1,a.length-1)]-a[j])*(k-j);};
  near(actual.sharpe.lower,quantile(sharpe,.025));
  near(actual.sharpe.upper,quantile(sharpe,.975));
  near(actual.returnPercent.lower,quantile(ret,.025));
  near(actual.returnPercent.upper,quantile(ret,.975));
  near(actual.drawdownPercent.p95,quantile(dd,.95));
  near(actual.drawdownPercent.p99,quantile(dd,.99));
});

const fetch = require('node-fetch');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./sim-counter-100-v2-results.json', 'utf8'));
const txids = data.results.filter(r => r.ok).map(r => r.txid);
const POLL_INTERVAL_MS = 30000;
const REQ_DELAY_MS = 600;
const MAX_MIN = 90;

async function checkStatus(txid) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(`https://api.hiro.so/extended/v1/tx/0x${txid}`);
      if (r.status === 429) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (!r.ok) return { status: 'pending' };
      const d = await r.json();
      return { status: d.tx_status || 'pending', result: d.tx_result?.repr };
    } catch (e) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return { status: 'unknown' };
}

(async () => {
  const states = new Map(txids.map(t => [t, { status: 'pending' }]));
  const start = Date.now();

  while (Date.now() - start < MAX_MIN * 60 * 1000) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    let success = 0, abort = 0, pending = 0, other = 0;
    for (const txid of txids) {
      const cur = states.get(txid);
      if (cur.status === 'success' || cur.status === 'abort_by_response' || cur.status === 'abort_by_post_condition') continue;
      const s = await checkStatus(txid);
      states.set(txid, s);
      await new Promise(r => setTimeout(r, REQ_DELAY_MS));
    }
    for (const v of states.values()) {
      if (v.status === 'success') success++;
      else if (v.status === 'abort_by_response' || v.status === 'abort_by_post_condition') abort++;
      else if (v.status === 'pending') pending++;
      else other++;
    }
    console.log(`[t+${elapsed}s] success=${success} abort=${abort} pending=${pending} other=${other}`);
    if (pending === 0 && other === 0) break;
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  let success = 0, abort = 0, pending = 0, other = 0;
  const failures = [];
  for (const [txid, v] of states.entries()) {
    if (v.status === 'success') success++;
    else if (v.status === 'abort_by_response' || v.status === 'abort_by_post_condition') { abort++; failures.push({ txid, ...v }); }
    else if (v.status === 'pending') pending++;
    else other++;
  }
  console.log(`\n=== Final ===`);
  console.log(`success=${success}/${txids.length} abort=${abort} pending=${pending} other=${other}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 10)) console.log(' ', f.txid, f.status, f.result || '');
  }

  fs.writeFileSync('./sim-counter-100-v2-confirmed.json', JSON.stringify({
    polledAt: new Date().toISOString(),
    success, abort, pending, other,
    states: Object.fromEntries(states),
  }, null, 2));
  console.log('\nSaved to sim-counter-100-v2-confirmed.json');
})();

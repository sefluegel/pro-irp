(function () {
  const API_BASE = "https://pro-irp-production.up.railway.app".replace(/\/$/, "");
  function el(tag, style){ const x=document.createElement(tag); Object.assign(x.style, style||{}); return x; }
  const wrap = el('div', {
    position:'fixed', top:'10px', right:'10px', zIndex:'9999',
    display:'flex', alignItems:'center', gap:'6px',
    background:'rgba(0,0,0,0.6)', color:'#fff',
    padding:'6px 10px', borderRadius:'9999px', font:'12px system-ui, -apple-system, Segoe UI, Roboto, Arial',
    boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
  });
  const dot = el('span', { width:'10px', height:'10px', borderRadius:'50%', display:'inline-block', background:'#ef4444' });
  const label = el('span'); label.textContent = 'API Down';
  wrap.append(dot,label);

  function set(state){
    if(state==='green'){ dot.style.background='#22c55e'; label.textContent='API OK'; }
    else if(state==='amber'){ dot.style.background='#eab308'; label.textContent='API Degraded'; }
    else { dot.style.background='#ef4444'; label.textContent='API Down'; }
  }
  // expose a manual override for screenshots: window.__setApiStatus('red'|'amber'|'green')
  window.__setApiStatus = set;

  async function poll(){
    if(!API_BASE) { set('red'); return; }
    try{
      const ctl = new AbortController(); const t0=Date.now();
      const id = setTimeout(()=>ctl.abort(), 4000);
      const res = await fetch(API_BASE + '/health', { signal: ctl.signal });
      clearTimeout(id);
      const ms = Date.now()-t0;
      if(res.ok && ms < 4000) set('green'); else set('amber');
    }catch{ set('red'); }
  }

  function start(){
    document.body.appendChild(wrap);
    poll();
    setInterval(poll, 15000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

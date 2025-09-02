(function(){
  try{
    var pill = document.createElement('div');
    pill.style.cssText='position:fixed;top:14px;right:14px;background:#111a;backdrop-filter:blur(6px);color:#fff;padding:6px 10px;border-radius:16px;font:600 12px system-ui,Segoe UI,Roboto,Arial;z-index:999999;display:flex;gap:6px;align-items:center;';
    var dot = document.createElement('span');
    dot.style.cssText='width:8px;height:8px;border-radius:50%;display:inline-block;background:#aaa;';
    var txt = document.createElement('span'); txt.textContent='checking';
    pill.appendChild(dot); pill.appendChild(txt);
    document.body.appendChild(pill);

    function set(c,label){ dot.style.background=c; txt.textContent=label; }
    fetch('https://pro-irp-production.up.railway.app/health',{cache:'no-store'})
      .then(r=>{
        if(!r.ok){ set('#f87171','API down'); return; }
        return r.json().then(j=>{
          if(j && j.degraded){ set('#fbbf24','API degraded'); }
          else { set('#22c55e','API OK'); }
        });
      })
      .catch(()=> set('#f87171','API unreachable'));
  }catch(e){}
})();

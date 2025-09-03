(function () {
  var dot = document.getElementById('api-dot');
  if (!dot) return;

  // API base is injected at build time from Netlify env into index.html
  var base = (window.API_BASE || '').replace(/\/$/, '');
  if (!base) { dot.setAttribute('data-state', 'warn'); return; }

  function ping() {
    var started = Date.now();
    var timeout = setTimeout(function () {
      dot.setAttribute('data-state', 'down');
    }, 8000);

    fetch(base + '/health', { cache: 'no-store' })
      .then(function (res) {
        clearTimeout(timeout);
        if (!res.ok) { dot.setAttribute('data-state', 'down'); return; }
        return res.json().catch(function(){ return {}; }).then(function (json) {
          var ms = Date.now() - started;
          // simple latency heuristic
          if (ms < 500) dot.setAttribute('data-state', 'ok');
          else if (ms < 2000) dot.setAttribute('data-state', 'warn');
          else dot.setAttribute('data-state', 'down');
          if (json && (json.version || json.status)) {
            dot.title = 'API: ' + (json.status || 'ok') + (json.version ? ('  ' + json.version) : '');
          } else {
            dot.title = 'API reachable in ' + ms + ' ms';
          }
        });
      })
      .catch(function () { clearTimeout(timeout); dot.setAttribute('data-state', 'down'); });
  }

  ping();
  setInterval(ping, 30000);
})();

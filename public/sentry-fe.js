(function(){
  var s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/7.120.0/bundle.tracing.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = function(){
    if (!window.Sentry) return;
    window.Sentry.init({ dsn: 'https://99a3d17119d387a02397c12e39afe869@o4509928613347328.ingest.us.sentry.io/4509951855427584', tracesSampleRate: 1.0, environment: 'production' });
    window.Sentry.captureMessage('Day3 FE test event');
  };
  document.head.appendChild(s);
})();

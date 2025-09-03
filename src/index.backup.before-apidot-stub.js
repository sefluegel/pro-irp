;/*__apiBadgeContainer bootstrap  ensures global exists immediately*/
(function(){
  try{
    if (typeof window !== 'undefined' && !window.__apiBadgeContainer) {
      var el = document.createElement('div');
      el.id = '__apiBadgeContainer';
      window.__apiBadgeContainer = el;              // define it right away
      if (document.body) {
        document.body.appendChild(el);              // attach now if possible
      } else {
        document.addEventListener('DOMContentLoaded', function(){
          if (!el.isConnected) document.body.appendChild(el);
        });
      }
    }
  }catch(e){}
})();
;/*__apiBadgeContainer_FIX*/
(function(){try{
  if (typeof window !== 'undefined' && !window.__apiBadgeContainer){
    var el = document.createElement('div');
    el.id='__apiBadgeContainer';
    el.style.cssText='position:fixed;top:8px;right:8px;z-index:10000';
    document.addEventListener('DOMContentLoaded', function(){
      if (!document.getElementById('__apiBadgeContainer')){
        document.body.appendChild(el);
      }
      window.__apiBadgeContainer = document.getElementById('__apiBadgeContainer') || el;
    });
  }
}catch(e){}})();
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Support React 18 createRoot or legacy render
let __reactDom:any;
try { __reactDom = require('react-dom/client'); } catch { __reactDom = null; }
if (__reactDom && __reactDom.createRoot) {
  const r = __reactDom.createRoot(__apiBadgeContainer);
  r.render(React.createElement(ApiStatusDot, {}));
} else {
  const ReactDOM = require('react-dom');
  ReactDOM.render(React.createElement(ApiStatusDot, {}), __apiBadgeContainer);
}




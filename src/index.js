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


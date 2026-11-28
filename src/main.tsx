import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';
import './i18n';
import { gildirakniOrnatish } from './lib/sonMaydoniGildiragi';
import { nativIlovaniOrnatish } from './native/ilova';

gildirakniOrnatish();
// Android ilovasi (Capacitor): chop etish, fayl yuklash/ochish, "Orqaga" tugmasi. Vebda hech narsa qilmaydi.
void nativIlovaniOrnatish();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

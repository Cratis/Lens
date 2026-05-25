import React from 'react';
import { createRoot } from 'react-dom/client';
import 'primereact/resources/themes/lara-dark-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Popup } from './Popup';

const root = document.getElementById('root')!;
createRoot(root).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);

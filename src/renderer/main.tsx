import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import { App } from './App';
import './styles/tokens.css';
import './styles/editor.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);

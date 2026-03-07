import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initGlobalTracker } from './lib/pixel-tracker'

// Inicializar pixel tracker global
initGlobalTracker();

createRoot(document.getElementById("root")!).render(<App />);

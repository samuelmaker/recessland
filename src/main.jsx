import { createRoot } from 'react-dom/client'
import './index.css'
import { GameCanvas } from './GameCanvas.jsx'
import { GameUI } from './GameUI.jsx'

createRoot(document.getElementById('root')).render(
  <div className='canvas-container'>
    <GameCanvas />
    <GameUI />
  </div>
)

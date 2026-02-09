import { createRoot } from 'react-dom/client'
import App from './App.jsx'

/**
 * Application bootstrap entrypoint: mounts the React App into #root.
 */
createRoot(document.getElementById('root')).render(
    <App />
)

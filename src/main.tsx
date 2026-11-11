import { initTheme } from './theme/initTheme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import { AuthProvider } from './providers/AuthProvider'
import '@fontsource-variable/inter'
import './styles/index.css'

initTheme()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Thiếu phần tử #root — kiểm tra template SSR của backend')

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
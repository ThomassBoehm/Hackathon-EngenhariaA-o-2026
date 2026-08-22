import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ObraDetail from './pages/ObraDetail'
import ObraForm from './pages/ObraForm'
import ContratoUpload from './pages/ContratoUpload'
import BuscaAvancada from './pages/BuscaAvancada'
import RelatoriosPage from './pages/RelatoriosPage'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/obras" element={<Navigate to="/" replace />} />
          <Route path="/obras/nova" element={<ObraForm />} />
          <Route path="/obras/:id" element={<ObraDetail />} />
          <Route path="/obras/:id/editar" element={<ObraForm />} />
          <Route path="/upload" element={<ContratoUpload />} />
          <Route path="/busca" element={<BuscaAvancada />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </TooltipProvider>
  </BrowserRouter>
)

export default App

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './lib/auth'
import { AdminCategoria } from './pages/admin/AdminCategoria'
import { AdminCompetencia } from './pages/admin/AdminCompetencia'
import { AdminCompetencias } from './pages/admin/AdminCompetencias'
import { AdminSimulacion } from './pages/admin/AdminSimulacion'
import { AdminGuia } from './pages/admin/AdminGuia'
import { AdminInicio } from './pages/admin/AdminInicio'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminLogin } from './pages/admin/AdminLogin'
import { AdminJuzgamiento } from './pages/admin/AdminJuzgamiento'
import { AdminJuzgamientoSala } from './pages/admin/AdminJuzgamientoSala'
import { AdminUsuarios } from './pages/admin/AdminUsuarios'
import { Competitions } from './pages/Competitions'
import { Home } from './pages/Home'
import { HorseDetail } from './pages/HorseDetail'
import { PersonaDetalle } from './pages/PersonaDetalle'
import { Pista } from './pages/Pista'
import { Horses } from './pages/Horses'
import { Ranking } from './pages/Ranking'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="caballos" element={<Horses />} />
            <Route path="caballo/:id" element={<HorseDetail />} />
            <Route path="competencias" element={<Competitions />} />
            <Route path="persona/:rol/:nombre" element={<PersonaDetalle />} />
          </Route>

          {/* Jueces, pre-pista y mesa técnica entran con el código de la competencia */}
          <Route path="pista" element={<Pista />} />
          <Route path="pista/:codigo" element={<Pista />} />

          {/* Módulo de administración: no está enlazado en el menú público */}
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminInicio />} />
            <Route path="usuarios" element={<AdminUsuarios />} />
            <Route path="guia" element={<AdminGuia />} />
            <Route path="competencias" element={<AdminCompetencias />} />
            <Route path="competencias/:id" element={<AdminCompetencia />} />
            <Route path="competencias/:id/simulacion" element={<AdminSimulacion />} />
            <Route path="juzgamiento" element={<AdminJuzgamiento />} />
            <Route path="juzgamiento/:id" element={<AdminJuzgamientoSala />} />
            <Route path=":slug" element={<AdminCategoria />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

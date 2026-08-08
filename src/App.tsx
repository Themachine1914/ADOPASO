import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Competitions } from './pages/Competitions'
import { Home } from './pages/Home'
import { HorseDetail } from './pages/HorseDetail'
import { Horses } from './pages/Horses'
import { Ranking } from './pages/Ranking'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="caballos" element={<Horses />} />
          <Route path="caballo/:id" element={<HorseDetail />} />
          <Route path="competencias" element={<Competitions />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

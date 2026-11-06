import { HashRouter, Navigate, Route, Routes } from 'react-router'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/classificacio" element={<main data-screen="classificacio">MarcOna</main>} />
        <Route path="*" element={<Navigate to="/classificacio" replace />} />
      </Routes>
    </HashRouter>
  )
}

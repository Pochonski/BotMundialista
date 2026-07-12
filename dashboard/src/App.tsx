import { Routes, Route } from 'react-router-dom'
import { PageShell } from '@/presentation/components/layout/PageShell'
import { DashboardPage } from '@/presentation/pages/DashboardPage'
import { AnalysisPage } from '@/presentation/pages/AnalysisPage'
import { CompetitionPage } from '@/presentation/pages/CompetitionPage'
import { PlayerProfilePage } from '@/presentation/pages/PlayerProfilePage'
import { HistoryEditionPage } from '@/presentation/pages/HistoryEditionPage'
import { MatchDetailPage } from '@/presentation/pages/MatchDetailPage'

export default function App() {
  return (
    <PageShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analisis" element={<AnalysisPage />} />
        <Route path="/competicion" element={<CompetitionPage />} />
        <Route path="/historial/:seasonNum" element={<HistoryEditionPage />} />
        <Route path="/player/:id" element={<PlayerProfilePage />} />
        <Route path="/partido/:id" element={<MatchDetailPage />} />
      </Routes>
    </PageShell>
  )
}

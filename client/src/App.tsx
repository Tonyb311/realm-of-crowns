import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { AdminRoute } from './components/ui/AdminRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import api from './services/api';
import { GameShell } from './components/layout/GameShell';
// Global components (always loaded)
import PoliticalNotifications from './components/PoliticalNotifications';
import ChatPanel from './components/ChatPanel';
import NotificationDropdown from './components/NotificationDropdown';
import SocialEventsProvider from './components/SocialEventsProvider';
import ProgressionEventsProvider from './components/ProgressionEventsProvider';

// Lazy-loaded page components
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const CharacterCreationPage = React.lazy(() => import('./pages/CharacterCreationPage'));
const TownPage = React.lazy(() => import('./pages/TownPage'));
const MarketPage = React.lazy(() => import('./pages/MarketPage'));
const WorldMapPage = React.lazy(() => import('./pages/WorldMapPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const CraftingPage = React.lazy(() => import('./pages/CraftingPage'));
const CombatPage = React.lazy(() => import('./pages/CombatPage'));
const TownHallPage = React.lazy(() => import('./pages/TownHallPage'));
const ElectionPage = React.lazy(() => import('./pages/ElectionPage'));
const GovernancePage = React.lazy(() => import('./pages/GovernancePage'));
const KingdomPage = React.lazy(() => import('./pages/KingdomPage'));
const GuildPage = React.lazy(() => import('./pages/GuildPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const QuestJournalPage = React.lazy(() => import('./pages/QuestJournalPage'));
const SkillTreePage = React.lazy(() => import('./pages/SkillTreePage'));
const AchievementPage = React.lazy(() => import('./pages/AchievementPage'));
const ProfessionsPage = React.lazy(() => import('./pages/ProfessionsPage'));
const HousingPage = React.lazy(() => import('./pages/HousingPage'));
const TradePage = React.lazy(() => import('./pages/TradePage'));
const DiplomacyPage = React.lazy(() => import('./pages/DiplomacyPage'));
const TravelPage = React.lazy(() => import('./pages/TravelPage'));
const CodexPage = React.lazy(() => import('./pages/CodexPage'));
const JobsBoardPage = React.lazy(() => import('./pages/JobsBoardPage'));

// Landing page
const LandingPage = React.lazy(() => import('./pages/LandingPage'));

// Admin pages
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminCharactersPage = React.lazy(() => import('./pages/admin/AdminCharactersPage'));
const AdminWorldPage = React.lazy(() => import('./pages/admin/AdminWorldPage'));
const AdminEconomyPage = React.lazy(() => import('./pages/admin/AdminEconomyPage'));
const AdminToolsPage = React.lazy(() => import('./pages/admin/AdminToolsPage'));
const ErrorLogDashboardPage = React.lazy(() => import('./pages/admin/ErrorLogDashboardPage'));
const SimulationDashboardPage = React.lazy(() => import('./pages/admin/SimulationDashboardPage'));
const ContentReleasePage = React.lazy(() => import('./pages/admin/ContentReleasePage'));
const AdminMonstersPage = React.lazy(() => import('./pages/admin/AdminMonstersPage'));

function App() {
  return (
    <AuthProvider>
      <PoliticalNotifications />
      <SocialEventsProvider />
      <ProgressionEventsProvider />
      <NotificationDropdown />
      <ChatPanel />
      <div className="min-h-screen bg-realm-bg-900">
        <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes — no shell */}
          <Route path="/" element={<RootPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Character creation — protected but no game shell */}
          <Route path="/create-character" element={<ProtectedRoute><CharacterCreationPage /></ProtectedRoute>} />

          {/* Game routes — wrapped in GameShell, requires character */}
          <Route element={<ProtectedRoute><RequireCharacter><GameShell><Outlet /></GameShell></RequireCharacter></ProtectedRoute>}>
            <Route path="/town" element={<TownPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/crafting" element={<CraftingPage />} />
            <Route path="/combat" element={<CombatPage />} />
            <Route path="/map" element={<WorldMapPage />} />
            <Route path="/town-hall" element={<TownHallPage />} />
            <Route path="/elections" element={<ElectionPage />} />
            <Route path="/governance" element={<GovernancePage />} />
            <Route path="/kingdom" element={<KingdomPage />} />
            <Route path="/guild" element={<GuildPage />} />
            <Route path="/profile/:characterId" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/quests" element={<QuestJournalPage />} />
            <Route path="/skills" element={<SkillTreePage />} />
            <Route path="/achievements" element={<AchievementPage />} />
            <Route path="/professions" element={<ProfessionsPage />} />
            <Route path="/housing" element={<HousingPage />} />
            <Route path="/trade" element={<TradePage />} />
            <Route path="/diplomacy" element={<DiplomacyPage />} />
            <Route path="/travel" element={<TravelPage />} />
            <Route path="/jobs" element={<JobsBoardPage />} />
            <Route path="/codex" element={<CodexPage />} />
            <Route path="/codex/:section" element={<CodexPage />} />
          </Route>

          {/* Admin routes — own layout */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="characters" element={<AdminCharactersPage />} />
            <Route path="world" element={<AdminWorldPage />} />
            <Route path="economy" element={<AdminEconomyPage />} />
            <Route path="tools" element={<AdminToolsPage />} />
            <Route path="error-logs" element={<ErrorLogDashboardPage />} />
            <Route path="simulation" element={<SimulationDashboardPage />} />
            <Route path="content-release" element={<ContentReleasePage />} />
            <Route path="monsters" element={<AdminMonstersPage />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>
    </AuthProvider>
  );
}

function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LandingPage />;
  return <HomePage />;
}

function useCharacterCheck() {
  return useQuery<{ id: string } | null>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get('/characters/me');
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

function HomePage() {
  const { data: character, isLoading } = useCharacterCheck();
  if (isLoading) return <LoadingScreen />;
  if (!character) return <Navigate to="/create-character" replace />;
  return <Navigate to="/town" replace />;
}

function RequireCharacter({ children }: { children: React.ReactNode }) {
  const { data: character, isLoading } = useCharacterCheck();
  if (isLoading) return <LoadingScreen />;
  if (!character) return <Navigate to="/create-character" replace />;
  return <>{children}</>;
}

// MAJ-18: 404 catch-all page
function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-display text-realm-gold-400 mb-4">404</h1>
      <p className="text-xl text-realm-text-secondary mb-8 text-center max-w-lg">
        This page does not exist. Perhaps the road was lost, or the map was wrong.
      </p>
      <Link
        to="/"
        className="px-8 py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-lg rounded hover:bg-realm-gold-400 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}

export default App;

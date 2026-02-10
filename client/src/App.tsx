import React, { Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import api from './services/api';
// Global components (always loaded)
import PoliticalNotifications from './components/PoliticalNotifications';
import ChatPanel from './components/ChatPanel';
import NotificationDropdown from './components/NotificationDropdown';
import SocialEventsProvider from './components/SocialEventsProvider';
import ProgressionEventsProvider from './components/ProgressionEventsProvider';
import HUD from './components/HUD';
import Navigation from './components/ui/Navigation';

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

function App() {
  return (
    <AuthProvider>
      <PoliticalNotifications />
      <SocialEventsProvider />
      <ProgressionEventsProvider />
      <NotificationDropdown />
      <ChatPanel />
      <HUD />
      <Navigation />
      <div className="min-h-screen bg-dark-500 pb-14 md:pb-12">
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/create-character"
            element={
              <ProtectedRoute>
                <CharacterCreationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/town"
            element={
              <ProtectedRoute>
                <TownPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute>
                <MarketPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crafting"
            element={
              <ProtectedRoute>
                <CraftingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/combat"
            element={
              <ProtectedRoute>
                <CombatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <WorldMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/town-hall"
            element={
              <ProtectedRoute>
                <TownHallPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elections"
            element={
              <ProtectedRoute>
                <ElectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/governance"
            element={
              <ProtectedRoute>
                <GovernancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kingdom"
            element={
              <ProtectedRoute>
                <KingdomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guild"
            element={
              <ProtectedRoute>
                <GuildPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:characterId"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quests"
            element={
              <ProtectedRoute>
                <QuestJournalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <SkillTreePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professions"
            element={
              <ProtectedRoute>
                <ProfessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/housing"
            element={
              <ProtectedRoute>
                <HousingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade"
            element={
              <ProtectedRoute>
                <TradePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diplomacy"
            element={
              <ProtectedRoute>
                <DiplomacyPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
      </div>
    </AuthProvider>
  );
}

function HomePage() {
  const navigate = useNavigate();

  const { data: character, isLoading } = useQuery<{ id: string } | null>({
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

  const hasCharacter = !!character;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-display text-primary-400 mb-4">
        Realm of Crowns
      </h1>
      <p className="text-xl text-parchment-300 mb-8 text-center max-w-2xl">
        A fantasy MMORPG with 20 playable races, player-driven economy,
        and D&D-style adventure. Your kingdom awaits.
      </p>
      <div className="flex gap-4">
        {isLoading ? (
          <div className="text-primary-400 font-display text-lg animate-pulse">Loading...</div>
        ) : hasCharacter ? (
          <>
            <button
              onClick={() => navigate('/town')}
              className="px-8 py-3 bg-primary-400 text-dark-500 font-display text-lg rounded hover:bg-primary-300 transition-colors"
            >
              Enter Town
            </button>
            <button
              onClick={() => navigate('/map')}
              className="px-8 py-3 border border-primary-400 text-primary-400 font-display text-lg rounded hover:bg-dark-300 transition-colors"
            >
              World Map
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/create-character')}
              className="px-8 py-3 bg-primary-400 text-dark-500 font-display text-lg rounded hover:bg-primary-300 transition-colors"
            >
              Create Your Character
            </button>
            <button className="px-8 py-3 border border-primary-400 text-primary-400 font-display text-lg rounded hover:bg-dark-300 transition-colors">
              Learn More
            </button>
          </>
        )}
      </div>
      <div className="mt-16 text-parchment-500 text-sm">
        <p>20 Races - 28 Professions - 68 Towns - Your Story</p>
      </div>
    </div>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserAuthProvider } from './contexts/UserAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Logins from './pages/Logins';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import Home from './pages/Home';
import NewHome from './pages/NewHome';
import HplClubs from './pages/HplClubs';
import HplClubRules from './pages/HplClubRules';
import HplClubRegistration from './pages/HplClubRegistration';
import HplPlayerRegistration from './pages/HplPlayerRegistration';
import PlayerProfile from './pages/PlayerProfile';
import ClubProfile from './pages/ClubProfile';
import AdminDashboard from './pages/AdminDashboard';
import MyTournaments from './pages/MyTournaments';
import CreateTournament from './pages/CreateTournament';
import TournamentDetails from './pages/TournamentDetails';
import AddPlayersTeams from './pages/AddPlayersTeams';
import AddFixtures from './pages/AddFixtures';
import FixtureList from './pages/FixtureList';
import AdminCleanup from './pages/AdminCleanup';
import UmpireScoring from './pages/UmpireScoring';
import UmpireMatchList from './pages/UmpireMatchList';
import UmpireFixtureMatches from './pages/UmpireFixtureMatches';
import ApiMatchList from './pages/ApiMatchList';
import ApiFixtureMatches from './pages/ApiFixtureMatches';
import StreamingMatchList from './pages/StreamingMatchList';
import StreamingFixtureMatches from './pages/StreamingFixtureMatches';
import TVDisplay from './pages/TVDisplay';
import BasicScore from './pages/BasicScore';
import MatchDetails from './pages/MatchDetails';
import XmlFeed from './pages/XmlFeed';
import StreamingOverlay from './pages/StreamingOverlay';
import StreamingOverlayController from './pages/StreamingOverlayController';
import Rankings from './pages/Rankings';
import Settings from './pages/Settings';
import ContentManagement from './pages/ContentManagement';
import Videos from './pages/Videos';
import News from './pages/News';
import NewsArticle from './pages/NewsArticle';
import Results from './pages/Results';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import SuperAdminManagement from './pages/SuperAdminManagement';
import AdminClubs from './pages/AdminClubs';
import ScreenDisplay from './pages/ScreenDisplay';
import MainDisplay from './pages/MainDisplay';
import SideDisplay from './pages/SideDisplay';
import OutsideDisplay from './pages/OutsideDisplay';
import ExcitementDisplay from './pages/ExcitementDisplay';
import ExcitementDisplay2 from './pages/ExcitementDisplay2';
import DisplayController from './pages/DisplayController';
import FirebaseDebug from './pages/FirebaseDebug';
import LogosManager from './pages/LogosManager';
import CloudinaryTest from './pages/CloudinaryTest';
import Players from './pages/Players';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RefundPolicy from './pages/RefundPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import DuprApi from './pages/DuprApi';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserAuthProvider>
          <Router>
            <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/logins" element={<Logins />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<NewHome />} />
            <Route path="/old-home" element={<Home />} />
            <Route path="/hpl-clubs" element={<HplClubs />} />
            <Route path="/hpl-club-rules" element={<HplClubRules />} />
            <Route path="/hpl-club-registration" element={<HplClubRegistration />} />
            <Route path="/hpl-player-registration" element={<HplPlayerRegistration />} />
            <Route path="/resetpassword" element={<ResetPassword />} />
            <Route path="/player-profile/:playerId" element={<PlayerProfile />} />
            <Route path="/club-profile/:clubId" element={<ClubProfile />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsArticle />} />
            <Route path="/results" element={<Results />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:tournamentId/:teamId" element={<TeamDetail />} />
            
            {/* Policy Pages - Public Routes */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="/shipping" element={<ShippingPolicy />} />
            
            {/* Admin Dashboard - Protected Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments" element={
              <ProtectedRoute>
                <MyTournaments />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/create" element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id" element={
              <ProtectedRoute>
                <TournamentDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/players-teams" element={
              <ProtectedRoute>
                <AddPlayersTeams />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/fixtures" element={
              <ProtectedRoute>
                <AddFixtures />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/fixtures/:fixtureId" element={
              <ProtectedRoute>
                <FixtureList />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/cleanup" element={
              <ProtectedRoute>
                <AdminCleanup />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/content" element={
              <ProtectedRoute>
                <ContentManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/clubs" element={
              <ProtectedRoute>
                <AdminClubs />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/super-admins" element={
              <ProtectedRoute>
                <SuperAdminManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/logos" element={
              <ProtectedRoute>
                <LogosManager />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/cloudinary-test" element={
              <ProtectedRoute>
                <CloudinaryTest />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/players" element={
              <ProtectedRoute>
                <Players />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/players" element={
              <ProtectedRoute>
                <Players />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/dupr-api" element={
              <ProtectedRoute>
                <DuprApi />
              </ProtectedRoute>
            } />
            
            {/* Umpire Scoring Route - Public access for umpires */}
            <Route path="/umpire/:matchId" element={<UmpireScoring />} />
            
            {/* Umpire Match List Route - Public access for umpires to see all matches */}
            <Route path="/umpire-matches/:tournamentId" element={<UmpireMatchList />} />
            
            {/* Umpire Fixture Matches Route - Public access for umpires to see matches in a fixture */}
            <Route path="/umpire-matches/:tournamentId/fixture/:fixtureGroupId" element={<UmpireFixtureMatches />} />
            
            {/* API Match List Route - Public access for API JSON data */}
            <Route path="/api-matches/:tournamentId" element={<ApiMatchList />} />
            
            {/* API Fixture Matches Route - Public access for API JSON data */}
            <Route path="/api-matches/:tournamentId/fixture/:fixtureGroupId" element={<ApiFixtureMatches />} />
            
            {/* Streaming Match List Route - Public access for streaming overlays */}
            <Route path="/streaming-matches/:tournamentId" element={<StreamingMatchList />} />
            
            {/* Streaming Fixture Matches Route - Public access for streaming overlays in a fixture */}
            <Route path="/streaming-matches/:tournamentId/fixture/:fixtureGroupId" element={<StreamingFixtureMatches />} />
            
            {/* TV Display Route - Public access for TV display */}
            <Route path="/tv/:matchId" element={<TVDisplay />} />
            
            {/* Tournament Display Route - Public access for tournament display */}
            <Route path="/tournament-display/:tournamentId" element={<TVDisplay />} />
            
            {/* Screen Display Route - Public access for screen display */}
            <Route path="/screen-display/:tournamentId" element={<ScreenDisplay />} />
            
            {/* Main Display Route - Public access for main display */}
            <Route path="/main-display/:tournamentId/:dateString" element={<MainDisplay />} />
            
            {/* Side Display Route - Public access for side display */}
            <Route path="/side-display/:tournamentId/:dateString" element={<SideDisplay />} />
            
            {/* Outside Display Route - Public access for outside display */}
            <Route path="/outside-display/:tournamentId/:dateString" element={<OutsideDisplay />} />
            
            {/* Excitement Display Route - Public access for excitement display (80ft x 6ft) */}
            <Route path="/excitement-display/:tournamentId/:dateString" element={<ExcitementDisplay />} />
            
            {/* Excitement Display 2 Route - Public access for excitement display (80ft x 6ft) for Team 2 */}
            <Route path="/excitement-display-2/:tournamentId/:dateString" element={<ExcitementDisplay2 />} />
            
            {/* Display Controller Route - Public access for display management */}
            <Route path="/display-controller/:tournamentId" element={<DisplayController />} />
            
            {/* Basic Score JSON API Route - Public access for JSON API endpoint */}
            <Route path="/basic-score/:matchId" element={<BasicScore />} />
            
            {/* XML Feed Route - Public access for external applications */}
            <Route path="/xml-feed/:matchId" element={<XmlFeed />} />
            
            {/* Streaming Overlay Route - Public access for streaming overlay */}
            <Route path="/streaming-overlay/:matchId" element={<StreamingOverlay />} />
            
            {/* Streaming Overlay Controller Route - Public access for overlay control */}
            <Route path="/streaming-overlay-controller/:matchId" element={<StreamingOverlayController />} />

            {/* Firebase Debug Route - Public access for debugging */}
            <Route path="/firebase-debug" element={<FirebaseDebug />} />

            {/* Match Details Route - Public access for viewers */}
            <Route path="/match/:matchId" element={<MatchDetails />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </Router>
      </UserAuthProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;

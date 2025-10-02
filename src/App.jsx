import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
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
import StreamingMatchList from './pages/StreamingMatchList';
import StreamingFixtureMatches from './pages/StreamingFixtureMatches';
import TVDisplay from './pages/TVDisplay';
import BasicScore from './pages/BasicScore';
import MatchDetails from './pages/MatchDetails';
import XmlFeed from './pages/XmlFeed';
import StreamingOverlay from './pages/StreamingOverlay';
import Rankings from './pages/Rankings';
import Settings from './pages/Settings';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route path="/rankings" element={<Rankings />} />
            
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
            
            {/* Umpire Scoring Route - Public access for umpires */}
            <Route path="/umpire/:matchId" element={<UmpireScoring />} />
            
            {/* Umpire Match List Route - Public access for umpires to see all matches */}
            <Route path="/umpire-matches/:tournamentId" element={<UmpireMatchList />} />
            
            {/* Umpire Fixture Matches Route - Public access for umpires to see matches in a fixture */}
            <Route path="/umpire-matches/:tournamentId/fixture/:fixtureGroupId" element={<UmpireFixtureMatches />} />
            
            {/* Streaming Match List Route - Public access for streaming overlays */}
            <Route path="/streaming-matches/:tournamentId" element={<StreamingMatchList />} />
            
            {/* Streaming Fixture Matches Route - Public access for streaming overlays in a fixture */}
            <Route path="/streaming-matches/:tournamentId/fixture/:fixtureGroupId" element={<StreamingFixtureMatches />} />
            
            {/* TV Display Route - Public access for TV display */}
            <Route path="/tv/:matchId" element={<TVDisplay />} />
            
            {/* Tournament Display Route - Public access for tournament display */}
            <Route path="/tournament-display/:tournamentId" element={<TVDisplay />} />
            
            {/* Basic Score JSON API Route - Public access for JSON API endpoint */}
            <Route path="/basic-score/:matchId" element={<BasicScore />} />
            
            {/* XML Feed Route - Public access for external applications */}
            <Route path="/xml-feed/:matchId" element={<XmlFeed />} />
            
            {/* Streaming Overlay Route - Public access for streaming overlay */}
            <Route path="/streaming-overlay/:matchId" element={<StreamingOverlay />} />

            {/* Match Details Route - Public access for viewers */}
            <Route path="/match/:matchId" element={<MatchDetails />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

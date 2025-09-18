import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
import TVDisplay from './pages/TVDisplay';
import BasicScore from './pages/BasicScore';
import MatchDetails from './pages/MatchDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            
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
            
            {/* Umpire Scoring Route - Public access for umpires */}
            <Route path="/umpire/:matchId" element={<UmpireScoring />} />
            
            {/* TV Display Route - Public access for TV display */}
            <Route path="/tv/:matchId" element={<TVDisplay />} />
            
            {/* Basic Score Display Route - Public access for basic score display */}
            <Route path="/basic-score/:matchId" element={<BasicScore />} />
            
            {/* Match Details Route - Public access for viewers */}
            <Route path="/match/:matchId" element={<MatchDetails />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

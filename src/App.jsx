import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import MyTournaments from './pages/MyTournaments';
import CreateTournament from './pages/CreateTournament';
import TournamentDetails from './pages/TournamentDetails';
import AddPlayersTeams from './pages/AddPlayersTeams';
import AddFixtures from './pages/AddFixtures';
import FixtureList from './pages/FixtureList';
import AdminCleanup from './pages/AdminCleanup';
import UmpireScoring from './pages/UmpireScoring';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            
            <Route path="/tournaments" element={
              <ProtectedRoute>
                <MyTournaments />
              </ProtectedRoute>
            } />
            
            <Route path="/tournaments/create" element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            } />
            
            <Route path="/tournaments/:id" element={
              <ProtectedRoute>
                <TournamentDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/tournaments/:id/players-teams" element={
              <ProtectedRoute>
                <AddPlayersTeams />
              </ProtectedRoute>
            } />
            
            <Route path="/tournaments/:id/fixtures" element={
              <ProtectedRoute>
                <AddFixtures />
              </ProtectedRoute>
            } />
            
            <Route path="/tournaments/:id/fixtures/:fixtureId" element={
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
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

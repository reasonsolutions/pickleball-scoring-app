import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserAuthProvider } from './contexts/UserAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import UserProtectedRoute from './components/UserProtectedRoute';
import HybridProtectedRoute from './components/HybridProtectedRoute';
import Login from './pages/Login';
import Logins from './pages/Logins';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import Home from './pages/Home';
import NewHome from './pages/NewHome';
import HplClubs from './pages/HplClubs';
import HplClubRules from './pages/HplClubRules';
import Clubs from './pages/Clubs';
import ClubInfo from './pages/ClubInfo';
import ClubsResults from './pages/ClubsResults';
import HplClubRegistration from './pages/HplClubRegistration';
import HplPlayerRegistration from './pages/HplPlayerRegistration';
import PlayerProfile from './pages/PlayerProfile';
import PlayerStats from './pages/PlayerStats';
import ClubProfile from './pages/ClubProfile';
import AdminDashboard from './pages/AdminDashboard';
import MyTournaments from './pages/MyTournaments';
import CreateTournament from './pages/CreateTournament';
import TournamentDetails from './pages/TournamentDetails';
import AddPlayersTeams from './pages/AddPlayersTeams';
import AddFixtures from './pages/AddFixtures';
import FixtureList from './pages/FixtureList';
import FixtureAnalytics from './pages/FixtureAnalytics';
import AdminCleanup from './pages/AdminCleanup';
import UmpireScoring from './pages/UmpireScoring';
import UmpireScoringModern from './pages/UmpireScoringModern';
import UmpireMatchList from './pages/UmpireMatchList';
import UmpireFixtureMatches from './pages/UmpireFixtureMatches';
import ApiMatchList from './pages/ApiMatchList';
import ApiFixtureMatches from './pages/ApiFixtureMatches';
import StreamingMatchList from './pages/StreamingMatchList';
import StreamingFixtureMatches from './pages/StreamingFixtureMatches';
import StreamingVenues from './pages/StreamingVenues';
import VenueScreen from './pages/VenueScreen';
import VenueScreenDisplay from './pages/VenueScreenDisplay';
import StreamingAds from './pages/StreamingAds';
import TVDisplay from './pages/TVDisplay';
import BasicScore from './pages/BasicScore';
import MatchDetails from './pages/MatchDetails';
import XmlFeed from './pages/XmlFeed';
import WebmSqueezer from './pages/WebmSqueezer';
import StreamingOverlay from './pages/StreamingOverlay';
import StreamingOverlayController from './pages/StreamingOverlayController';
import StreamingVenueOverlay from './pages/StreamingVenueOverlay';
import Rankings from './pages/Rankings';
import HplPlayerRankings from './pages/HplPlayerRankings';
import ClubsTable from './pages/ClubsTable';
import Settings from './pages/Settings';
import AppSettings from './pages/AppSettings';
import ContentManagement from './pages/ContentManagement';
import Videos from './pages/Videos';
import News from './pages/News';
import NewsArticle from './pages/NewsArticle';
import Results from './pages/Results';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import SuperAdminManagement from './pages/SuperAdminManagement';
import AdminClubs from './pages/AdminClubs';
import AdminPlayers from './pages/AdminPlayers';
import ScreenDisplay from './pages/ScreenDisplay';
import MainDisplay from './pages/MainDisplay';
import MainDisplay1 from './pages/MainDisplay1';
import SideDisplay from './pages/SideDisplay';
import OutsideDisplay from './pages/OutsideDisplay';
import PerimeterDisplay from './pages/PerimeterDisplay';
import ExcitementDisplay from './pages/ExcitementDisplay';
import ExcitementDisplay2 from './pages/ExcitementDisplay2';
import DisplayController from './pages/DisplayController';
import DisplayRemote from './pages/DisplayRemote';
import FirebaseDebug from './pages/FirebaseDebug';
import LogosManager from './pages/LogosManager';
import CloudinaryTest from './pages/CloudinaryTest';
import Players from './pages/Players';
import DownloadTeamLogos from './pages/DownloadTeamLogos';
import GreenScreen from './pages/GreenScreen';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RefundPolicy from './pages/RefundPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import DuprApi from './pages/DuprApi';
import Shop from './pages/Shop';
import Ticketing from './pages/Ticketing';
import TicketingAnalysis from './pages/TicketingAnalysis';
import CreateMatchDay from './pages/CreateMatchDay';
import MatchDayOrders from './pages/MatchDayOrders';
import PassScanner from './pages/PassScanner';
import Draft from './pages/Draft';
import Fantasy from './pages/Fantasy';
import FantasyPlayerDetail from './pages/FantasyPlayerDetail';
import FantasyTeamDetail from './pages/FantasyTeamDetail';
import AppUsers from './pages/AppUsers';

import AdminDraftView from './pages/AdminDraftView';
import DraftMainScreenDisplay from './pages/DraftMainScreenDisplay';
import TeamDraftRoom from './pages/TeamDraftRoom';
import Vendors from './pages/Vendors';
import VendorSetupPassword from './pages/VendorSetupPassword';
import VendorLogin from './pages/VendorLogin';
import VendorHome from './pages/VendorHome';
import CCPLHome from './pages/CCPLHome';
import CCPLSignup from './pages/CCPLSignup';
import CCPLLogin from './pages/CCPLLogin';
import CCPLResetPassword from './pages/CCPLResetPassword';
import CCPLProfile from './pages/CCPLProfile';
import CcplTeamProfile from './pages/CcplTeamProfile';
import CcplTeams from './pages/CcplTeams';
import CcplTeamDetails from './pages/CcplTeamDetails';
import CcplNewsArticle from './pages/CcplNewsArticle';
import CcplFixtures from './pages/CcplFixtures';
import CcplPasses from './pages/CcplPasses';
import CcplFantasy from './pages/CcplFantasy';
import TeamAdminSetupPassword from './pages/TeamAdminSetupPassword';
import Careers from './pages/Careers';
import CareerDetail from './pages/CareerDetail';
import AdminCareers from './pages/AdminCareers';
import CreateCareer from './pages/CreateCareer';
import CareerApplications from './pages/CareerApplications';
import Support from './pages/Support';

function App() {
  // Debug logging for routing
  React.useEffect(() => {
    console.log('🚀 App component mounted');
    console.log('📍 Current pathname:', window.location.pathname);
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <UserAuthProvider>
            <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/logins" element={<Logins />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<CCPLHome />} />
            <Route path="/ccpl-home" element={<CCPLHome />} />
            <Route path="/ccpl-s1" element={<NewHome />} />
            <Route path="/new-home" element={<NewHome />} />
            <Route path="/old-home" element={<Home />} />
            <Route path="/hpl-clubs" element={<HplClubs />} />
            <Route path="/hpl-club-rules" element={<HplClubRules />} />
            <Route path="/hpl-club-registration" element={<HplClubRegistration />} />
            <Route path="/hpl-player-registration" element={<HplPlayerRegistration />} />
            <Route path="/ccpl-signup" element={<CCPLSignup />} />
            <Route path="/ccpl-login" element={<CCPLLogin />} />
            <Route path="/ccpl-reset-password" element={<CCPLResetPassword />} />
            <Route path="/ccpl-profile/:userId" element={<CCPLProfile />} />
            <Route path="/ccpl-teamprofile/:teamId" element={<CcplTeamProfile />} />
            <Route path="/ccpl-teams" element={<CcplTeams />} />
            <Route path="/ccpl-teams/:teamSlug" element={<CcplTeamDetails />} />
            <Route path="/ccpl-fixtures" element={<CcplFixtures />} />
            <Route path="/ccpl-passes" element={<CcplPasses />} />
            <Route path="/ccplfantasy" element={<CcplFantasy />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/club-info/:clubId" element={<ClubInfo />} />
            <Route path="/clubs-results" element={<ClubsResults />} />
            <Route path="/resetpassword" element={<ResetPassword />} />
            <Route path="/player-profile/:playerId" element={
              <UserProtectedRoute>
                <PlayerProfile />
              </UserProtectedRoute>
            } />
            <Route path="/player-stats/:playerId" element={<PlayerStats />} />
            <Route path="/club-info/:clubId/player-stats/:playerId" element={<PlayerStats />} />
            <Route path="/club-profile/:clubId" element={
              <UserProtectedRoute>
                <ClubProfile />
              </UserProtectedRoute>
            } />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/hpl-player-rankings" element={<HplPlayerRankings />} />
            <Route path="/clubs-table" element={<ClubsTable />} />
            <Route path="/download-team-logos" element={<DownloadTeamLogos />} />
            <Route path="/greenscreen" element={<GreenScreen />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<CcplNewsArticle />} />
            <Route path="/results" element={<Results />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:tournamentId/:teamId" element={<TeamDetail />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/careers/:id" element={<CareerDetail />} />
            <Route path="/support" element={<Support />} />
            
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
              <HybridProtectedRoute>
                <TournamentDetails />
              </HybridProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/players-teams" element={
              <HybridProtectedRoute>
                <AddPlayersTeams />
              </HybridProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/fixtures" element={
              <HybridProtectedRoute>
                <AddFixtures />
              </HybridProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/fixtures/:fixtureId" element={
              <HybridProtectedRoute>
                <FixtureList />
              </HybridProtectedRoute>
            } />
            
            <Route path="/admin/tournaments/:id/analytics" element={
              <HybridProtectedRoute>
                <FixtureAnalytics />
              </HybridProtectedRoute>
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
            
            <Route path="/admin/app-settings" element={
              <ProtectedRoute>
                <AppSettings />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/content" element={
              <ProtectedRoute>
                <ContentManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/app-users" element={
              <ProtectedRoute>
                <AppUsers />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/clubs" element={
              <ProtectedRoute>
                <AdminClubs />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/players" element={
              <ProtectedRoute>
                <AdminPlayers />
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
            
            <Route path="/admin/draft" element={
              <ProtectedRoute>
                <Draft />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/fantasy" element={
              <ProtectedRoute>
                <Fantasy />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/fantasy/player/:playerId" element={
              <ProtectedRoute>
                <FantasyPlayerDetail />
              </ProtectedRoute>
            } />

            <Route path="/admin/fantasy/team/:teamId" element={
              <ProtectedRoute>
                <FantasyTeamDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/shop" element={
              <ProtectedRoute>
                <Shop />
              </ProtectedRoute>
            } />

            <Route path="/admin/careers" element={
              <ProtectedRoute>
                <MainLayout><AdminCareers /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/careers/create" element={
              <ProtectedRoute>
                <MainLayout><CreateCareer /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/careers/edit/:id" element={
              <ProtectedRoute>
                <MainLayout><CreateCareer /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/careers/:id/applications" element={
              <ProtectedRoute>
                <MainLayout><CareerApplications /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/ticketing" element={
              <ProtectedRoute>
                <MainLayout><Ticketing /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/ticketing/analysis" element={
              <ProtectedRoute>
                <MainLayout><TicketingAnalysis /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/ticketing/create" element={
              <ProtectedRoute>
                <MainLayout><CreateMatchDay /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/ticketing/edit/:id" element={
              <ProtectedRoute>
                <MainLayout><CreateMatchDay /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/ticketing/orders/:id" element={
              <ProtectedRoute>
                <MainLayout><MatchDayOrders /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Gate scanner - public so gate staff can scan without logging in */}
            <Route path="/admin/ticketing/scan/:id" element={<PassScanner />} />

            <Route path="/admin/vendors" element={
              <ProtectedRoute>
                <Vendors />
              </ProtectedRoute>
            } />

            {/* Vendor Setup Password Route - Public access for vendors */}
            <Route path="/vendor/setup-password" element={<VendorSetupPassword />} />

            {/* Vendor Login Route - Public access for vendors */}
            <Route path="/vendor/login" element={<VendorLogin />} />

            {/* Vendor Home Route - POS System for logged-in vendors */}
            <Route path="/vendor/home" element={<VendorHome />} />

            {/* Team Admin Setup Password Route - Public access for team admins */}
            <Route path="/team-admin/setup-password" element={<TeamAdminSetupPassword />} />

            
            <Route path="/admin-draft-view" element={<AdminDraftView />} />
            
            <Route path="/draft-main-screen-display" element={<DraftMainScreenDisplay />} />
            
            <Route path="/team-draft-room" element={<TeamDraftRoom />} />
            
            {/* Umpire Scoring Route - Public access for umpires */}
            <Route path="/umpire/:matchId" element={<UmpireScoringModern />} />
            
            {/* Old Umpire Scoring Route - Backup if needed */}
            <Route path="/umpire-old/:matchId" element={<UmpireScoring />} />
            
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
            
            {/* Streaming Venues Route - Public access for streaming overlays grouped by venue */}
            <Route path="/streaming-venues/:tournamentId" element={
              <>
                {console.log('✅ Matched /streaming-venues route')}
                <StreamingVenues />
              </>
            } />
            
            {/* Venue Screen Route - Public access for venue screen display */}
            <Route path="/venue-screen/:tournamentId" element={
              <>
                {console.log('✅ Matched /venue-screen route')}
                <VenueScreen />
              </>
            } />
            
            {/* Venue Screen Display Route - Public access for venue-specific display */}
            <Route path="/venue-screen-display/:tournamentId/:venueName/:dateString" element={
              <>
                {console.log('✅ Matched /venue-screen-display route')}
                <VenueScreenDisplay />
              </>
            } />
            
            {/* Streaming Ads Route - Public access for streaming ads overlay */}
            <Route path="/streaming-ads/:tournamentId" element={<StreamingAds />} />
            
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
            
            {/* Main Display 1 Route - Public access for main display with new UI */}
            <Route path="/main-display1/:tournamentId/:dateString" element={<MainDisplay1 />} />
            
            {/* Side Display Route - Public access for side display */}
            <Route path="/side-display/:tournamentId/:dateString" element={<SideDisplay />} />
            
            {/* Outside Display Route - Public access for outside display */}
            <Route path="/outside-display/:tournamentId/:dateString" element={<OutsideDisplay />} />

            {/* Court perimeter LED boards (Millumin output) - Public access */}
            <Route path="/main-court-perimeter/:tournamentId/:dateString" element={<PerimeterDisplay court="main" />} />
            <Route path="/side-court-perimeter/:tournamentId/:dateString" element={<PerimeterDisplay court="side" />} />
            
            {/* Excitement Display Route - Public access for excitement display (80ft x 6ft) */}
            <Route path="/excitement-display/:tournamentId/:dateString" element={<ExcitementDisplay />} />
            
            {/* Excitement Display 2 Route - Public access for excitement display (80ft x 6ft) for Team 2 */}
            <Route path="/excitement-display-2/:tournamentId/:dateString" element={<ExcitementDisplay2 />} />
            
            {/* Display Controller Route - Public access for display management */}
            <Route path="/display-controller/:tournamentId" element={<DisplayController />} />

            {/* Remote Route - Phone-friendly control for main and side displays */}
            <Route path="/remote/:tournamentId" element={<DisplayRemote />} />
            
            {/* Basic Score JSON API Route - Public access for JSON API endpoint */}
            <Route path="/basic-score/:matchId" element={<BasicScore />} />
            
            {/* WebM Squeezer - Public in-browser MP4 to WebM converter */}
            <Route path="/webm" element={<WebmSqueezer />} />
            
            {/* XML Feed Route - Public access for external applications */}
            <Route path="/xml-feed/:matchId" element={<XmlFeed />} />
            
            {/* Streaming Overlay Route - Public access for streaming overlay */}
            <Route path="/streaming-overlay/:matchId" element={<StreamingOverlay />} />
            
            {/* Streaming Venue Overlay Route - Public access for venue-specific streaming overlay */}
            <Route path="/streaming-venue-overlay/:venueId/:tournamentId" element={<StreamingVenueOverlay />} />
            
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
          </UserAuthProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

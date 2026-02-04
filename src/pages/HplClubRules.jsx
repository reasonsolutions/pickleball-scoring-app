import React from 'react';
import { Link } from 'react-router-dom';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';

// Import Avantique fonts
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function HplClubRules() {
  // Add font styles
  const fontStyles = `
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueBoldFont}') format('woff');
      font-weight: bold;
      font-style: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueRegularFont}') format('woff');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueMediumFont}') format('woff');
      font-weight: 500;
      font-style: normal;
    }
    @font-face {
      font-family: 'Avantique';
      src: url('${AvantiqueSemiboldFont}') format('woff');
      font-weight: 600;
      font-style: normal;
    }
  `;

  return (
    <div className="min-h-screen" style={{backgroundColor: '#212121'}}>
      {/* Inject font styles */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      {/* Navigation */}
      <NewHomeNavbar />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-white text-4xl md:text-6xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
            READ THIS BEFORE APPLYING AS A CLUB
          </h1>
          <div className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-4xl mx-auto" style={{fontFamily: 'Avantique, sans-serif'}}>
            <p className="mb-4">
              The HPL Club League is a <span className="text-orange-400 font-semibold">grassroots, club-based pickleball competition</span> designed to build long-term community, identity, and structure within the sport.
            </p>
            <p className="mb-4">
              This is <span className="text-orange-400 font-semibold">not</span> a tournament. This is <span className="text-orange-400 font-semibold">not</span> a franchise model.
            </p>
            <p>
              It is a league built around <span className="text-orange-400 font-semibold">clubs, responsibility, and belonging</span>. Before applying, please read the following carefully.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">01</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              1. WHAT THE HPL CLUB LEAGUE IS
            </h2>
            <ul className="text-gray-300 space-y-3 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• A 20-club league, split into two conferences</li>
              <li>• Each club fields a squad of 10 players per matchday</li>
              <li>• The league runs as a full season, not a one-off event</li>
              <li>• Matches follow the HPL format (6 matches + Gamebreaker)</li>
              <li>• The season culminates in playoffs and the HPL State of the League (Grand Final)</li>
            </ul>
            <p className="text-gray-300 mt-6 text-lg italic" style={{fontFamily: 'Avantique, sans-serif'}}>
              This is a grassroots competition — focused on development, community, and structured competition rather than elite-only participation.
            </p>
            <p className="text-gray-300 mt-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              All registrations, matching, scheduling, and governance are conducted through <span className="text-orange-400 font-semibold">thehpl.in</span>.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">02</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              2. LEAGUE FORMAT & COMPETITION STRUCTURE
            </h2>
            <p className="text-gray-300 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              The HPL Club League follows a structured, season-long competition format designed to balance competitiveness, fairness, and consistency across all clubs.
            </p>
            
            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              2.1 CONFERENCES & LEAGUE STAGE
            </h3>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• The league consists of 20 clubs, divided into:</li>
              <li className="ml-6">○ Conference A (10 clubs)</li>
              <li className="ml-6">○ Conference B (10 clubs)</li>
              <li>• Each club plays every other club in its conference once</li>
              <li>• This results in: 9 league ties per club in the conference stage</li>
            </ul>

            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              2.2 HOME & AWAY MATCHES
            </h3>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Of the 9 conference ties:</li>
              <li className="ml-6">○ 4 or 5 will be home ties</li>
              <li className="ml-6">○ 4 or 5 will be away ties</li>
              <li>• Each club must attach itself to one designated home venue, which represents the club's base and community</li>
            </ul>

            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              2.3 QUALIFICATION FOR PLAYOFFS
            </h3>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• From each conference: Top 5 clubs qualify for the playoffs</li>
              <li>• Playoff structure:</li>
              <li className="ml-6">○ The top-ranked club in each conference qualifies directly for the Conference Final</li>
              <li className="ml-6">○ The next four clubs play knockout ties to determine who faces the top seed</li>
              <li>• The Two Conference Champions advance to the Grand Final: HPL State of the League</li>
            </ul>

            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              2.4 TOTAL MATCHES & SEASON COMMITMENT
            </h3>
            <ul className="text-gray-300 space-y-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Each club is guaranteed: 9 league ties in the conference stage</li>
              <li>• Clubs reaching playoffs will play additional knockout ties</li>
              <li>• The format ensures that every club participates in a meaningful, table-driven season, not a short elimination event</li>
            </ul>
          </div>

          {/* Matchday & Tie Format Section */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500">
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              MATCHDAY & TIE FORMAT
            </h2>
            
            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              Tie Structure (HPL Format)
            </h3>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Each tie between two clubs consists of:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• 6 matches, played in the following order:</li>
              <li className="ml-6">○ Men's Doubles 1</li>
              <li className="ml-6">○ Women's Doubles</li>
              <li className="ml-6">○ Men's Singles</li>
              <li className="ml-6">○ Women's Singles</li>
              <li className="ml-6">○ Men's Doubles 2</li>
              <li className="ml-6">○ Mixed Doubles</li>
              <li>• If the tie is level after 6 matches, a Gamebreaker is played to decide the winner</li>
              <li>• No Player can play more than 2 games in a tie</li>
              <li>• Both Men's doubles teams have to be completely unique</li>
            </ul>

            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              Match Scoring Format
            </h3>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Every match within a tie is played as:</li>
              <li className="ml-6">○ Match is played to <span className="font-bold">15 points</span></li>
              <li className="ml-6">○ <span className="font-bold">Serve Point Scoring</span> is followed</li>
            </ul>

            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              This format:
            </p>
            <ul className="text-gray-300 space-y-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Rewards consistency</li>
              <li>• Reduces randomness</li>
            </ul>

            <div className="bg-orange-900 bg-opacity-30 rounded-xl p-6 mt-6">
              <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                WHY THIS FORMAT MATTERS
              </h3>
              <ul className="text-gray-300 space-y-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                <li>• Encourages depth over dependence on a few players</li>
                <li>• Creates season-long narratives and rivalries</li>
                <li>• Rewards well-managed clubs, not just strong individuals</li>
                <li>• Aligns with international best practices while remaining grassroots-friendly</li>
              </ul>
              <p className="text-orange-400 font-semibold mt-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                A 20-club, conference-based league with a full season, structured playoffs, and a standardised HPL match format designed for competitive, grassroots club sport.
              </p>
            </div>
          </div>

          {/* Section 3 - New League Start Question */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">03</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              3. WHEN WILL THE LEAGUE START?
            </h2>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              The HPL Club League is scheduled to run for 9-12 weeks during the months of March, April, and May.
            </p>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              The exact start and end dates for the league will be confirmed and communicated to all participating clubs by the end of February 2026.
            </p>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              This timeline ensures optimal weather conditions and allows clubs adequate preparation time for the season.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">04</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              4. WHAT CAN BE A CLUB
            </h2>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              A club does not need to be a company or commercial entity.
            </p>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              A club can be:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• A residential society or gated community</li>
              <li>• A pickleball or sports venue</li>
              <li>• A coaching academy or training centre</li>
              <li>• A social or recreational group</li>
              <li>• A corporate or institutional group</li>
              <li>• An independent pickleball collective</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              What matters is intent, organisation, and accountability, not legal structure.
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">05</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              5. WHAT IT MEANS TO BE A CLUB
            </h2>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Being a club in the HPL Club League means taking responsibility, not just participating.
            </p>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              A club is expected to:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Build and manage a 10-player team</li>
              <li>• Appoint one Club Manager with full authority</li>
              <li>• Represent a clear community or identity</li>
              <li>• Commit for the entire season</li>
              <li>• Uphold league standards of conduct and professionalism</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Clubs act as the local representatives of the league within their communities.
            </p>
          </div>

          {/* Section 6 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">06</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              6. THE CLUB MANAGER (NON-NEGOTIABLE)
            </h2>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Each club must appoint one Club Manager who:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Is the sole point of contact with the league</li>
              <li>• Has full decision-making authority</li>
              <li>• Oversees player selection and communication</li>
              <li>• Is responsible for matchday coordination</li>
              <li>• Is accountable for behaviour and compliance</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Clubs without a clearly empowered Club Manager will not be approved.
            </p>
          </div>

          {/* Section 7 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">07</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              7. TEAM COMPOSITION & PLAYER ELIGIBILITY
            </h2>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Each club must field a squad of 10 players</li>
              <li>• Players are selected only through the official platform process</li>
              <li>• Only players with DUPR ≤ 4.2** at the time of intimation of the club league are eligible to apply</li>
              <li>• Selection does not guarantee playing time — that remains a sporting decision</li>
            </ul>
            <p className="text-gray-300 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              **Subject to League's discretion. The eligibility will be a subject of the HPL Player index which is derived from DUPR (Ratings and Reliability)
            </p>
          </div>

          {/* Section 8 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">08</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              8. HOW PLAYERS JOIN CLUBS
            </h2>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Players register centrally on thehpl.in</li>
              <li>• Players may express interest in multiple clubs</li>
              <li>• Clubs review profiles and send invitations</li>
              <li>• Players choose which club to accept</li>
              <li>• Once accepted, player pays the registration fee (Rs. 5,000/-) and the player is locked to that club</li>
              <li>• The Players are not paid for their participation in the League</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              All club–player matching happens only on the platform.
            </p>
          </div>

          {/* Section 9 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">09</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              9. PLAYER DROPS & REPLACEMENTS
            </h2>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Clubs may drop players during the season for valid reasons (availability, conduct, commitment)</li>
              <li>• Replacement players must:</li>
              <li className="ml-6">○ Come from the registered player pool</li>
              <li className="ml-6">○ Match the required gender slot</li>
              <li className="ml-6">○ Be approved by the league</li>
            </ul>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              This ensures continuity while maintaining fairness.
            </p>
            <p className="text-gray-300 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              A detailed transfer policy (if any) will be communicated separately once finalised by the league.
            </p>
          </div>

          {/* Section 10 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">10</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              10. HOME VENUE & HOSTING
            </h2>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Each club must:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Declare one home venue</li>
              <li>• A venue can be home for a maximum of two clubs – The 2 clubs will be placed in separate conferences</li>
              <li>• Host assigned home matchdays – it is encouraged to create a good event. Clubs can create their own unique selling points during their home days.</li>
              <li>• Cooperate with league-appointed referees and match coordinators</li>
            </ul>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              The league handles:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Match officials</li>
              <li>• Scheduling</li>
              <li>• Recording and oversight</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Clubs are responsible for venue readiness and professionalism.
            </p>
          </div>

          {/* Section 11 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">11</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              11. CLUB CULTURE & PLAYER EXPERIENCE
            </h2>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Clubs are expected to create a positive, engaging experience for players.
            </p>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              This can include (but is not limited to):
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Training or practice sessions</li>
              <li>• Coaching or mentoring support</li>
              <li>• Team bonding activities</li>
              <li>• Social interactions and fun elements</li>
              <li>• Clear communication and inclusion</li>
              <li>• Engaging local community and supporters</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              The league values authentic culture — competitive, social, learning-focused, or a healthy mix.
            </p>
          </div>

          {/* Section 12 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">12</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              12. BRANDING, JERSEYS & IDENTITY
            </h2>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Jerseys and logos will follow league-wide standards</li>
              <li>• Clubs will express identity through:</li>
              <li className="ml-6">○ Approved naming formats</li>
              <li className="ml-6">○ Approved colour selections</li>
              <li className="ml-6">○ Club culture and storytelling</li>
            </ul>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              The league will:
            </p>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Share branding and jersey guidelines in advance</li>
              <li>• Recommend a vendor group to ensure best pricing and quality</li>
              <li>• Maintain visual consistency across all clubs</li>
            </ul>
            
            <div className="bg-orange-900 bg-opacity-30 rounded-xl p-6 mt-6">
              <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                Approved Club Name Suffixes
              </h3>
              <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                All clubs must end with one of the following:
              </p>
              <ul className="text-gray-300 space-y-2 text-lg grid grid-cols-2 md:grid-cols-4 gap-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                <li>• PC (Pickleball Club)</li>
                <li>• PBC (Pickleball Center)</li>
                <li>• Athletic</li>
                <li>• Academy</li>
                <li>• Collective</li>
                <li>• Crew</li>
                <li>• Union</li>
                <li>• Social</li>
              </ul>
            </div>
          </div>

          {/* Section 13 - Fees */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">13</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              13. FEES & FINANCIAL TRANSPARENCY
            </h2>
            <div className="bg-orange-900 bg-opacity-30 rounded-xl p-6 mb-6">
              <p className="text-orange-300 text-2xl font-bold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                Total Club Fee: ₹2,00,000 + applicable taxes
              </p>
              <p className="text-gray-300 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                This includes:
              </p>
              <ul className="text-gray-300 space-y-2 mt-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                <li>• ₹5,000 Application Fee (paid at form submission), refunded if club doesn't get approved.</li>
                <li>• Remaining amount payable upon approval</li>
              </ul>
            </div>
            
            <h3 className="text-orange-300 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              What the League Uses This For
            </h3>
            <p className="text-gray-300 mb-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Club fees contribute towards:
            </p>
            <ul className="text-gray-300 space-y-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• League operations and staffing</li>
              <li>• Match officials and coordinators</li>
              <li>• Technology and platform development (thehpl.in)</li>
              <li>• Scheduling, governance, and compliance</li>
              <li>• Media, recording, and documentation</li>
              <li>• Hosting and producing the HPL State of the League (Grand Final)</li>
            </ul>
            <p className="text-orange-400 font-semibold mt-4 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              This transparency ensures clubs know exactly what they are buying into.
            </p>
          </div>

          {/* Section 14 */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">14</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              14. SEASON-BY-SEASON APPROVAL
            </h2>
            <ul className="text-gray-300 space-y-2 mb-6 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              <li>• Clubs are approved for one season only</li>
              <li>• End-of-season review is conducted based on:</li>
              <li className="ml-6">○ Player feedback – 25 points</li>
              <li className="ml-6">○ Other clubs' feedback – 25 points</li>
              <li className="ml-6">○ Referee and coordinator reports – 25 points</li>
              <li className="ml-6">○ League oversight assessment – 25 points</li>
            </ul>
            <p className="text-orange-400 font-semibold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
              Clubs must score 60/100 or above to be eligible for the next season.
            </p>
          </div>

          {/* Section 15 - Who This League Is For */}
          <div className="bg-gray-800 rounded-2xl p-8 border-l-4 border-orange-500 relative">
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">15</span>
            </div>
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              15. WHO THIS LEAGUE IS FOR
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-900 bg-opacity-30 rounded-xl p-6">
                <h3 className="text-green-400 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                  This league is FOR clubs that:
                </h3>
                <ul className="text-gray-300 space-y-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  <li>• Believe in grassroots growth</li>
                  <li>• Value structure and accountability</li>
                  <li>• Want to build community through sport</li>
                  <li>• Are comfortable operating within a system</li>
                </ul>
              </div>
              
              <div className="bg-red-900 bg-opacity-30 rounded-xl p-6">
                <h3 className="text-red-400 text-xl font-bold mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
                  This league is NOT for:
                </h3>
                <ul className="text-gray-300 space-y-2 text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>
                  <li>• Informal or unaccountable groups</li>
                  <li>• Clubs seeking constant exceptions</li>
                  <li>• Those uncomfortable with league authority</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Final Note */}
          <div className="bg-gradient-to-r from-orange-900 via-gray-900 to-black rounded-2xl p-8 text-center">
            <h2 className="text-orange-400 text-2xl md:text-3xl font-bold mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              16. FINAL NOTE
            </h2>
            <p className="text-white text-xl mb-6" style={{fontFamily: 'Avantique, sans-serif'}}>
              Applying as a club is a statement of intent.
            </p>
            <p className="text-gray-300 text-lg mb-4" style={{fontFamily: 'Avantique, sans-serif'}}>
              If approved, you are committing to:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-500 bg-opacity-20 rounded-lg p-4">
                <span className="text-orange-300 font-bold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>A season</span>
              </div>
              <div className="bg-orange-500 bg-opacity-20 rounded-lg p-4">
                <span className="text-orange-300 font-bold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>A team</span>
              </div>
              <div className="bg-orange-500 bg-opacity-20 rounded-lg p-4">
                <span className="text-orange-300 font-bold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>A standard</span>
              </div>
              <div className="bg-orange-500 bg-opacity-20 rounded-lg p-4">
                <span className="text-orange-300 font-bold text-lg" style={{fontFamily: 'Avantique, sans-serif'}}>A community</span>
              </div>
            </div>
            <p className="text-orange-400 text-xl font-semibold" style={{fontFamily: 'Avantique, sans-serif'}}>
              If this resonates with you, we welcome your application.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
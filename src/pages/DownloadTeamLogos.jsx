import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Import Avantique fonts
import AvantiqueBoldFont from '../assets/fonts/Avantique/Avantique-Bold.woff';
import AvantiqueRegularFont from '../assets/fonts/Avantique/Avantique-Regular.woff';
import AvantiqueMediumFont from '../assets/fonts/Avantique/Avantique-Medium.woff';
import AvantiqueSemiboldFont from '../assets/fonts/Avantique/Avantique-Semibold.woff';

export default function DownloadTeamLogos() {
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

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Fetch teams from HPL Clubs tournament
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);

        // Find the HPL Clubs tournament
        const tournamentsRef = collection(db, 'tournaments');
        const tournamentsSnapshot = await getDocs(tournamentsRef);

        let hplClubsTournamentId = null;
        tournamentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.name === 'HPL Clubs' ||
              data.tournamentName === 'HPL Clubs' ||
              data.name?.toLowerCase().includes('hpl clubs') ||
              data.tournamentName?.toLowerCase().includes('hpl clubs')) {
            hplClubsTournamentId = doc.id;
          }
        });

        if (!hplClubsTournamentId) {
          setTeams([]);
          setLoading(false);
          return;
        }

        // Fetch clubs from hpl-clubs collection to get logos
        const clubsRef = collection(db, 'hpl-clubs');
        const clubsSnapshot = await getDocs(clubsRef);
        const clubsData = {};
        clubsSnapshot.docs.forEach(doc => {
          clubsData[doc.id] = doc.data();
        });

        // Fetch teams for HPL Clubs tournament
        const teamsQuery = query(
          collection(db, 'teams'),
          where('tournamentId', '==', hplClubsTournamentId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => {
          const teamData = doc.data();
          let clubLogo = null;
          for (const clubId in clubsData) {
            const club = clubsData[clubId];
            if (club.name === teamData.name || club.clubName === teamData.name) {
              if (club.teamLogo && club.teamLogo.url) {
                clubLogo = { url: club.teamLogo.url };
              } else if (club.logo && club.logo.url) {
                clubLogo = { url: club.logo.url };
              } else if (club.teamLogo && typeof club.teamLogo === 'string') {
                clubLogo = { url: club.teamLogo };
              } else if (club.logo && typeof club.logo === 'string') {
                clubLogo = { url: club.logo };
              }
              break;
            }
          }
          return {
            id: doc.id,
            ...teamData,
            logo: clubLogo || teamData.logo
          };
        }).filter(team => team.logo && team.logo.url);

        setTeams(teamsData);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const toggleTeamSelection = (teamId) => {
    const newSelected = new Set(selectedTeams);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeams(newSelected);
  };

  const selectAll = () => {
    if (selectedTeams.size === teams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(teams.map(t => t.id)));
    }
  };

  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
      return await response.blob();
    } catch (error) {
      console.error(`Error downloading ${filename}:`, error);
      return null;
    }
  };

  const handleDownload = async () => {
    if (selectedTeams.size === 0) {
      alert('Please select at least one team');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const selectedTeamsArray = teams.filter(t => selectedTeams.has(t.id));
      let downloadedCount = 0;

      for (const team of selectedTeamsArray) {
        if (team.logo && team.logo.url) {
          const filename = `${team.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
          const blob = await downloadImage(team.logo.url, filename);

          if (blob) {
            zip.file(filename, blob);
            downloadedCount++;
          }

          setDownloadProgress(Math.round((downloadedCount / selectedTeamsArray.length) * 100));
        }
      }

      if (downloadedCount === 0) {
        alert('No logos could be downloaded');
        setDownloading(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'team-logos.zip');
    } catch (error) {
      console.error('Error creating zip file:', error);
      alert('Error downloading logos. Please try again.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadSingle = async (team) => {
    if (!team.logo || !team.logo.url) {
      alert('Logo not available for this team');
      return;
    }

    try {
      const blob = await downloadImage(team.logo.url, team.name);
      if (blob) {
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        saveAs(blob, filename);
      }
    } catch (error) {
      console.error('Error downloading logo:', error);
      alert('Error downloading logo. Please try again.');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

      <NewHomeNavbar />

      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-6xl">
          {/* Page Title */}
          <div className="mb-8 sm:mb-12">
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold italic" style={{ fontFamily: 'Avantique, sans-serif' }}>
              DOWNLOAD TEAM LOGOS
            </h2>
            <p className="text-gray-400 text-sm sm:text-base mt-2">
              Select teams and download their logos as a ZIP file
            </p>
          </div>

          {/* Control Panel */}
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm sm:text-base"
                  style={{ fontFamily: 'Avantique, sans-serif' }}
                >
                  {selectedTeams.size === teams.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-gray-300 text-sm sm:text-base">
                  {selectedTeams.size} of {teams.length} selected
                </span>
              </div>

              <button
                onClick={handleDownload}
                disabled={selectedTeams.size === 0 || downloading}
                className={`px-6 py-2 rounded-lg font-bold transition-colors text-sm sm:text-base ${
                  selectedTeams.size === 0 || downloading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
                style={{ fontFamily: 'Avantique, sans-serif' }}
              >
                {downloading ? `Downloading... ${downloadProgress}%` : 'Download Selected'}
              </button>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg text-gray-400">Loading teams...</div>
              </div>
            ) : teams.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg text-gray-400">No teams with logos found</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedTeams.has(team.id)
                        ? 'border-orange-500 bg-gray-700'
                        : 'border-gray-600 bg-gray-750 hover:border-gray-500'
                    }`}
                    onClick={() => toggleTeamSelection(team.id)}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="checkbox"
                        checked={selectedTeams.has(team.id)}
                        onChange={() => toggleTeamSelection(team.id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(team);
                        }}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Download
                      </button>
                    </div>

                    {/* Logo */}
                    <div className="flex items-center justify-center h-32 mb-3 bg-gray-900 rounded-lg">
                      {team.logo?.url ? (
                        <OptimizedImage
                          src={team.logo.url}
                          alt={team.name}
                          type="logoSmall"
                          className="h-28 w-auto object-contain"
                        />
                      ) : (
                        <div className="text-gray-500 text-center">
                          <div className="text-sm">No logo</div>
                        </div>
                      )}
                    </div>

                    {/* Team Name */}
                    <h3 className="text-white font-semibold text-sm text-center truncate" style={{ fontFamily: 'Avantique, sans-serif' }}>
                      {team.name}
                    </h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

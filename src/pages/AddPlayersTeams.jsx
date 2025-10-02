
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import CloudinaryImageUpload from '../components/CloudinaryImageUpload';
import * as XLSX from 'xlsx';

export default function AddPlayersTeams() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, createTeamAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [format, setFormat] = useState(''); // 'player' or 'team'
  const [activeTab, setActiveTab] = useState('players'); // 'players' or 'teams'
  
  // Player form state
  const [playerForm, setPlayerForm] = useState({
    name: '',
    age: '',
    gender: '',
    duprId: '',
    photo: null
  });
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Team modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    selectedPlayers: [],
    logo: null,
    adminEmail: ''
  });
  const [playerSearch, setPlayerSearch] = useState('');
  
  // Edit team modal state
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamForm, setEditTeamForm] = useState({
    name: '',
    description: '',
    selectedPlayers: [],
    logo: null,
    adminEmail: ''
  });

  // Edit player modal state
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editPlayerForm, setEditPlayerForm] = useState({
    name: '',
    age: '',
    gender: '',
    duprId: '',
    photo: null
  });

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
        if (tournamentDoc.exists()) {
          const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
          setTournament(tournamentData);
          
          // Check if user is the owner
          if (tournamentData.createdBy !== currentUser.uid) {
            setError('You are not authorized to manage this tournament');
            return;
          }
        } else {
          setError('Tournament not found');
        }
      } catch (error) {
        console.error('Error fetching tournament:', error);
        setError('Failed to load tournament details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTournament();
    }
  }, [id, currentUser.uid]);

  useEffect(() => {
    if (format === 'team') {
      fetchPlayers();
      fetchTeams();
    }
  }, [format, id]);

  const fetchPlayers = async () => {
    try {
      const playersQuery = query(
        collection(db, 'players'),
        where('tournamentId', '==', id)
      );
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsQuery = query(
        collection(db, 'teams'),
        where('tournamentId', '==', id)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handlePlayerFormChange = (e) => {
    const { name, value } = e.target;
    setPlayerForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayerPhotoUpload = (photoData) => {
    setPlayerForm(prev => ({
      ...prev,
      photo: photoData
    }));
  };

  const handleEditPlayerFormChange = (e) => {
    const { name, value } = e.target;
    setEditPlayerForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditPlayerPhotoUpload = (photoData) => {
    setEditPlayerForm(prev => ({
      ...prev,
      photo: photoData
    }));
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!playerForm.name.trim()) {
      setError('Player name is required');
      return;
    }

    try {
      setSubmitting(true);
      const playerData = {
        name: playerForm.name.trim(),
        age: playerForm.age ? parseInt(playerForm.age) : null,
        gender: playerForm.gender,
        duprId: playerForm.duprId.trim(),
        photo: playerForm.photo ? {
          url: playerForm.photo.url,
          publicId: playerForm.photo.publicId
        } : null,
        tournamentId: id,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'players'), playerData);
      
      // Reset form
      setPlayerForm({
        name: '',
        age: '',
        gender: '',
        duprId: '',
        photo: null
      });
      
      // Refresh players list if in team format
      if (format === 'team') {
        fetchPlayers();
      }
      
      setError('');
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Failed to add player. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSubmitting(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const playersToAdd = [];
      for (const row of jsonData) {
        if (row.name || row.Name) {
          // Handle photo URL from CSV/Excel
          const photoUrl = (row.photo || row.Photo || row.photoUrl || row['Photo URL'] || row.photo_url || '').toString().trim();
          let photoData = null;
          
          if (photoUrl) {
            // If it's a direct URL, create a simple photo object
            photoData = {
              url: photoUrl,
              publicId: null // No publicId for direct URLs
            };
          }

          const playerData = {
            name: (row.name || row.Name || '').toString().trim(),
            age: row.age || row.Age ? parseInt(row.age || row.Age) : null,
            gender: (row.gender || row.Gender || '').toString().trim(),
            duprId: (row.duprId || row['DUPR ID'] || row.dupr_id || '').toString().trim(),
            photo: photoData,
            tournamentId: id,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
          };
          
          if (playerData.name) {
            playersToAdd.push(playerData);
          }
        }
      }

      // Add all players to Firestore
      for (const player of playersToAdd) {
        await addDoc(collection(db, 'players'), player);
      }

      // Refresh players list if in team format
      if (format === 'team') {
        fetchPlayers();
      }

      setError('');
      alert(`Successfully added ${playersToAdd.length} players!`);
    } catch (error) {
      console.error('Error uploading players:', error);
      setError('Failed to upload players. Please check your file format.');
    } finally {
      setSubmitting(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleTeamFormChange = (e) => {
    const { name, value } = e.target;
    setTeamForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayerSelection = (playerId) => {
    setTeamForm(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter(id => id !== playerId)
        : [...prev.selectedPlayers, playerId]
    }));
  };

  const handleTeamLogoUpload = (logoData) => {
    setTeamForm(prev => ({
      ...prev,
      logo: logoData
    }));
  };

  const handleEditTeamLogoUpload = (logoData) => {
    setEditTeamForm(prev => ({
      ...prev,
      logo: logoData
    }));
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      setError('Team name is required');
      return;
    }
    if (teamForm.selectedPlayers.length === 0) {
      setError('Please select at least one player for the team');
      return;
    }

    try {
      setSubmitting(true);
      let adminUid = null;
      
      // Create team admin account if email is provided
      if (teamForm.adminEmail.trim()) {
        const adminResult = await createTeamAdmin(
          teamForm.adminEmail.trim(),
          teamForm.name.trim(),
          id
        );
        
        if (adminResult.success) {
          adminUid = adminResult.uid;
          console.log(`Team admin account created with password: ${adminResult.tempPassword}`);
        } else {
          setError(`Failed to create team admin account: ${adminResult.error}`);
          return;
        }
      }
      
      const teamData = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim(),
        playerIds: teamForm.selectedPlayers,
        logo: teamForm.logo ? {
          url: teamForm.logo.url,
          publicId: teamForm.logo.publicId
        } : null,
        adminEmail: teamForm.adminEmail.trim(),
        adminUid: adminUid, // Store the admin user ID
        tournamentId: id,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'teams'), teamData);
      
      // Reset form and close modal
      setTeamForm({
        name: '',
        description: '',
        selectedPlayers: [],
        logo: null,
        adminEmail: ''
      });
      setShowTeamModal(false);
      
      // Refresh teams list
      fetchTeams();
      setError('');
      
      // Show success message with admin credentials if created
      if (adminUid && teamForm.adminEmail.trim()) {
        alert(`Team created successfully! Team admin account created for ${teamForm.adminEmail.trim()}. Check the Settings page for login credentials.`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setEditTeamForm({
      name: team.name,
      description: team.description || '',
      selectedPlayers: team.playerIds || [],
      logo: team.logo || null,
      adminEmail: team.adminEmail || ''
    });
    setShowEditTeamModal(true);
  };

  const handleEditTeamFormChange = (e) => {
    const { name, value } = e.target;
    setEditTeamForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditPlayerSelection = (playerId) => {
    setEditTeamForm(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter(id => id !== playerId)
        : [...prev.selectedPlayers, playerId]
    }));
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editTeamForm.name.trim()) {
      setError('Team name is required');
      return;
    }
    if (editTeamForm.selectedPlayers.length === 0) {
      setError('Please select at least one player for the team');
      return;
    }

    try {
      setSubmitting(true);
      setError(''); // Clear any previous errors
      let adminUid = editingTeam.adminUid || null;
      
      // Check if admin email changed and create new admin if needed
      const oldAdminEmail = editingTeam.adminEmail || '';
      const newAdminEmail = editTeamForm.adminEmail.trim();
      
      console.log('Updating team:', {
        oldAdminEmail,
        newAdminEmail,
        teamName: editTeamForm.name.trim()
      });
      
      if (newAdminEmail && newAdminEmail !== oldAdminEmail) {
        console.log('Creating new team admin account...');
        // Create new team admin account
        const adminResult = await createTeamAdmin(
          newAdminEmail,
          editTeamForm.name.trim(),
          id
        );
        
        if (adminResult.success) {
          adminUid = adminResult.uid;
          console.log(`New team admin account created with password: ${adminResult.tempPassword}`);
        } else {
          console.error('Failed to create team admin:', adminResult.error);
          setError(`Failed to create team admin account: ${adminResult.error}`);
          return;
        }
      }
      
      const teamData = {
        name: editTeamForm.name.trim(),
        description: editTeamForm.description.trim(),
        playerIds: editTeamForm.selectedPlayers,
        logo: editTeamForm.logo ? {
          url: editTeamForm.logo.url,
          publicId: editTeamForm.logo.publicId
        } : null,
        adminEmail: newAdminEmail,
        adminUid: adminUid, // Store the admin user ID
        updatedAt: serverTimestamp()
      };

      console.log('Updating team document with data:', teamData);
      await updateDoc(doc(db, 'teams', editingTeam.id), teamData);
      console.log('Team updated successfully');
      
      // Reset form and close modal
      setEditTeamForm({
        name: '',
        description: '',
        selectedPlayers: [],
        logo: null,
        adminEmail: ''
      });
      setShowEditTeamModal(false);
      setEditingTeam(null);
      setPlayerSearch('');
      
      // Refresh teams list
      fetchTeams();
      setError('');
      
      // Show success message with admin credentials if created
      if (newAdminEmail && newAdminEmail !== oldAdminEmail) {
        alert(`Team updated successfully! ${newAdminEmail ? 'Team admin account created for ' + newAdminEmail + '. Check the Settings page for login credentials.' : ''}`);
      } else {
        alert('Team updated successfully!');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(`Failed to update team: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    try {
      setSubmitting(true);
      
      // Check if team is used in any fixtures
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        where('tournamentId', '==', id)
      );
      const fixturesSnapshot = await getDocs(fixturesQuery);
      
      const teamFixtures = fixturesSnapshot.docs.filter(doc => {
        const fixture = doc.data();
        return fixture.team1 === teamId || fixture.team2 === teamId;
      });
      
      if (teamFixtures.length > 0) {
        setError(`Cannot delete team "${teamName}" because it is used in ${teamFixtures.length} fixture(s). Please delete the fixtures first or reassign them to other teams.`);
        return;
      }
      
      // If no fixtures found, proceed with confirmation
      if (window.confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
        await deleteDoc(doc(db, 'teams', teamId));
        
        // Refresh teams list
        fetchTeams();
        setError('');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setEditPlayerForm({
      name: player.name,
      age: player.age || '',
      gender: player.gender || '',
      duprId: player.duprId || '',
      photo: player.photo || null
    });
    setShowEditPlayerModal(true);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    if (!editPlayerForm.name.trim()) {
      setError('Player name is required');
      return;
    }

    try {
      setSubmitting(true);
      const playerData = {
        name: editPlayerForm.name.trim(),
        age: editPlayerForm.age ? parseInt(editPlayerForm.age) : null,
        gender: editPlayerForm.gender,
        duprId: editPlayerForm.duprId.trim(),
        photo: editPlayerForm.photo ? {
          url: editPlayerForm.photo.url,
          publicId: editPlayerForm.photo.publicId
        } : null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'players', editingPlayer.id), playerData);
      
      // Reset form and close modal
      setEditPlayerForm({
        name: '',
        age: '',
        gender: '',
        duprId: '',
        photo: null
      });
      setShowEditPlayerModal(false);
      setEditingPlayer(null);
      
      // Refresh players list
      fetchPlayers();
      setError('');
    } catch (error) {
      console.error('Error updating player:', error);
      setError('Failed to update player. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlayer = async (playerId, playerName) => {
    if (window.confirm(`Are you sure you want to delete the player "${playerName}"? This action cannot be undone.`)) {
      try {
        setSubmitting(true);
        await deleteDoc(doc(db, 'players', playerId));
        
        // Refresh players list
        fetchPlayers();
        setError('');
      } catch (error) {
        console.error('Error deleting player:', error);
        setError('Failed to delete player. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Export function to generate CSV with players and their team associations
  const handleExportData = async () => {
    try {
      setSubmitting(true);
      
      // Prepare data for export
      const exportData = [];
      
      if (format === 'team') {
        // For team format, include team information
        players.forEach(player => {
          // Find which team(s) this player belongs to
          const playerTeams = teams.filter(team =>
            team.playerIds && team.playerIds.includes(player.id)
          );
          
          if (playerTeams.length > 0) {
            // If player is in teams, create a row for each team
            playerTeams.forEach(team => {
              exportData.push({
                'Player Name': player.name,
                'Age': player.age || '',
                'Gender': player.gender || '',
                'DUPR ID': player.duprId || '',
                'Photo URL': player.photo?.url || '',
                'Team Name': team.name,
                'Team Description': team.description || '',
                'Team Logo URL': team.logo?.url || ''
              });
            });
          } else {
            // If player is not in any team
            exportData.push({
              'Player Name': player.name,
              'Age': player.age || '',
              'Gender': player.gender || '',
              'DUPR ID': player.duprId || '',
              'Photo URL': player.photo?.url || '',
              'Team Name': 'No Team',
              'Team Description': '',
              'Team Logo URL': ''
            });
          }
        });
      } else {
        // For player format, just export players without team info
        players.forEach(player => {
          exportData.push({
            'Player Name': player.name,
            'Age': player.age || '',
            'Gender': player.gender || '',
            'DUPR ID': player.duprId || '',
            'Photo URL': player.photo?.url || ''
          });
        });
      }
      
      if (exportData.length === 0) {
        alert('No data to export. Please add players first.');
        return;
      }
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, format === 'team' ? 'Players & Teams' : 'Players');
      
      // Generate filename with tournament name and timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${tournament?.name || 'Tournament'}_${format === 'team' ? 'Players_Teams' : 'Players'}_${timestamp}.xlsx`;
      
      // Download the file
      XLSX.writeFile(workbook, filename);
      
      alert(`Successfully exported ${exportData.length} records to ${filename}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk team import function
  const handleBulkTeamImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSubmitting(true);
      setError(''); // Clear any previous errors
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Raw data from file:', jsonData); // Debug log

      if (!jsonData || jsonData.length === 0) {
        setError('The file appears to be empty or invalid. Please check your file.');
        return;
      }

      // Get existing team names to prevent duplicates
      const existingTeamNames = new Set(teams.map(t => t.name.toLowerCase()));
      console.log('Existing teams:', Array.from(existingTeamNames)); // Debug log

      // Group data by team
      const teamsData = {};
      const playersToAdd = [];
      const existingPlayerNames = new Set(players.map(p => p.name.toLowerCase()));
      let processedRows = 0;
      let skippedDuplicateTeams = [];

      for (const row of jsonData) {
        // More flexible column name matching
        const teamName = (
          row['Team Name'] ||
          row['TeamName'] ||
          row['team_name'] ||
          row['team'] ||
          row['Team'] ||
          ''
        ).toString().trim();
        
        const playerName = (
          row['Player Name'] ||
          row['PlayerName'] ||
          row['player_name'] ||
          row['name'] ||
          row['Name'] ||
          row['Player'] ||
          ''
        ).toString().trim();
        
        console.log(`Processing row: Team="${teamName}", Player="${playerName}"`); // Debug log
        
        if (!teamName || !playerName) {
          console.log('Skipping row due to missing team or player name'); // Debug log
          continue;
        }

        // Skip if team already exists
        if (existingTeamNames.has(teamName.toLowerCase())) {
          if (!skippedDuplicateTeams.includes(teamName)) {
            skippedDuplicateTeams.push(teamName);
          }
          console.log(`Skipping duplicate team: ${teamName}`); // Debug log
          continue;
        }

        processedRows++;

        // Initialize team if not exists in our import data
        if (!teamsData[teamName]) {
          teamsData[teamName] = {
            name: teamName,
            description: (
              row['Team Description'] ||
              row['TeamDescription'] ||
              row['team_description'] ||
              row['description'] ||
              row['Description'] ||
              ''
            ).toString().trim(),
            logo: null,
            players: []
          };
          
          // Handle team logo URL
          const logoUrl = (
            row['Team Logo URL'] ||
            row['TeamLogoURL'] ||
            row['team_logo_url'] ||
            row['logo'] ||
            row['Logo'] ||
            ''
          ).toString().trim();
          
          if (logoUrl) {
            teamsData[teamName].logo = {
              url: logoUrl,
              publicId: null
            };
          }
        }

        // Check if player already exists (prevent duplicate players)
        let playerToAdd = null;
        if (!existingPlayerNames.has(playerName.toLowerCase())) {
          const photoUrl = (
            row['Photo URL'] ||
            row['PhotoURL'] ||
            row['photo_url'] ||
            row['photo'] ||
            row['Photo'] ||
            ''
          ).toString().trim();
          
          let photoData = null;
          if (photoUrl) {
            photoData = {
              url: photoUrl,
              publicId: null
            };
          }

          const ageValue = row['Age'] || row['age'] || row['AGE'] || '';
          const genderValue = (
            row['Gender'] ||
            row['gender'] ||
            row['GENDER'] ||
            ''
          ).toString().trim();
          
          const duprValue = (
            row['DUPR ID'] ||
            row['DUPRID'] ||
            row['dupr_id'] ||
            row['duprId'] ||
            row['dupr'] ||
            row['DUPR'] ||
            ''
          ).toString().trim();

          playerToAdd = {
            name: playerName,
            age: ageValue ? parseInt(ageValue) : null,
            gender: genderValue,
            duprId: duprValue,
            photo: photoData,
            tournamentId: id,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
          };
          
          playersToAdd.push(playerToAdd);
          existingPlayerNames.add(playerName.toLowerCase());
        } else {
          // Find existing player
          playerToAdd = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        }

        if (playerToAdd) {
          teamsData[teamName].players.push(playerToAdd);
        }
      }

      console.log(`Processed ${processedRows} rows, found ${Object.keys(teamsData).length} new teams`); // Debug log
      
      if (skippedDuplicateTeams.length > 0) {
        console.log(`Skipped duplicate teams: ${skippedDuplicateTeams.join(', ')}`); // Debug log
      }

      if (Object.keys(teamsData).length === 0) {
        let errorMessage = `No new teams to import. Processed ${processedRows} rows.`;
        if (skippedDuplicateTeams.length > 0) {
          errorMessage += ` Skipped ${skippedDuplicateTeams.length} duplicate teams: ${skippedDuplicateTeams.join(', ')}.`;
        }
        errorMessage += ' Please ensure your file has columns: "Team Name" and "Player Name" at minimum.';
        setError(errorMessage);
        return;
      }

      // Add new players to Firestore first
      const addedPlayers = [];
      for (const player of playersToAdd) {
        try {
          const docRef = await addDoc(collection(db, 'players'), player);
          addedPlayers.push({ id: docRef.id, ...player });
          console.log(`Added player: ${player.name} with ID: ${docRef.id}`); // Debug log
        } catch (playerError) {
          console.error('Error adding player:', player.name, playerError);
        }
      }

      // Update players list with new players
      const updatedPlayers = [...players, ...addedPlayers];

      // Create teams with player IDs
      let teamsCreated = 0;
      let teamsSkipped = 0;
      const teamErrors = [];
      
      for (const [teamName, teamData] of Object.entries(teamsData)) {
        console.log(`Creating team: ${teamName} with ${teamData.players.length} players`); // Debug log
        
        try {
          const playerIds = [];
          
          for (const player of teamData.players) {
            // Find player ID from updated players list
            const foundPlayer = updatedPlayers.find(p => p.name.toLowerCase() === player.name.toLowerCase());
            if (foundPlayer && foundPlayer.id) {
              console.log(`Found player ${player.name} with ID: ${foundPlayer.id}`); // Debug log
              playerIds.push(foundPlayer.id);
            } else {
              console.log(`Player not found or missing ID: ${player.name}`, foundPlayer); // Debug log
            }
          }

          console.log(`Team ${teamName} will have ${playerIds.length} players with IDs: ${playerIds.join(', ')}`); // Debug log

          if (playerIds.length > 0) {
            // Validate team data before creating
            if (!teamData.name || !teamData.name.trim()) {
              throw new Error('Team name is required');
            }
            
            if (!id) {
              throw new Error('Tournament ID is missing');
            }
            
            if (!currentUser || !currentUser.uid) {
              throw new Error('User authentication is missing');
            }

            const teamDoc = {
              name: teamData.name.trim(),
              description: teamData.description ? teamData.description.trim() : '',
              playerIds: playerIds,
              logo: teamData.logo || null,
              tournamentId: id,
              createdBy: currentUser.uid,
              createdAt: serverTimestamp()
            };

            console.log(`Creating team document:`, teamDoc); // Debug log

            const docRef = await addDoc(collection(db, 'teams'), teamDoc);
            console.log(`Successfully created team: ${teamName} with ID: ${docRef.id}`); // Debug log
            teamsCreated++;
          } else {
            console.log(`Skipping team ${teamName} - no valid players found`); // Debug log
            teamErrors.push(`${teamName}: No valid players found`);
            teamsSkipped++;
          }
        } catch (teamError) {
          console.error('Error adding team:', teamName, teamError);
          teamErrors.push(`${teamName}: ${teamError.message}`);
          teamsSkipped++;
        }
      }

      // Refresh data
      await fetchPlayers();
      await fetchTeams();

      setError('');
      let successMessage = `Successfully imported ${teamsCreated} teams with ${addedPlayers.length} new players!`;
      if (skippedDuplicateTeams.length > 0) {
        successMessage += ` Skipped ${skippedDuplicateTeams.length} duplicate teams: ${skippedDuplicateTeams.join(', ')}.`;
      }
      if (teamsSkipped > 0) {
        successMessage += ` ${teamsSkipped} teams were skipped due to errors.`;
        if (teamErrors.length > 0) {
          successMessage += `\n\nError details:\n${teamErrors.join('\n')}`;
        }
      }
      alert(successMessage);
    } catch (error) {
      console.error('Error importing teams:', error);
      setError(`Failed to import teams: ${error.message}. Please check your file format and try again.`);
    } finally {
      setSubmitting(false);
      e.target.value = ''; // Reset file input
    }
  };

  // Filter players based on search
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    (player.duprId && player.duprId.toLowerCase().includes(playerSearch.toLowerCase())) ||
    (player.gender && player.gender.toLowerCase().includes(playerSearch.toLowerCase()))
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error && !tournament) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <div className="mt-6">
            <button 
              className="btn btn-outline"
              onClick={() => navigate(`/admin/tournaments/${id}`)}
            >
              Back to Tournament
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/admin/tournaments/${id}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tournament
            </button>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">Add Players/Teams</h1>
          <p className="text-base-content/70 text-lg">
            Manage participants for <span className="font-semibold">{tournament?.name}</span>
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Format Selection */}
        {!format && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">Select Tournament Format</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className="card bg-primary/10 border-2 border-primary/20 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => setFormat('player')}
                >
                  <div className="card-body text-center">
                    <div className="text-primary text-4xl mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Player Format</h3>
                    <p className="text-base-content/70">Individual players competing</p>
                  </div>
                </div>

                <div 
                  className="card bg-secondary/10 border-2 border-secondary/20 hover:border-secondary cursor-pointer transition-colors"
                  onClick={() => setFormat('team')}
                >
                  <div className="card-body text-center">
                    <div className="text-secondary text-4xl mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Team Format</h3>
                    <p className="text-base-content/70">Teams of players competing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Format */}
        {format === 'player' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Player Management</h2>
              <button 
                className="btn btn-outline"
                onClick={() => setFormat('')}
              >
                Change Format
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Manual Entry */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title mb-4">Add Player Manually</h3>
                  <form onSubmit={handleAddPlayer} className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Player Name *</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter player name"
                        className="input input-bordered"
                        value={playerForm.name}
                        onChange={handlePlayerFormChange}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Age (Optional)</span>
                      </label>
                      <input
                        type="number"
                        name="age"
                        placeholder="Enter age"
                        className="input input-bordered"
                        value={playerForm.age}
                        onChange={handlePlayerFormChange}
                        min="1"
                        max="120"
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Gender</span>
                      </label>
                      <select
                        name="gender"
                        className="select select-bordered"
                        value={playerForm.gender}
                        onChange={handlePlayerFormChange}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">DUPR ID</span>
                      </label>
                      <input
                        type="text"
                        name="duprId"
                        placeholder="Enter DUPR ID"
                        className="input input-bordered"
                        value={playerForm.duprId}
                        onChange={handlePlayerFormChange}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`btn btn-primary w-full ${submitting ? 'loading' : ''}`}
                      disabled={submitting}
                    >
                      {submitting ? 'Adding Player...' : 'Add Player'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Bulk Upload */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title mb-4">Bulk Upload Players</h3>
                  <div className="space-y-4">
                    <div className="alert alert-info">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-bold">Excel Format Required</h4>
                        <p className="text-sm">Columns: Name, Age, Gender, DUPR ID, Photo URL (optional)</p>
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Upload Excel File</span>
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleBulkUpload}
                        className="file-input file-input-bordered w-full"
                        disabled={submitting}
                      />
                    </div>

                    {submitting && (
                      <div className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span>Processing file...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Format */}
        {format === 'team' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Team Management</h2>
              <button 
                className="btn btn-outline"
                onClick={() => setFormat('')}
              >
                Change Format
              </button>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-boxed">
              <button 
                className={`tab ${activeTab === 'players' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('players')}
              >
                Players
              </button>
              <button 
                className={`tab ${activeTab === 'teams' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('teams')}
              >
                Teams
              </button>
            </div>

            {/* Players Tab */}
            {activeTab === 'players' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manual Entry */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title mb-4">Add Player Manually</h3>
                    <form onSubmit={handleAddPlayer} className="space-y-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Player Name *</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          placeholder="Enter player name"
                          className="input input-bordered"
                          value={playerForm.name}
                          onChange={handlePlayerFormChange}
                          required
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Age (Optional)</span>
                        </label>
                        <input
                          type="number"
                          name="age"
                          placeholder="Enter age"
                          className="input input-bordered"
                          value={playerForm.age}
                          onChange={handlePlayerFormChange}
                          min="1"
                          max="120"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Gender</span>
                        </label>
                        <select
                          name="gender"
                          className="select select-bordered"
                          value={playerForm.gender}
                          onChange={handlePlayerFormChange}
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">DUPR ID</span>
                        </label>
                        <input
                          type="text"
                          name="duprId"
                          placeholder="Enter DUPR ID"
                          className="input input-bordered"
                          value={playerForm.duprId}
                          onChange={handlePlayerFormChange}
                        />
                      </div>

                      <CloudinaryImageUpload
                        onImageUpload={handlePlayerPhotoUpload}
                        currentImage={playerForm.photo?.url}
                        label="Player Photo"
                      />

                      <button
                        type="submit"
                        className={`btn btn-primary w-full ${submitting ? 'loading' : ''}`}
                        disabled={submitting}
                      >
                        {submitting ? 'Adding Player...' : 'Add Player'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Bulk Upload */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title mb-4">Bulk Upload Players</h3>
                    <div className="space-y-4">
                      <div className="alert alert-info">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-bold">Excel Format Required</h4>
                          <p className="text-sm">Columns: Name, Age, Gender, DUPR ID, Photo URL (optional)</p>
                        </div>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Upload Excel File</span>
                        </label>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleBulkUpload}
                          className="file-input file-input-bordered w-full"
                          disabled={submitting}
                        />
                      </div>

                      {submitting && (
                        <div className="flex items-center gap-2">
                          <span className="loading loading-spinner loading-sm"></span>
                          <span>Processing file...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Players List */}
                {players.length > 0 && (
                  <div className="lg:col-span-2">
                    <div className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        <h3 className="card-title mb-4">Added Players ({players.length})</h3>
                        <div className="overflow-x-auto">
                          <table className="table table-zebra">
                            <thead>
                              <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>DUPR ID</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {players.map((player) => (
                                <tr key={player.id}>
                                  <td>
                                    {player.photo?.url ? (
                                      <div className="avatar">
                                        <div className="w-12 h-12 rounded-full">
                                          <img src={player.photo.url} alt={player.name} />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="avatar placeholder">
                                        <div className="bg-neutral text-neutral-content rounded-full w-12 h-12">
                                          <span className="text-xl">{player.name.charAt(0)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="font-medium">{player.name}</td>
                                  <td>{player.age || '-'}</td>
                                  <td>{player.gender || '-'}</td>
                                  <td>{player.duprId || '-'}</td>
                                  <td>
                                    <div className="flex gap-2">
                                      <button
                                        className="btn btn-sm btn-outline"
                                        onClick={() => handleEditPlayer(player)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        className="btn btn-sm btn-error"
                                        onClick={() => handleDeletePlayer(player.id, player.name)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Teams ({teams.length})</h3>
                  <div className="flex gap-2">
                    {(players.length > 0 || teams.length > 0) && (
                      <button
                        className={`btn btn-success btn-sm ${submitting ? 'loading' : ''}`}
                        onClick={handleExportData}
                        disabled={submitting}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {submitting ? 'Exporting...' : 'Export'}
                      </button>
                    )}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleBulkTeamImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={submitting}
                      />
                      <button
                        className={`btn btn-info btn-sm ${submitting ? 'loading' : ''}`}
                        disabled={submitting}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        {submitting ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowTeamModal(true)}
                      disabled={players.length === 0}
                    >
                      Create Team
                    </button>
                  </div>
                </div>

                {players.length === 0 && (
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>Add players first before creating teams</span>
                  </div>
                )}

                {/* Import Format Info */}
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-bold">Bulk Team Import Format</h4>
                    <p className="text-sm">
                      Excel/CSV columns: Team Name, Player Name, Age, Gender, DUPR ID, Photo URL, Team Description, Team Logo URL
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Note:</strong> Each row should contain one player. Multiple rows with the same Team Name will be grouped together.
                    </p>
                  </div>
                </div>

                {/* Teams List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((team) => (
                    <div key={team.id} className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="card-title">{team.name}</h4>
                          <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                              </svg>
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                              <li>
                                <button onClick={() => handleEditTeam(team)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit Team
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => handleDeleteTeam(team.id, team.name)}
                                  className="text-error"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete Team
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                        {team.description && (
                          <p className="text-base-content/70 text-sm mb-3">{team.description}</p>
                        )}
                        <div className="mt-4">
                          <div className="text-sm text-base-content/60 mb-2">
                            Players ({team.playerIds?.length || 0}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {team.playerIds?.map((playerId) => {
                              const player = players.find(p => p.id === playerId);
                              return player ? (
                                <div key={playerId} className="badge badge-outline badge-sm">
                                  {player.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Creation Modal */}
        {showTeamModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Create New Team</h3>
              
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Team Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter team name"
                    className="input input-bordered"
                    value={teamForm.name}
                    onChange={handleTeamFormChange}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Team Description</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="Enter team description (optional)"
                    className="textarea textarea-bordered"
                    value={teamForm.description}
                    onChange={handleTeamFormChange}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Team Admin Email</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    placeholder="Enter team admin email (optional)"
                    className="input input-bordered"
                    value={teamForm.adminEmail}
                    onChange={handleTeamFormChange}
                  />
                </div>

                <CloudinaryImageUpload
                  onImageUpload={handleTeamLogoUpload}
                  currentImage={teamForm.logo?.url}
                  label="Team Logo"
                  uploadType="team"
                  className="mb-4"
                />

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Select Players *</span>
                  </label>
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search players by name, DUPR ID, or gender..."
                      className="input input-bordered w-full"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-base-300 rounded-lg p-4 space-y-2">
                    {filteredPlayers.length === 0 ? (
                      <div className="text-center text-base-content/60 py-4">
                        {playerSearch ? 'No players found matching your search' : 'No players available'}
                      </div>
                    ) : (
                      filteredPlayers.map((player) => (
                      <label key={player.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={teamForm.selectedPlayers.includes(player.id)}
                          onChange={() => handlePlayerSelection(player.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-base-content/60">
                            {player.age && `Age: ${player.age}`}
                            {player.age && player.gender && ' • '}
                            {player.gender}
                            {(player.age || player.gender) && player.duprId && ' • '}
                            {player.duprId && `DUPR: ${player.duprId}`}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                
                {/* Selected players count */}
                {teamForm.selectedPlayers.length > 0 && (
                  <div className="mt-2 text-sm text-base-content/60">
                    {teamForm.selectedPlayers.length} player{teamForm.selectedPlayers.length !== 1 ? 's' : ''} selected
                  </div>
                )}
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowTeamModal(false);
                      setTeamForm({
                        name: '',
                        description: '',
                        selectedPlayers: [],
                        logo: null,
                        adminEmail: ''
                      });
                      setPlayerSearch('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${submitting ? 'loading' : ''}`}
                    disabled={submitting || teamForm.selectedPlayers.length === 0}
                  >
                    {submitting ? 'Creating Team...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {showEditTeamModal && editingTeam && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Edit Team: {editingTeam.name}</h3>
              
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Team Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter team name"
                    className="input input-bordered"
                    value={editTeamForm.name}
                    onChange={handleEditTeamFormChange}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Team Description</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="Enter team description (optional)"
                    className="textarea textarea-bordered"
                    value={editTeamForm.description}
                    onChange={handleEditTeamFormChange}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Team Admin Email</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    placeholder="Enter team admin email (optional)"
                    className="input input-bordered"
                    value={editTeamForm.adminEmail}
                    onChange={handleEditTeamFormChange}
                  />
                </div>

                <CloudinaryImageUpload
                  onImageUpload={handleEditTeamLogoUpload}
                  currentImage={editTeamForm.logo?.url}
                  label="Team Logo"
                  uploadType="team"
                  className="mb-4"
                />

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Select Players *</span>
                  </label>
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search players by name, DUPR ID, or gender..."
                      className="input input-bordered w-full"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-base-300 rounded-lg p-4 space-y-2">
                    {filteredPlayers.length === 0 ? (
                      <div className="text-center text-base-content/60 py-4">
                        {playerSearch ? 'No players found matching your search' : 'No players available'}
                      </div>
                    ) : (
                      filteredPlayers.map((player) => (
                        <label key={player.id} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={editTeamForm.selectedPlayers.includes(player.id)}
                            onChange={() => handleEditPlayerSelection(player.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-base-content/60">
                              {player.age && `Age: ${player.age}`}
                              {player.age && player.gender && ' • '}
                              {player.gender}
                              {(player.age || player.gender) && player.duprId && ' • '}
                              {player.duprId && `DUPR: ${player.duprId}`}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  
                  {/* Selected players count */}
                  {editTeamForm.selectedPlayers.length > 0 && (
                    <div className="mt-2 text-sm text-base-content/60">
                      {editTeamForm.selectedPlayers.length} player{editTeamForm.selectedPlayers.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowEditTeamModal(false);
                      setEditingTeam(null);
                      setEditTeamForm({
                        name: '',
                        description: '',
                        selectedPlayers: [],
                        logo: null,
                        adminEmail: ''
                      });
                      setPlayerSearch('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${submitting ? 'loading' : ''}`}
                    disabled={submitting || editTeamForm.selectedPlayers.length === 0}
                  >
                    {submitting ? 'Updating Team...' : 'Update Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Player Modal */}
        {showEditPlayerModal && editingPlayer && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-lg mb-4">Edit Player: {editingPlayer.name}</h3>
              
              <form onSubmit={handleUpdatePlayer} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Player Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter player name"
                    className="input input-bordered"
                    value={editPlayerForm.name}
                    onChange={handleEditPlayerFormChange}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Age (Optional)</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    placeholder="Enter age"
                    className="input input-bordered"
                    value={editPlayerForm.age}
                    onChange={handleEditPlayerFormChange}
                    min="1"
                    max="120"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Gender</span>
                  </label>
                  <select
                    name="gender"
                    className="select select-bordered"
                    value={editPlayerForm.gender}
                    onChange={handleEditPlayerFormChange}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">DUPR ID</span>
                  </label>
                  <input
                    type="text"
                    name="duprId"
                    placeholder="Enter DUPR ID"
                    className="input input-bordered"
                    value={editPlayerForm.duprId}
                    onChange={handleEditPlayerFormChange}
                  />
                </div>

                <CloudinaryImageUpload
                  onImageUpload={handleEditPlayerPhotoUpload}
                  currentImage={editPlayerForm.photo?.url}
                  label="Player Photo"
                />

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowEditPlayerModal(false);
                      setEditingPlayer(null);
                      setEditPlayerForm({
                        name: '',
                        age: '',
                        gender: '',
                        duprId: '',
                        photo: null
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${submitting ? 'loading' : ''}`}
                    disabled={submitting}
                  >
                    {submitting ? 'Updating Player...' : 'Update Player'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMatchDay, updateMatchDay, getMatchDayById, getActiveTournamentId } from '../services/ticketingService';
import { uploadMatchDayImage } from '../utils/cloudinary';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function CreateMatchDay() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    hostTeam: '',
    hostTeamId: '',
    deadline: '',
    imageUrl: '',
    imagePublicId: ''
  });

  const [ticketTypes, setTicketTypes] = useState([
    { name: 'General Admission', price: 0, quantity: '' }
  ]);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchTeams();
    if (isEditMode) {
      fetchMatchDay();
    }
  }, [id]);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const tournamentId = await getActiveTournamentId();
      
      if (!tournamentId) {
        setError('No active tournament selected. Please select a tournament in App Settings.');
        setLoadingTeams(false);
        return;
      }

      const teamsQuery = query(
        collection(db, 'teams'),
        where('tournamentId', '==', tournamentId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTeams(teamsData);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchMatchDay = async () => {
    try {
      setLoading(true);
      const data = await getMatchDayById(id);
      
      // Convert Firestore Timestamp to date string for input
      const formatDateForInput = (date) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toISOString().split('T')[0];
      };

      setFormData({
        name: data.name || '',
        date: formatDateForInput(data.date),
        hostTeam: data.hostTeam || '',
        hostTeamId: data.hostTeamId || '',
        deadline: formatDateForInput(data.deadline),
        imageUrl: data.imageUrl || '',
        imagePublicId: data.imagePublicId || ''
      });

      setTicketTypes(data.ticketTypes || [{ name: 'General Admission', price: 0, quantity: '' }]);
      setImagePreview(data.imageUrl || null);
    } catch (err) {
      console.error('Error fetching match day:', err);
      setError('Failed to load match day data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeamChange = (e) => {
    const teamId = e.target.value;
    const selectedTeam = teams.find(team => team.id === teamId);
    
    setFormData(prev => ({
      ...prev,
      hostTeamId: teamId,
      hostTeam: selectedTeam ? selectedTeam.name : ''
    }));
  };

  const handleTicketTypeChange = (index, field, value) => {
    const updatedTicketTypes = [...ticketTypes];
    updatedTicketTypes[index][field] = value;
    setTicketTypes(updatedTicketTypes);
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: '', quantity: '' }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name || !formData.date || !formData.hostTeamId || !formData.deadline) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate passes
    const validTicketTypes = ticketTypes.filter(
      tt => tt.quantity && parseInt(tt.quantity) > 0
    );

    if (validTicketTypes.length === 0) {
      setError('Please specify the number of passes.');
      return;
    }

    try {
      setLoading(true);

      let imageUrl = formData.imageUrl;
      let imagePublicId = formData.imagePublicId;

      // Upload new image if selected
      if (imageFile) {
        setUploading(true);
        const uploadResult = await uploadMatchDayImage(imageFile);
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
        setUploading(false);
      }

      const matchDayData = {
        name: formData.name,
        date: formData.date,
        hostTeam: formData.hostTeam,
        hostTeamId: formData.hostTeamId,
        deadline: formData.deadline,
        imageUrl,
        imagePublicId
      };

      // Prepare ticket types separately (always General Admission, free)
      const ticketTypesData = validTicketTypes.map(tt => ({
        name: 'General Admission',
        price: 0,
        quantity: parseInt(tt.quantity),
        sold: tt.sold || 0,
        createdAt: tt.createdAt || null
      }));

      if (isEditMode) {
        await updateMatchDay(id, matchDayData, ticketTypesData);
      } else {
        await createMatchDay(matchDayData, ticketTypesData);
      }

      navigate('/admin/ticketing');
    } catch (err) {
      console.error('Error saving match day:', err);
      setError(err.message || 'Failed to save match day. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/ticketing')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ticketing
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? 'Edit Match Day' : 'Create Match Day'}
        </h1>
        <p className="text-gray-600">
          {isEditMode ? 'Update match day details and pass information' : 'Add a new match day with number of passes'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Match Day Image *
          </label>
          <div className="flex items-start gap-4">
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload an image for the match day (JPG, PNG, max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Match Day Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Match Day Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., CCPL Season 2 - Match Day 5"
            required
          />
        </div>

        {/* Date and Host Team */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Match Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="hostTeamId" className="block text-sm font-medium text-gray-700 mb-2">
              Host Team *
            </label>
            {loadingTeams ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading teams...
              </div>
            ) : teams.length === 0 ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                No teams available
              </div>
            ) : (
              <select
                id="hostTeamId"
                name="hostTeamId"
                value={formData.hostTeamId}
                onChange={handleTeamChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
            Pass Sales Deadline *
          </label>
          <input
            type="date"
            id="deadline"
            name="deadline"
            value={formData.deadline}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
        </div>

        {/* Number of Passes */}
        <div>
          <label htmlFor="passQuantity" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Passes (General Admission - Free) *
          </label>
          <input
            type="number"
            id="passQuantity"
            placeholder="Enter number of passes available"
            value={ticketTypes[0]?.quantity || ''}
            onChange={(e) => handleTicketTypeChange(0, 'quantity', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            min="1"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            All passes are free General Admission passes
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/ticketing')}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading || uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading || uploading}
          >
            {(loading || uploading) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {uploading ? 'Uploading...' : loading ? 'Saving...' : isEditMode ? 'Update Match Day' : 'Create Match Day'}
          </button>
        </div>
      </form>
    </div>
  );
}

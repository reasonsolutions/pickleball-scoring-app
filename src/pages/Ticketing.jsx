import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMatchDays, deleteMatchDay, getActiveTournamentId, createOrder } from '../services/ticketingService';
import { Timestamp } from 'firebase/firestore';
import TicketingTabs from '../components/TicketingTabs';

export default function Ticketing() {
  const navigate = useNavigate();
  const [matchDays, setMatchDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [generateTicketModal, setGenerateTicketModal] = useState(null);
  const [orderForm, setOrderForm] = useState({
    email: '',
    phoneNumber: '',
    ticketTypeId: '',
    quantity: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMatchDays();
  }, []);

  const fetchMatchDays = async () => {
    try {
      setLoading(true);
      const tournamentId = await getActiveTournamentId();
      setActiveTournamentId(tournamentId);
      
      if (!tournamentId) {
        setError('No active tournament selected. Please select a tournament in App Settings.');
        setMatchDays([]);
        setLoading(false);
        return;
      }

      const data = await getAllMatchDays();
      setMatchDays(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching match days:', err);
      setError('Failed to load match days. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matchDayId) => {
    try {
      await deleteMatchDay(matchDayId);
      setMatchDays(matchDays.filter(md => md.id !== matchDayId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting match day:', err);
      alert('Failed to delete match day. Please try again.');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    
    // Handle string date
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    
    return 'N/A';
  };

  const handleGenerateTickets = (matchDay) => {
    setGenerateTicketModal(matchDay);
    setOrderForm({
      email: '',
      phoneNumber: '',
      ticketTypeId: matchDay.ticketTypes?.[0]?.id || '',
      quantity: 1
    });
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderForm.email || !orderForm.phoneNumber || !orderForm.ticketTypeId || !orderForm.quantity) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const selectedTicketType = generateTicketModal.ticketTypes.find(
        tt => tt.id === orderForm.ticketTypeId
      );
      
      if (!selectedTicketType) {
        alert('Invalid ticket type selected');
        return;
      }

      if (orderForm.quantity > selectedTicketType.available) {
        alert(`Only ${selectedTicketType.available} passes available`);
        return;
      }

      const orderData = {
        email: orderForm.email,
        phoneNumber: orderForm.phoneNumber,
        ticketTypeId: orderForm.ticketTypeId,
        ticketTypeName: selectedTicketType.name,
        quantity: parseInt(orderForm.quantity),
        pricePerTicket: selectedTicketType.price,
        totalAmount: selectedTicketType.price * parseInt(orderForm.quantity),
        matchDayName: generateTicketModal.name,
        matchDayDate: generateTicketModal.date
      };

      await createOrder(generateTicketModal.id, orderData);
      
      alert('Passes generated successfully!');
      setGenerateTicketModal(null);
      setOrderForm({ email: '', phoneNumber: '', ticketTypeId: '', quantity: 1 });
      
      // Refresh match days to show updated sold counts
      fetchMatchDays();
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to generate passes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <TicketingTabs />

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticketing</h1>
          <p className="text-gray-600">Manage match day passes and events</p>
        </div>
        <button
          onClick={() => navigate('/admin/ticketing/create')}
          disabled={!activeTournamentId}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTournamentId
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!activeTournamentId ? 'Please select a tournament in App Settings first' : ''}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Match Day
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p>{error}</p>
              {!activeTournamentId && (
                <button
                  onClick={() => navigate('/admin/app-settings')}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900 font-medium"
                >
                  Go to App Settings →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Host Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pass Types
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matchDays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        <p className="text-lg font-medium">No match days found</p>
                        <p className="text-sm mt-1">Create your first match day to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  matchDays.map((matchDay) => (
                    <tr key={matchDay.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {matchDay.imageUrl && (
                            <img
                              src={matchDay.imageUrl}
                              alt={matchDay.name}
                              className="h-10 w-10 rounded object-cover mr-3"
                            />
                          )}
                          <button
                            onClick={() => navigate(`/admin/ticketing/orders/${matchDay.id}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                          >
                            {matchDay.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(matchDay.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {matchDay.hostTeam || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        General Admission (Free)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(matchDay.deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/ticketing/edit/${matchDay.id}`)}
                            className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleGenerateTickets(matchDay)}
                            className="text-green-600 hover:text-green-900 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                            title="Generate Passes"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(matchDay.id)}
                            className="text-red-600 hover:text-red-900 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Generate Passes Modal */}
      {generateTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Passes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Match Day: <span className="font-medium">{generateTicketModal.name}</span>
            </p>
            
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={orderForm.email}
                  onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="customer@example.com"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={orderForm.phoneNumber}
                  onChange={(e) => setOrderForm({...orderForm, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              {/* Pass Type - Hidden, auto-select first one */}
              <input type="hidden" value={orderForm.ticketTypeId} />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Pass Type:</span> General Admission (Free)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {generateTicketModal.ticketTypes?.[0]?.available || 0} passes available
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Passes *
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>

              {/* Total Display - Free */}
              {orderForm.quantity && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    Total: <span className="font-bold text-green-600">
                      {orderForm.quantity} Free Pass{parseInt(orderForm.quantity) !== 1 ? 'es' : ''}
                    </span>
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setGenerateTicketModal(null);
                    setOrderForm({ email: '', phoneNumber: '', ticketTypeId: '', quantity: 1 });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {submitting ? 'Generating...' : 'Generate Passes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this match day? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMatchDayById, getPassesByMatchDay } from '../services/ticketingService';
import app, { db } from '../utils/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import PassQRModal from '../components/PassQRModal';
import PassAnalytics from '../components/PassAnalytics';
import { passDelivery, isDelivering, canRetry } from '../utils/passDelivery';
import * as XLSX from 'xlsx';

const functions = getFunctions(app, 'asia-south1');
const plural = (n) => `${n} pass${n === 1 ? '' : 'es'}`;
const CCPL_TEAM_ID = 'CCPL_SUPERADMIN_TEAM';
const MAX_SEND = 6;

const Spinner = ({ className = 'h-4 w-4' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// WhatsApp delivery of an approved request's passes, updated live as they're sent
const DeliveryBadge = ({ pass }) => {
  const info = passDelivery(pass);
  if (info.state === 'unknown') return null;
  const styles = {
    queued: 'text-gray-600',
    sending: 'text-orange-700',
    sent: 'text-green-700',
    failed: 'text-red-700',
    stuck: 'text-red-700',
  };
  const label = {
    queued: 'Waiting to send',
    sending: `Sending ${info.sent}/${info.total}`,
    sent: `Sent ${info.sent}/${info.total}`,
    failed: `Failed · ${info.sent}/${info.total} sent`,
    stuck: `Stopped · ${info.sent}/${info.total} sent`,
  }[info.state];
  return (
    <span className={`mt-1 flex items-center gap-1 text-xs font-medium ${styles[info.state]}`} title={info.error || undefined}>
      {isDelivering(info) && <Spinner className="h-3 w-3" />}
      {label}
    </span>
  );
};

export default function MatchDayOrders() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [matchDay, setMatchDay] = useState(null);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userNames, setUserNames] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [activeTab, setActiveTab] = useState('passes'); // 'passes', 'send', 'allocation' or 'analytics'
  const [teamAllocations, setTeamAllocations] = useState({});
  const [savingAllocations, setSavingAllocations] = useState(false);
  const [allTeams, setAllTeams] = useState([]); // Array of team objects with id and name
  const [qrModal, setQrModal] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [actionPassId, setActionPassId] = useState(null); // request currently being declined
  const [resendingIds, setResendingIds] = useState([]); // approved requests whose passes are being resent
  const [selectedIds, setSelectedIds] = useState([]); // requests ticked for bulk approve (pending) or resend (approved)
  const [approvingIds, setApprovingIds] = useState([]); // requests currently being approved
  const [sendForm, setSendForm] = useState({ name: '', phone: '', count: '1' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // Keep requests live, so WhatsApp delivery progress shows as passes are sent in the background
  useEffect(() => {
    if (!id) return undefined;
    return onSnapshot(collection(db, 'ticketing', id, 'passes'), (snap) => {
      setPasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Error listening to passes:', err));
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [matchDayData, passesData] = await Promise.all([
        getMatchDayById(id),
        getPassesByMatchDay(id)
      ]);
      
      setMatchDay(matchDayData);
      // passes themselves come from the live listener below
      
      // Now fetch teams using the tournamentId from matchDayData
      if (matchDayData?.tournamentId) {
        await fetchAllTeamsWithTournamentId(matchDayData.tournamentId);
      }
      
      // Fetch user names for both actionBy and userId fields
      const actionByIds = passesData.map(pass => pass.actionBy).filter(Boolean);
      const userIds = passesData.map(pass => pass.userId).filter(Boolean);
      const uniqueUserIds = [...new Set([...actionByIds, ...userIds])];
      const userNamesMap = {};
      
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'ccpl-users', userId));
            if (userDoc.exists()) {
              userNamesMap[userId] = userDoc.data().name || 'Unknown';
            } else {
              // Super admins who approve/decline here live in the users collection
              const adminDoc = await getDoc(doc(db, 'users', userId));
              const adminData = adminDoc.exists() ? adminDoc.data() : null;
              userNamesMap[userId] = adminData?.name || adminData?.displayName || adminData?.email || 'Unknown';
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            userNamesMap[userId] = 'Unknown';
          }
        })
      );
      
      setUserNames(userNamesMap);
      
      // Fetch team allocations (ignore errors if subcollection doesn't exist yet)
      await fetchTeamAllocations();
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load passes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeamsWithTournamentId = async (tournamentId) => {
    try {
      if (!tournamentId) {
        console.error('No tournament ID provided');
        return;
      }

      // Fetch all teams that belong to this tournament
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const tournamentTeams = teamsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(team => team.tournamentId === tournamentId)
        .map(team => ({ id: team.id, name: team.name }))
        .filter(team => team.name);
      
      // Sort by team name
      tournamentTeams.sort((a, b) => a.name.localeCompare(b.name));
      
      // Add CCPL as a hardcoded team for superadmin pass requests
      tournamentTeams.push({
        id: 'CCPL_SUPERADMIN_TEAM',
        name: 'CCPL'
      });
      
      setAllTeams(tournamentTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchTeamAllocations = async () => {
    try {
      // Fetch all allocation documents from the allocation subcollection (keyed by teamId)
      const allocationsSnapshot = await getDocs(collection(db, 'ticketing', id, 'allocation'));
      const allocations = {};
      
      allocationsSnapshot.docs.forEach(doc => {
        allocations[doc.id] = doc.data().allocated || 0;
      });
      
      setTeamAllocations(allocations);
    } catch (error) {
      console.error('Error fetching team allocations:', error);
    }
  };

  const handleSaveAllocations = async () => {
    try {
      setSavingAllocations(true);
      
      // Save each team's allocation as a separate document in the allocation subcollection
      // Document ID is the teamId
      const savePromises = Object.entries(teamAllocations).map(([teamId, allocated]) => {
        const team = allTeams.find(t => t.id === teamId);
        const allocationRef = doc(db, 'ticketing', id, 'allocation', teamId);
        return setDoc(allocationRef, {
          teamId,
          teamName: team?.name || '',
          allocated: parseInt(allocated) || 0,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(savePromises);
      alert('Team allocations saved successfully!');
    } catch (error) {
      console.error('Error saving allocations:', error);
      alert('Failed to save allocations. Please try again.');
    } finally {
      setSavingAllocations(false);
    }
  };

  const handleAllocationChange = (teamId, value) => {
    setTeamAllocations(prev => ({
      ...prev,
      [teamId]: parseInt(value) || 0
    }));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (typeof date === 'string') {
      return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return 'N/A';
  };

  // Get unique statuses and teams for filter dropdowns
  const uniqueStatuses = [...new Set(passes.map(pass => pass.status).filter(Boolean))];
  const uniqueTeams = [...new Set(passes.map(pass => pass.team).filter(Boolean))];

  const busy = approvingIds.length > 0 || !!actionPassId || resendingIds.length > 0;

  // Warn before leaving the page while passes are being sent
  useEffect(() => {
    if (!approvingIds.length && !sending && !resendingIds.length) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [approvingIds.length, sending, resendingIds.length]);

  // Approve goes through the generateIndividualPassPDFs Cloud Function, same as a team admin:
  // each request is marked approved and its passes are queued to send in the background, one PDF
  // per pass on WhatsApp. Progress shows live on each row. Super admins aren't held to the team's allocation.
  const approvePasses = async (list) => {
    if (!list.length) return;
    const total = sumPasses(list);
    const ok = window.confirm(list.length === 1
      ? `Approve ${plural(total)} for ${list[0].name}?\n\nEach pass will be sent to ${list[0].phoneNumber} on WhatsApp as a separate PDF.`
      : `Approve ${list.length} requests (${plural(total)})?\n\nEach person will get every pass as a separate PDF on WhatsApp.`);
    if (!ok) return;
    const ids = list.map(p => p.id);
    setApprovingIds(ids);
    try {
      await httpsCallable(functions, 'generateIndividualPassPDFs')({
        action: 'approve',
        userId: currentUser.uid,
        eventId: id,
        passIds: ids,
      });
      setSelectedIds(sel => sel.filter(sid => !ids.includes(sid)));
    } catch (err) {
      console.error('Error approving pass requests:', err);
      alert(`Failed to approve ${list.length === 1 ? 'the pass request' : 'the pass requests'}.\n\n${err?.message || 'Please try again.'}`);
    } finally {
      setApprovingIds([]);
      fetchData();
    }
  };

  // Resend queues approved requests' passes to send on WhatsApp again (same PDFs / QR codes).
  // onlyUnsent retries just the passes a failed send didn't get to.
  const resendPasses = async (list, { onlyUnsent = false } = {}) => {
    if (!list.length) return;
    const total = onlyUnsent
      ? list.reduce((sum, p) => { const info = passDelivery(p); return sum + (info.total - info.sent); }, 0)
      : sumPasses(list);
    const verb = onlyUnsent ? 'Retry' : 'Resend';
    const ok = window.confirm(list.length === 1
      ? `${verb} ${plural(total)} to ${list[0].name} (${list[0].phoneNumber}) on WhatsApp?`
      : `${verb} ${plural(total)} to ${list.length} people on WhatsApp?`);
    if (!ok) return;
    const ids = list.map(p => p.id);
    setResendingIds(ids);
    try {
      await httpsCallable(functions, 'generateIndividualPassPDFs')({
        action: 'resend',
        userId: currentUser.uid,
        eventId: id,
        passIds: ids,
        onlyUnsent,
      });
      setSelectedIds(sel => sel.filter(sid => !ids.includes(sid)));
    } catch (err) {
      console.error('Error resending passes:', err);
      alert(`Failed to ${verb.toLowerCase()} passes.\n\n${err?.message || 'Please try again.'}`);
    } finally {
      setResendingIds([]);
    }
  };

  const toggleSelected = (passId) => {
    setSelectedIds(sel => (sel.includes(passId) ? sel.filter(sid => sid !== passId) : [...sel, passId]));
  };

  // Declining is a plain status update; nothing is sent
  const handleDecline = async (pass) => {
    const ok = window.confirm(`Decline ${pass.name}'s request for ${plural(pass.numPasses || 0)}?`);
    if (!ok) return;
    setActionPassId(pass.id);
    try {
      const changes = { status: 'declined', updatedAt: Timestamp.now(), actionBy: currentUser.uid };
      await updateDoc(doc(db, 'ticketing', id, 'passes', pass.id), changes);
      setPasses(prev => prev.map(p => (p.id === pass.id ? { ...p, ...changes } : p)));
    } catch (err) {
      console.error('Error declining pass request:', err);
      alert('Failed to decline the pass request. Please try again.');
    } finally {
      setActionPassId(null);
    }
  };

  // Send Passes goes through the same Cloud Function as a team admin's send, from the CCPL team
  const handleSend = async (e) => {
    e.preventDefault();
    const name = sendForm.name.trim();
    const phone = sendForm.phone.trim();
    const count = parseInt(sendForm.count, 10);
    if (!name) return alert('Please enter a name.');
    if (!phone) return alert('Please enter a phone number.');
    if (isNaN(count) || count < 1 || count > MAX_SEND) return alert(`Number of passes must be between 1 and ${MAX_SEND}.`);
    const ok = window.confirm(`Send ${plural(count)} from CCPL to ${name} (${phone}) on WhatsApp?\n\nEach pass will be sent as a separate PDF.`);
    if (!ok) return;

    setSending(true);
    try {
      const digits = phone.replace(/\D/g, '');
      await httpsCallable(functions, 'generateIndividualPassPDFs')({
        action: 'send',
        userId: currentUser.uid,
        eventId: id,
        name,
        phoneNumber: digits.length === 10 ? '91' + digits : digits,
        numPasses: count,
        teamName: 'CCPL',
      });
      setSendForm({ name: '', phone: '', count: '1' });
    } catch (err) {
      console.error('Error sending passes:', err);
      alert(`Failed to send passes.\n\n${err?.message || 'Please try again.'}`);
    } finally {
      setSending(false);
      fetchData();
    }
  };

  // Sum of numPasses across requests, by status
  const sumPasses = (list) => list.reduce((sum, p) => sum + (Number(p.numPasses) || 0), 0);
  const totalPassesRequested = sumPasses(passes);
  const totalPassesApproved = sumPasses(passes.filter(p => p.status === 'approved' || p.status === 'confirmed'));
  const totalPassesDeclined = sumPasses(passes.filter(p => p.status === 'declined' || p.status === 'rejected'));

  // Passes issued from CCPL (super admins aren't held to CCPL's allocation)
  const ccplSent = passes
    .filter(p => p.teamId === CCPL_TEAM_ID)
    .filter(p => p.status === 'approved' || p.status === 'confirmed')
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  const ccplPassesIssued = sumPasses(ccplSent);

  // Filter passes based on search term, status, and team
  const filteredPasses = passes.filter(pass => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        pass.name?.toLowerCase().includes(search) ||
        pass.phoneNumber?.toLowerCase().includes(search) ||
        pass.team?.toLowerCase().includes(search) ||
        pass.note?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter && pass.status !== statusFilter) {
      return false;
    }
    
    // Team filter
    if (teamFilter && pass.team !== teamFilter) {
      return false;
    }
    
    return true;
  });

  const sortableColumns = [
    { key: 'createdAt', label: 'Date' },
    { key: 'id', label: 'Pass ID' },
    { key: 'name', label: 'Name' },
    { key: 'phoneNumber', label: 'Phone Number' },
    { key: 'team', label: 'Team' },
    { key: 'userId', label: 'User ID' },
    { key: 'numPasses', label: 'Num Passes' },
    { key: 'status', label: 'Status' },
    { key: 'actionBy', label: 'Action By' },
    { key: 'note', label: 'Note' },
  ];

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortValue = (pass, key) => {
    switch (key) {
      case 'numPasses':
        return Number(pass.numPasses) || 0;
      case 'createdAt': {
        const d = pass.createdAt;
        if (!d) return 0;
        if (d.toMillis) return d.toMillis();
        if (d.seconds) return d.seconds * 1000;
        return new Date(d).getTime() || 0;
      }
      case 'userId':
        return (pass.userId ? userNames[pass.userId] || '' : '').toLowerCase();
      case 'actionBy':
        return (pass.actionBy ? userNames[pass.actionBy] || '' : '').toLowerCase();
      default:
        return (pass[key] ?? '').toString().toLowerCase();
    }
  };

  const sortedPasses = sortConfig.key
    ? [...filteredPasses].sort((a, b) => {
        const av = getSortValue(a, sortConfig.key);
        const bv = getSortValue(b, sortConfig.key);
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredPasses;

  // Export every pass request (ignoring filters) with the table's columns, in the current sort order
  const handleExport = () => {
    const sortedAll = sortConfig.key
      ? [...passes].sort((a, b) => {
          const av = getSortValue(a, sortConfig.key);
          const bv = getSortValue(b, sortConfig.key);
          if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
          if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        })
      : passes;
    const rows = sortedAll.map(pass => ({
      'Date': formatDate(pass.createdAt),
      'Pass ID': pass.id,
      'Name': pass.name || 'N/A',
      'Phone Number': pass.phoneNumber || 'N/A',
      'Team': pass.team || 'N/A',
      'User ID': pass.userId ? (userNames[pass.userId] || 'Unknown') : 'N/A',
      'Num Passes': Number(pass.numPasses) || 0,
      'Passes Scanned': Math.min(Number(pass.scannedCount) || 0, Number(pass.numPasses) || 0),
      'Status': pass.status || 'N/A',
      'Action By': pass.actionBy ? (userNames[pass.actionBy] || 'Unknown') : 'N/A',
      'Note': pass.note || '-',
    }));
    const header = sortableColumns.map(col => col.label);
    header.splice(header.indexOf('Num Passes') + 1, 0, 'Passes Scanned');
    const ws = XLSX.utils.json_to_sheet(rows, { header });
    ws['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 11 }, { wch: 14 }, { wch: 11 }, { wch: 20 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pass Requests');
    const name = (matchDay?.name || 'Match_Day').replace(/[^\w-]+/g, '_');
    XLSX.writeFile(wb, `${name}_Pass_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Pending requests can be selected to approve, approved ones to resend; select-all covers the ones shown
  const isApproved = (p) => p.status === 'approved' || p.status === 'confirmed';
  const isSelectable = (p) => p.status === 'pending' || isApproved(p);
  const visibleSelectable = sortedPasses.filter(isSelectable);
  const selectedPasses = passes.filter(p => p.status === 'pending' && selectedIds.includes(p.id));
  const selectedApproved = passes.filter(p => isApproved(p) && selectedIds.includes(p.id));
  const selectedCount = selectedPasses.length + selectedApproved.length;
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every(p => selectedIds.includes(p.id));
  // Background WhatsApp delivery across approved requests
  const approvedDeliveries = passes.filter(isApproved).map(p => ({ pass: p, info: passDelivery(p) }));
  const delivering = approvedDeliveries.filter(d => isDelivering(d.info));
  const retryable = approvedDeliveries.filter(d => canRetry(d.info)).map(d => d.pass);
  const toggleAllVisible = () => {
    const visibleIds = visibleSelectable.map(p => p.id);
    setSelectedIds(sel => (allVisibleSelected
      ? sel.filter(sid => !visibleIds.includes(sid))
      : [...new Set([...sel, ...visibleIds])]));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-w-0 max-w-full">
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
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{matchDay?.name}</h1>
            <p className="text-gray-600">Pass Management</p>
            <button
              onClick={() => navigate(`/admin/ticketing/scan/${id}`)}
              className="mt-3 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
            >
              Open Gate Scanner
            </button>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Passes</p>
                <p className="text-lg font-bold text-gray-900">{passes.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Passes Requested</p>
                <p className="text-lg font-bold text-yellow-600">
                  {passes.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Passes Declined</p>
                <p className="text-lg font-bold text-red-600">
                  {passes.filter(p => p.status === 'declined' || p.status === 'rejected').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Passes Issued</p>
                <p className="text-lg font-bold text-green-600">
                  {passes.filter(p => p.status === 'approved' || p.status === 'confirmed').length}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-orange-200">
              <div>
                <p className="text-gray-600">Total Passes Requested</p>
                <p className="text-lg font-bold text-gray-900">{totalPassesRequested}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Passes Approved</p>
                <p className="text-lg font-bold text-green-600">{totalPassesApproved}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Passes Declined</p>
                <p className="text-lg font-bold text-red-600">{totalPassesDeclined}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('passes')}
              className={`${
                activeTab === 'passes'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Pass Requests
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`${
                activeTab === 'send'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Send Passes
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`${
                activeTab === 'allocation'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Team Allocation
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${
                activeTab === 'analytics'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Passes Tab Content */}
      {activeTab === 'passes' && (
        <>
          {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, team, or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex-1">
            <label htmlFor="team-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Team
            </label>
            <select
              id="team-filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter || teamFilter || searchTerm) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setTeamFilter('');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Export Button */}
          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={!passes.length}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              Export to Excel
            </button>
          </div>
        </div>

        {/* Results Count */}
        {(searchTerm || statusFilter || teamFilter) && (
          <p className="text-sm text-gray-600">
            Found {filteredPasses.length} pass{filteredPasses.length !== 1 ? 'es' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter && ` with status "${statusFilter}"`}
            {teamFilter && ` in team "${teamFilter}"`}
          </p>
        )}
      </div>

      {/* Bulk approve / resend bar */}
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 ${selectedCount ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
        <p className="text-sm text-gray-700">
          {approvingIds.length
            ? `Approving ${approvingIds.length} request${approvingIds.length === 1 ? '' : 's'}…`
            : resendingIds.length
              ? `Queueing passes for ${resendingIds.length} ${resendingIds.length === 1 ? 'person' : 'people'}…`
              : selectedCount
                ? [
                    selectedPasses.length && `${selectedPasses.length} pending (${plural(sumPasses(selectedPasses))})`,
                    selectedApproved.length && `${selectedApproved.length} approved (${plural(sumPasses(selectedApproved))})`
                  ].filter(Boolean).join(' · ') + ' selected'
                : 'Tick pending requests to approve, or approved ones to resend, several at once.'}
          {delivering.length > 0 && (
            <span className="mt-1 flex items-center gap-2 text-orange-700">
              <Spinner className="h-3 w-3" />
              Sending on WhatsApp for {delivering.length} request{delivering.length === 1 ? '' : 's'}: {delivering.reduce((sum, d) => sum + d.info.sent, 0)} of {delivering.reduce((sum, d) => sum + d.info.total, 0)} passes sent. This carries on even if you leave the page.
            </span>
          )}
          {retryable.length > 0 && (
            <span className="mt-1 block text-red-700">
              {retryable.length} request{retryable.length === 1 ? '' : 's'} didn't get every pass. Use Retry to send the missing ones.
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && !busy && (
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg"
            >
              Clear
            </button>
          )}
          {retryable.length > 0 && (
            <button
              onClick={() => resendPasses(retryable, { onlyUnsent: true })}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-600 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retry failed ({retryable.length})
            </button>
          )}
          <button
            onClick={() => approvePasses(selectedPasses)}
            disabled={!selectedPasses.length || busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approvingIds.length > 1 && <Spinner />}
            {approvingIds.length > 1 ? 'Approving…' : `Approve selected${selectedPasses.length ? ` (${selectedPasses.length})` : ''}`}
          </button>
          <button
            onClick={() => resendPasses(selectedApproved)}
            disabled={!selectedApproved.length || busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendingIds.length > 1 && <Spinner />}
            {resendingIds.length > 1 ? 'Resending…' : `Resend selected${selectedApproved.length ? ` (${selectedApproved.length})` : ''}`}
          </button>
        </div>
      </div>

      {/* Passes Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto max-w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="pl-6 pr-2 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all requests"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  disabled={!visibleSelectable.length || busy}
                  className="h-4 w-4 accent-orange-500 cursor-pointer disabled:cursor-not-allowed"
                />
              </th>
              {sortableColumns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 hover:bg-gray-100"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <span className={sortConfig.key === col.key ? 'text-gray-900' : 'text-gray-300'}>
                      {sortConfig.key === col.key && sortConfig.direction === 'desc' ? '▼' : '▲'}
                    </span>
                  </span>
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPasses.length === 0 ? (
              <tr>
                <td colSpan="12" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">
                      {searchTerm ? 'No matching passes found' : 'No passes yet'}
                    </p>
                    <p className="text-sm mt-1">
                      {searchTerm ? 'Try a different search term' : 'Passes haven\'t been generated for this match day'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedPasses.map((pass) => (
                <tr key={pass.id} className={selectedIds.includes(pass.id) && isSelectable(pass) ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                  <td className="pl-6 pr-2 py-4 w-10">
                    {isSelectable(pass) && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${pass.name}'s request`}
                        checked={selectedIds.includes(pass.id)}
                        onChange={() => toggleSelected(pass.id)}
                        disabled={busy}
                        className="h-4 w-4 accent-orange-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(pass.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {pass.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {pass.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pass.phoneNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pass.team || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pass.userId ? (userNames[pass.userId] || 'Loading...') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {pass.numPasses || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      pass.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : pass.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : pass.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pass.status || 'N/A'}
                    </span>
                    {isApproved(pass) && <DeliveryBadge pass={pass} />}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pass.actionBy ? (userNames[pass.actionBy] || 'Loading...') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={pass.note}>
                    {pass.note || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {pass.status === 'pending' && (
                        approvingIds.includes(pass.id) ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-green-700">
                            <Spinner /> Approving…
                          </span>
                        ) : actionPassId === pass.id ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
                            <Spinner /> Declining…
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => approvePasses([pass])}
                              disabled={busy}
                              className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecline(pass)}
                              disabled={busy}
                              className="px-3 py-1 text-xs font-medium rounded border border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Decline
                            </button>
                          </>
                        )
                      )}
                      {(pass.status === 'approved' || pass.status === 'confirmed') && (
                        <>
                        <button
                          onClick={() => setQrModal(pass)}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          title="View QR Codes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        {resendingIds.includes(pass.id) ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-orange-700">
                            <Spinner /> Queueing…
                          </span>
                        ) : (
                          <>
                          {canRetry(passDelivery(pass)) && (
                            <button
                              onClick={() => resendPasses([pass], { onlyUnsent: true })}
                              disabled={busy}
                              className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Send only the passes that weren't sent"
                            >
                              Retry
                            </button>
                          )}
                          <button
                            onClick={() => resendPasses([pass])}
                            disabled={busy || isDelivering(passDelivery(pass))}
                            className="px-3 py-1 text-xs font-medium rounded border border-orange-600 text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Resend passes on WhatsApp"
                          >
                            Resend
                          </button>
                          </>
                        )}
                        </>
                      )}
                      {pass.status !== 'pending' && pass.status !== 'approved' && pass.status !== 'confirmed' && (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
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

      {/* Send Passes Tab Content */}
      {activeTab === 'send' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900 text-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-orange-400">Passes issued from CCPL</p>
              <p className="text-5xl font-bold mt-2">{ccplPassesIssued}</p>
              <p className="text-sm text-gray-300 mt-2">across {ccplSent.length} recipient{ccplSent.length === 1 ? '' : 's'}</p>
            </div>

            <form onSubmit={handleSend} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Send Passes</h2>
                <p className="text-sm text-gray-600">Passes are sent from the CCPL team on WhatsApp, one PDF per pass.</p>
              </div>
              <div>
                <label htmlFor="send-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  id="send-name"
                  value={sendForm.name}
                  onChange={(e) => setSendForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter full name"
                  disabled={sending}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="send-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  id="send-phone"
                  type="tel"
                  value={sendForm.phone}
                  onChange={(e) => setSendForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9876543210"
                  disabled={sending}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a 10-digit number (e.g. 9876543210)</p>
              </div>
              <div>
                <label htmlFor="send-count" className="block text-sm font-medium text-gray-700 mb-1">Number of Passes (max {MAX_SEND})</label>
                <input
                  id="send-count"
                  inputMode="numeric"
                  maxLength={1}
                  value={sendForm.count}
                  onChange={(e) => setSendForm(f => ({ ...f, count: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="1"
                  disabled={sending}
                  className="block w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending && <Spinner />}
                {sending ? 'Saving…' : 'Send Passes'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-x-auto max-w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Passes issued from CCPL</h3>
            </div>
            {ccplSent.length === 0 ? (
              <p className="px-6 py-12 text-center text-gray-500">No CCPL passes issued yet for this match day.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Name', 'Phone Number', 'Num Passes', 'Sent By', 'WhatsApp', ''].map(label => (
                      <th key={label} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ccplSent.map(pass => (
                    <tr key={pass.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(pass.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{pass.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pass.phoneNumber || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{pass.numPasses || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pass.actionBy ? (userNames[pass.actionBy] || 'Loading...') : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm"><DeliveryBadge pass={pass} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setQrModal(pass)}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors text-sm"
                        >
                          View QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab Content */}
      {activeTab === 'analytics' && (
        <PassAnalytics eventId={id} passes={passes} allTeams={allTeams} teamAllocations={teamAllocations} />
      )}

      {/* Allocation Tab Content */}
      {activeTab === 'allocation' && (
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Team Pass Allocation</h2>
              <p className="text-gray-600">Set the number of passes allocated to each team for this match day.</p>
            </div>

            <div className="space-y-4">
              {allTeams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No teams found</p>
                  <p className="text-sm mt-1">Teams will appear here once they are added to the tournament</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allTeams.map(team => {
                      const teamPasses = passes.filter(p => p.teamId === team.id);
                      const requested = sumPasses(teamPasses.filter(p => p.status === 'pending'));
                      const issued = sumPasses(teamPasses.filter(p => p.status === 'approved' || p.status === 'confirmed'));
                      const rejected = sumPasses(teamPasses.filter(p => p.status === 'declined' || p.status === 'rejected'));
                      const allocated = teamAllocations[team.id] || 0;

                      return (
                        <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">{team.name}</h3>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Requested:</span>
                              <span className="font-medium text-yellow-600">{requested}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Issued:</span>
                              <span className="font-medium text-green-600">{issued}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Rejected:</span>
                              <span className="font-medium text-red-600">{rejected}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Remaining:</span>
                              <span className="font-medium text-blue-600">{Math.max(0, allocated - issued)}</span>
                            </div>
                          </div>

                          <div>
                            <label htmlFor={`allocation-${team.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                              Allocated Passes
                            </label>
                            <input
                              id={`allocation-${team.id}`}
                              type="number"
                              min="0"
                              value={teamAllocations[team.id] || 0}
                              onChange={(e) => handleAllocationChange(team.id, e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveAllocations}
                      disabled={savingAllocations}
                      className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingAllocations ? 'Saving...' : 'Save Allocations'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <PassQRModal
          pass={qrModal}
          matchDayName={matchDay?.name}
          eventId={id}
          eventDate={matchDay?.date}
          onClose={() => setQrModal(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCareerById, getApplicationsByCareer, updateApplicationStatus } from '../services/careersService';

const STATUS_OPTIONS = ['new', 'reviewed', 'shortlisted', 'interviewing', 'rejected', 'hired'];

const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-gray-100 text-gray-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  interviewing: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-green-100 text-green-700'
};

// Try to find a human-friendly identifier for an application from its custom answers,
// since the form is fully admin-defined and may or may not include a "name" field.
const getApplicantDisplayName = (app) => {
  const answers = app.customAnswers || {};
  const nameKey = Object.keys(answers).find(k => /name/i.test(k) && typeof answers[k] === 'string' && answers[k].trim());
  if (nameKey) return answers[nameKey];
  const emailKey = Object.keys(answers).find(k => /email/i.test(k) && typeof answers[k] === 'string' && answers[k].trim());
  if (emailKey) return answers[emailKey];
  return 'Applicant';
};

const getApplicantSubtitle = (app) => {
  const answers = app.customAnswers || {};
  const parts = [];
  const emailKey = Object.keys(answers).find(k => /email/i.test(k) && typeof answers[k] === 'string' && answers[k].trim());
  if (emailKey) parts.push(answers[emailKey]);
  const phoneKey = Object.keys(answers).find(k => /phone/i.test(k) && typeof answers[k] === 'string' && answers[k].trim());
  if (phoneKey) parts.push(answers[phoneKey]);
  return parts.join(' · ');
};

const isFileAnswer = (value) => value && typeof value === 'object' && !Array.isArray(value) && 'url' in value;

export default function CareerApplications() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [career, setCareer] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [careerData, applicationsData] = await Promise.all([
        getCareerById(id),
        getApplicationsByCareer(id)
      ]);
      setCareer(careerData);
      setApplications(applicationsData);
      setError(null);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await updateApplicationStatus(id, applicationId, newStatus);
      setApplications(applications.map(a => a.id === applicationId ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update application status.');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredApplications = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/careers')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Careers
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Applications {career ? `for ${career.title}` : ''}
        </h1>
        <p className="text-gray-600">{applications.length} total application{applications.length === 1 ? '' : 's'}</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['all', ...STATUS_OPTIONS].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filterStatus === status
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <svg className="w-16 h-16 text-gray-300 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">No applications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app) => {
            const isExpanded = expandedId === app.id;
            const displayName = getApplicantDisplayName(app);
            const subtitle = getApplicantSubtitle(app);
            const answers = app.customAnswers || {};

            return (
              <div key={app.id} className="bg-white rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                      {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">{formatDate(app.submittedAt)}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50">
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Applied On</p>
                      <p className="text-sm text-gray-900">{formatDate(app.submittedAt)}</p>
                    </div>

                    {/* All answers, rendered generically since the form is fully custom */}
                    {Object.keys(answers).length > 0 ? (
                      <div className="border-t border-gray-200 pt-4 mb-4 space-y-4">
                        {Object.entries(answers).map(([label, answer]) => (
                          <div key={label}>
                            <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
                            {isFileAnswer(answer) ? (
                              <a
                                href={answer.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-fit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {answer.originalFilename || 'View / Download File'}
                              </a>
                            ) : (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                {Array.isArray(answer) ? (answer.join(', ') || '—') : (answer || '—')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mb-4">No answers submitted.</p>
                    )}

                    {/* Status Update */}
                    <div className="border-t border-gray-200 pt-4 flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Update Status:</label>
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getOpenCareers } from '../services/careersService';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLPartners from '../components/CCPLPartners';

const timeAgo = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

const formatDeadline = (date) => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Careers() {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      setLoading(true);
      const data = await getOpenCareers();
      setCareers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching careers:', err);
      setError('Failed to load job openings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCareers = useMemo(() => {
    if (!search) return careers;
    return careers.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()));
  }, [careers, search]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f10' }}>
      <CCPLNavbar activePage="careers" />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, #f97316 0%, transparent 40%), radial-gradient(circle at 80% 60%, #ea580c 0%, transparent 40%)'
          }}
        ></div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold mb-6 tracking-wide uppercase">
            We're Hiring
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
            Build the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Pickleball</span> With Us
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Join a passionate team shaping the fastest-growing sports league in India. Explore open roles and find where you fit.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 mt-12">
            <div>
              <p className="text-3xl font-bold text-white">{careers.length}</p>
              <p className="text-sm text-gray-500 mt-1">Open Positions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-gray-800 rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-6"></div>
                <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : filteredCareers.length === 0 ? (
          <div className="text-center py-24">
            <svg className="w-20 h-20 text-gray-700 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No matching roles right now</h3>
            <p className="text-gray-500">Try a different search, or check back soon for new openings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCareers.map((career) => {
              const deadline = formatDeadline(career.applicationDeadline);
              return (
                <Link
                  key={career.id}
                  to={`/careers/${career.id}`}
                  className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/10"
                >
                  {/* Banner image accent */}
                  {career.bannerImage?.url && (
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-cover bg-center"
                      style={{ backgroundImage: `url(${career.bannerImage.url})` }}
                    ></div>
                  )}

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-xs text-gray-600 whitespace-nowrap">{timeAgo(career.createdAt)}</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">
                      {career.title}
                    </h3>

                    {career.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-5">
                        {career.description.replace(/[#*_`>-]/g, '').slice(0, 140)}
                        {career.description.length > 140 ? '...' : ''}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      {deadline ? (
                        <span className="text-xs text-gray-500">Apply by {deadline}</span>
                      ) : <span />}
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 group-hover:text-orange-400 group-hover:gap-2.5 transition-all">
                        View & Apply
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Don't see the right role?</h2>
          <p className="text-gray-400 mb-6">We're always looking for passionate people. Reach out and tell us how you can contribute.</p>
          <a
            href="mailto:careers@centrecourtsports.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Us Your Resume
          </a>
        </div>
      </div>

      <CCPLPartners />
      <CCPLFooter />
    </div>
  );
}

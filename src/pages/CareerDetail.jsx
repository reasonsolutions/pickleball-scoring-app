import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCareerById, submitApplication } from '../services/careersService';
import { uploadResumeDocument } from '../utils/cloudinary';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import MarkdownPreview from '@uiw/react-markdown-preview';
import '@uiw/react-md-editor/markdown-editor.css';

const formatDate = (date) => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CareerDetail() {
  const { id } = useParams();
  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    fetchCareer();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCareer = async () => {
    try {
      setLoading(true);
      const data = await getCareerById(id);
      if (!data) {
        setError('This job listing could not be found.');
      } else {
        setCareer(data);
      }
    } catch (err) {
      console.error('Error loading career:', err);
      setError('Failed to load job details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0f0f10' }}>
        <CCPLNavbar activePage="careers" />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error || !career) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0f0f10' }}>
        <CCPLNavbar activePage="careers" />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{error || 'Job not found'}</h1>
          <Link to="/careers" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Careers
          </Link>
        </div>
        <CCPLFooter />
      </div>
    );
  }

  const deadline = formatDate(career.applicationDeadline);
  const isClosed = career.status === 'closed';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f10' }}>
      <CCPLNavbar activePage="careers" />

      {/* Banner */}
      <div className="relative">
        {career.bannerImage?.url ? (
          <div className="h-64 sm:h-80 w-full relative overflow-hidden">
            <img src={career.bannerImage.url} alt={career.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/60 to-transparent"></div>
          </div>
        ) : (
          <div
            className="h-48 w-full relative"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #f97316 0%, transparent 40%), radial-gradient(circle at 80% 60%, #ea580c 0%, transparent 40%)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/40 to-transparent"></div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-6">
          <div className="relative -mt-16 sm:-mt-20">
            <Link to="/careers" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to all jobs
            </Link>

            {isClosed && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  Closed
                </span>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{career.title}</h1>

            {deadline && (
              <div className="flex items-center gap-6 text-gray-400 text-sm flex-wrap mb-6">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Apply by {deadline}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10" data-color-mode="dark">
            {career.description && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">About the Role</h2>
                <div className="prose prose-invert max-w-none">
                  <MarkdownPreview source={career.description} style={{ backgroundColor: 'transparent' }} />
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Ready to apply?</h3>
              <div className="space-y-3 mb-6 text-sm">
                {deadline && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deadline</span>
                    <span className="text-gray-200 font-medium">{deadline}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium capitalize ${isClosed ? 'text-red-400' : 'text-green-400'}`}>{career.status}</span>
                </div>
              </div>

              {isClosed ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-4 text-center font-medium">
                  This position is no longer accepting applications.
                </div>
              ) : (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Apply Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CCPLFooter />

      {showApplyModal && (
        <ApplyModal
          career={career}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
          }}
        />
      )}
    </div>
  );
}

function ApplyModal({ career, onClose, onSuccess }) {
  const formFields = career.customFields || [];

  // answers[field.id] holds the value for that field.
  // For 'file' fields, the value is a File object until upload; checkbox fields hold arrays.
  const [answers, setAnswers] = useState({});
  const [fileNames, setFileNames] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const setFieldValue = (field, value) => {
    setAnswers(prev => ({ ...prev, [field.id]: value }));
  };

  const handleCheckboxOption = (field, option, checked) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
      const updated = checked ? [...current, option] : current.filter(o => o !== option);
      return { ...prev, [field.id]: updated };
    });
  };

  const handleFileSelect = (field, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be less than 10MB.');
      return;
    }
    setFieldValue(field, file);
    setFileNames(prev => ({ ...prev, [field.id]: file.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    for (const field of formFields) {
      if (field.required) {
        const val = answers[field.id];
        const isEmpty = val === undefined || val === null || val === '' ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          setError(`Please answer: "${field.label}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // Upload any file-type fields first
      const fileFields = formFields.filter(f => f.type === 'file' && answers[f.id] instanceof File);
      let uploadedFiles = {};
      if (fileFields.length > 0) {
        setUploadingFiles(true);
        const uploads = await Promise.all(
          fileFields.map(async (field) => {
            const result = await uploadResumeDocument(answers[field.id]);
            return [field.id, {
              url: result.url,
              publicId: result.publicId,
              originalFilename: result.originalFilename || fileNames[field.id]
            }];
          })
        );
        uploadedFiles = Object.fromEntries(uploads);
        setUploadingFiles(false);
      }

      // Build human-readable answers keyed by question label
      const customAnswers = {};
      formFields.forEach((field) => {
        if (field.type === 'file') {
          customAnswers[field.label] = uploadedFiles[field.id] || null;
        } else {
          customAnswers[field.label] = answers[field.id] ?? (field.type === 'checkbox' ? [] : '');
        }
      });

      await submitApplication(career.id, {
        customAnswers,
        jobTitle: career.title
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const renderField = (field) => {
    const value = answers[field.id] ?? (field.type === 'checkbox' ? [] : '');

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder={field.placeholder || 'https://'}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder={field.placeholder || 'you@example.com'}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
      case 'phone':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder={field.placeholder || '+91 9876543210'}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select an option</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => setFieldValue(field, e.target.value)}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-800"
                />
                <span className="text-sm text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(opt)}
                  onChange={(e) => handleCheckboxOption(field, opt, e.target.checked)}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-800 rounded"
                />
                <span className="text-sm text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'file':
        return (
          <label className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-orange-500/50 transition-colors">
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-gray-400 truncate">
              {fileNames[field.id] || field.placeholder || 'Click to upload a file (max 10MB)'}
            </span>
            <input
              type="file"
              onChange={(e) => handleFileSelect(field, e.target.files[0])}
              className="hidden"
            />
          </label>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Application Submitted!</h3>
            <p className="text-gray-400">Thank you for applying for {career.title}. Our team will review your application and get back to you soon.</p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-white">Apply for {career.title}</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {formFields.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  This job hasn't configured an application form yet. Please check back later.
                </div>
              ) : (
                <div className="space-y-5">
                  {formFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        {field.label} {field.required && '*'}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || formFields.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {uploadingFiles ? 'Uploading Files...' : submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

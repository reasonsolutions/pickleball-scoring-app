import React, { useState } from 'react';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import { submitSupportRequest } from '../services/supportService';

const REASON_OPTIONS = [
  'Account Deletion',
  'Technical Issue / Bug Report',
  'Billing & Payment Issue',
  'Registration / Signup Help',
  'Tournament / Fixture Issue',
  'Report a Player or Team',
  'Feedback & Suggestions',
  'Partnership / Business Inquiry',
  'Others'
];

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reason: '',
    otherReason: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.reason) newErrors.reason = 'Please select a reason';
    if (formData.reason === 'Others' && !formData.otherReason.trim()) {
      newErrors.otherReason = 'Please specify your reason';
    }
    if (!formData.message.trim()) newErrors.message = 'Please describe your request';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      await submitSupportRequest({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        reason: formData.reason === 'Others' ? `Others: ${formData.otherReason.trim()}` : formData.reason,
        message: formData.message.trim()
      });
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', reason: '', otherReason: '', message: '' });
    } catch (err) {
      console.error('Error submitting support request:', err);
      setSubmitError('Something went wrong while submitting your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
      errors[field] ? 'border-red-500' : 'border-gray-700'
    }`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f10' }}>
      <CCPLNavbar activePage="support" />

      {/* Banner */}
      <div
        className="relative h-40 sm:h-52 w-full"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #f97316 0%, transparent 40%), radial-gradient(circle at 80% 60%, #ea580c 0%, transparent 40%)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/40 to-transparent"></div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-24 -mt-16 sm:-mt-20 relative">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Support</h1>
        <p className="text-gray-400 mb-10">
          Need help with something? Fill out the form below and our team will get back to you as soon as possible.
        </p>

        {success ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
            <p className="text-gray-400 mb-6">
              Thank you for reaching out. Our support team will review your request and contact you shortly.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 font-medium"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-5">
            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {submitError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Your full name"
                className={inputClass('name')}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                className={inputClass('email')}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="+91 9876543210"
                className={inputClass('phone')}
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Reason *</label>
              <select
                value={formData.reason}
                onChange={handleChange('reason')}
                className={inputClass('reason')}
              >
                <option value="">Select a reason</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.reason && <p className="text-red-400 text-xs mt-1">{errors.reason}</p>}
            </div>

            {formData.reason === 'Others' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Please specify *</label>
                <input
                  type="text"
                  value={formData.otherReason}
                  onChange={handleChange('otherReason')}
                  placeholder="Tell us the reason"
                  className={inputClass('otherReason')}
                />
                {errors.otherReason && <p className="text-red-400 text-xs mt-1">{errors.otherReason}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Message *</label>
              <textarea
                value={formData.message}
                onChange={handleChange('message')}
                placeholder="Describe your issue or request in detail..."
                rows={8}
                className={inputClass('message')}
              />
              {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>

      <CCPLFooter />
    </div>
  );
}

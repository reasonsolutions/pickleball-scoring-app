import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { createCareer, updateCareer, getCareerById } from '../services/careersService';
import { uploadCareerImage } from '../utils/cloudinary';
import CareerFormBuilder from '../components/CareerFormBuilder';

const emptyForm = () => ({
  title: '',
  applicationDeadline: '',
  status: 'open',
  description: '',
  bannerImage: null
});

export default function CreateCareer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState(emptyForm());
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      fetchCareer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCareer = async () => {
    try {
      setLoading(true);
      const data = await getCareerById(id);
      if (!data) {
        setError('Job listing not found.');
        return;
      }
      setFormData({
        title: data.title || '',
        applicationDeadline: data.applicationDeadline || '',
        status: data.status || 'open',
        description: data.description || '',
        bannerImage: data.bannerImage || null
      });
      setCustomFields(data.customFields || []);
      setImagePreview(data.bannerImage?.url || null);
    } catch (err) {
      console.error('Error loading career:', err);
      setError('Failed to load job listing.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB.');
      return;
    }

    try {
      setUploadingImage(true);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      const result = await uploadCareerImage(file);
      setFormData(prev => ({ ...prev, bannerImage: result }));
      setImagePreview(result.url);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload banner image. Please try again.');
      setImagePreview(formData.bannerImage?.url || null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, bannerImage: null }));
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Please enter a job title.');
      return;
    }

    try {
      setSaving(true);

      const careerData = {
        ...formData,
        customFields
      };

      if (isEditMode) {
        await updateCareer(id, careerData);
      } else {
        await createCareer(careerData);
      }

      navigate('/admin/careers');
    } catch (err) {
      console.error('Error saving career:', err);
      setError(err.message || 'Failed to save job listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? 'Edit Job Listing' : 'Create Job Listing'}
        </h1>
        <p className="text-gray-600">
          {isEditMode ? 'Update the job details and application form' : 'Add a new job opening and customize its application form'}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner Image */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Banner Image</h2>
          <div className="flex items-start gap-4">
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-40 h-28 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={uploadingImage}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              <p className="mt-1 text-xs text-gray-500">Optional banner image for the job listing (JPG, PNG, max 5MB)</p>
              {uploadingImage && <p className="text-xs text-orange-600 mt-1">Uploading...</p>}
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Job Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Senior Frontend Developer"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline (optional)</label>
              <input
                type="date"
                name="applicationDeadline"
                value={formData.applicationDeadline}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="open">Open - Accepting Applications</option>
                <option value="draft">Draft - Hidden from public</option>
                <option value="closed">Closed - No longer accepting</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
          <div className="border border-gray-300 rounded-md overflow-hidden" data-color-mode="light">
            <MDEditor
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value || '' }))}
              preview="edit"
              height={240}
              textareaProps={{ placeholder: 'Describe the role, team, responsibilities, and requirements. You can use Markdown formatting, including lists.' }}
            />
          </div>
        </div>

        {/* Form Builder */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Application Form</h2>
          <p className="text-sm text-gray-500 mb-4">
            This form is completely custom — nothing is pre-filled or mandatory. Add every field you want candidates to fill out, including their name, email, phone, resume, or any other question.
          </p>
          <CareerFormBuilder fields={customFields} onChange={setCustomFields} />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate('/admin/careers')}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={saving || uploadingImage}
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {saving ? 'Saving...' : isEditMode ? 'Update Job Listing' : 'Publish Job Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}

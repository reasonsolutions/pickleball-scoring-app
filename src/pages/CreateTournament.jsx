import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import ImageUpload from '../components/ImageUpload';

export default function CreateTournament() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    prizeMoney: '',
    registrationFee: '',
    startDate: '',
    endDate: '',
    coverImageUrl: '',
    categories: {
      mensSingles: false,
      mensDoubles: false,
      womensSingles: false,
      womensDoubles: false,
      mixedDoubles: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [name]: checked
      }
    }));
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      coverImageUrl: imageUrl || ''
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Tournament name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.rules.trim()) {
      setError('Rules are required');
      return false;
    }
    if (!formData.prizeMoney || parseFloat(formData.prizeMoney) <= 0) {
      setError('Prize money must be greater than 0');
      return false;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return false;
    }
    if (!formData.endDate) {
      setError('End date is required');
      return false;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date');
      return false;
    }
    if (new Date(formData.startDate) < new Date()) {
      setError('Start date cannot be in the past');
      return false;
    }
    
    // Check if at least one category is selected
    const hasSelectedCategory = Object.values(formData.categories).some(category => category);
    if (!hasSelectedCategory) {
      setError('Please select at least one tournament category');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const tournamentData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        rules: formData.rules.trim(),
        prizeMoney: parseFloat(formData.prizeMoney),
        registrationFee: formData.registrationFee ? parseFloat(formData.registrationFee) : 0,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        coverImageUrl: formData.coverImageUrl,
        categories: formData.categories,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'tournaments'), tournamentData);
      navigate('/admin/tournaments');
    } catch (error) {
      console.error('Error creating tournament:', error);
      setError('Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Tournament</h1>
          <p className="text-base-content/70 mt-1">
            Set up your pickleball tournament with all the details
          </p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {error && (
              <div className="alert alert-error mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Cover Image */}
              <div className="form-section">
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  currentImage={formData.coverImageUrl}
                />
              </div>

              {/* Basic Information Section */}
              <div className="form-section">
                <h3 className="text-lg font-semibold mb-4 text-base-content border-b border-base-300 pb-2">
                  Basic Information
                </h3>
                
                {/* Tournament Name */}
                <div className="form-control w-full mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Tournament Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter tournament name"
                    className="input input-bordered w-full focus:input-primary"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Description *</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="Describe your tournament..."
                    className="textarea textarea-bordered h-24 focus:textarea-primary resize-none"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>

              {/* Tournament Categories Section */}
              <div className="form-section">
                <h3 className="text-lg font-semibold mb-4 text-base-content border-b border-base-300 pb-2">
                  Tournament Categories *
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="mensSingles"
                        className="checkbox checkbox-primary"
                        checked={formData.categories.mensSingles}
                        onChange={handleCategoryChange}
                      />
                      <span className="label-text font-medium">Men's Singles</span>
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="mensDoubles"
                        className="checkbox checkbox-primary"
                        checked={formData.categories.mensDoubles}
                        onChange={handleCategoryChange}
                      />
                      <span className="label-text font-medium">Men's Doubles</span>
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="womensSingles"
                        className="checkbox checkbox-primary"
                        checked={formData.categories.womensSingles}
                        onChange={handleCategoryChange}
                      />
                      <span className="label-text font-medium">Women's Singles</span>
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="womensDoubles"
                        className="checkbox checkbox-primary"
                        checked={formData.categories.womensDoubles}
                        onChange={handleCategoryChange}
                      />
                      <span className="label-text font-medium">Women's Doubles</span>
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="mixedDoubles"
                        className="checkbox checkbox-primary"
                        checked={formData.categories.mixedDoubles}
                        onChange={handleCategoryChange}
                      />
                      <span className="label-text font-medium">Mixed Doubles</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Financial Information Section */}
              <div className="form-section">
                <h3 className="text-lg font-semibold mb-4 text-base-content border-b border-base-300 pb-2">
                  Financial Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Prize Money (₹) *</span>
                    </label>
                    <input
                      type="number"
                      name="prizeMoney"
                      placeholder="0.00"
                      className="input input-bordered w-full focus:input-primary"
                      value={formData.prizeMoney}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Registration Fee (₹)</span>
                    </label>
                    <input
                      type="number"
                      name="registrationFee"
                      placeholder="0.00"
                      className="input input-bordered w-full focus:input-primary"
                      value={formData.registrationFee}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="form-section">
                <h3 className="text-lg font-semibold mb-4 text-base-content border-b border-base-300 pb-2">
                  Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Start Date *</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      className="input input-bordered w-full focus:input-primary"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">End Date *</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      className="input input-bordered w-full focus:input-primary"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Rules Section */}
              <div className="form-section">
                <h3 className="text-lg font-semibold mb-4 text-base-content border-b border-base-300 pb-2">
                  Rules & Regulations
                </h3>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Tournament Rules *</span>
                  </label>
                  <textarea
                    name="rules"
                    placeholder="Enter tournament rules and regulations..."
                    className="textarea textarea-bordered h-32 focus:textarea-primary resize-none"
                    value={formData.rules}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="form-section">
                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-base-300">
                  <button
                    type="button"
                    className="btn btn-outline btn-lg"
                    onClick={() => navigate('/admin/tournaments')}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
                    disabled={loading}
                  >
                    {loading ? 'Creating Tournament...' : 'Create Tournament'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
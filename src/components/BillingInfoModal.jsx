import React, { useState } from 'react';

export default function BillingInfoModal({ isOpen, onClose, onSave, initialData = {} }) {
  const [formData, setFormData] = useState({
    billingName: initialData.billingName || '',
    gstNumber: initialData.gstNumber || '',
    billingAddress: initialData.billingAddress || ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.billingName.trim()) {
      errors.billingName = 'Individual/Company Name is required';
    }
    
    if (!formData.billingAddress.trim()) {
      errors.billingAddress = 'Billing Address is required';
    }
    
    // GST Number is optional, but if provided should follow Indian GST format
    if (formData.gstNumber.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(formData.gstNumber.trim())) {
      errors.gstNumber = 'Invalid GST Number format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving billing info:', error);
      setFormErrors({ submit: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-600">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
            Billing Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4 mb-6">
          <p className="text-orange-300 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
            Please provide your billing details. This information is required for all clubs and will be used for invoice generation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
              Individual / Company Name*
            </label>
            <input
              type="text"
              name="billingName"
              value={formData.billingName}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-700 text-white rounded-lg border ${
                formErrors.billingName ? 'border-red-500' : 'border-gray-600'
              } focus:border-orange-500 focus:outline-none`}
              style={{fontFamily: 'Avantique, sans-serif'}}
              placeholder="Enter name for billing"
            />
            {formErrors.billingName && (
              <p className="text-red-500 text-xs mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                {formErrors.billingName}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
              GST Number (if applicable)
            </label>
            <input
              type="text"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-700 text-white rounded-lg border ${
                formErrors.gstNumber ? 'border-red-500' : 'border-gray-600'
              } focus:border-orange-500 focus:outline-none`}
              style={{fontFamily: 'Avantique, sans-serif'}}
              placeholder="e.g., 27AAPFU0939F1ZV"
            />
            {formErrors.gstNumber && (
              <p className="text-red-500 text-xs mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                {formErrors.gstNumber}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" style={{fontFamily: 'Avantique, sans-serif'}}>
              Billing Address*
            </label>
            <textarea
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 bg-gray-700 text-white rounded-lg border ${
                formErrors.billingAddress ? 'border-red-500' : 'border-gray-600'
              } focus:border-orange-500 focus:outline-none`}
              style={{fontFamily: 'Avantique, sans-serif'}}
              placeholder="Enter complete billing address"
            />
            {formErrors.billingAddress && (
              <p className="text-red-500 text-xs mt-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                {formErrors.billingAddress}
              </p>
            )}
          </div>
          
          {formErrors.submit && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
              <p className="text-red-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                {formErrors.submit}
              </p>
            </div>
          )}
          
          <div className="flex space-x-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                isSaving
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              {isSaving ? 'Saving...' : 'Save Information'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
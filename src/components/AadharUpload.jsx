import React, { useState, useRef, useCallback } from 'react';
import { uploadAadharDocument } from '../utils/cloudinary';

const AadharUpload = ({ onAadharChange, currentAadhar, currentPreview }) => {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Handle file upload with Cloudinary upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type - accept images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid file. Accepted formats: JPG, PNG, GIF, PDF');
      return;
    }

    // Validate file size (max 10MB for documents)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload to Cloudinary
      const cloudinaryResult = await uploadAadharDocument(file);
      
      // Pass Cloudinary data to parent component
      onAadharChange({
        file: file,
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        previewUrl: file.type === 'application/pdf' ? null : cloudinaryResult.secure_url,
        fileName: file.name,
        fileType: file.type
      });
    } catch (error) {
      console.error('Error uploading Aadhar document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onAadharChange]);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Remove document
  const removeDocument = useCallback(() => {
    onAadharChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onAadharChange]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
          Upload your Aadhar Card <span className="text-red-500">*</span>
        </label>
        <p className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
          Please upload a clear copy of your Aadhar card (front side). Accepted formats: JPG, PNG, GIF, PDF (Max 10MB)
        </p>
      </div>

      {/* Document Preview */}
      {currentAadhar && (
        <div className="relative inline-block">
          {currentPreview ? (
            // Image preview
            <img
              src={currentPreview}
              alt="Aadhar document preview"
              className="w-64 h-40 object-cover rounded-lg border-2 border-orange-500"
            />
          ) : (
            // PDF or other document preview
            <div className="w-64 h-40 bg-gray-700 rounded-lg border-2 border-orange-500 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-orange-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white text-sm font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {currentAadhar.fileName}
                </p>
                <p className="text-gray-400 text-xs" style={{fontFamily: 'Avantique, sans-serif'}}>
                  {currentAadhar.fileType === 'application/pdf' ? 'PDF Document' : 'Document'}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={removeDocument}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-600 text-center">
            <div className="space-y-6">
              {/* Upload Animation */}
              <div className="mx-auto w-16 h-16 relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>
              
              {/* Upload Text */}
              <div className="space-y-3">
                <h3 className="text-orange-400 text-xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Uploading Document
                </h3>
                <div className="space-y-2 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                  <p className="text-lg">Uploading your Aadhar card...</p>
                  <p className="text-sm text-gray-400">Please do not close or refresh the page</p>
                </div>
              </div>
              
              {/* Progress Dots Animation */}
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Options */}
      {!currentAadhar && (
        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-gray-600 hover:border-orange-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4 relative z-10 pointer-events-none">
              <div className="mx-auto w-12 h-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                <p className="text-lg font-medium">Drop your Aadhar card here</p>
                <p className="text-sm text-gray-400">or click to browse</p>
                <p className="text-xs text-gray-500 mt-2">Supports: JPG, PNG, GIF, PDF (Max 10MB)</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Aadhar Card</span>
            </button>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="text-blue-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
            <p className="font-semibold mb-1">Security Notice:</p>
            <p>Your Aadhar card information is securely stored and will only be used for identity verification purposes. We follow strict data protection protocols to ensure your privacy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AadharUpload;
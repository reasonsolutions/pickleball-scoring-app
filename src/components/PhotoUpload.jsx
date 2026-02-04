import React, { useState, useRef, useCallback, useEffect } from 'react';
import { removeBackground } from '@imgly/background-removal';
import { uploadPlayerPhoto } from '../utils/cloudinary';

const PhotoUpload = ({ onPhotoChange, currentPhoto, currentPreview }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Camera constraints for better quality
  const cameraConstraints = {
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 960 },
      facingMode: 'user', // Front camera preferred
      aspectRatio: { ideal: 4/3 }
    },
    audio: false
  };

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setStream(mediaStream);
      setShowCamera(true);
      
      // Set video source after modal is shown
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please check permissions or try uploading a file instead.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraError(null);
  }, [stream]);

  // Capture photo from camera with Rembg background removal and Cloudinary upload
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob for Rembg processing
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Use Rembg to remove background - much better quality!
            const imageWithoutBg = await removeBackground(blob);
            
            // Create file for Cloudinary upload
            const file = new File([imageWithoutBg], 'camera-photo.png', { type: 'image/png' });
            
            // Upload to Cloudinary
            const cloudinaryResult = await uploadPlayerPhoto(file);
            
            // Pass Cloudinary data to parent component
            onPhotoChange({
              file: file,
              cloudinaryUrl: cloudinaryResult.secure_url,
              cloudinaryPublicId: cloudinaryResult.public_id,
              previewUrl: cloudinaryResult.secure_url
            });
            
            setCapturedPhoto(cloudinaryResult.secure_url);
            stopCamera();
          } catch (error) {
            console.error('Error processing photo:', error);
            // Fallback to original image if processing fails
            try {
              const file = new File([blob], 'camera-photo.png', { type: 'image/png' });
              const cloudinaryResult = await uploadPlayerPhoto(file);
              
              onPhotoChange({
                file: file,
                cloudinaryUrl: cloudinaryResult.secure_url,
                cloudinaryPublicId: cloudinaryResult.public_id,
                previewUrl: cloudinaryResult.secure_url
              });
              
              setCapturedPhoto(cloudinaryResult.secure_url);
              stopCamera();
            } catch (fallbackError) {
              console.error('Fallback upload also failed:', fallbackError);
              alert('Failed to upload photo. Please try again.');
            }
          }
        }
        setIsCapturing(false);
        setIsProcessing(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error capturing photo:', error);
      setIsCapturing(false);
      setIsProcessing(false);
    }
  }, [onPhotoChange, stopCamera]);

  // Handle file upload with background removal and Cloudinary upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Use Rembg to remove background from uploaded file
      const imageWithoutBg = await removeBackground(file);
      
      // Create new file with background removed
      const processedFile = new File([imageWithoutBg], 'uploaded-photo.png', { type: 'image/png' });
      
      // Upload to Cloudinary
      const cloudinaryResult = await uploadPlayerPhoto(processedFile);
      
      // Pass Cloudinary data to parent component
      onPhotoChange({
        file: processedFile,
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        previewUrl: cloudinaryResult.secure_url
      });
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      // Fallback to original file if processing fails
      try {
        const cloudinaryResult = await uploadPlayerPhoto(file);
        
        onPhotoChange({
          file: file,
          cloudinaryUrl: cloudinaryResult.secure_url,
          cloudinaryPublicId: cloudinaryResult.public_id,
          previewUrl: cloudinaryResult.secure_url
        });
      } catch (fallbackError) {
        console.error('Fallback upload also failed:', fallbackError);
        alert('Failed to upload photo. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onPhotoChange]);

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

  // Remove photo
  const removePhoto = useCallback(() => {
    onPhotoChange(null, null);
    setCapturedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onPhotoChange]);

  // Handle video stream when modal opens
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [showCamera, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-white text-base sm:text-lg font-medium" style={{fontFamily: 'Avantique, sans-serif'}}>
          Upload Photo <span className="text-red-500">*</span>
        </label>
        <p className="text-gray-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
          Please upload a clear passport-style photo or take one using your camera.
        </p>
      </div>

      {/* Photo Preview */}
      {(currentPreview || capturedPhoto) && (
        <div className="relative inline-block">
          <img
            src={currentPreview || capturedPhoto}
            alt="Profile preview"
            className="w-32 h-40 object-cover rounded-lg border-2 border-orange-500"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Processing Overlay - Blocks entire page interaction */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-600 text-center">
            <div className="space-y-6">
              {/* Processing Animation */}
              <div className="mx-auto w-16 h-16 relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              {/* Processing Text */}
              <div className="space-y-3">
                <h3 className="text-orange-400 text-xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Processing Your Photo
                </h3>
                <div className="space-y-2 text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                  <p className="text-lg">Removing background...</p>
                  <p className="text-sm text-gray-400">This may take a few moments</p>
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
      {!currentPreview && !capturedPhoto && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-white" style={{fontFamily: 'Avantique, sans-serif'}}>
                <p className="text-lg font-medium">Drop your photo here</p>
                <p className="text-sm text-gray-400">or click to browse</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload from Device</span>
            </button>
            
            <button
              type="button"
              onClick={startCamera}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              style={{fontFamily: 'Avantique, sans-serif'}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Take Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Error */}
      {cameraError && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p className="text-red-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
            {cameraError}
          </p>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-600">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-orange-400 text-xl font-bold" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Take Your Photo
                </h3>
                <button
                  onClick={stopCamera}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-orange-500/10 border border-orange-500 rounded-lg p-4">
                <h4 className="text-orange-400 font-semibold mb-2" style={{fontFamily: 'Avantique, sans-serif'}}>
                  Photo Guidelines:
                </h4>
                <ul className="text-white text-sm space-y-1" style={{fontFamily: 'Avantique, sans-serif'}}>
                  <li>• Stand in front of a plain, light-colored background</li>
                  <li>• Look directly at the camera with a neutral expression</li>
                  <li>• Ensure your face is well-lit and clearly visible</li>
                  <li>• Keep your head straight and shoulders square</li>
                  <li>• Remove any hats, sunglasses, or face coverings</li>
                </ul>
              </div>

              {/* Camera View with Overlay */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                  style={{ maxHeight: '400px' }}
                />
                
                {/* Passport Photo Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    {/* Oval guide for face positioning */}
                    <div 
                      className="border-2 border-orange-500 border-dashed rounded-full bg-transparent"
                      style={{
                        width: '200px',
                        height: '240px',
                        opacity: 0.7
                      }}
                    />
                    {/* Center crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-orange-500 rounded-full bg-transparent opacity-50" />
                    </div>
                    {/* Guidelines text */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-orange-400 text-sm font-medium whitespace-nowrap">
                      Position your face within the oval
                    </div>
                  </div>
                </div>
              </div>

              {/* Capture Button */}
              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing || isProcessing}
                  className={`${
                    isCapturing || isProcessing
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 hover:scale-105'
                  } text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform shadow-lg flex items-center space-x-2`}
                  style={{fontFamily: 'Avantique, sans-serif'}}
                >
                  {isCapturing || isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{isProcessing ? 'PROCESSING...' : 'CAPTURING...'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>CAPTURE PHOTO</span>
                    </>
                  )}
                </button>
              </div>

              {/* Processing Info */}
              {isProcessing && (
                <div className="text-center">
                  <p className="text-orange-400 text-sm" style={{fontFamily: 'Avantique, sans-serif'}}>
                    Removing background and creating transparent PNG...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PhotoUpload;
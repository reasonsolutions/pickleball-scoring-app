import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLTopBar from '../components/CCPLTopBar';
import { Step0PlayerInfo, Step1PlayerIdentity, Step2Eligibility, Step3Residency, Step4PickleballProfile, Step5PlayerBio, Step6Availability, Step7MandatoryPractice, Step8AuctionPreference, Step9MedicalFitness, Step10PlayerPhoto, Step11FinalDeclaration, StepPlaceholder } from './CCPLSignupSteps';
import { saveStep1Data, updateStep1Data, saveCompleteRegistration, saveRegistrationData, checkEmailExists } from '../services/ccplSignupService';
import { generateOTP, sendWhatsAppOTP, markPhoneAsVerified } from '../services/whatsappOtpService';

export default function CCPLSignup() {
  const navigate = useNavigate();
  const accentColor = '#ee3a24';
  const accentColorDark = '#7d0f0f';

  // Clear any saved form data since registration is closed
  React.useEffect(() => {
    localStorage.removeItem('ccpl-signup-form');
    localStorage.removeItem('ccpl-signup-step');
    localStorage.removeItem('ccpl-signup-maxstep');
    localStorage.removeItem('ccpl-signup-userid');
  }, []);

  // Add spinner animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Load saved data from localStorage on mount
  const loadSavedData = () => {
    try {
      const savedForm = localStorage.getItem('ccpl-signup-form');
      const savedStep = localStorage.getItem('ccpl-signup-step');
      const savedMaxStep = localStorage.getItem('ccpl-signup-maxstep');
      const savedUserId = localStorage.getItem('ccpl-signup-userid');
      
      return {
        form: savedForm ? JSON.parse(savedForm) : null,
        step: savedStep ? parseInt(savedStep) : 0,
        maxStep: savedMaxStep ? parseInt(savedMaxStep) : 0,
        userId: savedUserId || null
      };
    } catch (error) {
      console.error('Error loading saved data:', error);
      return { form: null, step: 0, maxStep: 0, userId: null };
    }
  };

  const savedData = loadSavedData();
  
  const [step, setStep] = useState(savedData.step);
  const [maxStep, setMaxStep] = useState(savedData.maxStep);
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState(savedData.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [form, setForm] = useState(savedData.form || {
    fullName: '', displayName: '', dobDay: '', dobMonth: '', dobYear: '', gender: '',
    whatsapp: '', email: '', password: '', city: '', currentAddress: '', permanentAddress: '',
    govIdType: '', govIdOther: '', govIdNumber: '', govIdFile: '',
    eligibilityRoute: '',
    residing: '', residingSinceMonth: '', residingSinceYear: '', residencyBasis: '', residencyBasisOther: '',
    residencyDocType: '', residencyFile: '',
    duprDoubles: '', duprSingles: '', duprProfile: '', discipline: '', preference: '', yearsPlaying: '',
    clubs: '', previousLeagues: '', achievements: '',
    bio: '', strengths: '', playingStyle: '', contribution: '',
    matchdays: {}, matchdaysConfirmed: '', postseasonDates: {}, postseasonAvailability: '', availabilityDecl: {},
    practiceCommit: '', practiceDays: {}, practiceTimes: {}, practiceRestrictions: '', practiceDecl: {},
    auctionUnderstand: false, preAuction: '', franchisePref: '', franchisePrefOther: '',
    medicalCondition: '', medicalDetails: '', medicallyFit: '', emergencyName: '', emergencyRelationship: '', emergencyNumber: '',
    playerPhoto: '', actionPhoto: '', mediaConsent: false,
    finalDecl: {},
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    try {
      // Create a copy of form without File objects for localStorage
      const formToSave = { ...form };
      // Remove File objects as they can't be stringified
      if (formToSave.govIdFile instanceof File) delete formToSave.govIdFile;
      if (formToSave.residencyFile instanceof File) delete formToSave.residencyFile;
      if (formToSave.playerPhoto instanceof File) delete formToSave.playerPhoto;
      if (formToSave.actionPhoto instanceof File) delete formToSave.actionPhoto;
      
      localStorage.setItem('ccpl-signup-form', JSON.stringify(formToSave));
    } catch (error) {
      console.error('Error saving form to localStorage:', error);
    }
  }, [form]);

  // Save step, maxStep, and userId to localStorage
  useEffect(() => {
    localStorage.setItem('ccpl-signup-step', step.toString());
  }, [step]);

  useEffect(() => {
    localStorage.setItem('ccpl-signup-maxstep', maxStep.toString());
  }, [maxStep]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem('ccpl-signup-userid', userId);
    }
  }, [userId]);

  // Clear localStorage on successful submission
  useEffect(() => {
    if (submitted) {
      localStorage.removeItem('ccpl-signup-form');
      localStorage.removeItem('ccpl-signup-step');
      localStorage.removeItem('ccpl-signup-maxstep');
      localStorage.removeItem('ccpl-signup-userid');
    }
  }, [submitted]);

  // OTP verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState(''); // Track which number was verified
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // Camera modal states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFieldName, setCameraFieldName] = useState(''); // Track which field is using camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Update verification status based on phone number changes
  useEffect(() => {
    if (verifiedPhoneNumber) {
      // If current number matches verified number, show as verified
      if (form.whatsapp === verifiedPhoneNumber) {
        setPhoneVerified(true);
      } else {
        // If number changed to something else, remove verification
        setPhoneVerified(false);
      }
    }
  }, [form.whatsapp, verifiedPhoneNumber]);

  // Auto-update matchdaysConfirmed based on checked matchdays
  useEffect(() => {
    const matchdaysCount = Object.values(form.matchdays || {}).filter(v => v === true).length;
    if (matchdaysCount !== form.matchdaysConfirmed) {
      setForm(prev => ({ ...prev, matchdaysConfirmed: matchdaysCount }));
    }
  }, [form.matchdays]);

  const STEP_META = [
    { label: 'Player Info', title: 'Player Information', sub: null },
    { label: 'Identity', title: 'Player Identity', sub: null },
    { label: 'Eligibility', title: 'CCPL Eligibility', sub: null },
    { label: 'Residency', title: 'Residency Verification', sub: 'Complete this section only if registering through Hyderabad Residency.' },
    { label: 'Profile', title: 'Pickleball Profile', sub: null },
    { label: 'Bio', title: 'Player Profile', sub: null },
    { label: 'Availability', title: 'Availability & Commitment', sub: null },
    { label: 'Practice', title: 'Mandatory Team Practice', sub: null },
    { label: 'Auction', title: 'Auction & Team Preference', sub: null },
    { label: 'Medical', title: 'Medical & Fitness Declaration', sub: null },
    { label: 'Photo', title: 'Player Photograph & Media', sub: null },
    { label: 'Declaration', title: 'Player Declaration & Consent', sub: null },
  ];

  const setField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  // Validation function for each step
  const validateStep = (stepNumber) => {
    const errors = [];
    
    switch(stepNumber) {
      case 0: // Player Info
        if (!form.fullName?.trim()) errors.push('Full Name');
        if (!form.email?.trim()) errors.push('Email');
        if (!form.password?.trim()) errors.push('Password');
        if (!form.whatsapp?.trim()) errors.push('WhatsApp Number');
        if (!form.gender) errors.push('Gender');
        if (!form.dobDay || !form.dobMonth || !form.dobYear) errors.push('Date of Birth');
        if (!form.city?.trim()) errors.push('City');
        if (!form.currentAddress?.trim()) errors.push('Current Address');
        if (!form.permanentAddress?.trim()) errors.push('Permanent Address');
        break;
        
      case 1: // Player Identity
        if (!form.govIdType) errors.push('Government ID Type');
        if (form.govIdType === 'Other' && !form.govIdOther?.trim()) errors.push('Other ID Type');
        if (!form.govIdNumber?.trim()) errors.push('Government ID Number');
        if (!form.govIdFile) errors.push('Government ID Document');
        break;
        
      case 2: // Eligibility
        if (!form.eligibilityRoute) errors.push('Eligibility Route');
        break;
        
      case 3: // Residency (only if eligibility route requires it)
        if (form.eligibilityRoute === 'residency') {
          if (!form.residing) errors.push('Residing Status');
          if (!form.residingSinceMonth || !form.residingSinceYear) errors.push('Residing Since');
          if (!form.residencyBasis) errors.push('Residency Basis');
          if (form.residencyBasis === 'Other' && !form.residencyBasisOther?.trim()) errors.push('Other Residency Basis');
          if (!form.residencyDocType) errors.push('Residency Document Type');
          if (!form.residencyFile) errors.push('Residency Proof Document');
        }
        break;
        
      case 4: // Pickleball Profile
        if (!form.discipline) errors.push('Discipline');
        if (!form.preference) errors.push('Preference');
        if (!form.yearsPlaying) errors.push('Years Playing');
        break;
        
      case 5: // Player Bio
        if (!form.bio?.trim()) errors.push('Player Bio');
        if (!form.strengths?.trim()) errors.push('Strengths');
        if (!form.playingStyle?.trim()) errors.push('Playing Style');
        if (!form.contribution?.trim()) errors.push('Contribution');
        break;
        
      case 6: // Availability
        if (!form.matchdaysConfirmed) errors.push('Matchday Availability Confirmation');
        // Check if all 9 availability declaration checkboxes are checked
        const requiredAvailabilityDeclarations = 9;
        const checkedAvailabilityDeclarations = Object.values(form.availabilityDecl || {}).filter(v => v === true).length;
        if (checkedAvailabilityDeclarations < requiredAvailabilityDeclarations) {
          errors.push(`All ${requiredAvailabilityDeclarations} availability declarations must be accepted`);
        }
        break;
        
      case 7: // Practice
        if (!form.practiceCommit) errors.push('Practice Commitment');
        const practiceTimesCount = Object.values(form.practiceTimes || {}).filter(v => v === true).length;
        if (practiceTimesCount === 0) errors.push('Practice Time Preference');
        // Check if all 6 practice declaration checkboxes are checked
        const requiredPracticeDeclarations = 6;
        const checkedPracticeDeclarations = Object.values(form.practiceDecl || {}).filter(v => v === true).length;
        if (checkedPracticeDeclarations < requiredPracticeDeclarations) {
          errors.push(`All ${requiredPracticeDeclarations} practice declarations must be accepted`);
        }
        break;
        
      case 8: // Auction
        if (!form.auctionUnderstand) errors.push('Auction Understanding Confirmation');
        if (!form.preAuction) errors.push('Pre-Auction Preference');
        if (form.franchisePref === 'Yes' && !form.franchisePrefOther?.trim()) {
          errors.push('Franchise Selection (you selected "Yes" but did not choose a franchise)');
        }
        break;
        
      case 9: // Medical
        if (!form.medicalCondition) errors.push('Medical Condition Status');
        if (form.medicalCondition === 'Yes' && !form.medicalDetails?.trim()) errors.push('Medical Condition Details');
        if (!form.medicallyFit) errors.push('Medical Fitness Declaration');
        if (!form.emergencyName?.trim()) errors.push('Emergency Contact Name');
        if (!form.emergencyRelationship?.trim()) errors.push('Emergency Contact Relationship');
        if (!form.emergencyNumber?.trim()) errors.push('Emergency Contact Number');
        break;
        
      case 10: // Player Photo
        if (!form.playerPhoto) errors.push('Player Photograph');
        if (!form.mediaConsent) errors.push('Media Consent');
        break;
        
      case 11: // Final Declaration
        // Check if all declaration checkboxes are checked
        const requiredDeclarations = 12; // Total number of declarations
        const checkedDeclarations = Object.values(form.finalDecl || {}).filter(v => v === true).length;
        if (checkedDeclarations < requiredDeclarations) {
          errors.push(`All ${requiredDeclarations} declarations must be accepted`);
        }
        break;
    }
    
    return errors;
  };

  // Handle phone verification
  const handleVerifyPhone = async () => {
    // Clean phone number - remove spaces, +91, etc.
    const cleanedPhone = form.whatsapp?.replace(/\D/g, '').replace(/^91/, '');
    
    console.log('Original phone:', form.whatsapp);
    console.log('Cleaned phone:', cleanedPhone);
    
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setSendingOtp(true);
    setOtpError('');
    setError('');
    
    // Generate OTP
    const otp = generateOTP();
    setGeneratedOtp(otp);
    console.log('Generated OTP:', otp); // For testing
    console.log('Sending to phone:', cleanedPhone);
    
    // Send OTP via WhatsApp (send 10-digit number, function will add +91)
    const result = await sendWhatsAppOTP(cleanedPhone, otp);
    setSendingOtp(false);
    
    if (result.success) {
      setShowOtpModal(true);
      setEnteredOtp('');
    } else {
      setError(`Failed to send OTP: ${result.error}`);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    if (enteredOtp === generatedOtp) {
      setPhoneVerified(true);
      setVerifiedPhoneNumber(form.whatsapp); // Save the verified phone number
      setShowOtpModal(false);
      setOtpError('');
      
      // If user already exists, update their verification status
      if (userId) {
        await markPhoneAsVerified(userId);
      }
    } else {
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const onField = (e) => setField(e.target.name, e.target.value);
  const onFile = (e) => {
    // Store the actual File object, not just the filename
    const file = e.target.files && e.target.files[0];
    
    // Validate file size (max 5MB)
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert(`File size must not exceed 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        e.target.value = ''; // Clear the input
        return;
      }
    }
    
    setField(e.target.name, file || null);
  };

  // Camera functions
  const openCamera = async (fieldName) => {
    setCameraFieldName(fieldName);
    setShowCameraModal(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Front camera for selfies
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use the upload option.');
      setShowCameraModal(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob and create File object
      canvas.toBlob((blob) => {
        const file = new File([blob], `${cameraFieldName}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setField(cameraFieldName, file);
        closeCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCameraFieldName('');
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const goStep = (i) => { if (i <= maxStep) setStep(i); };
  
  const next = async (e) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Next button clicked. Current step:', step);
    setError(null);
    
    // Validate current step before proceeding
    const validationErrors = validateStep(step);
    if (validationErrors.length > 0) {
      console.log('Validation failed:', validationErrors);
      setError(`Please fill in the following required fields: ${validationErrors.join(', ')}`);
      return;
    }
    
    console.log('Validation passed for step:', step);
    
    // If moving from Step 1 (step 0) to Step 2, check email and save user data
    if (step === 0 && !userId) {
      console.log('Checking email and saving Step 1 data...');
      setLoading(true);
      
      // Check if email exists and if payment has been completed
      const emailCheck = await checkEmailExists(form.email);
      
      if (emailCheck.exists && emailCheck.hasPayment) {
        // Email exists and payment is complete - block registration
        setLoading(false);
        setError(emailCheck.message);
        return;
      }
      
      if (emailCheck.exists && !emailCheck.hasPayment) {
        // Email exists but no payment - allow user to continue and overwrite
        console.log('Email exists but registration incomplete. Allowing user to continue...');
        setUserId(emailCheck.userId);
        // Update Step 1 data for existing user
        await updateStep1Data(emailCheck.userId, form);
        setLoading(false);
        const newStep = Math.min(step + 1, 11);
        console.log('Moving to step:', newStep);
        setStep(newStep);
        setMaxStep(Math.max(maxStep, newStep));
        return;
      }
      
      // Email doesn't exist - create new user
      const result = await saveStep1Data(form);
      setLoading(false);
      
      if (result.success) {
        console.log('Step 1 data saved successfully');
        setUserId(result.userId);
        // Also update additional Step 1 fields
        await updateStep1Data(result.userId, form);
        const newStep = Math.min(step + 1, 11);
        console.log('Moving to step:', newStep);
        setStep(newStep);
        setMaxStep(Math.max(maxStep, newStep));
      } else {
        console.error('Failed to save Step 1 data:', result.error);
        setError(result.error || 'Failed to save user data. Please try again.');
        return;
      }
    } else if (userId && step >= 1) {
      // Save current step data to registration subcollection before moving to next step
      console.log(`Saving Step ${step + 1} data...`);
      setLoading(true);
      
      // Prepare step data based on current step
      let stepData = {};
      const stepNumber = step + 1; // step 0 = Step 1, step 1 = Step 2, etc.
      
      switch (stepNumber) {
        case 2: // Player Identity
          // Upload govIdFile to Cloudinary if it's a File object
          let govIdFileUrl = form.govIdFile;
          if (form.govIdFile && typeof form.govIdFile !== 'string') {
            console.log('Uploading government ID to Cloudinary...');
            const { uploadCCPLGovIdDocument } = await import('../utils/cloudinaryOptimized');
            const uploadResult = await uploadCCPLGovIdDocument(form.govIdFile);
            govIdFileUrl = uploadResult.secure_url;
            console.log('Government ID uploaded:', govIdFileUrl);
            // Update form state with URL
            setField('govIdFile', govIdFileUrl);
          }
          
          stepData = {
            govIdType: form.govIdType,
            govIdOther: form.govIdOther,
            govIdNumber: form.govIdNumber,
            govIdFile: govIdFileUrl,
          };
          break;
        case 3: // CCPL Eligibility
          stepData = {
            eligibilityRoute: form.eligibilityRoute,
          };
          break;
        case 4: // Residency Verification
          // Upload residencyFile to Cloudinary if it's a File object
          let residencyFileUrl = form.residencyFile;
          if (form.residencyFile && typeof form.residencyFile !== 'string') {
            console.log('Uploading residency document to Cloudinary...');
            const { uploadCCPLResidencyDocument } = await import('../utils/cloudinaryOptimized');
            const uploadResult = await uploadCCPLResidencyDocument(form.residencyFile);
            residencyFileUrl = uploadResult.secure_url;
            console.log('Residency document uploaded:', residencyFileUrl);
            // Update form state with URL
            setField('residencyFile', residencyFileUrl);
          }
          
          stepData = {
            residing: form.residing,
            residingSinceMonth: form.residingSinceMonth,
            residingSinceYear: form.residingSinceYear,
            residencyBasis: form.residencyBasis,
            residencyBasisOther: form.residencyBasisOther,
            residencyDocType: form.residencyDocType,
            residencyFile: residencyFileUrl,
          };
          break;
        case 5: // Pickleball Profile
          stepData = {
            duprDoubles: form.duprDoubles,
            duprSingles: form.duprSingles,
            duprProfile: form.duprProfile,
            discipline: form.discipline,
            preference: form.preference,
            yearsPlaying: form.yearsPlaying,
            clubs: form.clubs,
            previousLeagues: form.previousLeagues,
            achievements: form.achievements,
          };
          break;
        case 6: // Player Bio
          stepData = {
            bio: form.bio,
            strengths: form.strengths,
            playingStyle: form.playingStyle,
            contribution: form.contribution,
          };
          break;
        case 7: // Availability & Commitment
          stepData = {
            matchdays: form.matchdays,
            matchdaysConfirmed: form.matchdaysConfirmed,
            postseasonDates: form.postseasonDates,
            postseasonAvailability: form.postseasonAvailability,
            availabilityDecl: form.availabilityDecl,
          };
          break;
        case 8: // Mandatory Team Practice
          stepData = {
            practiceCommit: form.practiceCommit,
            practiceDays: form.practiceDays,
            practiceTimes: form.practiceTimes,
            practiceRestrictions: form.practiceRestrictions,
            practiceDecl: form.practiceDecl,
          };
          break;
        case 9: // Auction & Team Preference
          stepData = {
            auctionUnderstand: form.auctionUnderstand,
            preAuction: form.preAuction,
            franchisePref: form.franchisePref,
            franchisePrefOther: form.franchisePrefOther,
          };
          break;
        case 10: // Medical & Fitness
          stepData = {
            medicalCondition: form.medicalCondition,
            medicalDetails: form.medicalDetails,
            medicallyFit: form.medicallyFit,
            emergencyName: form.emergencyName,
            emergencyRelationship: form.emergencyRelationship,
            emergencyNumber: form.emergencyNumber,
          };
          break;
        case 11: // Player Photograph & Media
          // Upload playerPhoto to Cloudinary if it's a File object
          let playerPhotoUrl = form.playerPhoto;
          if (form.playerPhoto && typeof form.playerPhoto !== 'string') {
            console.log('Uploading player photo to Cloudinary...');
            const { uploadCCPLPlayerPhoto } = await import('../utils/cloudinaryOptimized');
            const uploadResult = await uploadCCPLPlayerPhoto(form.playerPhoto);
            playerPhotoUrl = uploadResult.secure_url;
            console.log('Player photo uploaded:', playerPhotoUrl);
            // Update form state with URL
            setField('playerPhoto', playerPhotoUrl);
          }
          
          // Upload actionPhoto to Cloudinary if it's a File object
          let actionPhotoUrl = form.actionPhoto;
          if (form.actionPhoto && typeof form.actionPhoto !== 'string') {
            console.log('Uploading action photo to Cloudinary...');
            const { uploadCCPLActionPhoto } = await import('../utils/cloudinaryOptimized');
            const uploadResult = await uploadCCPLActionPhoto(form.actionPhoto);
            actionPhotoUrl = uploadResult.secure_url;
            console.log('Action photo uploaded:', actionPhotoUrl);
            // Update form state with URL
            setField('actionPhoto', actionPhotoUrl);
          }
          
          stepData = {
            playerPhoto: playerPhotoUrl,
            actionPhoto: actionPhotoUrl,
            mediaConsent: form.mediaConsent,
          };
          break;
        case 12: // Final Declaration
          stepData = {
            finalDecl: form.finalDecl,
          };
          break;
      }
      
      const result = await saveRegistrationData(userId, stepNumber, stepData);
      setLoading(false);
      
      if (result.success) {
        console.log(`Step ${stepNumber} data saved successfully`);
        
        // Skip step 4 (Residency Verification) if eligibility route is not 'residency'
        let newStep;
        if (step === 2 && form.eligibilityRoute !== 'residency') {
          // Skip from step 3 (Eligibility) directly to step 5 (Pickleball Profile)
          newStep = 4; // step 4 in code = step 5 in UI
          console.log('Skipping Residency Verification step');
        } else {
          newStep = Math.min(step + 1, 11);
        }
        
        console.log('Moving to step:', newStep);
        setStep(newStep);
        setMaxStep(Math.max(maxStep, newStep));
      } else {
        console.error(`Failed to save Step ${stepNumber} data:`, result.error);
        setError(`Failed to save step data: ${result.error}. Please try again.`);
        return;
      }
    } else {
      // Skip step 4 (Residency Verification) if eligibility route is not 'residency'
      let newStep;
      if (step === 2 && form.eligibilityRoute !== 'residency') {
        // Skip from step 3 (Eligibility) directly to step 5 (Pickleball Profile)
        newStep = 4; // step 4 in code = step 5 in UI
        console.log('Skipping Residency Verification step');
      } else {
        newStep = Math.min(step + 1, 11);
      }
      
      console.log('Moving from step', step, 'to step', newStep);
      setStep(newStep);
      setMaxStep(Math.max(maxStep, newStep));
    }
  };
  
  const back = () => {
    // Skip step 4 (Residency Verification) when going back if eligibility route is not 'residency'
    if (step === 4 && form.eligibilityRoute !== 'residency') {
      // Skip from step 5 (Pickleball Profile) back to step 3 (Eligibility)
      setStep(2);
      console.log('Skipping Residency Verification step (going back)');
    } else {
      setStep(Math.max(step - 1, 0));
    }
  };

  const handleSubmit = async (e) => {
    console.log('handleSubmit called! Event:', e?.type, 'Current step:', step);
    e.preventDefault();
    
    // Only allow submission on the final step (step 11)
    if (step !== 11) {
      console.log('Form submission prevented - not on final step. Current step:', step);
      return;
    }
    
    console.log('Proceeding with payment on step 11');
    
    if (!userId) {
      setError('User ID not found. Please start from Step 1.');
      return;
    }
    
    // Validate Step 12 - all declarations must be checked
    const requiredDeclarations = 12;
    const checkedDeclarations = Object.values(form.finalDecl || {}).filter(v => v === true).length;
    if (checkedDeclarations < requiredDeclarations) {
      setError(`Please accept all ${requiredDeclarations} declarations before submitting.`);
      return;
    }
    
    // Check if Razorpay is loaded
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please refresh the page and try again.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Razorpay payment options
      const options = {
        // Live key (production)
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Sfh0BL4V2hv19K',
        // Test key (for development/testing)
        // key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SBJaghscYIrVY1',
        amount: 19900, // Rs. 199 in paise
        currency: 'INR',
        name: 'Centre Court Pickleball League',
        description: 'CCPL Player Registration Fee',
        image: 'https://res.cloudinary.com/dchlpsvwh/image/upload/v1/pickleball_app/ccpl/logo',
        handler: async function (response) {
          console.log('Payment successful:', response);
          
          // After successful payment, submit the registration
          setLoading(true);
          console.log('Submitting registration after payment...');
          
          const result = await saveCompleteRegistration(userId, {
            ...form,
            paymentInfo: {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id || 'N/A',
              signature: response.razorpay_signature || 'N/A',
              amount: 19900,
              currency: 'INR',
              paidAt: new Date().toISOString(),
              paymentMethod: 'razorpay'
            }
          });
          
          if (result.success) {
            console.log('Registration submitted successfully');
            
            // Show success immediately
            setLoading(false);
            setSubmitted(true);
            
            // Send confirmation email in the background (don't wait for it)
            fetch('https://us-central1-pickleball-app-9ccf7.cloudfunctions.net/sendCCPLRegistrationEmail', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: form.email,
                name: form.fullName,
                userId: userId
              })
            }).then(emailResponse => emailResponse.json())
              .then(emailResult => {
                if (emailResult.status === 'success') {
                  console.log('Confirmation email sent successfully');
                } else {
                  console.error('Failed to send confirmation email:', emailResult.message);
                }
              })
              .catch(emailError => {
                console.error('Error sending confirmation email:', emailError);
              });
          } else {
            console.error('Registration submission failed:', result.error);
            setLoading(false);
            setError(`Payment successful but failed to submit registration: ${result.error}. Please contact support with payment ID: ${response.razorpay_payment_id}`);
          }
        },
        prefill: {
          name: form.fullName,
          email: form.email,
          contact: form.whatsapp
        },
        notes: {
          userId: userId,
          registrationType: 'CCPL Player Registration'
        },
        theme: {
          color: accentColor
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setError('Payment cancelled. Please try again to complete your registration.');
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response);
        let errorMessage = 'Payment failed. Please try again.';
        
        if (response.error) {
          console.error('Payment error details:', response.error);
          if (response.error.description) {
            errorMessage = response.error.description;
          } else if (response.error.reason) {
            errorMessage = response.error.reason;
          }
        }
        
        setLoading(false);
        setError(errorMessage);
        alert(`Payment Failed: ${errorMessage}`);
      });
      
      rzp.open();
      
    } catch (error) {
      console.error('Error initializing payment:', error);
      setLoading(false);
      setError('Failed to initialize payment. Please try again.');
    }
  };

  const makeRadio = (field, opts) => {
    const cur = form[field];
    return opts.map(o => {
      const isObj = typeof o === 'object';
      const value = isObj ? o.value : o;
      const label = isObj ? o.label : o;
      const desc = isObj ? o.desc : null;
      const selected = cur === value;
      return {
        value, label, desc,
        onClick: () => setField(field, value),
        bg: selected ? accentColor : 'transparent',
        color: selected ? '#fff' : 'rgba(255,255,255,0.6)',
        descColor: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
        borderColor: selected ? accentColor : 'rgba(255,255,255,0.2)',
      };
    });
  };

  const makeChecklist = (group, items) => {
    const state = form[group] || {};
    return items.map((it, i) => {
      const isObj = typeof it === 'object';
      const key = isObj ? it.key : String(i);
      const label = isObj ? it.label : it;
      const checked = !!state[key];
      return {
        key, label, checked,
        toggle: () => toggleGroupKey(group, key),
        bg: checked ? accentColor : 'transparent',
        color: checked ? '#fff' : 'rgba(255,255,255,0.6)'
      };
    });
  };

  const toggleGroupKey = (group, key) => setForm(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [key]: !(prev[group] || {})[key] } }));

  const buttonStyle = (opt) => ({
    padding: '11px 18px',
    background: opt.bg,
    color: opt.color,
    border: '1px solid rgba(255,255,255,0.25)',
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '12px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer'
  });

  const milestones = STEP_META.map((m, i) => {
    const isCurrent = i === step;
    const isDone = i < step;
    const visited = i <= maxStep;
    return {
      label: m.label,
      display: isDone ? '✓' : String(i + 1),
      bg: isCurrent ? accentColor : isDone ? '#fff' : 'transparent',
      color: isCurrent ? '#fff' : isDone ? '#0b0b0c' : 'rgba(255,255,255,0.5)',
      borderColor: isCurrent || isDone ? accentColor : 'rgba(255,255,255,0.3)',
      labelColor: isCurrent ? '#fff' : 'rgba(255,255,255,0.4)',
      cursor: visited ? 'pointer' : 'default',
      disabled: !visited,
      onClick: () => goStep(i),
    };
  });

  const renderStep = () => {
    const stepProps = { form, onField, onFile, setField, makeRadio, makeChecklist, buttonStyle, accentColor, openCamera };
    
    switch(step) {
      case 0: return <Step0PlayerInfo {...stepProps} onVerifyPhone={handleVerifyPhone} phoneVerified={phoneVerified} />;
      case 1: return <Step1PlayerIdentity {...stepProps} />;
      case 2: return <Step2Eligibility {...stepProps} />;
      case 3: return <Step3Residency {...stepProps} />;
      case 4: return <Step4PickleballProfile {...stepProps} />;
      case 5: return <Step5PlayerBio {...stepProps} />;
      case 6: return <Step6Availability {...stepProps} />;
      case 7: return <Step7MandatoryPractice {...stepProps} />;
      case 8: return <Step8AuctionPreference {...stepProps} />;
      case 9: return <Step9MedicalFitness {...stepProps} />;
      case 10: return <Step10PlayerPhoto {...stepProps} />;
      case 11: return <Step11FinalDeclaration {...stepProps} />;
      default: return <StepPlaceholder stepNumber={step} />;
    }
  };

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/TournySignUp/uploads/zuume-cut-black.ttf') format('truetype');
          font-weight: 900;
          font-style: normal;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/TournySignUp/uploads/zuume-cut-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        
        body {
          margin: 0;
          background: #0b0b0c;
          overflow-x: hidden;
        }
        
        .cc-league-tab {
          transition: background 0.2s ease, color 0.2s ease;
        }
        
        .cc-league-tab:hover {
          background: rgba(255, 255, 255, 0.85) !important;
        }
      `}</style>

      <div style={{ background: '#0b0b0c', color: '#fff', fontFamily: "'Montserrat', sans-serif", minHeight: '100vh' }}>
        <CCPLTopBar activeLeague="ccpl-s2" accentColor={accentColor} />
        {/* Navigation */}
        <CCPLNavbar activePage="signup" />

        {/* Main Content */}
        <section style={{ position: 'relative', background: '#0b0b0c', color: '#fff', fontFamily: "'Montserrat', sans-serif", minHeight: '100vh', boxSizing: 'border-box', padding: '32px 6vw 96px' }}>
          
          <div style={{ maxWidth: '1280px', margin: '0 auto 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Season 2 · Official Player Registration</span>
              <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: accentColor }}>Registration Closed</span>
            </div>
            <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)', height: '200px' }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <img src="/TournySignUp/uploads/test1.png" alt="Player action" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.15),rgba(11,11,12,0.8) 75%,#0b0b0c 100%)', pointerEvents: 'none' }}></div>
              <div style={{ position: 'absolute', top: '14px', left: '14px', width: '16px', height: '16px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff' }}></div>
              <div style={{ position: 'absolute', bottom: '14px', right: '14px', width: '16px', height: '16px', borderBottom: '2px solid #fff', borderRight: '2px solid #fff' }}></div>
              <div style={{ position: 'absolute', left: '28px', right: '28px', bottom: '22px' }}>
                <h1 style={{ fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'normal', fontSize: 'clamp(32px,4vw,48px)', lineHeight: 0.9, margin: 0, textTransform: 'uppercase' }}>Registration Closed</h1>
              </div>
            </div>
          </div>

          {/* Registration Closed Message */}
          <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', border: '1px solid rgba(255,255,255,0.18)', padding: '56px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(238, 58, 36, 0.1)', border: `3px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: accentColor }}>
              ⏱
            </div>
            <div>
              <span style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, display: 'block', marginBottom: '12px' }}>Applications Closed</span>
              <h2 style={{ fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'normal', fontSize: '44px', lineHeight: 1, margin: '0 0 16px 0', textTransform: 'uppercase' }}>Deadline Has Passed</h2>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', maxWidth: '520px', margin: '0 auto' }}>
                The registration window for CCPL Season 2 has now closed. The application deadline was 22 August 2026, and we are no longer accepting new registrations.
              </p>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', maxWidth: '520px', margin: '16px auto 0' }}>
                Thank you for your interest in the Centre Court Pickleball League. Please stay tuned for announcements about future seasons.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                to="/ccpl-home"
                style={{ padding: '14px 28px', background: `linear-gradient(180deg,${accentColor},${accentColorDark})`, border: 'none', color: '#fff', textDecoration: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'inline-block' }}
              >
                Back to Home
              </Link>
            </div>
          </div>

          {/* Hidden form content - keeping for reference but not displaying */}
          {false && !submitted && (
            <div style={{ maxWidth: '1280px', margin: '0 auto 36px', overflowX: 'auto' }}>
              <div style={{ position: 'relative', minWidth: '760px' }}>
                <div style={{ position: 'absolute', top: '13px', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.15)' }}></div>
                <div style={{ position: 'absolute', top: '13px', left: 0, height: '2px', background: accentColor, width: `${(step / 11) * 100}%`, transition: 'width .3s ease' }}></div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                  {milestones.map((ms, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="cc-milestone"
                      onClick={ms.onClick}
                      disabled={ms.disabled}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        flex: '0 0 auto',
                        width: '60px',
                        cursor: ms.cursor
                      }}
                    >
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: ms.bg,
                        color: ms.color,
                        border: `2px solid ${ms.borderColor}`,
                        flexShrink: 0,
                        boxSizing: 'border-box'
                      }}>
                        {ms.display}
                      </span>
                      <span style={{
                        fontSize: '8.5px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: ms.labelColor,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '60px'
                      }}>
                        {ms.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OTP Verification Modal */}
          {showOtpModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: '#0b0b0c', border: `2px solid ${accentColor}`, padding: '40px', maxWidth: '450px', width: '90%' }}>
                <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '20px', margin: '0 0 10px', textTransform: 'uppercase', color: accentColor }}>Verify WhatsApp Number</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '25px' }}>
                  We've sent a 4-digit OTP to your WhatsApp number ending in {form.whatsapp?.slice(-4)}
                </p>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                  Enter OTP
                  <input
                    type="text"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    maxLength="4"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.25)',
                      color: '#fff',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '24px',
                      padding: '10px 2px',
                      outline: 'none',
                      textAlign: 'center',
                      letterSpacing: '0.5em'
                    }}
                    autoFocus
                  />
                </label>

                {otpError && (
                  <p style={{ color: '#ff4444', fontSize: '12px', marginBottom: '15px' }}>{otpError}</p>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={enteredOtp.length !== 4}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      background: enteredOtp.length === 4 ? accentColor : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      border: 'none',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      cursor: enteredOtp.length === 4 ? 'pointer' : 'not-allowed',
                      opacity: enteredOtp.length === 4 ? 1 : 0.5
                    }}
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpModal(false);
                      setEnteredOtp('');
                      setOtpError('');
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      background: 'transparent',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form is now hidden - registration closed */}
          {false && submitted ? (
            <>

              {/* Payment Success Modal */}
              {showPaymentSuccess && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                  <div style={{ background: '#0b0b0c', border: `2px solid ${accentColor}`, padding: '40px', maxWidth: '500px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `rgba(0,255,0,0.1)`, border: '3px solid #0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '40px' }}>
                      ✓
                    </div>
                    <h2 style={{ fontFamily: "'Zuume Cut', sans-serif", fontSize: '32px', margin: '0 0 15px', textTransform: 'uppercase', color: '#0f0' }}>Payment Successful!</h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>Your registration has been submitted successfully.</p>
                  </div>
                </div>
              )}
              
              <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '14px', border: '1px solid rgba(255,255,255,0.18)', padding: '56px' }}>
                <span style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor }}>Registration Received</span>
                <p style={{ fontFamily: "'Zuume Cut', sans-serif", fontWeight: 900, fontStyle: 'normal', fontSize: '44px', lineHeight: 1, margin: 0, textTransform: 'uppercase' }}>Thank You<br />For Registering</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', maxWidth: '420px' }}>Check your email for confirmation. The League Committee will verify your eligibility and residency documentation before the Auction on 5 September 2026.</p>
                <div style={{ display: 'flex', gap: '15px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate(`/ccpl-profile/${userId}`)}
                    style={{ padding: '14px 28px', background: `linear-gradient(180deg,${accentColor},${accentColorDark})`, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}
                  >
                    View My Profile →
                  </button>
                  <Link
                    to="/ccpl-home"
                    style={{ padding: '14px 28px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', textDecoration: 'none', fontFamily: "'Montserrat', sans-serif", fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'inline-block' }}
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </>
          ) : false && (
            <form
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                // Prevent Enter key from EVER submitting the form
                // User MUST click the Submit Registration button explicitly
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              style={{ maxWidth: '760px', margin: '0 auto', border: '1px solid rgba(255,255,255,0.18)', padding: '40px 5vw', display: 'flex', flexDirection: 'column', gap: '22px', boxSizing: 'border-box' }}
            >
              
              <div>
                <span style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: accentColor }}>Section {String(step + 1).padStart(2, '0')} / 12</span>
                <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '26px', margin: '6px 0 2px', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{STEP_META[step].title}</h2>
                {STEP_META[step].sub && (
                  <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(255,255,255,0.45)' }}>{STEP_META[step].sub}</p>
                )}
              </div>

              {renderStep()}

              {/* Error and Loading Display */}
              {error && (
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(238, 58, 36, 0.1)',
                  border: '1px solid rgba(238, 58, 36, 0.3)',
                  borderRadius: '4px',
                  color: '#ff6b6b',
                  fontSize: '13px',
                  lineHeight: 1.5
                }}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              {loading && (
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(238, 58, 36, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderTopColor: accentColor,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></span>
                  Saving your information...
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '16px' }}>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    disabled={loading}
                    style={{
                      padding: '16px 22px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    ← Back
                  </button>
                )}
                {step < 11 ? (
                  <button
                    type="button"
                    onClick={next}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '19px',
                      background: `linear-gradient(180deg,${accentColor},${accentColorDark})`,
                      border: 'none',
                      color: '#fff',
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: '16px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading && step === 0 ? 'Saving...' : 'Next →'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '19px',
                      background: `linear-gradient(180deg,${accentColor},${accentColorDark})`,
                      border: 'none',
                      color: '#fff',
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: '16px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Submitting...' : 'Submit Registration →'}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Camera Modal */}
        {showCameraModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '0.05em'
                }}>Take Photo</h3>
                <button
                  onClick={closeCamera}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{
                position: 'relative',
                width: '100%',
                background: '#000',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    transform: 'scaleX(-1)' // Mirror the video for selfie mode
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.5)',
                textAlign: 'center'
              }}>
                Position your face in the center. Ensure good lighting and a plain background.
              </p>

              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={closeCamera}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: `linear-gradient(180deg, ${accentColor}, ${accentColorDark})`,
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  📷 Capture Photo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <CCPLFooter />
    </>
  );
}

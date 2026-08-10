import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

const VENDORS_COLLECTION = 'vendors';

/**
 * Vendor Service
 * Handles all vendor-related operations
 */

// Create a new vendor
export const createVendor = async (vendorData) => {
  try {
    const vendorDoc = {
      name: vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone,
      category: vendorData.category,
      status: 'pending', // pending, active, inactive
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Add logo only if provided
    if (vendorData.logo) {
      vendorDoc.logo = vendorData.logo;
    }
    
    const vendorRef = await addDoc(collection(db, VENDORS_COLLECTION), vendorDoc);
    
    return { id: vendorRef.id, ...vendorData, status: 'pending' };
  } catch (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }
};

// Get all vendors
export const getAllVendors = async () => {
  try {
    const vendorsSnapshot = await getDocs(collection(db, VENDORS_COLLECTION));
    const vendors = [];
    
    vendorsSnapshot.forEach((doc) => {
      vendors.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return vendors;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
};

// Get vendor by ID
export const getVendorById = async (vendorId) => {
  try {
    const vendorDoc = await doc(db, VENDORS_COLLECTION, vendorId);
    if (vendorDoc.exists()) {
      return { id: vendorDoc.id, ...vendorDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching vendor:', error);
    throw error;
  }
};

// Get vendor by email
export const getVendorByEmail = async (email) => {
  try {
    const q = query(collection(db, VENDORS_COLLECTION), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching vendor by email:', error);
    throw error;
  }
};

// Update vendor
export const updateVendor = async (vendorId, vendorData) => {
  try {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
    await updateDoc(vendorRef, {
      ...vendorData,
      updatedAt: serverTimestamp()
    });
    
    return { id: vendorId, ...vendorData };
  } catch (error) {
    console.error('Error updating vendor:', error);
    throw error;
  }
};

// Delete vendor
export const deleteVendor = async (vendorId) => {
  try {
    await deleteDoc(doc(db, VENDORS_COLLECTION, vendorId));
    return true;
  } catch (error) {
    console.error('Error deleting vendor:', error);
    throw error;
  }
};

// Send vendor invitation email
export const sendVendorInvitation = async (vendorData, setupToken) => {
  try {
    const setupLink = `${window.location.origin}/vendor/setup-password?token=${setupToken}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">Welcome to HPL Vendor Portal</h1>
          <p style="color: #666; margin: 10px 0;">You've been invited as a vendor</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${vendorData.name}!</h2>
          <p style="color: #666; margin: 15px 0;">
            You have been added as a vendor for the Hyderabad Pickleball League.
          </p>
          <p style="color: #666; margin: 15px 0;">
            <strong>Vendor Details:</strong><br>
            Name: ${vendorData.name}<br>
            Category: ${vendorData.category}<br>
            Email: ${vendorData.email}
          </p>
          <p style="color: #666; margin: 15px 0;">
            To complete your registration and set up your password, please click the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}"
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Set Up Your Password
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 20px;">
            This link will expire in 24 hours for security reasons.
          </p>
          <p style="color: #999; font-size: 12px;">
            If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            © 2024 Hyderabad Pickleball League. All rights reserved.
          </p>
        </div>
      </div>
    `;

    // Log the setup link for testing (remove in production)
    console.log('Vendor Setup Link:', setupLink);

    // Firebase project ID - use the correct one
    const projectId = 'pickleball-app-9ccf7';

    // Call Firebase function to send email
    const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/sendRecruitmentEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: vendorData.email,
        subject: 'Welcome to HPL Vendor Portal - Set Up Your Password',
        html: emailHtml,
        type: 'vendor_invitation'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Email sending failed:', errorText);
      // Don't throw error - vendor is already created, just log the issue
      return {
        success: false,
        message: 'Vendor created but email failed to send. Please share the setup link manually.',
        setupLink
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending vendor invitation:', error);
    // Don't throw error - vendor is already created
    const setupLink = `${window.location.origin}/vendor/setup-password?token=${setupToken}`;
    return {
      success: false,
      message: 'Vendor created but email failed to send. Please share the setup link manually.',
      setupLink,
      error: error.message
    };
  }
};

// Generate setup token for vendor
export const generateSetupToken = async (vendorId, email) => {
  try {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Store token in vendor-setup-tokens collection
    const tokenRef = await addDoc(collection(db, 'vendor-setup-tokens'), {
      vendorId,
      email,
      token,
      expiresAt,
      used: false,
      createdAt: serverTimestamp()
    });
    
    return token;
  } catch (error) {
    console.error('Error generating setup token:', error);
    throw error;
  }
};

// Verify setup token
export const verifySetupToken = async (token) => {
  try {
    const q = query(
      collection(db, 'vendor-setup-tokens'),
      where('token', '==', token),
      where('used', '==', false)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { valid: false, message: 'Invalid token' };
    }
    
    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = tokenData.expiresAt.toDate();
    
    if (now > expiresAt) {
      return { valid: false, message: 'Token has expired' };
    }
    
    return {
      valid: true,
      tokenId: tokenDoc.id,
      vendorId: tokenData.vendorId,
      email: tokenData.email
    };
  } catch (error) {
    console.error('Error verifying setup token:', error);
    throw error;
  }
};

// Toggle vendor status (active/inactive)
export const toggleVendorStatus = async (vendorId, currentStatus) => {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
    await updateDoc(vendorRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    
    return newStatus;
  } catch (error) {
    console.error('Error toggling vendor status:', error);
    throw error;
  }
};

// Mark token as used
export const markTokenAsUsed = async (tokenId) => {
  try {
    const tokenRef = doc(db, 'vendor-setup-tokens', tokenId);
    await updateDoc(tokenRef, {
      used: true,
      usedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
};

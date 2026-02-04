import React, { createContext, useContext, useState, useEffect } from 'react';

const UserAuthContext = createContext();

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user session from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('userSession');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user session:', error);
        localStorage.removeItem('userSession');
      }
    }
    setLoading(false);
  }, []);

  // Login function - saves user data and session
  const login = (userData) => {
    const userSession = {
      id: userData.id,
      type: userData.type, // 'player' or 'club'
      email: userData.email,
      name: userData.name,
      loginTime: new Date().toISOString()
    };
    
    setUser(userSession);
    localStorage.setItem('userSession', JSON.stringify(userSession));
  };

  // Logout function - clears user data and session
  const logout = () => {
    setUser(null);
    localStorage.removeItem('userSession');
  };

  // Check if user is logged in
  const isLoggedIn = () => {
    return user !== null;
  };

  // Get user type
  const getUserType = () => {
    return user?.type || null;
  };

  // Get user profile URL
  const getProfileUrl = () => {
    if (!user) return null;
    return user.type === 'player' 
      ? `/player-profile/${user.id}` 
      : `/club-profile/${user.id}`;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isLoggedIn,
    getUserType,
    getProfileUrl
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};
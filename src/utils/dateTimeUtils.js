/**
 * Utility functions for handling date and time operations in the pickleball app
 */

/**
 * Parse a date string in various formats and return a Date object
 * @param {string|Date|Object} dateValue - The date value to parse
 * @returns {Date} - Parsed date object
 */
export const parseDate = (dateValue) => {
  if (!dateValue) return new Date(0);
  
  try {
    let dateObj;
    if (typeof dateValue === 'string') {
      // Try parsing as ISO string first
      dateObj = new Date(dateValue);
      if (isNaN(dateObj.getTime())) {
        // Try parsing as DD/MM/YYYY or MM/DD/YYYY
        const parts = dateValue.split(/[-/]/);
        if (parts.length === 3) {
          // Assume DD/MM/YYYY format first
          dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
          if (isNaN(dateObj.getTime())) {
            // Try MM/DD/YYYY format
            dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
          }
        }
      }
    } else if (dateValue.toDate) {
      // Firestore Timestamp
      dateObj = dateValue.toDate();
    } else {
      dateObj = new Date(dateValue);
    }
    
    return isNaN(dateObj.getTime()) ? new Date(0) : dateObj;
  } catch (error) {
    console.warn('Error parsing date:', dateValue, error);
    return new Date(0);
  }
};

/**
 * Parse a time string and return hours and minutes
 * @param {string} timeStr - Time string in format "HH:MM" or "H:MM"
 * @returns {Object} - Object with hours and minutes as numbers
 */
export const parseTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hours: 0, minutes: 0 };
  }
  
  try {
    // Handle various time formats
    const cleanTimeStr = timeStr.trim();
    const timeParts = cleanTimeStr.split(':');
    
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      // Validate hours and minutes
      if (!isNaN(hours) && !isNaN(minutes) && 
          hours >= 0 && hours <= 23 && 
          minutes >= 0 && minutes <= 59) {
        return { hours, minutes };
      }
    }
    
    console.warn('Invalid time format:', timeStr);
    return { hours: 0, minutes: 0 };
  } catch (error) {
    console.warn('Error parsing time:', timeStr, error);
    return { hours: 0, minutes: 0 };
  }
};

/**
 * Create a DateTime object from date and time strings
 * @param {string|Date|Object} dateStr - Date string or object
 * @param {string} timeStr - Time string in format "HH:MM"
 * @returns {Date} - Combined DateTime object
 */
export const createDateTime = (dateStr, timeStr) => {
  try {
    const matchDate = parseDate(dateStr);
    const { hours, minutes } = parseTime(timeStr);
    
    // Create new date with the parsed time
    const matchDateTime = new Date(
      matchDate.getFullYear(),
      matchDate.getMonth(),
      matchDate.getDate(),
      hours,
      minutes,
      0, // seconds
      0  // milliseconds
    );
    
    return matchDateTime;
  } catch (error) {
    console.warn('Error creating DateTime:', dateStr, timeStr, error);
    return new Date(0);
  }
};

/**
 * Check if player names should be revealed based on match timing
 * @param {Object} match - Match object with status, time, date properties
 * @param {Object} fixture - Fixture object with time, date properties (fallback)
 * @returns {boolean} - Whether player names should be shown
 */
export const shouldShowPlayerNames = (match, fixture = {}) => {
  try {
    // If match is completed or in progress, always show player names
    if (match.status === 'completed' || match.status === 'in-progress') {
      return true;
    }
    
    // For scheduled matches, check the 55-minute rule
    const matchTimeStr = match.time || fixture.time;
    const matchDateStr = match.date || fixture.date;
    
    // If no time specified, show player names
    if (!matchTimeStr) {
      return true;
    }
    
    const now = new Date();
    let matchDateTime;
    
    if (matchDateStr) {
      // Combine date and time
      matchDateTime = createDateTime(matchDateStr, matchTimeStr);
    } else {
      // Use today's date with the time
      const today = new Date();
      const { hours, minutes } = parseTime(matchTimeStr);
      matchDateTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes,
        0,
        0
      );
    }
    
    // If match time has passed, always show player names
    if (now > matchDateTime) {
      return true;
    }
    
    // Show player names 55 minutes before match time
    const revealTime = new Date(matchDateTime.getTime() - (55 * 60 * 1000));
    return now >= revealTime;
    
  } catch (error) {
    console.warn('Error in shouldShowPlayerNames:', error);
    // If there's an error, default to showing player names
    return true;
  }
};

/**
 * Format a date for display
 * @param {string|Date|Object} dateValue - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateForDisplay = (dateValue) => {
  try {
    const dateObj = parseDate(dateValue);
    if (dateObj.getTime() === 0) {
      return 'No Date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', dateValue, error);
    return 'Invalid Date';
  }
};
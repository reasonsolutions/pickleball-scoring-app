import React, { useState, useEffect } from 'react';

export default function NotificationBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger the slide down animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500); // Small delay to ensure page has loaded

    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    window.open('https://www.youtube.com/live/RS0gyIBEvQM', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`notification-bar ${isVisible ? 'slide-down' : ''}`}>
      <div 
        className="notification-content"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        <div className="notification-text">
          🏆 The Mavericks and All Stars will battle it out in the biggest and Final Showdown of HPL Season 1! Watch it here
        </div>
        <div className="notification-arrow">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function SwipeToEndMatch({ onEndMatch, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startX, setStartX] = useState(0);
  const sliderRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  const SLIDER_WIDTH = 48; // Width of the circular slider button (w-12 = 48px)
  const COMPLETION_THRESHOLD = 0.9; // 90% of the way to complete

  const getMaxPosition = useCallback(() => {
    if (!containerRef.current) return 0;
    return containerRef.current.offsetWidth - SLIDER_WIDTH - 16; // 16px for padding (left-2 + right-2)
  }, []);

  const handleStart = useCallback((clientX) => {
    if (disabled) return;
    
    setIsDragging(true);
    setIsCompleted(false);
    setStartX(clientX - dragPosition);
  }, [disabled, dragPosition]);

  const handleMove = useCallback((clientX) => {
    if (!isDragging) return;
    
    const maxPosition = getMaxPosition();
    const newPosition = Math.max(0, Math.min(maxPosition, clientX - startX));
    
    setDragPosition(newPosition);
    
    // Check if we've reached the completion threshold
    const progress = newPosition / maxPosition;
    if (progress >= COMPLETION_THRESHOLD && !isCompleted) {
      setIsCompleted(true);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } else if (progress < COMPLETION_THRESHOLD && isCompleted) {
      setIsCompleted(false);
    }
  }, [isDragging, startX, getMaxPosition, isCompleted]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (isCompleted) {
      // Trigger the end match action
      onEndMatch();
      return;
    }
    
    // Animate back to start
    const startPosition = dragPosition;
    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentPosition = startPosition * (1 - easeOut);
      
      setDragPosition(currentPosition);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsCompleted(false);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [isDragging, isCompleted, dragPosition, onEndMatch]);

  // Mouse events
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    handleStart(e.clientX);
  }, [handleStart]);

  const handleMouseMove = useCallback((e) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const getSliderStyle = () => {
    return {
      transform: `translateX(${dragPosition}px)`,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out'
    };
  };

  const getProgressPercentage = () => {
    const maxPosition = getMaxPosition();
    return maxPosition > 0 ? (dragPosition / maxPosition) * 100 : 0;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-400 p-4">
      <div 
        ref={containerRef}
        className={`relative w-full h-16 bg-black rounded-full overflow-hidden cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          background: `linear-gradient(to right, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.3) ${getProgressPercentage()}%, transparent ${getProgressPercentage()}%)`
        }}
      >
        {/* Background text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white text-lg font-semibold tracking-wide">
            {isCompleted ? 'Release to End Match' : 'Swipe to End Match'}
          </span>
        </div>
        
        {/* Slider button */}
        <div
          ref={sliderRef}
          className={`absolute top-2 left-2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${isCompleted ? 'bg-green-500' : 'bg-white'}`}
          style={getSliderStyle()}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Arrow icon */}
          <svg 
            className={`w-6 h-6 transition-colors duration-200 ${
              isCompleted ? 'text-white' : 'text-gray-600'
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isCompleted ? (
              // Checkmark icon when completed
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            ) : (
              // Arrow icon when not completed
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 5l7 7-7 7" 
              />
            )}
          </svg>
        </div>
        
        {/* Subtle shine effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none"
          style={{
            transform: `translateX(${dragPosition - 100}px)`,
            width: '200px',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
        />
      </div>
    </div>
  );
}
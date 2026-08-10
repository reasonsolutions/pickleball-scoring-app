import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedLogoUrl } from '../utils/cloudinaryAdmin';

export default function SlidingImagesCarousel({ images, currentIndex, onIndexChange, startAfter = 0, duration = 5 }) {
  const [isVisible, setIsVisible] = useState(false);
  const carouselTimerRef = useRef(null);
  const startTimerRef = useRef(null);

  useEffect(() => {
    // Start timer to show carousel after startAfter seconds
    if (startAfter > 0) {
      startTimerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, startAfter * 1000);
    } else {
      setIsVisible(true);
    }

    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
      }
    };
  }, [startAfter]);

  useEffect(() => {
    if (!isVisible || images.length === 0) return;

    // Auto-rotate images based on duration
    carouselTimerRef.current = setInterval(() => {
      onIndexChange((prevIndex) => (prevIndex + 1) % images.length);
    }, duration * 1000);

    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [isVisible, images.length, duration, onIndexChange]);

  if (!isVisible || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return null;
}

import React, { useEffect, useRef, useState } from 'react';

// Black bottom panel that slides up one sliding image at a time, holds it, then slides down.
// Same cycle as MainDisplay1: wait startAfter seconds, slide up (2s), hold duration seconds, slide down (2s).
export default function SlidingImagesOverlay({ images = [], startAfter = 0, duration = 5 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationState, setAnimationState] = useState('hidden'); // 'hidden', 'slideUp', 'slideDown'
  const timerRef = useRef(null);
  const cycleRef = useRef(null);

  useEffect(() => {
    setAnimationState('hidden');
    if (images.length === 0) return;

    let index = 0;
    const runCycle = () => {
      timerRef.current = setTimeout(() => {
        setCurrentIndex(index);
        setAnimationState('slideUp');

        cycleRef.current = setTimeout(() => {
          setAnimationState('slideDown');

          timerRef.current = setTimeout(() => {
            setAnimationState('hidden');
            index = (index + 1) % images.length;
            runCycle();
          }, 2000);
        }, 2000 + duration * 1000);
      }, startAfter * 1000);
    };

    runCycle();

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(cycleRef.current);
    };
  }, [images, startAfter, duration]);

  const image = images[currentIndex];
  if (animationState === 'hidden' || !image) return null;

  return (
    <>
      <style>{`
        @keyframes slidingOverlayUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slidingOverlayDown{from{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}
      `}</style>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '42%',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#000',
          animation: animationState === 'slideUp'
            ? 'slidingOverlayUp 2s ease-in-out forwards'
            : 'slidingOverlayDown 2s ease-in-out forwards'
        }}
      >
        <img src={image.url} alt={image.name || 'Sliding Image'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </>
  );
}

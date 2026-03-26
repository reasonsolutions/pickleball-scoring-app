"use client";

import React from "react";
import { motion } from "framer-motion";

interface FloatingLogosBackgroundProps {
  logos: string[];
  opacity?: number;
}

export const FloatingLogosBackground: React.FC<FloatingLogosBackgroundProps> = ({
  logos,
  opacity = 0.3,
}) => {
  // Generate evenly distributed positions for each logo
  const generateRandomPosition = (index: number) => {
    const totalLogos = logos.length;
    // Distribute logos evenly across the width
    const leftPercent = ((index + 1) / (totalLogos + 1)) * 100;
    // Distribute logos evenly across the height
    const topPercent = ((index % Math.ceil(Math.sqrt(totalLogos))) / Math.ceil(Math.sqrt(totalLogos))) * 80 + 10;
    
    return {
      top: `${topPercent}%`,
      left: `${leftPercent}%`,
      duration: 15 + Math.random() * 10,
      delay: index * 0.5,
    };
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {logos.map((logo, index) => {
        const position = generateRandomPosition(index);
        return (
          <motion.div
            key={index}
            className="absolute"
            style={{
              top: position.top,
              left: position.left,
              opacity: opacity,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: position.duration,
              delay: position.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <img
              src={logo.includes('cloudinary') ? `${logo}${logo.includes('?') ? '&' : '?'}q_auto` : logo}
              alt={`Team logo ${index}`}
              className="w-20 h-20 md:w-24 md:h-24 object-contain"
            />
          </motion.div>
        );
      })}
    </div>
  );
};

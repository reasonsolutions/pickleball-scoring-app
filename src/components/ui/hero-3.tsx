"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

// Props interface for the component
interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string | React.ReactNode;
  ctaText?: string;
  buttons?: Array<{ text: string; onClick?: () => void; href?: string; variant?: 'primary' | 'secondary' }>;
  images: string[];
  className?: string;
}

// Reusable Button component styled like in the image
const ActionButton = ({ children }: { children: React.ReactNode }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="mt-8 px-8 py-3 rounded-full bg-red-500 text-white font-semibold shadow-lg transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
  >
    {children}
  </motion.button>
);

// Custom button component for hero
interface ButtonProps {
  text: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

const HeroButton = ({ text, onClick, href, variant = 'primary' }: ButtonProps) => {
   const baseClasses = "px-8 py-3 rounded-xl font-bold text-base sm:text-lg lg:text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl inline-block";
   const primaryClasses = "bg-orange-500 hover:bg-orange-600 text-white";
   const secondaryClasses = "bg-white hover:bg-gray-100 text-orange-500 border-2 border-orange-500";
   
   const className = `${baseClasses} ${variant === 'primary' ? primaryClasses : secondaryClasses}`;
   const buttonStyle = { fontFamily: 'Avantique, sans-serif' };
   
   if (href) {
     return (
       <a href={href} className={className} style={buttonStyle}>
         {text}
       </a>
     );
   }
   
   return (
     <button onClick={onClick} className={className} style={buttonStyle}>
       {text}
     </button>
   );
 };

// The main hero component
export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  buttons,
  images,
  className,
}) => {
  // Animation variants for the text content
  const FADE_IN_ANIMATION_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
  };

  // Duplicate images for a seamless loop - triple duplication for smooth infinite scroll
  const duplicatedImages = [...images, ...images, ...images];

  return (
    <section
      className={`relative w-full overflow-hidden bg-transparent flex flex-col items-center justify-start text-center px-4 -mt-0 ${className || ""}`}
      style={{ marginTop: 0, paddingTop: 0 }}
    >
      {/* Gradient overlay behind text */}
      <div
        className="absolute top-0 left-0 right-0 h-1/2 z-5 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(33, 33, 33, 0.95), rgba(33, 33, 33, 0.7), transparent)',
        }}
      ></div>

      {/* Text Content - Top */}
      <div className="z-10 flex flex-col items-center justify-start pt-20 pb-8">
        {/* Tagline */}
        {tagline && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={FADE_IN_ANIMATION_VARIANTS}
            className="mb-4 inline-block rounded-full border border-orange-500 bg-orange-500 bg-opacity-10 px-4 py-1.5 text-sm font-medium text-orange-300 backdrop-blur-sm"
            style={{ fontFamily: 'Avantique, sans-serif' }}
          >
            {tagline}
          </motion.div>
        )}

        {/* Main Title */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-white"
          style={{ fontFamily: 'Avantique, sans-serif' }}
        >
          {typeof title === 'string' ? (
            title.split(" ").map((word, i) => (
              <motion.span
                key={i}
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))
          ) : (
            title
          )}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-xl text-lg text-gray-300"
          style={{ fontFamily: 'Avantique, sans-serif' }}
        >
          {description}
        </motion.p>

        {/* Call to Action Buttons */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          {buttons && buttons.length > 0 ? (
            buttons.map((button, index) => (
              <HeroButton
                key={index}
                text={button.text}
                onClick={button.onClick}
                href={button.href}
                variant={button.variant}
              />
            ))
          ) : ctaText ? (
            <ActionButton>{ctaText}</ActionButton>
          ) : null}
        </motion.div>
      </div>

      {/* Animated Image Marquee - Bottom */}
      <div className="relative w-full h-auto flex items-center justify-center py-12 overflow-hidden" style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
      }}>
        <motion.div
          className="flex gap-6"
          animate={{
            x: ["0%", "-66.666%"],
            transition: {
              ease: "linear",
              duration: 40,
              repeat: Infinity,
              repeatType: "loop",
            },
          }}
          initial={{ x: "0%" }}
        >
          {duplicatedImages.map((src, index) => (
            <div
              key={index}
              className="relative aspect-[3/4] h-80 md:h-96 flex-shrink-0"
              style={{
                rotate: `${(index % 2 === 0 ? -3 : 4)}deg`,
              }}
            >
              <img
                src={src}
                alt={`Showcase image ${index + 1}`}
                className="w-full h-full object-cover rounded-3xl shadow-lg"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export function SplashScreen() {
  return (
    <motion.div
      id="app-splash-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#FDF9F3] flex flex-col items-center justify-between py-16 px-6 z-50 select-none"
    >
      {/* Top decorative spacer */}
      <div />

      {/* Center content: Minimalist Logo & Brand Title */}
      <div className="flex flex-col items-center text-center space-y-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 70, 
            damping: 15,
            delay: 0.1 
          }}
          className="relative w-28 h-28 flex items-center justify-center"
        >
          {/* Subtle surrounding glow ring matching red/pink accents */}
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.35, 0.65, 0.35] 
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F7D9E3] to-[#FCE6D5] blur-md opacity-40"
          />
          
          {/* Concentric rotating line ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-0 rounded-full border border-dashed border-[#D35271]/20"
          />

          {/* Minimalist premium logo card: T-Rex line-art and cycle track */}
          <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#3C2A3F]/5">
            <svg 
              className="w-12 h-12" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="40" stroke="#F7D9E3" strokeWidth="6" fill="none" />
              <path d="M 50 10 A 40 40 0 0 1 90 50" stroke="#D35271" strokeWidth="6" strokeLinecap="round" fill="none" />
              <g transform="translate(24, 24) scale(0.52)" fill="none" stroke="#3C2A3F" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 24 50 
                         C 28 50, 32 47, 36 43
                         C 40 39, 44 35, 52 35
                         C 54 35, 56 34, 58 32
                         C 60 30, 61 27, 65 27
                         C 69 27, 71 29, 72 32
                         C 73 35, 71 37, 67 37
                         C 64 37, 63 39, 64 41
                         C 65 43, 62 44, 58 44
                         C 56 47, 55 50, 53 53
                         C 55 54, 57 54, 58 53
                         C 59 52, 60 52, 60 53
                         C 60 54, 59 55, 57 55
                         C 55 56, 54 57, 53 58
                         C 51 61, 50 64, 49 68
                         C 49 71, 51 72, 53 72
                         L 57 72
                         C 58 72, 58 71, 57 69
                         C 56 66, 55 62, 55 59
                         C 51 59, 48 62, 46 66
                         C 45 68, 44 71, 45 72
                         L 49 72
                         C 50 72, 50 71, 49 69
                         C 48 66, 47 62, 46 59
                         C 42 59, 39 58, 36 57
                         C 28 55, 20 53, 14 53
                         C 18 52, 21 51, 24 50 Z" />
                <circle cx="64" cy="31" r="2.5" fill="#3C2A3F" stroke="none" />
              </g>
            </svg>
          </div>
        </motion.div>

        {/* Elegant Serif Typography */}
        <div className="space-y-2">
          <motion.h1
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="font-serif italic text-4xl font-bold text-[#3C2A3F] tracking-widest uppercase"
          >
            DINOCYCLE
          </motion.h1>
          
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="text-[10px] tracking-[0.25em] text-[#3C2A3F]/50 font-sans uppercase font-bold"
          >
            Aesthetic Cycle Intelligence
          </motion.p>
        </div>
      </div>

      {/* Bottom section: loading states */}
      <div className="flex flex-col items-center space-y-3.5">
        {/* Softly pulsing pink loading ring */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <motion.div 
            animate={{ 
              scale: [1, 1.8, 1],
              opacity: [0.4, 0, 0.4] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute w-6 h-6 rounded-full border border-[#D35271]/50 bg-[#F7D9E3]/10"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-5 h-5 rounded-full border-2 border-t-transparent border-[#D35271]"
          />
        </div>

        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[9.5px] font-sans font-bold uppercase tracking-[0.2em] text-[#3C2A3F]/40"
        >
          Connecting local vault
        </motion.span>
      </div>
    </motion.div>
  );
}

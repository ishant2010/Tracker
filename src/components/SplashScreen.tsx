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

          {/* Minimalist premium logo card: droplet & lotus bud hybrid */}
          <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#3C2A3F]/5">
            <svg 
              className="w-10 h-10 text-[#D35271]" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C12 2 19 9 19 14C19 17.866 15.866 21 12 21C8.13401 21 5 17.866 5 14C5 9 12 2 12 2ZM12 6.18C10.15 8.79 7.8 11.72 7.8 13.9C7.8 16.22 9.68 18.1 12 18.1C14.32 18.1 16.2 16.22 16.2 13.9C16.2 11.72 13.85 8.79 12 6.18Z" />
            </svg>
          </div>
        </motion.div>

        {/* Elegant Serif Typography */}
        <div className="space-y-2">
          <motion.h1
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="font-serif italic text-3xl font-bold text-[#3C2A3F] tracking-wide"
          >
            Sisterhood Sanctuary
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

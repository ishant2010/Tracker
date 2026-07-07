/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Moon, Bell } from 'lucide-react';

interface AestheticEmptyStateProps {
  type: 'calendar' | 'moon' | 'bell';
  title?: string;
  description?: string;
}

export function AestheticEmptyState({ type, title, description }: AestheticEmptyStateProps) {
  const defaultTitle = "We're gathering your data!";
  const defaultDescription = "Log a few more days to unlock these insights.";

  const renderIllustration = () => {
    switch (type) {
      case 'moon':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Ambient soft glow circles */}
            <motion.div 
              animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.45, 0.3] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-tr from-[#E9E3F5] to-[#FCE6D5] rounded-full blur-xl"
            />
            <motion.div 
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#D5CBE5] to-[#E9E3F5] flex items-center justify-center border border-[#3C2A3F]/5 shadow-sm"
            >
              <Moon className="w-8 h-8 text-[#3C2A3F] opacity-75 drop-shadow-sm" />
              {/* Little floating stars */}
              <motion.span 
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                className="absolute top-2 right-2 text-xs"
              >
                ✨
              </motion.span>
              <motion.span 
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 1.2 }}
                className="absolute bottom-2 left-2 text-[9px]"
              >
                ⭐
              </motion.span>
            </motion.div>
          </div>
        );
      case 'bell':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-tr from-[#F7D9E3] to-[#E9E3F5] rounded-full blur-xl"
            />
            <motion.div 
              animate={{ y: [0, -4, 0], rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
              className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#F7D9E3] to-[#F1A9C4] flex items-center justify-center border border-[#3C2A3F]/5 shadow-sm"
            >
              <Bell className="w-8 h-8 text-[#3C2A3F] opacity-75 drop-shadow-sm" />
              <motion.span 
                animate={{ scale: [0.8, 1.1, 0.8] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E9E3F5] border border-white flex items-center justify-center text-[8px] font-bold text-[#3C2A3F]"
              >
                ✦
              </motion.span>
            </motion.div>
          </div>
        );
      case 'calendar':
      default:
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.45, 0.3] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-tr from-[#FCE6D5] to-[#E9E3F5] rounded-full blur-xl"
            />
            <motion.div 
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#FCE6D5] to-[#F7C6A3] flex items-center justify-center border border-[#3C2A3F]/5 shadow-sm"
            >
              <Calendar className="w-8 h-8 text-[#3C2A3F] opacity-75 drop-shadow-sm" />
              <motion.span 
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-1 right-2 text-sm"
              >
                🌸
              </motion.span>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white/45 border border-[#3C2A3F]/5 rounded-[32px] shadow-sm select-none">
      {renderIllustration()}
      
      <h4 className="font-serif italic text-base text-[#3C2A3F] font-bold mt-3">
        {title || defaultTitle}
      </h4>
      <p className="text-xs text-[#3C2A3F]/60 font-sans max-w-xs mt-1 leading-normal">
        {description || defaultDescription}
      </p>
    </div>
  );
}

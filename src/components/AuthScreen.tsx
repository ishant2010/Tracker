/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Sparkles, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from '../db/firebase';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onAuthSuccess();
    } catch (err: any) {
      console.error("Google sign in error", err);
      // Fallback for environment/iframe restrictions or standard popup failure
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/iframe-disabled') {
        setError('Google sign-in popup is blocked or disabled in this frame. Please use Email/Password sign-in!');
      } else {
        setError(err.message || 'An error occurred during Google sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isLogin && !displayName) {
      setError('Please enter your display name.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, {
          displayName: displayName
        });
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error("Email auth error", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#F3EFE6] text-[#3C2A3F] h-full overflow-y-auto select-none relative">
      
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-lavender/40 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-brand-pink/30 rounded-full blur-[50px] pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col items-center text-center mt-8 space-y-4 relative z-10">
        <div className="w-16 h-16 rounded-3xl bg-brand-lavender flex items-center justify-center border border-brand-text/5 shadow-sm">
          <Sparkles className="w-7 h-7 text-[#3C2A3F]" />
        </div>
        <div className="space-y-1">
          <h1 className="font-serif italic text-3xl font-semibold text-[#3C2A3F]">
            Sanctuary Vesta
          </h1>
          <p className="text-xs text-[#3C2A3F]/60 font-medium tracking-wide">
            Your private cycle & health companion
          </p>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="my-auto py-4 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold tracking-widest text-[#3C2A3F]/60 uppercase ml-1">
                    Display Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3 w-4 h-4 text-[#3C2A3F]/40" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-brand-text/5 focus:border-[#3C2A3F]/20 outline-none text-xs font-semibold font-sans transition-all placeholder:text-[#3C2A3F]/35"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold tracking-widest text-[#3C2A3F]/60 uppercase ml-1">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-[#3C2A3F]/40" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-brand-text/5 focus:border-[#3C2A3F]/20 outline-none text-xs font-semibold font-sans transition-all placeholder:text-[#3C2A3F]/35"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold tracking-widest text-[#3C2A3F]/60 uppercase ml-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-[#3C2A3F]/40" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-brand-text/5 focus:border-[#3C2A3F]/20 outline-none text-xs font-semibold font-sans transition-all placeholder:text-[#3C2A3F]/35"
                  />
                </div>
              </div>

              {/* Error messages */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-rose-600 text-[11px] font-sans leading-normal">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#3C2A3F] hover:bg-[#2B1D2F] text-[#F3EFE6] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md shadow-[#3C2A3F]/10 disabled:opacity-75"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Log In' : 'Sign Up'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Separator line */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-[1px] bg-brand-text/10 flex-1" />
              <span className="text-[9px] font-mono font-bold text-brand-text/35 tracking-widest uppercase">
                OR
              </span>
              <div className="h-[1px] bg-brand-text/10 flex-1" />
            </div>

            {/* Google Authentication Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-white hover:bg-white/80 border border-brand-text/10 text-[#3C2A3F] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer shadow-sm disabled:opacity-70"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.09 15.548 0 12.24 0 5.582 0 0 5.373 0 12s5.582 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.79-.085-1.4-.195-1.925H12.24z"
                />
              </svg>
              Continue with Google
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer link to toggle Login/Signup */}
      <div className="text-center pb-4 relative z-10">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          disabled={loading}
          className="text-xs text-[#3C2A3F]/60 hover:text-[#3C2A3F] font-semibold transition-all underline decoration-[#3C2A3F]/20 underline-offset-4"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>

    </div>
  );
}

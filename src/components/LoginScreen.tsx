/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, Mail, Lock, LogIn, UserPlus, CheckCircle, ArrowLeft, Key } from "lucide-react";
import type { Operator } from "../types.js";

interface LoginScreenProps {
  onLogin: (operator: Operator) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("operator@factory.shield");
  const [password, setPassword] = useState("password");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  // Login / Signup / Verify Modes
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Random / dynamic token for email verification demo
  const [activationToken, setActivationToken] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  // Load registered users from localStorage or initialize
  const getRegisteredUsers = (): any[] => {
    try {
      const data = localStorage.getItem("gesture_shield_registered_users");
      if (!data) {
        const defaultUser = {
          email: "operator@factory.shield",
          password: "password",
          verified: true,
          name: "OPERATOR_01"
        };
        localStorage.setItem("gesture_shield_registered_users", JSON.stringify([defaultUser]));
        return [defaultUser];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const saveUser = (user: any) => {
    try {
      const users = getRegisteredUsers();
      // Remove any existing duplicate email profiles if re-signing up
      const filtered = users.filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
      filtered.push(user);
      localStorage.setItem("gesture_shield_registered_users", JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  };

  const verifyUserEmail = (emailStr: string) => {
    try {
      const users = getRegisteredUsers();
      const updated = users.map((u) => {
        if (u.email.toLowerCase() === emailStr.toLowerCase()) {
          return { ...u, verified: true };
        }
        return u;
      });
      localStorage.setItem("gesture_shield_registered_users", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    setTimeout(() => {
      const users = getRegisteredUsers();
      const targetUser = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!targetUser) {
        setError("AUTHENTICATION FAILED: Operator profile not found in directory.");
        setIsSubmitting(false);
        return;
      }

      if (targetUser.password !== password) {
        setError("PROTOCOL MISMATCH: Invalid password signature. Access denied.");
        setIsSubmitting(false);
        return;
      }

      if (!targetUser.verified) {
        // Redirection to verify screen for complete authorization
        setPendingEmail(targetUser.email);
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        setActivationToken(randomCode);
        setMode("verify");
        setError("SIGN-UP UNVERIFIED: Enter activation credentials to proceed.");
        setIsSubmitting(false);
        return;
      }

      // Login Successful!
      const userInitials = targetUser.email.split("@")[0].toUpperCase();
      onLogin({
        email: targetUser.email,
        id: `OP_${userInitials.substring(0, 6)}_${Math.floor(10 + Math.random() * 89)}`,
        name: userInitials.replace(/[._-]/g, " "),
        role: "LEAD_OPERATOR",
        sessionToken: `SESSION_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      });
      setIsSubmitting(false);
    }, 850);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("SECURITY COMPLIANCE ERROR: Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("VALIDATION CONFLICT: Access passcodes do not match.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const cleanedEmail = email.trim();
      
      // Save user as unverified initially
      const newUser = {
        email: cleanedEmail,
        password: password,
        verified: false,
        name: cleanedEmail.split("@")[0].toUpperCase()
      };

      saveUser(newUser);

      // Generate verification activation token
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setActivationToken(randomCode);
      setPendingEmail(cleanedEmail);
      
      setMode("verify");
      setSuccess("SIGN-UP PROTOCOL INITIATED: Safe activation passcode dispatched.");
      setIsSubmitting(false);
    }, 800);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (verificationCode.trim() !== activationToken) {
      setError("INVALID ACCESS CODE: Verification signature mismatch.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      // Mark as verified!
      verifyUserEmail(pendingEmail);
      // Switch back to login with auto-filled credentials!
      setEmail(pendingEmail);
      setMode("signin");
      setSuccess("AUTHENTICATION COMPLIANCE: Email activated successfully. Please sign in.");
      setVerificationCode("");
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 bg-surface-lowest overflow-hidden transition-colors duration-300">
      {/* Decorative Blueprint Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(to_right,var(--border-main)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-main)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Cinematic Ambient Glow in Corners */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-industrial-red/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div 
        id="login_card"
        className="relative z-10 w-full max-w-md glass-panel bg-surface-low border border-border-main rounded-xl p-8 flex flex-col gap-6 inner-bevel animate-[fadeIn_0.5s_ease-out] transition-transform duration-300"
      >
        {/* Brand Header */}
        <header className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-high border border-border-main flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300">
            <Shield className="text-industrial-red w-9 h-9 fill-industrial-red/20" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-sans text-3xl font-extrabold tracking-tighter text-text-base uppercase select-none">
              GESTURE SHIELD
            </h1>
            <p className="font-sans text-xs tracking-[0.2em] font-semibold text-text-muted uppercase opacity-75">
              Industrial Sign Language Intelligence
            </p>
          </div>
        </header>

        {/* Display Error / Success Notifications */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 font-mono text-[11px] leading-relaxed text-center animate-pulse">
            🚨 {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-mono text-[11px] leading-relaxed text-center animate-[slideDown_0.3s_ease]">
            ✅ {success}
          </div>
        )}

        {/* Dynamic Mode Form */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs font-bold tracking-wider text-text-muted uppercase ml-1">
                Terminal ID / Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80">
                  <Mail className="w-5 h-5 pointer-events-none" />
                </span>
                <input 
                  id="login_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-high border border-border-main rounded-lg px-12 py-3 text-text-base text-sm placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-border-active focus:border-transparent transition-all font-mono"
                  placeholder="operator@factory.shield"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs font-bold tracking-wider text-text-muted uppercase ml-1">
                Access Protocol / Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80">
                  <Lock className="w-5 h-5 pointer-events-none" />
                </span>
                <input 
                  id="login_password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-high border border-border-main rounded-lg px-12 py-3 text-text-base text-sm placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-border-active focus:border-transparent transition-all font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Sign In Trigger Buttons */}
            <div className="flex flex-col gap-3 mt-2">
              <button 
                id="login_submit_btn"
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-industrial-red hover:bg-[#b02727] text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-red-900/10 w-full flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                {isSubmitting ? "AUTHORIZING SIGNATURE..." : "SIGN IN"}
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4 animate-[fadeIn_0.25s_ease-out]">
            {/* Email Input */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-sans text-xs font-bold tracking-wider text-text-muted uppercase ml-1">
                Operator Email Setup
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80">
                  <Mail className="w-5 h-5 pointer-events-none" />
                </span>
                <input 
                  id="signup_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-high border border-border-main rounded-lg px-12 py-3 text-text-base text-sm placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-border-active focus:border-transparent transition-all font-mono"
                  placeholder="operator@factory.shield"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-sans text-xs font-bold tracking-wider text-text-muted uppercase ml-1">
                Assign Access Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80">
                  <Lock className="w-5 h-5 pointer-events-none" />
                </span>
                <input 
                  id="signup_password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-high border border-border-main rounded-lg px-12 py-3 text-text-base text-sm placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-border-active focus:border-transparent transition-all font-mono"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-sans text-xs font-bold tracking-wider text-text-muted uppercase ml-1">
                Confirm Selected Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80">
                  <Lock className="w-5 h-5 pointer-events-none" />
                </span>
                <input 
                  id="signup_confirm_password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface-high border border-border-main rounded-lg px-12 py-3 text-text-base text-sm placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-border-active focus:border-transparent transition-all font-mono"
                  placeholder="Confirm passcode"
                />
              </div>
            </div>

            <button 
              id="signup_submit_btn"
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-industrial-red hover:bg-[#b02727] text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-red-900/10 w-full flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              <UserPlus className="w-5 h-5" />
              {isSubmitting ? "CREATING PROFILE..." : "PROVISION NEW ACCESS BADGE"}
            </button>

            <button
              id="signup_back_btn"
              type="button"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setMode("signin");
              }}
              className="text-center font-sans text-xs font-bold text-text-muted hover:text-text-base mt-2 flex items-center gap-1.5 justify-center cursor-pointer hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Authorization
            </button>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4 animate-[fadeIn_0.25s_ease-out]">
            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-4 flex flex-col items-center gap-2 select-text">
              <Key className="w-8 h-8 text-indigo-400 animate-pulse animate-[spin_12s_infinite_linear]" />
              <div className="text-center space-y-1">
                <p className="font-sans font-black text-[10px] text-indigo-400 uppercase tracking-widest leading-normal">SECURE DIGITAL ACTIVATION CARRIER</p>
                <p className="font-sans text-[11px] text-[#bcc7da]/85 leading-normal">
                  A verification email message was sent directly to:
                </p>
                <p className="font-mono text-xs font-bold text-white select-all cursor-pointer">
                  {pendingEmail}
                </p>
              </div>
              
              <div className="w-full mt-2.5 bg-[#010910] border border-border-main p-3 rounded-lg text-center select-text">
                <p className="font-sans text-[9px] text-text-muted/80 uppercase tracking-widest font-black leading-normal">SIMULATED ACTIVE VERIFICATION CODE</p>
                <p className="font-mono text-2xl font-black text-white tracking-[0.2em] mt-2 select-all select-text cursor-copy">
                  {activationToken}
                </p>
                <p className="font-sans text-[8px] text-text-muted/45 mt-1.5 leading-normal">Click code pattern to select & copy activation protocol key.</p>
              </div>
            </div>

            {/* OTP Code Input */}
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="font-sans text-xs font-bold tracking-wider text-text-muted uppercase ml-1">
                Security Activation Key (OTP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80">
                  <Key className="w-5 h-5 pointer-events-none" />
                </span>
                <input 
                  id="activation_code_input"
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-surface-high border border-border-main rounded-lg px-12 py-3 text-text-base text-sm placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center tracking-[0.4em] font-mono text-lg font-black"
                  placeholder="000000"
                />
              </div>
            </div>

            <button 
              id="verify_submit_btn"
              type="submit" 
              disabled={isSubmitting || verificationCode.trim().length !== 6}
              className="w-full bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg disabled:bg-surface-high disabled:text-text-muted/45 w-full flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <CheckCircle className="w-5 h-5" />
              {isSubmitting ? "VERIFYING BADGE COMPLIANCE..." : "VERIFY & ACTIVATE PROFILE"}
            </button>

            <button
              id="verify_cancel_btn"
              type="button"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setMode("signin");
              }}
              className="text-center font-sans text-xs font-bold text-text-muted hover:text-text-base mt-2 flex items-center gap-1.5 justify-center cursor-pointer hover:underline animate-pulse"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Access Form
            </button>
          </form>
        )}

        {/* Footer Links */}
        <footer className="text-center pt-4 border-t border-border-main flex flex-col gap-4 select-none">
          {mode === "signin" && (
            <p className="font-sans text-xs text-text-muted">
              New operator?{" "}
              <span 
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setMode("signup");
                }}
                className="text-text-base font-bold hover:underline ml-1 cursor-pointer transition-colors"
              >
                Sign Up
              </span>
            </p>
          )}
          {mode === "signup" && (
            <p className="font-sans text-xs text-text-muted">
              Already have security credentials?{" "}
              <span 
                onClick={() => {
                  setError(null);
                  setMode("signin");
                }}
                className="text-text-base font-bold hover:underline ml-1 cursor-pointer transition-colors"
              >
                Sign In
              </span>
            </p>
          )}
          <div className="flex justify-center gap-6">
            <span className="font-sans text-[10px] text-text-muted/60 font-bold tracking-widest hover:text-text-base cursor-pointer transition-colors">
              LEGAL COMPLIANCE
            </span>
            <span className="font-sans text-[10px] text-text-muted/60 font-bold tracking-widest hover:text-text-base cursor-pointer transition-colors">
              ISO PROTOCOL
            </span>
          </div>
        </footer>
      </div>

      {/* Atmospheric Industrial Grid Accents */}
      <div className="absolute top-8 right-8 border-t-2 border-r-2 border-border-main/20 w-16 h-16 pointer-events-none hidden md:block" />
      <div className="absolute bottom-8 left-8 border-b-2 border-l-2 border-border-main/20 w-16 h-16 pointer-events-none hidden md:block" />
      
      <div className="fixed bottom-6 right-8 font-mono text-[10px] text-text-muted/35 select-none tracking-wider">
        SYS_OPERATIONAL // VER_4.0.2
      </div>
    </div>
  );
}

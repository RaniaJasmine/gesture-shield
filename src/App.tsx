/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutGrid, Video, MessageSquare, Bot, Settings, Shield, LogOut, Sun, Moon, User,
  Terminal, ShieldCheck, Activity, BrainCircuit, RefreshCw, Cpu
} from "lucide-react";

import type { Operator, Device, Alert, Message, ActiveScreen, WifiLink } from "./types.js";
import { DEFAULT_DEVICES, DEFAULT_ALERTS, DEFAULT_MESSAGES } from "./data.js";

// Components
import LoginScreen from "./components/LoginScreen.js";
import DashboardScreen from "./components/DashboardScreen.js";
import VideoCallScreen from "./components/VideoCallScreen.js";
import TeamChatScreen from "./components/TeamChatScreen.js";
import AiAssistantScreen from "./components/AiAssistantScreen.js";

export default function App() {
  const [operator, setOperator] = useState<Operator | null>(() => {
    // Check if operator already logged in via simple session storage simulation
    const stored = localStorage.getItem("g_shield_operator");
    return stored ? JSON.parse(stored) : null;
  });

  const [activeTab, setActiveTab] = useState<ActiveScreen>("dashboard");
  const [devices, setDevices] = useState<Device[]>(DEFAULT_DEVICES);
  const [alerts, setAlerts] = useState<Alert[]>(DEFAULT_ALERTS);
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [darkTheme, setDarkTheme] = useState<boolean>(true);
  const [emergencyActive, setEmergencyActive] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);
  const [wifiLinks, setWifiLinks] = useState<WifiLink[]>([]);

  // Trigger local state persistence
  const handleLogin = (user: Operator) => {
    setOperator(user);
    localStorage.setItem("g_shield_operator", JSON.stringify(user));
  };

  const handleLogout = () => {
    setOperator(null);
    localStorage.removeItem("g_shield_operator");
  };

  // Toggle active dark class on body
  useEffect(() => {
    const html = document.documentElement;
    if (darkTheme) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [darkTheme]);

  // Handle triggering alert dynamically
  const handleTriggerAlert = (newAlert: Omit<Alert, "id" | "time">) => {
    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false });
    const fullAlert: Alert = {
      ...newAlert,
      id: `alert-${Date.now()}`,
      time: timeNow
    };

    setAlerts(prev => [fullAlert, ...prev]);

    // Send corresponding threat log message to Team Chat
    const warningMessage: Message = {
      id: `system-threat-msg-${Date.now()}`,
      senderId: "CORE_LOGIC_HUB",
      senderName: "AI_CORE_HUB",
      timestamp: timeNow.substring(0, 5),
      text: `⚠️ [THREAT_ALERT] Critical hazard detected at ${newAlert.location}: "${newAlert.title}". Sector quarantine suggested.`,
      role: "device"
    };

    setMessages(prev => [...prev, warningMessage]);

    if (newAlert.severity === "critical") {
      setEmergencyActive(true);
    }
  };

  // Clears a reported alert
  const handleClearAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "cleared" as const } : a));
    const targetAlert = alerts.find(a => a.id === id);
    
    // Announce cleared threat in Team Chat
    const clearMessage: Message = {
      id: `system-clear-msg-${Date.now()}`,
      senderId: "CORE_LOGIC_HUB",
      senderName: "AI_CORE_HUB",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      text: `✅ [NOMINAL_STATUS] Threat cleared: "${targetAlert?.title || "Incident"}" has been flagged as secure.`,
      role: "device"
    };
    setMessages(prev => [...prev, clearMessage]);

    // Check if any critical alerts remain
    setTimeout(() => {
      setAlerts(current => {
        const remainingCritical = current.some(a => a.severity === "critical" && a.status === "active");
        if (!remainingCritical) {
          setEmergencyActive(false);
        }
        return current;
      });
    }, 100);
  };

  if (!operator) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="bg-bg-base text-text-base font-sans min-h-screen selection:bg-industrial-red/20 flex flex-col md:flex-row select-none transition-colors duration-300">
      
      {/* 1. Global Red Emergency Alert Banner (Shown if at least one critical alert is active) */}
      <AnimatePresence>
        {emergencyActive && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 inset-x-0 bg-industrial-red text-white py-2.5 px-4 z-[100] text-center font-bold text-xs tracking-widest flex items-center justify-center gap-2 animate-[pulse_1.5s_infinite] shadow-lg select-none"
          >
            <Shield className="w-4.5 h-4.5 fill-white/10" />
            <span>EMERGENCY LOCKDOWN PROTOCOL ACTIVE! SYSTEM TERMINALS REDUCED TO SAFE-MODE</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Desktop Navigation Panel (As in images, fixed left sidebar) */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-border-main bg-surface-low z-50 select-none transition-all duration-300">
        <div className="p-6 border-b border-border-main flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-industrial-red fill-industrial-red/10" />
            <h1 className="text-sm font-black tracking-wider text-text-base uppercase select-none">
              GESTURE SHIELD
            </h1>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text-dim">
            Resilient Sign Intelligence
          </p>
        </div>

        {/* Sidebar Nav Buttons */}
        <nav className="flex-1 py-6 px-3 space-y-1.5">
          {[
            { id: "dashboard", label: "Dashboard", Icon: LayoutGrid },
            { id: "video", label: "Video Call", Icon: Video },
            { id: "chat", label: "Team Chat", Icon: MessageSquare },
            { id: "ai", label: "AI Assistant", Icon: Bot },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                id={`sidebar_link_${item.id}`}
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveScreen)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold select-none transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-sidebar-active text-text-base border-l-2 border-l-industrial-red"
                    : "text-text-muted hover:bg-surface-high hover:text-text-base"
                }`}
              >
                <item.Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-text-base" : "text-text-muted"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            id="sidebar_link_settings"
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold select-none transition-all duration-200 cursor-pointer ${
              activeTab === "settings" 
                ? "bg-sidebar-active text-text-base border-l-2 border-l-industrial-red"
                : "text-text-muted hover:bg-surface-high hover:text-text-base"
            }`}
          >
            <Settings className="w-5 h-5 shrink-0 text-text-muted" />
            <span>Settings</span>
          </button>
        </nav>

        {/* User Identity widget (Bottom rail) */}
        <div className="p-4 border-t border-border-main select-none bg-surface-lowest">
          <div className="flex items-center gap-3 p-2 bg-surface-low rounded-lg border border-border-main max-w-full overflow-hidden">
            <div className="w-8 h-8 rounded bg-industrial-red flex items-center justify-center font-bold text-white uppercase shrink-0 text-xs">
              OP
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-text-base truncate uppercase tracking-wide">{operator.name}</p>
              <p className="text-[9px] text-text-muted font-mono">ACTIVE_SESSION</p>
            </div>
            <button 
              id="sidebar_logout_btn"
              onClick={handleLogout}
              className="p-1 hover:text-text-base text-text-muted truncate cursor-pointer"
              title="Terminate Secure Session"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Mobile Navigation Header (Shown only on small screens) */}
      <header className="md:hidden fixed top-0 inset-x-0 h-16 bg-surface-low/95 backdrop-blur-md border-b border-border-main flex justify-between items-center px-4 z-[90] select-none">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-industrial-red fill-industrial-red/10" />
          <span className="font-sans font-black text-text-base text-sm uppercase tracking-tight">GESTURE SHIELD</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkTheme(!darkTheme)}
            className="p-2 hover:bg-surface-high rounded-full transition-colors text-text-muted cursor-pointer"
          >
            {darkTheme ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <div className="w-8 h-8 rounded-full bg-industrial-red flex items-center justify-center font-bold text-white text-xs select-none shrink-0" onClick={handleLogout}>
            O1
          </div>
        </div>
      </header>

      {/* 4. Desktop Top App Bar (Aligned right next to Sidebar) */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <header className="hidden md:flex fixed top-0 right-0 left-64 z-40 bg-bg-base/85 backdrop-blur-xl border-b border-border-main h-16 justify-between items-center px-8 shadow-sm select-none transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <span className="font-sans text-xs font-black text-text-base uppercase tracking-wider select-none">
              {activeTab === "dashboard" ? "Device D-1 (Primary)" : "System Operational"}
            </span>

            <span className="ml-2 px-2 py-0.5 bg-green-500/10 border border-green-500/35 text-green-600 dark:text-green-400 text-[9px] rounded font-mono font-black select-none uppercase tracking-wider">
              Connected - Secure Link
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Theme Toggle option */}
            <button 
              id="theme_toggle_btn"
              onClick={() => setDarkTheme(!darkTheme)}
              className="p-2 text-text-muted hover:text-text-base hover:bg-surface-high rounded-full transition-all cursor-pointer"
              title="Toggle Security Theme Grid"
            >
              {darkTheme ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>

            {/* Operator Quick Stats indicator */}
            <div className="flex items-center gap-2 bg-surface-low hover:bg-surface-high transition-colors p-1.5 px-3 rounded-full border border-border-main select-none cursor-pointer">
              <User className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-[10px] font-mono font-bold text-text-muted">{operator.email}</span>
            </div>
          </div>
        </header>

        {/* 5. Main Canvas Content Area */}
        <main className="flex-1 pt-20 md:pt-24 pb-24 md:pb-8 px-4 md:px-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === "dashboard" && (
                <DashboardScreen 
                  devices={devices} 
                  setDevices={setDevices}
                  alerts={alerts}
                  onTriggerAlert={handleTriggerAlert}
                  onClearAlert={handleClearAlert}
                  onClearEmergency={() => setEmergencyActive(false)}
                />
              )}
              {activeTab === "video" && (
                <VideoCallScreen 
                  devices={devices} 
                  setDevices={setDevices} 
                  wifiLinks={wifiLinks}
                  setWifiLinks={setWifiLinks}
                  messages={messages}
                  setMessages={setMessages}
                  onWifiLinkCreated={(link) => {
                    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
                    const sysMessage: Message = {
                      id: `system-wifi-link-${Date.now()}`,
                      senderId: "WIFI_COORDINATOR",
                      senderName: "MESH_LINK_MGR",
                      timestamp: timeNow,
                      text: `🛜 [WIFI_ESTABLISHED] Direct tunnel established between ${link.sourceId} and ${link.targetId} on ${link.frequency} band. Signal: ${link.signalStrength}%. Max throughput: ${link.bandwidthMbps} Mbps.`,
                      role: "device"
                    };
                    setMessages(prev => [...prev, sysMessage]);
                  }}
                  onWifiLinkRemoved={(linkId) => {
                    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
                    const sysMessage: Message = {
                      id: `system-wifi-break-${Date.now()}`,
                      senderId: "WIFI_COORDINATOR",
                      senderName: "MESH_LINK_MGR",
                      timestamp: timeNow,
                      text: `🔌 [WIFI_DISCONNECTED] Peer-to-peer Wi-Fi connection with identifier ${linkId} has been gracefully disengaged. Routing reverted to local nodes.`,
                      role: "device"
                    };
                    setMessages(prev => [...prev, sysMessage]);
                  }}
                />
              )}
              {activeTab === "chat" && (
                <TeamChatScreen 
                  operator={operator} 
                  messages={messages} 
                  setMessages={setMessages}
                  devices={devices}
                  setDevices={setDevices}
                />
              )}
              {activeTab === "ai" && (
                <AiAssistantScreen />
              )}
              {activeTab === "settings" && (
                <div className="glass-panel p-8 rounded-xl max-w-2xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out]">
                  <div className="flex items-center gap-2 pb-2 border-b border-border-main">
                    <Settings className="w-6 h-6 text-text-base animate-spin-[spin_3s_linear_infinite]" />
                    <h2 className="text-xl font-extrabold text-text-base tracking-tight uppercase">SYSTEM MANAGEMENT PANEL</h2>
                  </div>

                  <div className="space-y-4 font-sans text-sm leading-relaxed text-text-muted">
                    <p>
                      Welcome to the **Gesture Shield Operational Hub**. From here you can test security anomalies, manage local registries, and terminate the session.
                    </p>

                    <div className="bg-surface-low p-4 rounded-lg border border-border-main space-y-2">
                      <p className="font-mono text-xs text-text-base uppercase font-bold">Local Host Details:</p>
                      <ul className="text-xs font-mono space-y-1.5 list-disc pl-4 select-text text-text-muted">
                        <li><strong className="text-text-base">Operator ID:</strong> {operator.id}</li>
                        <li><strong className="text-text-base">Access Scope:</strong> {operator.role}</li>
                        <li><strong className="text-text-base">Active Session Token:</strong> {operator.sessionToken}</li>
                        <li><strong className="text-text-base">Local Port Integration:</strong> Static Gateway bound exclusively on port 3000.</li>
                      </ul>
                    </div>

                    {/* Integrated Supabase SQL Schema Provisioning block */}
                    <div className="bg-surface-lowest p-4 rounded-lg border border-border-main/80 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <p className="font-mono text-[11px] text-industrial-red uppercase font-black tracking-wider">
                          🔌 Supabase Database Schema Script
                        </p>
                        <button
                          onClick={() => {
                            const sqlText = `-- 1. Biometric Gesture Log Table\nCREATE TABLE IF NOT EXISTS public.biometric_gesture_logs (\n    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n    gesture_name TEXT NOT NULL,\n    severity TEXT NOT NULL,\n    location TEXT NOT NULL,\n    timestamp TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 2. AI Conversation Log Table\nCREATE TABLE IF NOT EXISTS public.ai_convo_logs (\n    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n    user_prompt TEXT NOT NULL,\n    ai_reply TEXT NOT NULL,\n    engine TEXT NOT NULL,\n    created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 3. Team Chat Messages Table\nCREATE TABLE IF NOT EXISTS public.team_messages (\n    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n    sender_id TEXT NOT NULL,\n    sender_name TEXT NOT NULL,\n    text TEXT NOT NULL,\n    role TEXT NOT NULL,\n    timestamp TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Enable Row Level Security Policies\nALTER TABLE public.biometric_gesture_logs ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.ai_convo_logs ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Allow public inserts" ON public.biometric_gesture_logs FOR INSERT WITH CHECK (true);\nCREATE POLICY "Allow public select" ON public.biometric_gesture_logs FOR SELECT USING (true);\n\nCREATE POLICY "Allow public inserts" ON public.ai_convo_logs FOR INSERT WITH CHECK (true);\nCREATE POLICY "Allow public select" ON public.ai_convo_logs FOR SELECT USING (true);\n\nCREATE POLICY "Allow public inserts" ON public.team_messages FOR INSERT WITH CHECK (true);\nCREATE POLICY "Allow public select" ON public.team_messages FOR SELECT USING (true);`;
                            navigator.clipboard.writeText(sqlText);
                            setSqlCopied(true);
                            setTimeout(() => setSqlCopied(false), 2000);
                          }}
                          className="bg-sidebar-active/70 hover:bg-sidebar-active border border-[#3A4A60]/60 text-text-base text-[9px] font-mono uppercase tracking-wider px-2.5 py-1 rounded transition-all active:scale-95 cursor-pointer"
                        >
                          {sqlCopied ? "✓ Copied!" : "Copy SQL Script"}
                        </button>
                      </div>

                      <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                        If you encounter schema cache faults (e.g. <code>PGRST205</code> errors in logs) upon connecting a custom Supabase cluster, copy and execute this creation script inside the <strong className="text-text-base">SQL Editor</strong> of your Supabase Workspace to generate all required tables and row permissions instantly:
                      </p>

                      <pre className="text-[9px] font-mono bg-black/60 p-3 rounded border border-white/5 text-teal-400 select-text overflow-x-auto max-h-48 leading-relaxed">
{`-- Create tables for Gesture Shield Syncing
CREATE TABLE IF NOT EXISTS public.biometric_gesture_logs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    gesture_name TEXT NOT NULL,
    severity TEXT NOT NULL,
    location TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_convo_logs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_prompt TEXT NOT NULL,
    ai_reply TEXT NOT NULL,
    engine TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_messages (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    text TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);`}
                      </pre>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button 
                        onClick={() => {
                          setDevices(DEFAULT_DEVICES);
                          setAlerts(DEFAULT_ALERTS);
                          setMessages(DEFAULT_MESSAGES);
                          setEmergencyActive(false);
                        }}
                        className="py-2.5 px-4 border border-border-main hover:bg-surface-high text-xs font-bold text-text-base rounded transition-colors uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset Database Logs
                      </button>

                      <button 
                        id="logout_main_settings_btn"
                        onClick={handleLogout}
                        className="py-2.5 px-4 bg-industrial-red hover:bg-[#b02727] text-white text-xs font-bold rounded transition-colors uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Terminate Session Links
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* 6. Mobile Bottom Navigation Bar (Shown on mobile browser, matching Screen 2 and 3) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full rounded-t-xl z-50 bg-[#071d30]/95 backdrop-blur-lg border-t border-[#3A4A60]/50 shadow-2xl flex justify-around items-center h-20 px-4 pb-safe select-none">
          {[
            { id: "dashboard", Icon: LayoutGrid, label: "Dash" },
            { id: "video", Icon: Video, label: "Video" },
            { id: "chat", Icon: MessageSquare, label: "Chat" },
            { id: "ai", Icon: Bot, label: "AI" },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                id={`mobile_tab_${item.id}`}
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveScreen)}
                className={`flex flex-col items-center justify-center p-3 transition-colors ${
                  isActive ? "text-white scale-105" : "text-on-surface-variant/70"
                }`}
              >
                <item.Icon className="w-5.5 h-5.5" />
                <span className="font-sans text-[9px] font-bold tracking-wider mt-1 uppercase select-none">{item.label}</span>
              </button>
            );
          })}
          
          <button
            id="mobile_tab_settings"
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center p-3 transition-colors ${
              activeTab === "settings" ? "text-white scale-105" : "text-on-surface-variant/70"
            }`}
          >
            <Settings className="w-5.5 h-5.5" />
            <span className="font-sans text-[9px] font-bold tracking-wider mt-1 uppercase select-none">System</span>
          </button>
        </nav>
      </div>

    </div>
  );
}

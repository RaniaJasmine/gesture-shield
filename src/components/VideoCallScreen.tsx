/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ShieldCheck, 
  Activity, ActivityIcon, Signal, Compass, Monitor, Cpu, Wifi,
  Send, MessageSquare, ArrowRight
} from "lucide-react";
import type { Device, WifiLink, Message } from "../types.js";
import WifiPeerLinkCentral from "./WifiPeerLinkCentral.js";

interface VideoCallScreenProps {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  wifiLinks: WifiLink[];
  setWifiLinks: React.Dispatch<React.SetStateAction<WifiLink[]>>;
  onWifiLinkCreated?: (link: WifiLink) => void;
  onWifiLinkRemoved?: (linkId: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function VideoCallScreen({ 
  devices, 
  setDevices,
  wifiLinks,
  setWifiLinks,
  onWifiLinkCreated,
  onWifiLinkRemoved,
  messages,
  setMessages
}: VideoCallScreenProps) {
  // Call state handles dialing and hanging up
  const [callActive, setCallActive] = useState<boolean>(true);
  const [dialingId, setDialingId] = useState<string | null>(null);
  const [dialingProgress, setDialingProgress] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [videoOff, setVideoOff] = useState<boolean>(false);

  // Set default active remote device on load
  const [activeDevice, setActiveDevice] = useState<Device | null>(() => {
    return devices.find(d => d.id === "UNIT_BRAVO_04") || devices.find(d => d.id !== "D-1" && d.id !== "CORE_LOGIC_HUB") || null;
  });

  // Set default calling source device
  const [sourceDevice, setSourceDevice] = useState<Device | null>(() => {
    return devices.find(d => d.id === "D-1") || devices[0] || null;
  });

  // Peer-to-peer texting states
  const [peerText, setPeerText] = useState("");
  const [peerHistory, setPeerHistory] = useState<{
    id: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    text: string;
  }[]>([]);
  
  // Real-time telemetry states that fluctuate realistically
  const [latency, setLatency] = useState<number>(24);
  const [bitrate, setBitrate] = useState<number>(4.2);
  const [fps, setFps] = useState<number>(60);

  // Check if activeDevice has an established Wi-Fi peer link
  const activeDeviceLink = activeDevice && wifiLinks ? wifiLinks.find(link => 
    link.sourceId === activeDevice.id || link.targetId === activeDevice.id
  ) : null;

  const hasWifiChannel = !!activeDeviceLink;

  // Fluctuations simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(prev => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(18, Math.min(38, prev + delta));
      });
      setBitrate(prev => {
        const delta = Number((Math.random() * 0.8 - 0.4).toFixed(1)); // -0.4 to +0.4
        return Math.max(2.8, Math.min(5.5, Number((prev + delta).toFixed(1))));
      });
      setFps(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.max(57, Math.min(60, prev + delta));
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Simulate dialing
  const handleDialDevice = (device: Device) => {
    if (callActive) {
      setCallActive(false);
    }
    setDialingId(device.id);
    setDialingProgress(0);
  };

  useEffect(() => {
    if (dialingId !== null) {
      const interval = setInterval(() => {
        setDialingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            const dev = devices.find(d => d.id === dialingId) || null;
            setActiveDevice(dev);
            setDialingId(null);
            setCallActive(true);
            return 100;
          }
          return prev + 25;
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [dialingId, devices]);

  // Transmit peer messaging and trigger automated peer replies
  const handleSendPeerText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!peerText.trim() || !sourceDevice || !activeDevice) return;

    const textToSend = peerText.trim();
    setPeerText("");

    const timeString = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
    
    // Add to local peerHistory logs
    const newSourceMsg = {
      id: `peer-${Date.now()}-src`,
      senderId: sourceDevice.id,
      senderName: sourceDevice.name,
      timestamp: timeString,
      text: textToSend
    };
    setPeerHistory(prev => [...prev, newSourceMsg]);

    // Construct unified P2P alert packet for the parent messaging context
    const parentMsg: Message = {
      id: `system-p2p-${Date.now()}-src`,
      senderId: sourceDevice.id,
      senderName: sourceDevice.name,
      timestamp: timeString,
      text: `📡 [P2P LINK to ${activeDevice.id}]: ${textToSend}`,
      role: sourceDevice.id === "D-1" ? "operator" : "device"
    };
    setMessages(prev => [...prev, parentMsg]);

    // Send P2P node messaging log event to database api dynamically
    fetch("/api/supabase/sync-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "team_messages",
        data: {
          sender_id: parentMsg.senderId,
          sender_name: parentMsg.senderName,
          text: parentMsg.text,
          role: parentMsg.role,
          timestamp: new Date().toISOString()
        }
      })
    }).catch(err => console.debug("Supabase direct mesh logging disabled/fallback active", err));

    // Simulate reactive respond sequence from activeDevice target receiver
    setTimeout(() => {
      let automatedReply = "";
      const lowerText = textToSend.toLowerCase();

      if (lowerText.includes("status") || lowerText.includes("report") || lowerText.includes("diagnostic")) {
        automatedReply = `[SECURE_ACK] System telemetry confirmed. Power output at 100%. Thermal levels within nominal margins (32.4°C). Latency: ${latency}ms. Security locks verified.`;
      } else if (lowerText.includes("ping") || lowerText.includes("hello") || lowerText.includes("test")) {
        automatedReply = `[P2P_ECHO] Ping echo response confirmed. Audio and camera stream encryption is running at full capacity under TLS 1.3 protocol.`;
      } else if (lowerText.includes("alert") || lowerText.includes("emergency") || lowerText.includes("hazard")) {
        automatedReply = `[INTERCOM_URGENT] Threat acknowledged. Activating localized sensor sweep on this asset sector. Standby for target locks.`;
      } else if (lowerText.includes("help") || lowerText.includes("deploy") || lowerText.includes("where")) {
        automatedReply = `[RESP_COORD] Tracking target. Sector position: ${activeDevice.latitude.toFixed(4)}° N, ${activeDevice.longitude.toFixed(4)}° W. Signal level: ${activeDevice.signalStrength}%.`;
      } else {
        automatedReply = `[ROUTED_TRANS] Data packet received. Core neural pathways verified. Stream rate stable at ${bitrate} Mbps.`;
      }

      const replyMsg = {
        id: `peer-${Date.now()}-dest`,
        senderId: activeDevice.id,
        senderName: activeDevice.name,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
        text: automatedReply
      };
      setPeerHistory(prev => [...prev, replyMsg]);

      const parentReplyMsg: Message = {
        id: `system-p2p-${Date.now()}-dest`,
        senderId: activeDevice.id,
        senderName: activeDevice.name,
        timestamp: replyMsg.timestamp,
        text: `⚡ [P2P LINK from ${activeDevice.id}]: ${automatedReply}`,
        role: "device"
      };
      setMessages(prev => [...prev, parentReplyMsg]);

      // Sync direct response log to Supabase
      fetch("/api/supabase/sync-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "team_messages",
          data: {
            sender_id: parentReplyMsg.senderId,
            sender_name: parentReplyMsg.senderName,
            text: parentReplyMsg.text,
            role: parentReplyMsg.role,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(err => console.debug(err));

    }, 1200);
  };

  return (
    <div className="space-y-8 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aspect Ratio Video Feed Stack (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Video stream 1: Local console */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden glass-panel border border-[#3A4A60]/50 shadow-2xl bg-[#030d16] flex flex-col justify-between p-5">
            {/* Animated Matrix wave visualizer */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#3a4a60_1px,transparent_1px),linear-gradient(to_bottom,#3a4a60_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

            <div className="flex justify-between items-start font-mono text-[9px] text-[#bcc7da]/70 z-10">
              <div className="space-y-1">
                <p>SYS_STATUS: RUNNING</p>
                <p>SIGNAL_STRENGTH: {hasWifiChannel ? "100% DIRECT MESH (EXCELLENT)" : "CELLULAR_STANDBY"}</p>
              </div>
              <div className="text-right space-y-1">
                <p>LATENCY_OFFSET: {hasWifiChannel ? "0.15 MS [TUNNELED]" : "+14.2 MS"}</p>
                <p>ENCRYPTION: {hasWifiChannel ? `${activeDeviceLink?.frequency} WPA3_TUNNEL` : "HARDWARE_ECC"}</p>
              </div>
            </div>

            {/* Central Holographic Oscilloscope Waveform */}
            <div className="flex-1 flex items-center justify-center relative my-4 z-10">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full border border-[#bcc7da]/10 animate-ping duration-1000" />
                <div className="w-24 h-24 rounded-full border border-[#bcc7da]/20 animate-pulse" />
              </div>
              
              <svg className="w-full h-16 stroke-[#c1c7d2]/40 stroke-2 fill-none" viewBox="0 0 400 100">
                <path d="M 0,50 Q 50,15 100,50 T 200,50 T 300,50 T 400,50" className="animate-pulse" />
                <path d="M 0,50 Q 40,85 80,50 T 160,50 T 240,50 T 320,50 T 400,50" className="stroke-red-500/20" />
                <path d="M 0,50 H 400" className="opacity-10 stroke-[0.5]" />
              </svg>
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono text-outline/50 uppercase z-10">
              <span>LOCAL_LOOP_IP // 127.0.0.1</span>
              <span>CONSOLE_DEEPLOCK_ONLINE</span>
            </div>
            
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-xs text-white">
              <Monitor className="w-4 h-4 text-white shrink-0" />
              <div className="flex items-center gap-1">
                <span className="font-sans font-black text-red-500 text-[10px] tracking-wider uppercase block select-none">FROM:</span>
                <select 
                  value={sourceDevice?.id || ""} 
                  onChange={(e) => {
                    const dev = devices.find(d => d.id === e.target.value) || null;
                    setSourceDevice(dev);
                  }}
                  className="bg-transparent border-none text-white font-sans font-black text-xs uppercase tracking-wider focus:outline-none cursor-pointer p-0 select-none outline-none"
                >
                  <option value="D-1" className="bg-[#030d16] text-white">Local HQ Console (D-1)</option>
                  {devices.filter(d => d.id !== "D-1").map(d => (
                    <option key={d.id} value={d.id} className="bg-[#030d16] text-white">{d.name} ({d.id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 bg-[#4CAF50]/15 border border-[#4CAF50]/40 px-3 py-1 rounded-lg z-10">
              <span className="font-mono text-[9px] text-[#4CAF50] uppercase font-black tracking-widest animate-pulse">
                {hasWifiChannel ? "🛜 PEER-TO-PEER DIRECT LINK" : "ENCRYPTED SECURE LINK"}
              </span>
            </div>
          </div>

          {/* Video stream 2: Remote camera */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden glass-panel border border-[#3A4A60]/50 shadow-2xl bg-[#030d16]">
            {callActive && !videoOff ? (
              <div className="absolute inset-0 flex flex-col justify-between p-5 font-mono text-xs z-10">
                {/* Thermal Wireframe Conveyor Line Scan overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-bright/20 via-[#030d16] to-[#000511]" />
                
                {/* Custom SVG Wireframe Layout simulating the camera picture */}
                <div className="absolute inset-x-6 top-14 bottom-14 border border-white/10 rounded flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#4CAF50]/5 to-transparent pointer-events-none" />
                  
                  {/* Simulated Target Tracking Box */}
                  <div className="border border-[#4CAF50] bg-[#4CAF50]/10 p-2 rounded absolute top-4 left-4 flex flex-col gap-0.5 text-[9px] animate-pulse">
                    <span className="font-bold uppercase text-[7px] tracking-widest text-[#4CAF50]">TRACKING_TARGET_01</span>
                    <span className="text-white/80">GESTR_LOCK: OK</span>
                    <span className="text-white/80">CONF_RATIO: 98.4%</span>
                  </div>

                  <div className="border border-red-500 bg-red-500/10 p-2 rounded absolute bottom-4 right-4 flex flex-col gap-0.5 text-[9px] animate-pulse">
                    <span className="font-bold uppercase text-[7px] tracking-widest text-red-500">ACTIVE_HAZARD_OVERLAY</span>
                    <span className="text-white/80">OVERRIDE: DISPATCH_WARN</span>
                    <span className="text-white/80">REACTION_TIME: 220MS</span>
                  </div>

                  {/* Aesthetic alignment guidelines */}
                  <div className="absolute top-2 left-2 border-t-2 border-l-2 border-white/10 w-4 h-4" />
                  <div className="absolute top-2 right-2 border-t-2 border-r-2 border-white/10 w-4 h-4" />
                  <div className="absolute bottom-2 left-2 border-b-2 border-l-2 border-white/10 w-4 h-4" />
                  <div className="absolute bottom-2 right-2 border-b-2 border-r-2 border-white/10 w-4 h-4" />
                  
                  <p className="text-[#3A4A60] uppercase text-[10px] select-none font-bold tracking-[0.2em] animate-pulse">
                    NEURAL_STREAM_SECURE_FEED
                  </p>
                </div>

                {/* Tickers */}
                <div className="flex justify-between items-start text-on-surface-variant font-mono text-[9px] z-10 select-none">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-ping ${(activeDevice?.status || "ONLINE") === "ALERT" ? "bg-industrial-red" : "bg-[#4CAF50]"}`} />
                    <span>STREAM_HOST: {activeDevice?.id || "DEVICE_D-1"} [{(activeDevice?.status || "ONLINE")}]</span>
                  </div>
                  <span>FPS: {hasWifiChannel ? 60 : fps} // CHNL_BITRATE: {hasWifiChannel ? `${activeDeviceLink?.bandwidthMbps || 866} MBPS [MAX]` : `${bitrate} MBPS`}</span>
                </div>

                {/* Hardware Lock Indicator HUD overlays */}
                {muted && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 z-20 bg-orange-500/15 border border-orange-500/40 text-orange-500 font-mono text-[10px] px-3 py-1.5 rounded-md tracking-widest uppercase font-bold text-center select-none shadow animate-[pulse_1.5s_infinite]">
                    ⚠️ COG_AUDIO_STREAM_MUTED
                  </div>
                )}

                <div className="flex justify-between items-end text-on-surface-variant font-mono text-[9px] z-10 select-none">
                  <span>COORDINATES: {(activeDevice?.latitude || 34.0522).toFixed(4)}° N, {(activeDevice?.longitude || -118.2437).toFixed(4)}° W</span>
                  <span>ENC: RSA_4096_OVER_TLS_1.3</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-outline/50 z-10 select-none">
                <VideoOff className="w-12 h-12 mb-2 stroke-[1.5] text-industrial-red animate-pulse" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#d0e4ff] font-bold">
                  {videoOff ? "🎥 OPTICAL LENS DISENGAGED // LENS_CLOSED" : "📞 TACTICAL CONSOLE HOOK RELEASE"}
                </p>
                <p className="font-sans text-[10px] text-text-muted mt-1 select-none">
                  {videoOff ? "Re-engage camera shutter toggle from action bar to resume feed." : "Select a connection target from the list above to route a feed."}
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

            {/* Device name badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-xs text-white select-none">
              <Cpu className="w-4 h-4 text-white shrink-0" />
              <div className="flex items-center gap-1">
                <span className="font-sans font-black text-[#4CAF50] text-[10px] tracking-wider uppercase block select-none">TO:</span>
                <select 
                  value={activeDevice?.id || ""} 
                  onChange={(e) => {
                    const dev = devices.find(d => d.id === e.target.value) || null;
                    if (dev) {
                      handleDialDevice(dev);
                    }
                  }}
                  className="bg-transparent border-none text-white font-sans font-black text-xs uppercase tracking-wider focus:outline-none cursor-pointer p-0 select-none outline-none"
                >
                  <option value="" disabled className="bg-[#030d16] text-text-muted">Select Target</option>
                  {devices.filter(d => d.id !== sourceDevice?.id).map(d => (
                    <option key={d.id} value={d.id} className="bg-[#030d16] text-white">{d.name} ({d.id})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Floating dialer screen */}
            {dialingId !== null && (
              <div className="absolute inset-0 bg-black/85 z-20 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center space-y-1">
                  <p className="font-sans text-xs text-[#bcc7da] uppercase font-bold tracking-widest">
                    ROUTING SECURE IP LAYER...
                  </p>
                  <div className="w-48 bg-surface-container h-1 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${dialingProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Floating Action Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel px-6 py-2.5 rounded-full flex items-center gap-6 shadow-2xl transition-all duration-300 hover:scale-105 z-10">
              {/* Call Toggle */}
              <button 
                id="call_toggle_act"
                onClick={() => setCallActive(!callActive)}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 shadow-lg ${
                  callActive 
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-900/30" 
                    : "bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-green-900/30"
                }`}
              >
                {callActive ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </button>

              {/* Mute toggle */}
              <button 
                id="mute_toggle_act"
                onClick={() => setMuted(!muted)}
                disabled={!callActive}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-90 ${
                  muted ? "bg-orange-500 text-white" : "bg-surface-highest hover:bg-surface-high text-[#bcc7da]"
                }`}
              >
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Video toggle */}
              <button 
                id="video_toggle_act"
                onClick={() => setVideoOff(!videoOff)}
                disabled={!callActive}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-90 ${
                  videoOff ? "bg-orange-500 text-white" : "bg-surface-highest hover:bg-surface-high text-[#bcc7da]"
                }`}
              >
                {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* P2P Transmitted Messaging Console */}
          <div className="glass-panel p-5 rounded-xl border border-[#3A4A60]/50 shadow-2xl bg-[#030d16] flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-border-main/50 pb-2 mb-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-industrial-red animate-pulse" />
                <h3 className="font-sans text-xs font-black tracking-widest text-[#bcc7da] uppercase">
                  PEER-TO-PEER ENCRYPTED CHAT TERMINAL
                </h3>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#4CAF50] animate-pulse bg-[#4CAF50]/10 px-2.5 py-1 rounded border border-[#4CAF50]/25 select-none">
                {callActive ? "● DIRECT TRANSLATION TUNNEL ACTIVE" : "▲ INTERCOM OFFLINE - DIAL TARGET"}
              </span>
            </div>

            {/* Chat history screen */}
            <div className="h-40 overflow-y-auto bg-black/50 border border-white/5 rounded-lg p-3 font-mono text-[11px] leading-relaxed space-y-2.5 no-scrollbar select-text">
              {peerHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted/40 italic select-none">
                  <p>No telemetry payloads recorded on this peer link.</p>
                  <p className="text-[9px] mt-1 text-center">Type in the transmitter below to exchange encrypted data packets between {sourceDevice?.id || "Local HQ"} and {activeDevice?.id || "Target"}.</p>
                </div>
              ) : (
                peerHistory.map((item) => {
                  const isSource = item.senderId === sourceDevice?.id;
                  return (
                    <div key={item.id} className="flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex items-center gap-1.5 select-none">
                        <span className="text-[9px] text-[#bcc7da]/45">[{item.timestamp}]</span>
                        <span className={`font-bold ${isSource ? "text-indigo-400" : "text-amber-400"}`}>
                          {item.senderName} ({item.senderId})
                        </span>
                        <span className="text-[#bcc7da]/30">➔</span>
                        <span className="text-text-muted/80 font-black">
                          {isSource ? activeDevice?.id : sourceDevice?.id}
                        </span>
                      </div>
                      <p className="text-[#bcc7da]/90 bg-white/5 p-2 rounded border border-white/5 font-mono whitespace-pre-wrap select-text">
                        {item.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendPeerText} className="flex gap-3">
              <input 
                id="p2p_chat_input"
                type="text"
                value={peerText}
                onChange={(e) => setPeerText(e.target.value)}
                disabled={!callActive}
                placeholder={callActive ? `Send peer stream packet from ${sourceDevice?.id || "HQ"}...` : "Establish call connection first to enable peer typing..."}
                className="flex-1 bg-[#010910] border border-border-main rounded-lg px-4 py-2.5 text-xs text-text-base placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-industrial-red font-mono"
              />
              <button 
                id="p2p_chat_send_button"
                type="submit"
                disabled={!callActive || !peerText.trim()}
                className="px-5 bg-industrial-red hover:bg-[#b02727] disabled:bg-surface-high disabled:text-text-muted/35 text-white text-xs font-bold font-sans rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow cursor-pointer uppercase font-semibold"
              >
                <span>TRANSMIT</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Side Control & Diagnostic list (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Remote Devices Stream Routing */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-[11px] font-bold tracking-widest text-[#bcc7da] uppercase select-none">
                REMOTE DEVICES
              </h3>
              <span className="px-1.5 py-0.5 bg-[#4CAF50]/10 text-[#4CAF50] text-[9px] rounded font-mono border border-[#4CAF50]/20 select-none">
                ACTIVE {devices.filter(d => d.id !== "D-1" && d.id !== "CORE_LOGIC_HUB").length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {devices.filter(d => d.id !== "D-1" && d.id !== "CORE_LOGIC_HUB").map((dev) => (
                <div 
                  id={`call_device_row_${dev.id}`}
                  key={dev.id}
                  className="bg-glass border border-border-main rounded-xl p-3 flex items-center justify-between hover:bg-surface-high transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-surface-high flex items-center justify-center text-text-muted transition-colors">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-mono text-xs text-text-base font-bold tracking-wide">
                        {dev.id} ({dev.status === "ALERT" ? "ALERT" : "ONLINE"})
                      </h4>
                      <p className="text-[9px] text-text-muted font-mono">
                        LAT: {dev.latitude.toFixed(2)} / LNG: {dev.longitude.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button 
                    id={`dial_device_btn_${dev.id}`}
                    onClick={() => handleDialDevice(dev)}
                    className="px-3 py-1 bg-[#4CAF50] hover:bg-[#43a047] text-white text-[10px] font-bold font-sans rounded transition-all active:scale-95 shadow cursor-pointer animate-pulse"
                  >
                    CALL
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Stream Health Panel */}
          <section className="bg-surface-low rounded-xl border border-border-main p-4">
            <div className="flex items-center gap-2 mb-4 select-none">
              <Activity className="w-4 h-4 text-text-muted" />
              <h3 className="font-sans text-[10px] font-bold tracking-widest text-text-muted uppercase">
                STREAM HEALTH TELEMETRY
              </h3>
            </div>

            {callActive ? (
              <div className="space-y-4">
                {/* Connection Channel badge */}
                <div className={`p-2 px-3 rounded-lg border font-mono text-[9px] flex items-center gap-2 leading-tight ${
                  hasWifiChannel 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-[#0b1723] border-[#3a4a60]/20 text-[#bcc7da]/80"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${hasWifiChannel ? "bg-emerald-400 animate-ping" : "bg-[#bcc7da]/40"}`} />
                  <div>
                    <p className="font-black uppercase text-white">{hasWifiChannel ? "CHANNEL: DIRECT WI-FI P2P" : "CHANNEL: REMOTE CELLULAR"}</p>
                    <p className="text-[8px] text-text-muted mt-0.5">{hasWifiChannel ? "Authenticated ultra-low latency mesh routing." : "Standard bridge routing. Establish Wi-Fi link of target device below to optimize."}</p>
                  </div>
                </div>

                {/* Latency */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-sans text-text-muted font-medium">Latency</span>
                    <span className="text-xs font-mono text-text-base text-right">{hasWifiChannel ? 2 : latency}ms</span>
                  </div>
                  <div className="h-1 bg-surface-highest rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#4CAF50] transition-all duration-300 rounded-full" 
                      style={{ width: `${hasWifiChannel ? 99 : Math.max(10, Math.min(100, (100 - latency)))}%` }} 
                    />
                  </div>
                </div>

                {/* Bitrate */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-sans text-text-muted font-medium">Bitrate</span>
                    <span className="text-xs font-mono text-text-base text-right">{hasWifiChannel ? `${activeDeviceLink?.bandwidthMbps || 866} Mbps` : `${bitrate} Mbps`}</span>
                  </div>
                  <div className="h-1 bg-surface-highest rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#4CAF50] transition-all duration-300 rounded-full" 
                      style={{ width: `${hasWifiChannel ? 100 : (bitrate / 6) * 100}%` }} 
                    />
                  </div>
                </div>

                {/* Framerate */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-sans text-text-muted font-medium">Video FPS Rate</span>
                    <span className="text-xs font-mono text-text-base text-right">{hasWifiChannel ? 60 : fps} FPS</span>
                  </div>
                  <div className="h-1 bg-surface-highest rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#4CAF50] transition-all duration-300 rounded-full" 
                      style={{ width: `${((hasWifiChannel ? 60 : fps) / 60) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-text-dim font-sans text-xs italic select-none">
                Establish a secure stream to render sensor data.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Wi-Fi P2P Connection Console at the bottom of Video Call */}
      <section className="border-t border-border-main/50 pt-8 mt-4 select-none">
        <div className="flex flex-col gap-1 mb-5">
          <h3 className="font-sans text-xs font-black tracking-widest text-text-base uppercase flex items-center gap-2">
            <Wifi className="w-4 h-4 text-indigo-400" />
            DIRECT WI-FI PEER-TO-PEER MESH CONTROLLER
          </h3>
          <p className="text-[11px] text-text-muted font-sans">
            Provision dedicated hardware-level mesh links between active workspace terminals. Dynamic routing automatically boosts call bitrate metrics to gigabit speeds.
          </p>
        </div>
        <WifiPeerLinkCentral 
          devices={devices} 
          wifiLinks={wifiLinks} 
          setWifiLinks={setWifiLinks}
          onWifiLinkCreated={onWifiLinkCreated}
          onWifiLinkRemoved={onWifiLinkRemoved}
        />
      </section>
    </div>
  );
}

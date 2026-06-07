/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Shield, Bot, Server, User, Plus, Activity
} from "lucide-react";
import { Message, Device, Operator } from "../types.js";

interface TeamChatScreenProps {
  operator: Operator;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
}

export default function TeamChatScreen({ 
  operator, 
  messages, 
  setMessages, 
  devices,
  setDevices
}: TeamChatScreenProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [isAiReplying, setIsAiReplying] = useState<boolean>(false);
  const [showNetworkDrawer, setShowNetworkDrawer] = useState<boolean>(true);
  const [showProvisionModal, setShowProvisionModal] = useState<boolean>(false);
  const [newNodeId, setNewNodeId] = useState("");
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState<"precision_manufacturing" | "robot_2" | "shield" | "airplanemode_active" | "smart_toy">("shield");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-msg-${Date.now()}`,
      senderId: operator.id,
      senderName: operator.name,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      text: inputValue,
      role: "operator"
    };

    setMessages(prev => [...prev, userMessage]);
    const prompt = inputValue;
    setInputValue("");
    setIsAiReplying(true);

    // Sync sent user message to Supabase
    fetch("/api/supabase/sync-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "team_messages",
        data: {
          sender_id: userMessage.senderId,
          sender_name: userMessage.senderName,
          text: userMessage.text,
          role: userMessage.role,
          timestamp: new Date().toISOString()
        }
      })
    }).catch(err => console.debug("Supabase logging is disabled or missing keys.", err));

    // Call server-side diagnostics system (Groq powered)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: prompt, 
          history: messages.map(msg => ({
            role: msg.role === 'operator' ? 'user' : 'assistant',
            content: msg.text
          }))
        }),
      });
      const data = await response.json();
      
      const aiResponse: Message = {
        id: `ai-msg-${Date.now()}`,
        senderId: "SHIELD_AI",
        senderName: "SHIELD_AI",
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
        text: data.text || "AI Core failed to compile a diagnostic. Please check connection.",
        role: "ai"
      };
      setMessages(prev => [...prev, aiResponse]);

      // Sync AI response to Supabase
      fetch("/api/supabase/sync-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "team_messages",
          data: {
            sender_id: aiResponse.senderId,
            sender_name: aiResponse.senderName,
            text: aiResponse.text,
            role: aiResponse.role,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(err => console.debug("Supabase logging is disabled or missing keys.", err));

    } catch (err) {
      console.error("AI Assistant error: ", err);
      // Fallback
      setTimeout(() => {
        const fallbackMsg: Message = {
          id: `ai-msg-${Date.now()}`,
          senderId: "SHIELD_AI",
          senderName: "SHIELD_AI",
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
          text: `🔐 [LOCAL_EMERGENCY] AI received tactical override. Local sensors reporting nominal behavior for Sector 7. Broadcast logs archived successfully.`,
          role: "ai"
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }, 1000);
    } finally {
      setIsAiReplying(false);
    }
  };

  const handleProvisionNode = () => {
    setNewNodeId(`NODE_${Math.floor(10 + Math.random() * 90)}`);
    setNewNodeName("");
    setShowProvisionModal(true);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex rounded-xl overflow-hidden glass-panel border border-border-main select-none transition-colors duration-300">
      {/* Messages Feed panel */}
      <section className="flex-1 flex flex-col bg-gradient-to-b from-surface-low to-surface-lowest relative h-full">
        {/* Messages view */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth custom-scrollbar no-scrollbar">
          {/* Static Session Init text */}
          <div className="flex justify-center select-none">
            <span className="px-3 py-1 bg-surface-high rounded-full text-[10px] font-mono text-text-muted/80 border border-border-main select-none">
              TACTICAL GROUP INITIALLY SYNCHRONIZED // 14:02:11
            </span>
          </div>

          {messages.map((msg) => {
            const isSelf = msg.role === "operator";
            const isAi = msg.role === "ai";
            const isDevice = msg.role === "device";

            return (
              <div 
                id={`chat_bubble_${msg.id}`}
                key={msg.id}
                className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isSelf ? "self-end ml-auto flex-row-reverse" : "self-start mr-auto"}`}
              >
                {/* Visual Avatar */}
                <div className={`w-10 h-10 shrink-0 border rounded-lg flex items-center justify-center shadow ${
                  isSelf 
                    ? "bg-industrial-red border-red-950 text-white" 
                    : isAi 
                      ? "bg-surface-high border-border-main text-text-muted" 
                      : "bg-surface-low border-border-main text-text-base"
                }`}>
                  {isSelf && <User className="w-5 h-5 animate-pulse" />}
                  {isAi && <Bot className="w-5 h-5 animate-pulse" />}
                  {isDevice && <Server className="w-5 h-5 animate-pulse" />}
                </div>

                {/* Bubble Text */}
                <div className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 select-none">
                    <span className="font-sans text-[10px] font-bold text-text-muted">
                      {msg.senderName}
                    </span>
                    <span className="font-mono text-[9px] text-text-muted/40">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className={`px-4 py-3 rounded-lg text-sm shadow leading-relaxed font-sans ${
                    isSelf 
                      ? "bg-industrial-red text-white rounded-tr-none rounded-br-2xl" 
                      : isAi 
                        ? "bg-surface-high text-text-base rounded-tl-none rounded-bl-2xl border-l-[3px] border-l-indigo-500 border border-border-main" 
                        : "bg-surface-low text-text-base rounded-tl-none rounded-bl-2xl border-l-[3px] border-l-industrial-red border border-border-main"
                  }`}>
                    {msg.imageUrl && (
                      <div className="mb-2.5 rounded-lg overflow-hidden border border-border-main w-full max-w-sm bg-surface-lowest p-3 text-[10px] font-mono text-text-muted/80 relative select-none">
                        {/* Thermal heat map mockup with pure CSS gradients and targets */}
                        <div className="flex justify-between items-center border-b border-border-main pb-1.5 mb-2 text-[9px] uppercase font-black text-red-500">
                          <span>THERMAL SCAN PROTOCOL</span>
                          <span className="animate-pulse">LOCK // TRGT_02</span>
                        </div>
                        <div className="relative h-28 bg-gradient-to-br from-red-950 via-orange-950 to-amber-950 rounded border border-border-main overflow-hidden flex items-center justify-center">
                          {/* Oscillating Crosshairs */}
                          <div className="absolute inset-x-0 h-px bg-red-500/20" />
                          <div className="absolute inset-y-0 w-px bg-red-500/20" />
                          
                          {/* Glowing target rings and labels */}
                          <div className="absolute w-12 h-12 rounded-full border border-orange-500/35 animate-ping" />
                          <div className="absolute w-8 h-8 rounded-full border border-red-500 bg-red-500/10 flex items-center justify-center">
                            <span className="text-[7px] text-white font-bold leading-none uppercase">Lock</span>
                          </div>
                          
                          {/* Aesthetic calibration lines */}
                          <div className="absolute top-1.5 left-1.5 border-t border-l border-white/20 w-3 h-3" />
                          <div className="absolute bottom-1.5 right-1.5 border-b border-r border-white/20 w-3 h-3" />
                          
                          {/* Abstract sensor waves */}
                          <div className="absolute top-2 right-2 flex flex-col gap-0.5 text-[7px] text-[#4CAF50] uppercase items-end">
                            <span>TEMP: 38.6°C</span>
                            <span>DEV: NOMINAL</span>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center text-[8px] font-mono opacity-50">
                          <span>GRID SECTOR: NY_7G_E</span>
                          <span>LATENCY_STABILITY: 99.8%</span>
                        </div>
                      </div>
                    )}
                    <span className="whitespace-pre-line">{msg.text}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* AI generating log spinner */}
          {isAiReplying && (
            <div className="flex gap-3 max-w-[70%] self-start mr-auto">
              <div id="ai_thinking_bubble" className="w-10 h-10 shrink-0 border border-border-main rounded-lg bg-surface-high flex items-center justify-center text-text-muted">
                <Bot className="w-5 h-5 animate-spin text-text-base" />
              </div>
              <div className="flex flex-col gap-1 items-start">
                <span className="font-sans text-[10px] font-bold text-text-muted select-none">
                  SHIELD_AI [ANALYZING CODES...]
                </span>
                <div className="px-4 py-2 bg-surface-low text-text-muted font-mono text-xs italic rounded-lg rounded-tl-none animate-pulse border border-border-main">
                  Routing biometric data overlays... compiling response...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-surface-low border-t border-border-main z-10">
          <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea 
                id="transmit_textarea"
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                className="w-full bg-surface-lowest border border-border-main rounded-lg px-4 py-3 text-text-base text-sm focus:outline-none focus:ring-1 focus:ring-industrial-red font-mono placeholder:text-text-muted/40 resize-none"
                placeholder="TRANSMIT TACTICAL COMMAND..."
              />
            </div>
            
            <button 
              id="send_chat_btn"
              type="submit"
              className="h-11 px-6 bg-industrial-red hover:bg-[#b02727] active:scale-95 transition-all text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span className="font-sans text-xs tracking-wider uppercase font-extrabold select-none">SEND</span>
              <Send className="w-4 h-4 cursor-pointer" />
            </button>
          </form>
        </div>
      </section>

      {/* Right Drawer sidebar: Network Nodes (col-4) */}
      {showNetworkDrawer && (
        <aside className="hidden lg:flex w-80 flex-col bg-surface-high border-l border-border-main h-full animate-[fadeIn_0.3s_ease-out] transition-colors duration-300">
          <div className="p-4 border-b border-border-main bg-surface-low select-none">
            <div className="flex justify-between items-center">
              <span className="font-sans text-xs tracking-widest font-black text-text-base uppercase">
                NETWORK_NODES
              </span>
              <span className="px-1.5 py-0.5 bg-surface-low text-text-base text-[10px] font-mono font-bold rounded border border-border-main">
                12 ACTIVE
              </span>
            </div>
          </div>

          {/* List of active nodes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
            {/* Group 1: Response Teams */}
            <div className="space-y-2">
              <h4 className="font-mono text-[9px] font-bold text-text-muted/60 tracking-widest uppercase px-2">
                RESPONSE_UNITS
              </h4>
              
              <div className="space-y-1.5">
                {devices.filter(d => d.type === "shield").map((dev) => (
                  <div key={dev.id} className="p-3 rounded-lg bg-surface-low border border-border-main flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded bg-surface-lowest flex items-center justify-center border border-border-main text-text-base">
                        <Shield className="w-4 h-4 text-text-base" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface-low ${
                        dev.status === "ALERT" ? "bg-industrial-red animate-pulse" : "bg-[#4CAF50]"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-base truncate">{dev.id}</p>
                      <p className={`text-[9px] uppercase font-mono ${dev.status === "ALERT" ? "text-industrial-red font-black" : "text-text-muted/70"}`}>
                        {dev.status === "ALERT" ? "DEPLOYED // SECTOR_7" : "IDLE // HQ_SEC"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group 2: AI systems */}
            <div className="space-y-2">
              <h4 className="font-mono text-[9px] font-bold text-text-muted/60 tracking-widest uppercase px-2">
                AUTOMATED_ASSETS
              </h4>
              
              <div className="space-y-1.5">
                {devices.filter(d => d.type === "airplanemode_active" || d.type === "smart_toy").map((dev) => (
                  <div key={dev.id} className="p-3 rounded-lg bg-surface-low border border-border-main flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded bg-surface-lowest flex items-center justify-center border border-border-main text-text-muted">
                        {dev.type === "airplanemode_active" ? <Activity className="w-4 h-4 text-text-base animate-pulse" /> : <Bot className="w-4 h-4 text-text-base animate-pulse" />}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface-low bg-[#4CAF50]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-base truncate">{dev.id}</p>
                      <p className="text-[9px] text-text-muted uppercase font-mono truncate">
                        {dev.type === "airplanemode_active" ? "PATROL // WEST_WING" : "NOMINAL // STANDBY"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Provision node link */}
          <div className="p-4 bg-surface-low border-t border-border-main select-none">
            <button 
              id="provision_node_btn"
              onClick={handleProvisionNode}
              className="w-full py-2 border border-border-main hover:bg-surface-high text-[10px] tracking-wider transition-colors rounded text-text-muted font-bold flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <Plus className="w-3.5 h-3.5" />
              PROVISION NODE
            </button>
          </div>
        </aside>
      )}

      {/* Provision Node Modal overlay */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-xl space-y-4 animate-[fadeIn_0.2s_ease-out] bg-surface-low border border-border-main">
            <h3 className="font-sans text-lg font-extrabold text-text-base uppercase tracking-tight text-white">
              PROVISION NEW SECURITY ASSET
            </h3>
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-text-muted block">NODE CLASSIFICATION ID</label>
                <input 
                  type="text"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  className="w-full bg-surface-lowest border border-border-main p-2.5 rounded text-white text-xs font-mono font-bold uppercase tracking-wider focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-text-muted block">ASSET DESCRIPTION NAME</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Loading Bay Camera C"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full bg-surface-lowest border border-border-main p-2.5 rounded text-text-base text-xs focus:outline-none placeholder:text-text-muted/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-text-muted block">ASSET HARDWARE SENSOR</label>
                <select 
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as any)}
                  className="w-full bg-surface-lowest border border-border-main p-2.5 rounded text-text-base text-xs focus:outline-none cursor-pointer"
                >
                  <option value="shield">Secure Shield Responder Badge</option>
                  <option value="precision_manufacturing">Precision Thermal Lens</option>
                  <option value="robot_2">AI Robot Grader V2</option>
                  <option value="airplanemode_active">Sentry Patrol Drone UAV</option>
                  <option value="smart_toy">Autonomous Logic Hub Core</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-4 py-2 border border-border-main text-text-muted rounded hover:bg-surface-high transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (!newNodeName.trim()) return;
                    
                    const newAsset: Device = {
                      id: newNodeId || `NODE_${Math.floor(Date.now() % 1000)}`,
                      name: newNodeName,
                      status: "ONLINE",
                      latitude: 34.0522 + (Math.random() * 0.01 - 0.005),
                      longitude: -118.2437 + (Math.random() * 0.01 - 0.005),
                      type: newNodeType,
                      signalStrength: Math.floor(92 + Math.random() * 8),
                      latencyMs: Math.floor(4 + Math.random() * 20)
                    };

                    // Add device to general state
                    setDevices(prev => [...prev, newAsset]);

                    // Push success log inside Team Chat
                    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
                    const systemLog: Message = {
                      id: `system-provision-log-${Date.now()}`,
                      senderId: "CORE_LOGIC_HUB",
                      senderName: "SYSTEM_MONITOR_CORP",
                      timestamp: timeNow,
                      text: `📡 [PROVISION_SUCCESS] New secure asset launched: ${newAsset.name} (#${newAsset.id}). Grid sensors fully synchronized. Nominal status confirmed.`,
                      role: "device"
                    };
                    setMessages(prev => [...prev, systemLog]);

                    setShowProvisionModal(false);
                  }}
                  className="px-4 py-2 bg-industrial-red hover:bg-[#b02727] text-white font-bold rounded transition-colors cursor-pointer"
                >
                  AUTHORIZE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

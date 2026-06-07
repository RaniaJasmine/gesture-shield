/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkle, Sparkles, Terminal, Mic, Send, Paperclip, Lock, Activity, Bot
} from "lucide-react";

interface ChatTurn {
  id: string;
  sender: "ai" | "operator";
  senderName: string;
  timestamp: string;
  text: string;
  metrics?: {
    correlationRatio: string;
    riskLevel: string;
    riskColor: string;
  };
}

export default function AiAssistantScreen() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: "turn-1",
      sender: "ai",
      senderName: "AI_CORE_V4",
      timestamp: "09:14:22",
      text: "System diagnostic complete. All biometric sign-detection sensors are online. Industrial floor Zone B shows minor vibration variance. How shall we proceed with the current safety oversight?"
    },
    {
      id: "turn-2",
      sender: "operator",
      senderName: "OPERATOR",
      timestamp: "09:15:01",
      text: "Analyze recent gesture anomalies in the loading bay. Is there a correlation with the conveyor speed increases?"
    },
    {
      id: "turn-3",
      sender: "ai",
      senderName: "AI_CORE_V4",
      timestamp: "09:15:08",
      text: "Analysis indicates a 14% increase in 'Urgent Stop' gesture attempts at Loading Bay 4. This correlates directly with the 20% conveyor speed boost implemented at 08:00.\n\nRecommend immediate review of Safety Protocol 09-Beta or emergency speed reduction.",
      metrics: {
        correlationRatio: "0.88",
        riskLevel: "ELEVATED",
        riskColor: "text-orange-500"
      }
    }
  ]);

  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [tokenCount, setTokenCount] = useState<number>(2142);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSyncingDoc, setIsSyncingDoc] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [turns]);

  // Handle dynamic Microphone Voice translation simulation
  const handleStartListening = () => {
    if (isListening) return;
    setIsListening(true);
    setInputValue("");
    setTimeout(() => {
      setInputValue("Voice Input 09-Alpha: Requesting immediate status of thermal sensor Alpha.");
      setIsListening(false);
    }, 2500);
  };

  // Simulate file diagram upload analysis
  const handleUploadDocumentSnapshot = () => {
    if (isSyncingDoc) return;
    setIsSyncingDoc(true);
    setTimeout(() => {
      setIsSyncingDoc(false);
      handleSubmitPrompt("Analysis of schematic document load_alpha_sensor_matrix.jpg: Hand-sign occlusion is below normal operating limits.");
    }, 1800);
  };

  // Handle Custom Message submitting
  const handleSubmitPrompt = async (text: string) => {
    if (!text.trim()) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      sender: "operator",
      senderName: "OPERATOR",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      text: text
    };

    setTurns(prev => [...prev, userTurn]);
    setInputValue("");
    setIsTyping(true);
    setTokenCount(prev => prev + Math.floor(Math.random() * 150) + 80);

    // Prompt Gemini AI assistant
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          history: turns.map(t => ({
            role: t.sender === 'operator' ? 'user' : 'assistant',
            content: t.text
          }))
        }),
      });
      const data = await response.json();
      
      // Determine if Gemini suggests any metrics
      let calculatedMetrics;
      const lowerText = text.toLowerCase();
      if (lowerText.includes("stop") || lowerText.includes("emergency") || lowerText.includes("hazard")) {
        calculatedMetrics = {
          correlationRatio: "0.95",
          riskLevel: "CRITICAL",
          riskColor: "text-red-500"
        };
      } else if (lowerText.includes("health") || lowerText.includes("safe")) {
        calculatedMetrics = {
          correlationRatio: "0.12",
          riskLevel: "NOMINAL",
          riskColor: "text-green-400"
        };
      }

      const aiTurn: ChatTurn = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        senderName: "AI_CORE_V4",
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        text: data.text || "AI experienced a localized buffer overflow. Re-initiating connection.",
        metrics: calculatedMetrics
      };

      setTurns(prev => [...prev, aiTurn]);
    } catch (e) {
      setTimeout(() => {
        const fallbackTurn: ChatTurn = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          senderName: "AI_CORE_v4",
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          text: `🔐 **[Backup Simulator Override]** Evaluated query command details: "${text}". Running local offline biometric checks. Safety system nominal.`
        };
        setTurns(prev => [...prev, fallbackTurn]);
      }, 900);
    } finally {
      setIsTyping(false);
    }
  };

  const handleChipClick = (topic: string) => {
    handleSubmitPrompt(topic);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-surface-lowest rounded-xl overflow-hidden glass-panel border border-border-main select-none transition-colors duration-300">
      {/* Scrollable diagnostic log area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth custom-scrollbar no-scrollbar">
        {/* Timeline Header */}
        <div className="flex justify-center select-none">
          <span className="bg-surface-high text-text-muted font-sans text-[10px] font-bold px-3 py-1 rounded-full border border-border-main uppercase tracking-widest">
            Tactical Log: Current Session
          </span>
        </div>

        {/* Turns list */}
        {turns.map((turn) => {
          const isAi = turn.sender === "ai";
          return (
            <div 
              id={`combat_turn_${turn.id}`}
              key={turn.id} 
              className={`flex gap-3 max-w-4xl ${isAi ? "self-start mr-auto" : "self-end ml-auto flex-row-reverse"}`}
            >
              {/* Bot or User Emblem */}
              <div className={`w-10 h-10 border rounded-lg shrink-0 flex items-center justify-center ${
                isAi 
                  ? "glass-panel border-border-main text-text-muted" 
                  : "bg-surface-high text-text-base border-border-main"
              }`}>
                {isAi ? (
                  <Bot className="w-5 h-5 text-text-base animate-pulse" />
                ) : (
                  <Terminal className="w-5 h-5 font-bold" />
                )}
              </div>

              {/* Speech bubble contents */}
              <div className={`flex flex-col gap-1 ${isAi ? "items-start" : "items-end"}`}>
                <div className={`glass-panel p-4 rounded-xl max-w-2xl text-sm leading-relaxed font-sans whitespace-pre-wrap ${
                  isAi ? "rounded-tl-none border-l-2 border-l-indigo-500 bg-surface-low" : "rounded-tr-none bg-surface-high border border-border-main"
                }`}>
                  
                  {/* Markdown styled text representation */}
                  <span className={isAi ? "text-text-base" : "text-text-base font-medium"}>
                    {turn.text}
                  </span>

                  {/* Render simulated dynamic metrics (Correlation & Risk ratios) matching screenshot 4 */}
                  {turn.metrics && (
                    <div className="grid grid-cols-2 gap-3 mt-4 select-none animate-[fadeIn_0.5s_ease-out]">
                      <div className="bg-surface-lowest p-3 rounded-lg border border-border-main">
                        <p className="text-[10px] text-text-muted font-bold font-sans uppercase tracking-wider mb-1">
                          CONVEYOR CORRELATION RATIO
                        </p>
                        <p className="text-3xl font-mono text-text-base font-extrabold font-sans">
                          {turn.metrics.correlationRatio}
                        </p>
                      </div>
                      <div className="bg-surface-lowest p-3 rounded-lg border border-border-main">
                        <p className="text-[10px] text-text-muted font-bold font-sans uppercase tracking-wider mb-1">
                          DECISION RISK LEVEL
                        </p>
                        <p className={`text-3xl font-mono font-black ${turn.metrics.riskColor}`}>
                          {turn.metrics.riskLevel}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
                
                <span className="text-[9px] text-text-muted/40 font-mono uppercase tracking-wider select-none">
                  {turn.timestamp} // {turn.senderName}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3 max-w-[70%] self-start mr-auto">
            <div className="w-10 h-10 shrink-0 border border-border-main rounded-lg bg-surface-high flex items-center justify-center">
              <Bot className="w-5 h-5 animate-spin text-text-base" />
            </div>
            <div className="flex flex-col gap-1 items-start select-none">
              <span className="font-sans text-[10px] font-bold text-text-muted">
                AI_CORE_V4 [SOLVING HAZARD RATIOS...]
              </span>
              <div className="px-4 py-2 bg-surface-low text-text-muted font-mono text-xs italic rounded-lg rounded-tl-none animate-pulse border border-border-main">
                Fetching factory telemetry metrics...
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Suggestion & Text bar */}
      <div className="p-4 border-t border-border-main bg-surface-low shadow-2xl space-y-4">
        {/* Suggestion Chips list in line with screenshot 4 */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          <button 
            id="suggestion_fire"
            onClick={() => handleChipClick("Analyse fire and thermal containment procedures in sector 7-G")}
            className="flex-shrink-0 px-4 py-2 bg-surface-lowest hover:bg-surface-high border border-border-main rounded-full text-xs font-semibold text-text-muted hover:border-border-active transition-colors cursor-pointer"
          >
            Fire protocol?
          </button>
          <button 
            id="suggestion_chem"
            onClick={() => handleChipClick("Analyse potential spill triggers inside Substation 2")}
            className="flex-shrink-0 px-4 py-2 bg-surface-lowest hover:bg-surface-high border border-border-main rounded-full text-xs font-semibold text-text-muted hover:border-border-active transition-colors cursor-pointer"
          >
            Chem spill?
          </button>
          <button 
            id="suggestion_emerg"
            onClick={() => handleChipClick("Execute immediate emergency shutdown command override")}
            className="flex-shrink-0 px-4 py-2 bg-industrial-red/20 border border-industrial-red/40 text-[#D32F2F] rounded-full text-xs font-bold hover:bg-industrial-red hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
          >
            Emergency stop?
          </button>
          <button 
            id="suggestion_report"
            onClick={() => handleChipClick("Compiles overall gesture accuracy diagnostic report")}
            className="flex-shrink-0 px-4 py-2 bg-surface-lowest hover:bg-surface-high border border-border-main rounded-full text-xs font-semibold text-text-muted hover:border-border-active transition-colors cursor-pointer"
          >
            System health report
          </button>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 glass-panel p-1.5 rounded-xl border border-border-main overflow-hidden focus-within:ring-1 focus-within:ring-border-active transition-all bg-surface-lowest">
          <div className="pl-3 select-none">
            <Terminal className={`w-5 h-5 ${isListening ? "text-indigo-400 animate-pulse" : isSyncingDoc ? "text-indigo-500 animate-bounce" : "text-text-muted/80"}`} />
          </div>
          {isListening ? (
            <div className="flex-1 flex items-center gap-3 text-xs font-mono text-indigo-400 select-none py-1 px-1">
              <span className="animate-pulse">🎙️ [LISTENING VOCAL SPECTRUM...]</span>
              <div className="flex gap-1 h-3.5 items-end">
                <span className="w-1 bg-indigo-400 animate-[pulse_0.4s_infinite_100ms] h-full" />
                <span className="w-0.5 bg-indigo-400 animate-[pulse_0.6s_infinite_300ms] h-1/2" />
                <span className="w-1 bg-indigo-400 animate-[pulse_0.5s_infinite_200ms] h-3/4" />
                <span className="w-0.5 bg-indigo-400 animate-[pulse_0.4s_infinite_400ms] h-1/3" />
              </div>
            </div>
          ) : isSyncingDoc ? (
            <div className="flex-1 text-xs font-mono text-indigo-400 select-none py-1 animate-pulse px-1 uppercase tracking-widest">
              ⚡ PARSING SCHEMATICS SNAPS...
            </div>
          ) : (
            <input 
              id="terminal_prompt_input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmitPrompt(inputValue);
                }
              }}
              className="flex-1 bg-transparent border-none focus:outline-none text-text-base text-sm font-mono py-2"
              placeholder="Command input or tactical query..."
            />
          )}

          <div className="flex items-center gap-1 select-none pr-1">
            <button 
              type="button"
              onClick={handleStartListening}
              className={`p-2 rounded-lg transition-colors cursor-pointer text-text-muted ${isListening ? "text-indigo-400 bg-indigo-500/10 animate-pulse" : "hover:bg-surface-high"}`}
              title="Speak voice command override"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={handleUploadDocumentSnapshot}
              className={`p-2 rounded-lg transition-colors cursor-pointer text-text-muted ${isSyncingDoc ? "text-indigo-400 bg-indigo-500/10 animate-bounce" : "hover:bg-surface-high"}`}
              title="Upload thermal schematics"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button 
              id="terminal_send_btn"
              onClick={() => handleSubmitPrompt(inputValue)}
              className="bg-text-base text-surface-lowest p-2.5 rounded-lg flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bottom metrics line (similar to screen 4 footer) */}
        <div className="mt-1 flex justify-between items-center px-1 select-none text-text-muted/40 font-mono text-[9px] uppercase tracking-wider">
          <p className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Secure Channel Encrypted // G-SHIELD AES-256
          </p>
          <p>
            AI Engine Token usage: {tokenCount.toLocaleString()} / 5,000
          </p>
        </div>
      </div>
    </div>
  );
}

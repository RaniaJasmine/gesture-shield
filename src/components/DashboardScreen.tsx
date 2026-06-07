/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Cpu, Wifi, Network, Hand, Flame, Shield, Activity, 
  CheckCircle, AlertCircle, Play, Square, CircleDot, Plus, Trash2, VideoOff, X
} from "lucide-react";
import { Device, Alert, Gesture } from "../types.js";
import { DEFAULT_GESTURES } from "../data.js";

interface DashboardScreenProps {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  alerts: Alert[];
  onTriggerAlert: (alert: Omit<Alert, "id" | "time">) => void;
  onClearAlert: (id: string) => void;
  onClearEmergency?: () => void;
}

export default function DashboardScreen({ 
  devices, 
  setDevices,
  alerts, 
  onTriggerAlert, 
  onClearAlert,
  onClearEmergency
}: DashboardScreenProps) {
  const [selectedGesture, setSelectedGesture] = useState<Gesture>(DEFAULT_GESTURES[1]); // DEFAULT is "HELP"
  const [decoderResult, setDecoderResult] = useState<string>("");
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [isCameraLive, setIsCameraLive] = useState<boolean>(true);
  const [customAlertTitle, setCustomAlertTitle] = useState("");
  const [customAlertLocation, setCustomAlertLocation] = useState("Sector B-Zone 9");
  const [customAlertSeverity, setCustomAlertSeverity] = useState<"critical" | "warning" | "nominal">("warning");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New fully functional states to make every action button & card fully active
  const [aiFrequency, setAiFrequency] = useState<string>("Standard Mode (4.8 Hz)");
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepProgress, setSweepProgress] = useState<number>(0);
  const [showDeviceGridModal, setShowDeviceGridModal] = useState<boolean>(false);
  const [selectedAlertDetails, setSelectedAlertDetails] = useState<Alert | null>(null);
  const [userDismissedDecoder, setUserDismissedDecoder] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMpLoaded, setIsMpLoaded] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastAnalyzedGestureRef = useRef<string>("");
  const lastAnalysisTimeRef = useRef<number>(0);

  // Trigger interactive signal scan sweep
  const triggerSignalSweep = () => {
    if (isSweeping) return;
    setIsSweeping(true);
    setSweepProgress(0);
    
    const interval = setInterval(() => {
      setSweepProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Randomize connection strengths of all active devices in state
          setDevices(currentDevices => 
            currentDevices.map(dev => ({
              ...dev,
              signalStrength: Number((85 + Math.random() * 14.8).toFixed(1)),
              latencyMs: Math.max(2, Math.floor(dev.latencyMs + Math.random() * 6 - 3))
            }))
          );

          setTimeout(() => {
            setIsSweeping(false);
          }, 1200);
          
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  // Cycle between AI core sensory speeds
  const handleCycleAiSpeed = () => {
    const modes = [
      "Standard Mode (4.8 Hz)", 
      "Deep Scan Mode (12 Hz)", 
      "Power Saver (1.5 Hz)", 
      "Overclock (25.0 Hz)"
    ];
    const nextIdx = (modes.indexOf(aiFrequency) + 1) % modes.length;
    setAiFrequency(modes[nextIdx]);
  };

  // Poll for MediaPipe CDNs being ready in window scope
  useEffect(() => {
    const handleCheck = () => {
      if (window.Hands && window.Camera) {
        setIsMpLoaded(true);
      }
    };
    const interval = setInterval(handleCheck, 500);
    handleCheck();
    return () => clearInterval(interval);
  }, []);

  // Decode selected gesture with backend (Groq first, fallback to Gemini, then physical local translation)
  const decodeGesture = async (gesture: Gesture) => {
    setIsDecoding(true);
    setSelectedGesture(gesture);
    setUserDismissedDecoder(false);
    try {
      const response = await fetch("/api/analyze-gesture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gestureName: gesture.name,
          severity: gesture.severity,
          location: "Sector 7 Hallway B"
        }),
      });
      const data = await response.json();
      setDecoderResult(data.text || "");
    } catch (err) {
      console.error("Decoder endpoint error: ", err);
      setDecoderResult(`Local override fallback translation:\n\nTriggered hand gesture "${gesture.name}" is interpreted as code: ${gesture.severity}. Location logged.`);
    } finally {
      setIsDecoding(false);

      // System auto-triggers dynamic incident alert if it's an emergency trigger
      if (gesture.id === "safe") {
        if (onClearEmergency) {
          onClearEmergency();
        }
        onTriggerAlert({
          title: `Biometric Code Cleared: ${gesture.name}`,
          location: "Primary Camera Feed • Sector 7 Hallway B",
          severity: "nominal",
          status: "cleared"
        });
      } else {
        onTriggerAlert({
          title: `Biometric Code Alert: ${gesture.name}`,
          location: "Primary Camera Feed • Sector 7 Hallway B",
          severity: gesture.id === "emergency" ? "critical" : "warning",
          status: "active"
        });
      }
    }
  };

  // Initialize MediaPipe hands track or navigator webcam fallback
  useEffect(() => {
    let cameraInstance: any = null;
    let handsInstance: any = null;
    setCameraError(null);

    if (isCameraLive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          // Permission is GRANTED! Shut down temporary stream before setup
          stream.getTracks().forEach(t => t.stop());

          if (isMpLoaded && videoRef.current) {
            try {
              handsInstance = new window.Hands({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
              });

              handsInstance.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.55,
                minTrackingConfidence: 0.55
              });

              handsInstance.onResults((results: any) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                // Align canvas pixel ratios
                if (videoRef.current) {
                  canvas.width = videoRef.current.videoWidth || 320;
                  canvas.height = videoRef.current.videoHeight || 240;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                  const landmarks = results.multiHandLandmarks[0];

                  // 1. Draw connecting cords (Skeleton strings)
                  ctx.strokeStyle = "#D32F2F";
                  ctx.lineWidth = 2.5;
                  ctx.lineCap = "round";

                  const connections = [
                    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                    [0, 5], [5, 6], [6, 7], [7, 8], // Index
                    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
                    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
                    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
                    [5, 9], [9, 13], [13, 17] // Palmar lines
                  ];

                  connections.forEach(([p1, p2]) => {
                    const pt1 = landmarks[p1];
                    const pt2 = landmarks[p2];
                    ctx.beginPath();
                    ctx.moveTo(pt1.x * canvas.width, pt1.y * canvas.height);
                    ctx.lineTo(pt2.x * canvas.width, pt2.y * canvas.height);
                    ctx.stroke();
                  });

                  // 2. Draw dots on nodes
                  landmarks.forEach((pt: any) => {
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#D32F2F";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                  });

                  // 3. ASL Computer Vision Heuristics
                  const indexOpen = landmarks[8].y < landmarks[6].y;
                  const middleOpen = landmarks[12].y < landmarks[10].y;
                  const ringOpen = landmarks[16].y < landmarks[14].y;
                  const pinkyOpen = landmarks[20].y < landmarks[18].y;
                  
                  const thumbOpen = Math.abs(landmarks[4].x - landmarks[9].x) > 0.16;

                  let detectedId = "";

                  if (indexOpen && middleOpen && ringOpen && pinkyOpen) {
                    detectedId = "stop";
                  } else if (thumbOpen && pinkyOpen && !indexOpen && !middleOpen && !ringOpen) {
                    detectedId = "help";
                  } else if (Math.hypot(landmarks[8].x - landmarks[4].x, landmarks[8].y - landmarks[4].y) < 0.08 && middleOpen && ringOpen && pinkyOpen) {
                    detectedId = "fire";
                  } else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
                    detectedId = "safe";
                  } else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
                    detectedId = "emergency";
                  }

                  if (detectedId && detectedId !== lastAnalyzedGestureRef.current) {
                    const now = Date.now();
                    if (now - lastAnalysisTimeRef.current > 2200) {
                      lastAnalyzedGestureRef.current = detectedId;
                      lastAnalysisTimeRef.current = now;
                      const targetGest = DEFAULT_GESTURES.find(g => g.id === detectedId);
                      if (targetGest) {
                        decodeGesture(targetGest);
                      }
                    }
                  }
                }
              });

              cameraInstance = new window.Camera(videoRef.current, {
                onFrame: async () => {
                  if (videoRef.current && handsInstance) {
                    await handsInstance.send({ image: videoRef.current });
                  }
                },
                width: 320,
                height: 240
              });

              cameraInstance.start();
            } catch (err: any) {
              console.error("MediaPipe initialization error: ", err);
              setCameraError(`init_error: ${err.message || err}`);
            }
          } else {
            // Direct browser web session fallback (no landmarks)
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
              .then(liveStream => {
                streamRef.current = liveStream;
                if (videoRef.current) {
                  videoRef.current.srcObject = liveStream;
                }
              })
              .catch(e => {
                setCameraError("webcam_permission_denied");
              });
          }
        })
        .catch(err => {
          console.warn("Failed to acquire camera: ", err);
          if (err.name === "NotAllowedError" || err.message?.includes("Permission") || err.name === "PermissionDeniedError") {
            setCameraError("webcam_permission_denied");
          } else {
            setCameraError(`hardware_error: ${err.message || "No camera device detected"}`);
          }
        });
    }

    return () => {
      if (cameraInstance) {
        try { cameraInstance.stop(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraLive, isMpLoaded]);


  // Run initial decode on help
  useEffect(() => {
    decodeGesture(DEFAULT_GESTURES[1]);
  }, []);

  const handleAddNewAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAlertTitle.trim()) return;
    onTriggerAlert({
      title: customAlertTitle,
      location: customAlertLocation,
      severity: customAlertSeverity,
      status: "active"
    });
    setCustomAlertTitle("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Welcome header in line with screenshot 2 */}
      <section className="flex flex-col gap-1 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-3xl font-bold font-sans tracking-tight text-text-base">Welcome back, Operator</h2>
          <p className="text-text-muted text-sm font-sans">
            Environment scanning active. No immediate physical threats in Sector 1.
          </p>
        </div>
        <button 
          id="trigger_modal_btn"
          onClick={() => setShowAddModal(true)}
          className="self-start md:self-auto flex items-center gap-2 bg-industrial-red hover:bg-[#b02727] text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          TRIGGER ALERT PROTOCOL
        </button>
      </section>

      {/* Main Status Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: AI Engine Online */}
        <div 
          onClick={handleCycleAiSpeed}
          className="glass-panel p-5 rounded-xl flex items-center justify-between border-l-4 border-green-500 bg-surface-low hover:bg-surface-high transition-all duration-300 cursor-pointer active:scale-[0.98] select-none"
          title="Cycle AI Sensory Sample Speed"
        >
          <div className="space-y-1">
            <p className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">AI Neural Engine (Click to Cycle)</p>
            <h3 className="text-xl font-bold font-sans text-text-base">System Online</h3>
            <p className="text-[9px] font-mono text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-0.5 mt-1.5 rounded border border-green-500/20 inline-block font-bold">{aiFrequency}</p>
          </div>
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
        </div>

        {/* Card 2: Signal Strength */}
        <div 
          onClick={triggerSignalSweep}
          className={`glass-panel p-5 rounded-xl flex items-center justify-between border-l-4 border-indigo-500 bg-surface-low hover:bg-surface-high transition-all duration-300 cursor-pointer active:scale-[0.98] select-none ${isSweeping ? "animate-pulse border-b border-indigo-500" : ""}`}
          title="Trigger Live Signal Diagnostics Sweep"
        >
          <div className="space-y-1">
            <p className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Signal Strength (Click to Scan)</p>
            {isSweeping ? (
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold font-mono text-indigo-400">SWEEPING: {sweepProgress}%</h3>
                <div className="w-24 bg-surface-lowest h-1 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${sweepProgress}%` }} />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold font-sans text-text-base">{(devices.reduce((acc, dev) => acc + dev.signalStrength, 0) / devices.length).toFixed(1)}%</h3>
                <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">Grid link stable</span>
              </div>
            )}
          </div>
          <Wifi className={`w-8 h-8 text-text-muted shrink-0 transition-all ${isSweeping ? "text-indigo-500 animate-bounce" : "group-hover:text-indigo-400"}`} />
        </div>

        {/* Card 3: Active Devices */}
        <div 
          onClick={() => setShowDeviceGridModal(true)}
          className="glass-panel p-5 rounded-xl flex items-center justify-between border-l-4 border-orange-500 bg-surface-low hover:bg-surface-high transition-all duration-300 cursor-pointer active:scale-[0.98] select-none"
          title="Open Grid Device Configurator Drawer"
        >
          <div className="space-y-1">
            <p className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Active Devices (Click to Manage)</p>
            <h3 className="text-xl font-bold font-sans text-text-base">{devices.length} Units</h3>
            <p className="text-[9px] font-mono text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 mt-1.5 rounded border border-orange-500/20 inline-block font-bold">Config Matrix</p>
          </div>
          <Network className="w-8 h-8 text-text-muted opacity-80 shrink-0 hover:text-orange-500 transition-colors" />
        </div>
      </div>

      {/* Gesture Quick Guide & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Aspect: Quick Guide & Scanner Feed */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="space-y-3">
            <h3 className="font-sans text-[11px] font-bold tracking-widest text-[#bcc7da] uppercase select-none">
              GESTURE QUICK GUIDE
            </h3>
            
            {/* Horizontal Grid of Interactive Gestures */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {DEFAULT_GESTURES.map((gest) => {
                const isSelected = selectedGesture.id === gest.id;
                return (
                  <button
                    id={`gesture_btn_${gest.id}`}
                    key={gest.id}
                    onClick={() => decodeGesture(gest)}
                    className={`glass-panel p-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 group active:scale-95 ${
                      isSelected 
                        ? "border-industrial-red bg-industrial-red/10 scale-[1.02]" 
                        : "hover:border-border-active hover:bg-surface-high"
                    }`}
                  >
                    {gest.id === "stop" && <Hand className="w-8 h-8 text-industrial-red group-hover:scale-110 transition-transform" />}
                    {gest.id === "help" && <CircleDot className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />}
                    {gest.id === "fire" && <Flame className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />}
                    {gest.id === "emergency" && <Activity className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" />}
                    {gest.id === "safe" && <CheckCircle className="w-8 h-8 text-[#4CAF50] group-hover:scale-110 transition-transform" />}
                    
                    <span className="font-sans text-[10px] font-bold text-text-base tracking-wider uppercase">
                      {gest.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Integrated Multi-Sensor Bento Row (Radar map & Live Biometric Webcam Feed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Aspect Left: AI Computer Vision Diagnosis */}
            <div className="flex flex-col space-y-2">
              <h4 className="font-sans text-[11px] font-black tracking-widest text-text-muted uppercase select-none">
                AI COMPUTER VISION DIAGNOSIS
              </h4>
              <div className="relative overflow-hidden glass-panel rounded-xl flex-1 p-5 border border-border-main bg-surface-low select-none flex flex-col justify-between min-h-[288px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-border-main">
                    <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <div>
                      <h5 className="text-[11px] text-white font-black leading-normal uppercase">MEDIAPIPE TRACKING ACTIVE</h5>
                      <p className="text-[9px] text-text-muted font-sans uppercase">Coordinate Lock: 21 Landmarks Spatial Track</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-text-muted font-sans">
                    <div className="flex justify-between items-center text-[11px] py-0.5">
                      <span>Spatial Coordinate Thread:</span>
                      <strong className="text-white font-mono uppercase bg-surface-lowest px-1.5 py-0.5 rounded border border-border-main">Worker Thread #1</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-0.5">
                      <span>FPS Jitter Rate:</span>
                      <strong className="text-emerald-400 font-mono">0.05 ms (STABLE)</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-0.5">
                      <span>Detection Confidence Level:</span>
                      <strong className="text-white font-mono">55.0% Minimum</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-0.5">
                      <span>Dynamic Matrix Skeleton Track:</span>
                      <strong className="text-indigo-400 font-mono">ACTIVE (FP32 precision)</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-border-main flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="flex items-center gap-1.5 text-indigo-400 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    LOCAL_INTELLIGENCE_OK
                  </span>
                  <span>VERSION 4.8.1-BETA</span>
                </div>
              </div>
            </div>

            {/* Aspect Right: Live Biometric Camera Display */}
            <div className="flex flex-col space-y-2">
              <h4 className="font-sans text-[11px] font-black tracking-widest text-text-muted uppercase select-none flex items-center justify-between">
                <span>GESTURE CAMERA TERMINAL (D-1)</span>
                {isCameraLive && (
                  <span className="inline-flex items-center gap-1 bg-industrial-red/10 border border-industrial-red/30 text-industrial-red text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest animate-pulse selection:bg-transparent">
                    <span className="w-1.5 h-1.5 rounded-full bg-industrial-red" />
                    LIVE PIPELINE
                  </span>
                )}
              </h4>
              
              <div 
                id="camera_feed_panel"
                className="relative overflow-hidden glass-panel rounded-xl h-72 w-full flex flex-col border border-border-main bg-surface-low select-none transition-all duration-300"
              >
                {/* Banner overlay with state indicator */}
                <div className="absolute top-3 left-3 z-15 flex items-center gap-2 select-none shadow">
                  {isCameraLive ? (
                    <span className="text-[9px] font-black tracking-wider text-white bg-black/75 px-2 py-0.5 rounded border border-white/10 uppercase">
                      OP_CAM_STREAM
                    </span>
                  ) : (
                    <span className="text-[9px] font-black tracking-wider text-text-muted bg-black/75 px-2 py-0.5 rounded border border-white/5 uppercase">
                      STREAM OFFLINE
                    </span>
                  )}
                </div>

                {/* Video elements canvas viewports */}
                {isCameraLive ? (
                  cameraError ? (
                    <div className="w-full flex-1 bg-[#180d0d] flex flex-col items-center justify-center text-center p-4 select-text border-t border-border-main/50">
                      <AlertCircle className="w-8 h-8 mb-2 text-industrial-red animate-pulse" />
                      <span className="font-mono text-[10px] uppercase font-black text-industrial-red tracking-widest">
                        Webcam Allocation Blocked
                      </span>
                      <p className="text-[10px] text-text-muted/90 max-w-xs mt-2 leading-relaxed font-sans">
                        {cameraError === "webcam_permission_denied"
                          ? "Iframe sandbox protocols restrict camera stream requests. Click below to safely open the full dashboard in a new browser tab to activate physical ASL skeleton tracking!"
                          : `Interface Error: ${cameraError}`}
                      </p>
                      
                      <button
                        onClick={() => window.open(window.location.href, "_blank")}
                        className="mt-3.5 bg-industrial-red hover:bg-[#b02727] text-white text-[9px] font-bold tracking-widest px-3 py-1.5 rounded uppercase font-sans transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
                      >
                        Bypass & Open in New Tab ↗
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full flex-1 bg-black overflow-hidden flex items-center justify-center">
                      <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline 
                        muted
                        className="w-full h-full object-cover grayscale opacity-90 transition-opacity" 
                        style={{ transform: "scaleX(-1)" }} // Mirror effect for natural gesture interaction
                      />
                      <canvas 
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        style={{ transform: "scaleX(-1)" }} // Match mirror scale on coordinate projections
                      />

                      {/* Metadata specs */}
                      <div className="absolute bottom-3 left-3 z-10 bg-black/85 backdrop-blur border border-white/10 px-2 py-1.5 rounded text-[8px] font-mono text-text-muted shadow space-y-0.5">
                        <p className="font-bold text-white uppercase tracking-wider text-[9px]">Skeletal Lock</p>
                        <p>Pipeline: {isMpLoaded ? "MediaPipe Hands V1" : "Browser Web Session"}</p>
                        <p>Sensing Rate: ~4.8 Hz</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-full flex-1 bg-surface-lowest flex flex-col items-center justify-center text-text-muted/40 select-none px-4 text-center">
                    <VideoOff className="w-10 h-10 mb-2 truncate stroke-[1.5]" />
                    <span className="font-mono text-[10px] uppercase font-black text-text-muted tracking-wider">Operational Pipeline Offline</span>
                    <p className="text-[10px] text-text-muted/60 max-w-xs mt-1 font-sans leading-relaxed">
                      Enable system hardware camera locks below to activate the real-time ASL sign gesture tracker.
                    </p>
                  </div>
                )}

                {/* Bottom interactive action bar */}
                <div className="bg-surface-high border-t border-border-main p-3 flex justify-between items-center text-[10px] font-mono shrink-0">
                  <span className="text-text-muted uppercase text-[9px] font-bold">
                    {isCameraLive ? "Biometric Tracking Active" : "Operational Standby"}
                  </span>
                  <button
                    id="camera_toggle_btn"
                    onClick={() => setIsCameraLive(!isCameraLive)}
                    className="bg-industrial-red hover:bg-[#b02727] text-white font-bold text-[9px] tracking-wider py-1.5 px-3 rounded uppercase flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow"
                  >
                    {isCameraLive ? "Suspend Camera" : "Initiate Webcam"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Aspect: Recent Alerts list (col-4) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h3 className="font-sans text-[11px] font-bold tracking-widest text-text-muted uppercase select-none">
            RECENT ALERTS ({alerts.filter(a => a.status === "active").length})
          </h3>
          
          <div className="glass-panel rounded-xl overflow-hidden divide-y divide-border-main max-h-[340px] overflow-y-auto no-scrollbar">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-text-muted font-sans text-sm italic">
                All physical systems nominal. No alerts active.
              </div>
            ) : (
              alerts.map((al) => {
                const isCritical = al.severity === "critical";
                const isWarning = al.severity === "warning";
                
                return (
                  <div 
                    id={`alert_row_${al.id}`}
                    key={al.id} 
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).parentElement?.tagName !== "BUTTON") {
                        setSelectedAlertDetails(al);
                      }
                    }}
                    className="p-4 flex items-center justify-between hover:bg-surface-high transition-all duration-200 group cursor-pointer border-l-2 border-transparent hover:border-l-industrial-red"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 shrink-0 ${
                        isCritical ? "text-industrial-red animate-pulse" : isWarning ? "text-orange-500" : "text-green-500"
                      }`} />
                      <div>
                        <p className={`text-sm font-bold font-sans ${
                          al.status === "cleared" ? "text-text-muted/40 line-through" : "text-text-base"
                        }`}>
                          {al.title}
                        </p>
                        <p className="text-[10px] text-text-muted font-sans">
                          {al.location} {al.status === "cleared" && "• CLEAR"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-text-muted select-none">
                        {al.time}
                      </span>
                      {al.status === "active" ? (
                        <button 
                          onClick={() => onClearAlert(al.id)}
                          className="font-sans text-[10px] font-bold text-industrial-red hover:underline p-1 cursor-pointer"
                        >
                          RESOLVE
                        </button>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500/40" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Floating Overlays */}


      {/* 2. Neural Decoder (Bottom Right) */}
      {!userDismissedDecoder && alerts.filter(a => a.status === "active").length > 0 && (
        <div 
          id="neural_decoder_panel"
          className="fixed bottom-24 md:bottom-6 right-6 z-30 w-80 glass-panel rounded-xl p-4 border border-border-main shadow-2xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-3 select-none">
            <div className="flex items-center gap-2">
              <Cpu className="text-text-muted w-5 h-5 animate-pulse" />
              <span className="font-sans text-[10px] font-black tracking-widest text-text-base uppercase">
                NEURAL DECODER PROTOCOL
              </span>
            </div>
            <button 
              onClick={() => setUserDismissedDecoder(true)}
              className="text-text-muted hover:text-white p-1 rounded cursor-pointer"
              title="Dismiss Decoder Display"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-surface-lowest p-3 rounded-lg border border-border-main">
              <p className="text-[10px] font-mono text-text-muted mb-1">ASL Detected Symbol:</p>
              <h4 className="text-xl font-extrabold text-industrial-red tracking-wider uppercase animate-pulse">
                {selectedGesture.name}
              </h4>
            </div>

            <div className="bg-surface-low p-3 rounded-lg border border-border-main max-h-[120px] overflow-y-auto no-scrollbar">
              {isDecoding ? (
                <div className="flex items-center gap-2 text-xs text-text-base">
                  <div className="w-2.5 h-2.5 border-2 border-industrial-red border-t-transparent rounded-full animate-spin" />
                  <span>DECODING SIGN SEQUENCE...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-text-muted">Decoded Action translation:</p>
                  <div className="text-xs text-text-base leading-relaxed font-sans whitespace-pre-wrap">
                    {decoderResult || selectedGesture.translation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Trigger Alert Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-xl space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <h3 className="font-sans text-lg font-extrabold text-text-base uppercase tracking-tight">
              PROPAGATE ALERT PROTOCOL
            </h3>

            <form onSubmit={handleAddNewAlertSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Hazard Code / Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Conveyor Belt Friction Hazard"
                  value={customAlertTitle}
                  onChange={(e) => setCustomAlertTitle(e.target.value)}
                  className="w-full bg-surface-low border border-border-main rounded p-2.5 text-xs text-text-base focus:outline-none focus:ring-1 focus:ring-industrial-red"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Plant Location</label>
                <input 
                  type="text"
                  required
                  value={customAlertLocation}
                  onChange={(e) => setCustomAlertLocation(e.target.value)}
                  className="w-full bg-surface-low border border-border-main rounded p-2.5 text-xs text-text-base focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Severity Protocol</label>
                <select 
                  value={customAlertSeverity}
                  onChange={(e) => setCustomAlertSeverity(e.target.value as any)}
                  className="w-full bg-surface-low border border-border-main rounded p-2.5 text-xs focus:outline-none text-text-base block"
                >
                  <option value="warning" className="bg-surface-lowest text-orange-500">WARNING (Elevated Risk)</option>
                  <option value="critical" className="bg-surface-lowest text-red-500">CRITICAL (Stop System)</option>
                  <option value="nominal" className="bg-surface-lowest text-green-500">NOMINAL (General Audit)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border-main text-text-muted rounded text-xs hover:bg-surface-high transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-industrial-red hover:bg-[#b02727] text-white font-bold rounded text-xs transition-colors cursor-pointer"
                >
                  BROADCAST
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Grid Device Configurator Modal */}
      {showDeviceGridModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel p-6 rounded-xl space-y-4 animate-[fadeIn_0.2s_ease-out] bg-surface-low border border-border-main">
            <div className="flex justify-between items-center pb-2 border-b border-border-main">
              <h3 className="font-sans text-lg font-extrabold text-white uppercase tracking-tight">
                🎛️ SYSTEM HARDWARE RECEPTACLE MATRIX
              </h3>
              <button 
                onClick={() => setShowDeviceGridModal(false)}
                className="text-text-muted hover:text-white font-mono text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>
            
            <p className="text-[11px] text-text-muted font-sans leading-relaxed">
              Below is the active listing of physical transceivers and responder badges in the coordinate grid. Toggle powers, shutter lenses, or mock hazard conditions instantly.
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar text-xs">
              {devices.map((dev) => (
                <div 
                  key={dev.id} 
                  className="bg-surface-lowest border border-border-main p-3.5 rounded-lg flex items-center justify-between gap-3 text-white font-mono"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase tracking-wider text-xs truncate">{dev.name}</span>
                      <span className="text-[9px] text-text-muted bg-surface-low border border-border-main px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">{dev.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted font-sans pt-1">
                      <span>Signal: <strong className="text-white">{dev.signalStrength}%</strong></span>
                      <span>Latency: <strong className="text-white">{dev.latencyMs}ms</strong></span>
                      <span>Status: <strong className={dev.status === "ALERT" ? "text-industrial-red animate-pulse" : dev.status === "OFFLINE" ? "text-text-muted" : "text-green-500"}>{dev.status}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle Alert */}
                    <button
                      onClick={() => {
                        setDevices(prev => prev.map(d => {
                          if (d.id === dev.id) {
                            const newStatus = d.status === "ALERT" ? "ONLINE" : "ALERT";
                            return { ...d, status: newStatus };
                          }
                          return d;
                        }));
                      }}
                      className={`px-2 py-1 text-[9px] rounded font-bold uppercase transition-all border cursor-pointer ${
                        dev.status === "ALERT" 
                          ? "bg-industrial-red/20 border-industrial-red text-industrial-red" 
                          : "border-border-main hover:bg-surface-high text-orange-400"
                      }`}
                      title="Toggle Incident Alarm on Device"
                    >
                      MOCK HAZARD
                    </button>

                    {/* Toggle Shutter Online / Offline */}
                    <button
                      onClick={() => {
                        setDevices(prev => prev.map(d => {
                          if (d.id === dev.id) {
                            const newStatus = d.status === "OFFLINE" ? "ONLINE" : "OFFLINE";
                            return { ...d, status: newStatus };
                          }
                          return d;
                        }));
                      }}
                      className={`px-2 py-1 text-[9px] rounded font-bold uppercase transition-all border cursor-pointer ${
                        dev.status === "OFFLINE" 
                          ? "bg-stone-500/20 border-stone-500 text-stone-500" 
                          : "border-border-main hover:bg-surface-high text-white"
                      }`}
                      title="Shut off power / stream connection"
                    >
                      {dev.status === "OFFLINE" ? "BOOT" : "SHUTTER"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border-main">
              <button 
                type="button" 
                onClick={() => setShowDeviceGridModal(false)}
                className="px-4 py-2 bg-industrial-red hover:bg-[#b02727] text-white text-xs font-bold rounded transition-colors cursor-pointer uppercase"
              >
                APPLY PIPELINE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Holographic Threat Dispatcher Modal */}
      {selectedAlertDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-xl space-y-4 animate-[fadeIn_0.2s_ease-out] bg-surface-low border border-border-main text-white">
            <div className="flex justify-between items-center pb-2 border-b border-border-main select-none">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${selectedAlertDetails.severity === "critical" ? "text-industrial-red animate-pulse" : "text-orange-500"}`} />
                <h3 className="font-sans text-lg font-extrabold uppercase tracking-tight">
                  TOW-CORE SECURITY DISPATCH
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAlertDetails(null)}
                className="text-text-muted hover:text-white font-mono text-xs cursor-pointer"
              >
                [DISMISS]
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-surface-lowest p-4 rounded-lg border border-border-main space-y-1 select-none">
                <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Hazard Description:</p>
                <h4 className="text-base font-extrabold leading-tight text-white">{selectedAlertDetails.title}</h4>
                <div className="flex items-center gap-4 text-[10px] text-text-muted pt-1.5 font-mono">
                  <span>Location: <strong className="text-white">{selectedAlertDetails.location}</strong></span>
                  <span>Registered: <strong className="text-white">{selectedAlertDetails.time}</strong></span>
                  <span>Incident ID: <strong className="text-white uppercase">{selectedAlertDetails.id}</strong></span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-[#4FC3F7] uppercase tracking-wider block font-bold select-none">Recommended AI Checklists & Safety Protocol Action Items</p>
                <div className="p-3 bg-surface-high border border-[#4FC3F7]/20 rounded-lg space-y-2 select-none text-text-base">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" defaultChecked className="mt-0.5 accent-industrial-red cursor-pointer" />
                    <span>Halt manufacturing cells in immediate vicinity (Sector Local Grid).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5 accent-industrial-red cursor-pointer" />
                    <span>Acknowledge employee biometric wrist status readings.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5 accent-industrial-red cursor-pointer" />
                    <span>Deploy drone unit coordinates feed for thermal video overlay.</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border-main">
                <button 
                  type="button"
                  onClick={() => setSelectedAlertDetails(null)}
                  className="px-4 py-2 border border-border-main text-text-muted rounded hover:bg-surface-high transition-colors cursor-pointer text-xs"
                >
                  CLOSE DIALOG
                </button>
                {selectedAlertDetails.status === "active" && (
                  <button 
                    type="button"
                    onClick={() => {
                      onClearAlert(selectedAlertDetails.id);
                      setSelectedAlertDetails(null);
                    }}
                    className="px-4 py-2 bg-industrial-red hover:bg-[#b02727] text-white font-bold rounded transition-colors cursor-pointer text-xs uppercase"
                  >
                    RESOLVE INCIDENT SECURE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

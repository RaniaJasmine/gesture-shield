/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Operator {
  email: string;
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  sessionToken?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  avatarUrl?: string;
  timestamp: string; // HH:MM format
  text: string;
  role: "operator" | "ai" | "device";
  imageUrl?: string;
}

export interface Device {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "ALERT";
  latitude: number;
  longitude: number;
  type: "precision_manufacturing" | "robot_2" | "shield" | "airplanemode_active" | "smart_toy";
  signalStrength: number;
  latencyMs: number;
}

export interface Alert {
  id: string;
  title: string;
  location: string;
  time: string;
  severity: "critical" | "warning" | "nominal";
  status: "active" | "cleared";
}

export interface Gesture {
  id: string;
  name: string;
  icon: string; // Lucide icon identifier
  description: string;
  translation: string;
  severity: "ELEVATED" | "CRITICAL" | "NOMINAL";
}

export interface WifiLink {
  id: string;
  sourceId: string;
  targetId: string;
  frequency: "2.4 GHz" | "5.0 GHz" | "6.0 GHz";
  status: "ESTABLISHED" | "ROUTING" | "DEGRADED";
  signalStrength: number;
  bandwidthMbps: number;
}

export type ActiveScreen = "dashboard" | "video" | "chat" | "ai" | "settings";

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    google: any;
  }
}


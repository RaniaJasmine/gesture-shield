/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Device, Alert, Gesture, Message } from "./types.js";

export const DEFAULT_DEVICES: Device[] = [
  {
    id: "D-1",
    name: "Device D-1 (Primary)",
    status: "ONLINE",
    latitude: 34.0522,
    longitude: -118.2437,
    type: "precision_manufacturing",
    signalStrength: 98.4,
    latencyMs: 24,
  },
  {
    id: "D-2",
    name: "D-2 Assembly-B",
    status: "ONLINE",
    latitude: 34.0531,
    longitude: -118.242,
    type: "precision_manufacturing",
    signalStrength: 94.1,
    latencyMs: 28,
  },
  {
    id: "D-3",
    name: "D-3 Heavy Grader",
    status: "ONLINE",
    latitude: 51.5074,
    longitude: -0.1278,
    type: "robot_2",
    signalStrength: 91.5,
    latencyMs: 32,
  },
  {
    id: "UNIT_ALPHA_01",
    name: "Alpha Responder Squad",
    status: "ONLINE",
    latitude: 34.0505,
    longitude: -118.245,
    type: "shield",
    signalStrength: 99.1,
    latencyMs: 14,
  },
  {
    id: "UNIT_BRAVO_04",
    name: "Bravo Patrol Unit",
    status: "ALERT",
    latitude: 34.0581,
    longitude: -118.249,
    type: "shield",
    signalStrength: 87.2,
    latencyMs: 42,
  },
  {
    id: "DRONE_SENTRY_08",
    name: "Sentry Drone-08",
    status: "ONLINE",
    latitude: 34.051,
    longitude: -118.248,
    type: "airplanemode_active",
    signalStrength: 95.8,
    latencyMs: 18,
  },
  {
    id: "CORE_LOGIC_HUB",
    name: "Core Logic AI Engine",
    status: "ONLINE",
    latitude: 34.0515,
    longitude: -118.243,
    type: "smart_toy",
    signalStrength: 100,
    latencyMs: 2,
  }
];

export const DEFAULT_ALERTS: Alert[] = [
  {
    id: "alert-1",
    title: "Help Gesture Detected",
    location: "Sector 4 • Hallway B",
    time: "14:02:45",
    severity: "warning",
    status: "active",
  },
  {
    id: "alert-2",
    title: "System Check Complete",
    location: "Device D-12 • Online",
    time: "13:50:12",
    severity: "nominal",
    status: "cleared",
  },
  {
    id: "alert-3",
    title: "Power Substation Drop",
    location: "Substation 2 • Critical",
    time: "13:12:05",
    severity: "critical",
    status: "active",
  },
  {
    id: "alert-4",
    title: "Manual Secure Override",
    location: "Gate Alpha • Locked",
    time: "12:45:33",
    severity: "nominal",
    status: "cleared",
  }
];

export const DEFAULT_GESTURES: Gesture[] = [
  {
    id: "stop",
    name: "STOP",
    icon: "Hand",
    description: "Full hand flat screen gesture",
    translation: "Immediate halting sequence. Stop order propagated to all programmable logic controllers.",
    severity: "CRITICAL"
  },
  {
    id: "help",
    name: "HELP",
    icon: "CircleDot",
    description: "Two fists overlapping gesture",
    translation: "Emergency dispatch. Requesting operators block conveyor and deploy human assets.",
    severity: "ELEVATED"
  },
  {
    id: "fire",
    name: "FIRE",
    icon: "Flame",
    description: "Flaring fingers sweeping gesture",
    translation: "Thermal hazard identified in loading bay, routing suppression and emergency logs.",
    severity: "CRITICAL"
  },
  {
    id: "emergency",
    name: "EMERGENCY",
    icon: "Activity",
    description: "Crossed forearms gesture",
    translation: "Local environment perimeter breach. Initiating exit lock sequences.",
    severity: "CRITICAL"
  },
  {
    id: "safe",
    name: "SAFE",
    icon: "CheckCircle",
    description: "Thumbs-up biometric check",
    translation: "Diagnostic nominal status validated. Overwriting previous safety notifications.",
    severity: "NOMINAL"
  }
];

export const DEFAULT_MESSAGES: Message[] = [
  {
    id: "msg-1",
    senderId: "UNIT_BRAVO_04",
    senderName: "UNIT_BRAVO_04",
    timestamp: "14:05",
    text: "Perimeter breach detected in Sector 7-G. Anomaly in visual feed recognized as non-organic motion signature. Initiating tactical scan.",
    role: "device"
  },
  {
    id: "msg-2",
    senderId: "operator",
    senderName: "LEAD_OPERATOR",
    timestamp: "14:06",
    text: "Confirmed. Unit Bravo-04, hold position. Deploying AI Assistant drone for thermal confirmation. Maintain radio silence.",
    role: "operator"
  },
  {
    id: "msg-3",
    senderId: "SHIELD_AI",
    senderName: "SHIELD_AI",
    timestamp: "14:06",
    text: "Thermal confirmation positive. Subject identified: Class-02 Intruders. Location locked at coordinates: 40.7128 N, 74.0060 W.",
    role: "ai",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAE_bT_xe_0VVkKb-bhsSW1-jhlFGZTPybTu6Jfu43ctmA1STRngR0mH0H1_KF8o-7rp-D9JMT5LwS-3RItmhxEZFMvLfhHjXmanYgNz7juZiwHlbrgYIcSYAAnG4lj2ni_VZqmHujqolSc5OmP4OPV5nY9BbD90pcuQ4JCuCXnqG0zpTDKOA4Fn_0wACMgN8F913SPjARySZFUbLyML__N3ePGw2jYZBtUm9Atle9JdCzmaimh3NC19FOFJvryenFuGhq4BSAyvj_A"
  },
  {
    id: "msg-4",
    senderId: "operator",
    senderName: "LEAD_OPERATOR",
    timestamp: "14:07",
    text: "Alert sent to local response team. Shield AI, initiate lockdown of external exits in Sector 7-G immediately.",
    role: "operator"
  }
];

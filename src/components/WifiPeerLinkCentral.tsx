/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Link2, Radio, X, Loader2, ArrowRightLeft, ShieldCheck, Cpu } from "lucide-react";
import type { Device, WifiLink } from "../types.js";

interface WifiPeerLinkCentralProps {
  devices: Device[];
  onWifiLinkCreated?: (link: WifiLink) => void;
  onWifiLinkRemoved?: (linkId: string) => void;
  wifiLinks: WifiLink[];
  setWifiLinks: React.Dispatch<React.SetStateAction<WifiLink[]>>;
}

export default function WifiPeerLinkCentral({
  devices,
  wifiLinks,
  setWifiLinks,
  onWifiLinkCreated,
  onWifiLinkRemoved,
}: WifiPeerLinkCentralProps) {
  const [sourceId, setSourceId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [frequency, setFrequency] = useState<"2.4 GHz" | "5.0 GHz" | "6.0 GHz">("5.0 GHz");
  const [isLinking, setIsLinking] = useState(false);

  // Filter out offline devices or use all devices
  const activeDevices = devices.filter(d => d.status !== "OFFLINE");

  const handleEstablishLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) {
      alert("⚠️ Error: Source and Target device cannot be the same physical node.");
      return;
    }

    // Check if link already exists
    const linkExists = wifiLinks.some(
      (l) =>
        (l.sourceId === sourceId && l.targetId === targetId) ||
        (l.sourceId === targetId && l.targetId === sourceId)
    );

    if (linkExists) {
      alert("🛜 Notice: Active peer-to-peer Wi-Fi connection already exists between these two assets.");
      return;
    }

    setIsLinking(true);

    setTimeout(() => {
      const srcDevice = devices.find((d) => d.id === sourceId);
      const tgtDevice = devices.find((d) => d.id === targetId);
      
      const newLink: WifiLink = {
        id: `WIFI_LINK_${Math.floor(1000 + Math.random() * 9000)}`,
        sourceId,
        targetId,
        frequency,
        status: "ESTABLISHED",
        signalStrength: Math.floor(82 + Math.random() * 18),
        bandwidthMbps: frequency === "2.4 GHz" ? 300 : frequency === "5.0 GHz" ? 866 : 1201,
      };

      setWifiLinks((prev) => [...prev, newLink]);
      
      if (onWifiLinkCreated) {
        onWifiLinkCreated(newLink);
      }

      setIsLinking(false);
      setSourceId("");
      setTargetId("");
    }, 1200);
  };

  const handleBreakLink = (linkId: string) => {
    setWifiLinks((prev) => prev.filter((l) => l.id !== linkId));
    if (onWifiLinkRemoved) {
      onWifiLinkRemoved(linkId);
    }
  };

  return (
    <div className="relative overflow-hidden glass-panel rounded-xl flex flex-col border border-border-main bg-surface-low select-none transition-all duration-300 min-h-[360px]">
      <div className="p-4 border-b border-border-main bg-surface-high flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-industrial-red animate-pulse" />
          <h4 className="text-[10px] uppercase font-black tracking-widest text-text-muted">
            WIFI PEER-TO-PEER CONSOLE
          </h4>
        </div>
        <span className="text-[9px] font-mono text-[#4FC3F7] uppercase tracking-wider font-bold">
          {wifiLinks.length} Links Active
        </span>
      </div>

      <div className="p-4 pt-3 flex-1 flex flex-col lg:flex-row gap-4">
        {/* Establish Link Section */}
        <form onSubmit={handleEstablishLink} className="flex-1 space-y-3.5">
          <p className="text-[11px] text-text-muted leading-relaxed font-sans">
            Bridge physical transceivers by routing a direct Wi-Fi mesh tunnel. Select any two online hardware nodes to synchronize signals.
          </p>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] uppercase font-bold text-text-muted block mb-1">Source Node</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-surface-lowest border border-border-main p-2 rounded text-text-base text-xs focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- select node --</option>
                  {activeDevices.map((d) => (
                    <option key={d.id} value={d.id} className="bg-surface-lowest text-text-base">
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-text-muted block mb-1">Target Node</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-surface-lowest border border-border-main p-2 rounded text-text-base text-xs focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- select node --</option>
                  {activeDevices.map((d) => (
                    <option key={d.id} value={d.id} className="bg-surface-lowest text-text-base">
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold text-text-muted block mb-1">Wi-Fi Frequency Band</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["2.4 GHz", "5.0 GHz", "6.0 GHz"] as const).map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setFrequency(band)}
                    className={`p-2 text-[10px] font-mono rounded border uppercase font-bold transition-all text-center cursor-pointer ${
                      frequency === band
                        ? "bg-industrial-red/10 border-industrial-red text-white"
                        : "border-border-main hover:bg-surface-high text-text-muted"
                    }`}
                  >
                    {band}
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-sans text-text-muted/60 mt-1 leading-normal">
                {frequency === "2.4 GHz" && "⚡ Long range routing & deep sensory penetration, speed limit 300 Mbps"}
                {frequency === "5.0 GHz" && "⚡ High bandwidth & balanced interference suppression, limit 866 Mbps"}
                {frequency === "6.0 GHz" && "⚡ Ultra-Fast next-gen channel. Clear spectrum line of sight, limit 1201 Mbps"}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLinking || !sourceId || !targetId || sourceId === targetId}
            className={`w-full py-2.5 font-bold text-[10px] uppercase font-sans tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-all text-white border ${
              isLinking
                ? "bg-surface-high border-border-main text-text-muted cursor-not-allowed"
                : !sourceId || !targetId || sourceId === targetId
                ? "bg-surface-high/50 border-border-main/50 text-text-muted/40 cursor-not-allowed"
                : "bg-industrial-red hover:bg-[#b02727] border-industrial-red shadow-md active:scale-95 cursor-pointer"
            }`}
          >
            {isLinking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                TUNNELING PEER LINK...
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                ESTABLISH WI-FI LINK
              </>
            )}
          </button>
        </form>

        {/* Current Active Links List */}
        <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-border-main lg:pl-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="text-[9px] uppercase font-black tracking-wider text-text-muted mb-2 select-none">
              ACTIVE WIFI PIPELINES
            </h5>

            {wifiLinks.length === 0 ? (
              <div className="py-8 text-center text-[10px] italic text-text-muted/60 font-sans border border-dashed border-border-main/60 rounded-lg flex flex-col items-center justify-center gap-1">
                <ArrowRightLeft className="w-5 h-5 text-text-muted/30 stroke-[1.5]" />
                <span>No peer channels bridged.</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 no-scrollbar text-xs font-mono">
                {wifiLinks.map((link) => {
                  const src = devices.find((d) => d.id === link.sourceId);
                  const tgt = devices.find((d) => d.id === link.targetId);

                  return (
                    <div
                      key={link.id}
                      className="bg-surface-lowest border border-border-main p-2 rounded-lg space-y-1.5 transition-all"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-white">
                        <div className="flex items-center gap-0.5 max-w-[80%] truncate">
                          <span className="text-industrial-red">{src?.id || link.sourceId}</span>
                          <span className="text-text-muted font-normal px-0.5">↔</span>
                          <span className="text-industrial-red">{tgt?.id || link.targetId}</span>
                        </div>
                        <button
                          onClick={() => handleBreakLink(link.id)}
                          className="text-text-muted hover:text-industrial-red p-0.5 rounded cursor-pointer"
                          title="Terminate Connection"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[8.5px] text-text-muted pt-0.5 border-t border-white/5 font-sans leading-relaxed">
                        <div>
                          Band: <strong className="text-white font-mono">{link.frequency}</strong>
                        </div>
                        <div>
                          Signal: <strong className="text-white font-mono">{link.signalStrength}%</strong>
                        </div>
                        <div>
                          Rate: <strong className="text-emerald-400 font-mono">{link.bandwidthMbps}M</strong>
                        </div>
                        <div className="flex items-center gap-0.5 text-emerald-400 font-mono font-bold">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                          <span>WPA3</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border-main flex justify-between items-center text-[8.5px] font-mono text-text-muted/50">
            <span>SECURE LINKED MESH</span>
            <span className="text-green-500 font-bold select-none">ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  );
}

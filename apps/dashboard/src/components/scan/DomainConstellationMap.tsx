'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Activity,
  Globe,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Eye,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScanDomainRecord } from '@/lib/api';

interface DomainConstellationMapProps {
  firstPartyHost: string;
  scanDomains: ScanDomainRecord[];
}

export function DomainConstellationMap({
  firstPartyHost,
  scanDomains,
}: DomainConstellationMapProps) {
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Filter 3rd-party domains
  const thirdPartyDomains = useMemo(() => {
    return scanDomains.filter((sd) => sd.is_third_party && sd.domain);
  }, [scanDomains]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    thirdPartyDomains.forEach((sd) => {
      if (sd.domain?.category) set.add(sd.domain.category);
    });
    return Array.from(set);
  }, [thirdPartyDomains]);

  const filteredDomains = useMemo(() => {
    if (filterCategory === 'ALL') return thirdPartyDomains;
    if (filterCategory === 'TRACKERS_ONLY') {
      return thirdPartyDomains.filter((sd) => sd.domain?.is_tracker);
    }
    return thirdPartyDomains.filter((sd) => sd.domain?.category === filterCategory);
  }, [thirdPartyDomains, filterCategory]);

  // Compute radial geometry
  const width = 600;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const innerRadius = 110;
  const outerRadius = 190;

  // Distribute nodes evenly around center
  const nodes = useMemo(() => {
    const total = filteredDomains.length;
    if (total === 0) return [];

    return filteredDomains.map((sd, index) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
      // Stagger radius slightly between inner and outer for depth
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const category = sd.domain?.category || 'Unclassified';
      let color = '#71717a'; // zinc
      if (category === 'Advertising') color = '#f59e0b'; // amber
      else if (category === 'Analytics') color = '#38bdf8'; // sky
      else if (category === 'Session Replay') color = '#f43f5e'; // rose
      else if (category === 'Social Media') color = '#a855f7'; // purple
      else if (category === 'Content' || category === 'Payment') color = '#10b981'; // emerald

      return {
        ...sd,
        x,
        y,
        angle,
        radius,
        color,
      };
    });
  }, [filteredDomains, centerX, centerY, innerRadius, outerRadius]);

  const selectedNode = useMemo(() => {
    if (!selectedDomainId) return nodes[0] || null;
    return nodes.find((n) => n.id === selectedDomainId) || nodes[0] || null;
  }, [nodes, selectedDomainId]);

  return (
    <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-base font-bold font-sans text-zinc-100">
                Third-Party Domain Constellation
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400 mt-0.5">
              Interactive radial topology map of all third-party telemetry and script endpoints connected to <strong className="text-zinc-200">{firstPartyHost}</strong>.
            </CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <span className="text-3xs text-zinc-500 px-1.5 uppercase">Filter:</span>
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                filterCategory === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({thirdPartyDomains.length})
            </button>
            <button
              onClick={() => setFilterCategory('TRACKERS_ONLY')}
              className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                filterCategory === 'TRACKERS_ONLY'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              Trackers ({thirdPartyDomains.filter((d) => d.domain?.is_tracker).length})
            </button>
            {categories.slice(0, 3).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                  filterCategory === cat
                    ? 'bg-zinc-700 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* ============================================================= */}
          {/* SVG Constellation Canvas (8 Cols) */}
          {/* ============================================================= */}
          <div className="lg:col-span-8 relative bg-zinc-950 flex items-center justify-center p-4 min-h-[460px] overflow-hidden">
            {/* Subtle radial background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full max-w-xl h-auto select-none"
            >
              <defs>
                {/* Center glowing pulse animation */}
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Orbit Guide Rings */}
              <circle
                cx={centerX}
                cy={centerY}
                r={innerRadius}
                fill="none"
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={outerRadius}
                fill="none"
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray="4 6"
              />

              {/* Connecting Telemetry Lines */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g key={`line-${node.id}`}>
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={node.x}
                      y2={node.y}
                      stroke={isSelected ? node.color : '#3f3f46'}
                      strokeWidth={isSelected ? 2 : 1}
                      strokeOpacity={isSelected ? 0.9 : 0.4}
                      strokeDasharray={node.domain?.is_tracker ? '3 3' : 'none'}
                    />
                  </g>
                );
              })}

              {/* Center First-Party Node */}
              <g className="cursor-pointer">
                <circle cx={centerX} cy={centerY} r="38" fill="url(#centerGlow)" />
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="24"
                  fill="#09090b"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />
                <Shield className="w-5 h-5 text-indigo-400" x={centerX - 10} y={centerY - 10} />
                <text
                  x={centerX}
                  y={centerY + 38}
                  textAnchor="middle"
                  className="fill-zinc-300 font-mono text-[10px] font-bold"
                >
                  {firstPartyHost}
                </text>
                <text
                  x={centerX}
                  y={centerY + 49}
                  textAnchor="middle"
                  className="fill-indigo-400 font-mono text-[8px] uppercase tracking-wider"
                >
                  1st-Party Host
                </text>
              </g>

              {/* Orbiting 3rd-Party Satellite Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const nodeRadius = isSelected ? 12 : 9;

                return (
                  <g
                    key={`node-${node.id}`}
                    onClick={() => setSelectedDomainId(node.id)}
                    className="cursor-pointer transition-transform group"
                  >
                    {/* Pulsing ring for selected or tracker node */}
                    {(isSelected || node.domain?.is_tracker) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeRadius + 4}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="1.5"
                        strokeOpacity={isSelected ? 0.8 : 0.3}
                      />
                    )}

                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={nodeRadius}
                      fill={node.color}
                      stroke="#18181b"
                      strokeWidth="2"
                    />

                    {/* Node Text Label */}
                    <text
                      x={node.x}
                      y={node.y + (node.y > centerY ? 18 : -14)}
                      textAnchor="middle"
                      className={`font-mono text-[9px] pointer-events-none transition-colors ${
                        isSelected
                          ? 'fill-white font-bold'
                          : 'fill-zinc-400 group-hover:fill-zinc-200'
                      }`}
                    >
                      {node.domain?.hostname ? (
                        node.domain.hostname.length > 20
                          ? `${node.domain.hostname.substring(0, 18)}…`
                          : node.domain.hostname
                      ) : (
                        'Unknown'
                      )}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Canvas Hint */}
            <div className="absolute bottom-3 left-4 text-3xs font-mono text-zinc-500 flex items-center gap-2 pointer-events-none">
              <span>● Click any node to inspect telemetry details</span>
            </div>
          </div>

          {/* ============================================================= */}
          {/* Node Detail Inspector Panel (4 Cols) */}
          {/* ============================================================= */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                    Inspected Endpoint
                  </span>
                  <Badge
                    variant={selectedNode.domain?.is_tracker ? 'danger' : 'secondary'}
                  >
                    {selectedNode.domain?.is_tracker ? 'Classified Tracker' : '3rd-Party Asset'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold font-mono text-zinc-100 break-all">
                    {selectedNode.domain?.hostname}
                  </h3>
                  <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                    <span>eTLD+1:</span>
                    <strong className="text-indigo-300">
                      {selectedNode.domain?.registrable_domain}
                    </strong>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                    <span className="text-3xs text-zinc-500 uppercase block">Category</span>
                    <span className="font-semibold" style={{ color: selectedNode.color }}>
                      {selectedNode.domain?.category || 'Unclassified'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                    <span className="text-3xs text-zinc-500 uppercase block">Requests</span>
                    <span className="font-semibold text-zinc-200">
                      {selectedNode.request_count} Beacons
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 col-span-2">
                    <span className="text-3xs text-zinc-500 uppercase block">Transport Security</span>
                    <span
                      className={`font-semibold flex items-center gap-1 mt-0.5 ${
                        selectedNode.insecure_request_count > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {selectedNode.insecure_request_count > 0 ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{selectedNode.insecure_request_count} Insecure HTTP Requests</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>100% Transport Layer Security (HTTPS)</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Privacy Impact Note */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 text-2xs space-y-1.5 leading-relaxed">
                  <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Observed Privacy Indicator</span>
                  </div>
                  <p className="text-zinc-400">
                    {selectedNode.domain?.is_tracker
                      ? `Classified under the DuckDuckGo Radar / Disconnect catalog as an active ${selectedNode.domain.category} endpoint. Correlates client telemetry across domains.`
                      : 'Third-party asset or content delivery domain without classified cross-site tracking signatures.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-zinc-500">
                Select a domain node from the constellation to view telemetry details.
              </div>
            )}

            {/* Constellation Legend */}
            <div className="pt-4 border-t border-zinc-800 space-y-1.5 text-2xs font-mono text-zinc-400">
              <span className="text-3xs text-zinc-500 uppercase block tracking-wider">Legend</span>
              <div className="grid grid-cols-2 gap-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Advertising</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Analytics</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Session Replay</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Content / Pay</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

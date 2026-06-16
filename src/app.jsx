import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Battery, Zap, Truck, Users, AlertTriangle, Calendar,
  BarChart3, LogOut, Menu, X, Phone, Send, FileText,
  CheckCircle, Clock, Thermometer, Activity, Shield,
  ChevronDown, ChevronUp, Filter, RefreshCw, Bell,
  MapPin, Settings, TrendingUp, AlertCircle, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { generateInitialData, INCIDENT_TYPES, SEVERITIES, AUTO_TAGS } from '../data.js';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const ACCOUNTS = {
  admin: { password: 'admin123', role: 'admin', label: 'System Administrator' },
  operator: { password: 'operator123', role: 'operator', label: 'Shift Operator' },
};

const NAV_ITEMS = [

  { id: 'battery', icon: Battery, label: 'Battery Status', roles: ['admin', 'operator'] },
  { id: 'power', icon: Zap, label: 'Power Load', roles: ['admin', 'operator'] },
  { id: 'vehicles', icon: Truck, label: 'Vehicle Dashboard', roles: ['admin', 'operator'] },
  { id: 'drivers', icon: Users, label: 'Driver Contact', roles: ['admin', 'operator'] },
  { id: 'incidents', icon: AlertTriangle, label: 'Incident Reports', roles: ['admin', 'operator'] },
  { id: 'charging', icon: Calendar, label: 'Charging Schedule', roles: ['admin'] },
  { id: 'kpi', icon: BarChart3, label: 'Pilot KPIs', roles: ['admin'] },
];

const C = {
  bg: '#0F1117',
  surface: '#161B27',
  border: '#1E2940',
  blue: '#2D7DD2',
  amber: '#F4A259',
  red: '#E63946',
  green: '#2EC4B6',
  textMuted: '#64748B',
  text: '#CBD5E1',
  textBright: '#F1F5F9',
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function SocColor(soc) {
  if (soc >= 50) return C.green;
  if (soc >= 20) return C.amber;
  return C.red;
}
function TempColor(t) {
  if (t > 50) return C.red;
  if (t >= 45) return C.amber;
  return C.green;
}
function StatusTagColor(tag) {
  if (tag === 'Isolated' || tag === 'Blocked') return C.red;
  if (tag === 'Warning') return C.amber;
  if (tag === 'Fault') return C.red;
  return C.green;
}
function SeverityColor(s) {
  if (s === 'High') return C.red;
  if (s === 'Medium') return C.amber;
  return C.green;
}
function ResolutionColor(r) {
  if (r === 'Resolved') return C.green;
  if (r === 'In Progress') return C.blue;
  return C.amber;
}

// ── UI COMPONENTS ──────────────────────────────────────────────────────────────
function Badge({ color, children, small }) {
  return (
    <span style={{
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      borderRadius: 4,
      padding: small ? '1px 6px' : '2px 8px',
      fontSize: small ? 10 : 11,
      fontFamily: 'monospace',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function Card({ children, style, className }) {
  return (
    <div className={className} style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: 16,
      ...style
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && <Icon size={18} color={C.blue} />}
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.textBright }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#2d0a0d' : t.type === 'warn' ? '#2d1e00' : '#0a2d1f',
          border: `1px solid ${t.type === 'error' ? C.red : t.type === 'warn' ? C.amber : C.green}`,
          borderRadius: 8,
          padding: '10px 16px',
          color: C.textBright,
          fontSize: 13,
          maxWidth: 340,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {t.type === 'error' ? <AlertCircle size={16} color={C.red} /> :
           t.type === 'warn' ? <AlertTriangle size={16} color={C.amber} /> :
           <CheckCircle size={16} color={C.green} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── LIVE LOAD BAR ──────────────────────────────────────────────────────────────
function LiveLoadBar({ powerLoad, normalCount, fastCount, slotsOccupied }) {
  const pct = Math.min((powerLoad / 50) * 100, 100);
  const loadColor = powerLoad > 45 ? C.red : powerLoad > 40 ? C.amber : C.green;

  return (
    <div style={{
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div className="blink" style={{ width: 8, height: 8, borderRadius: '50%', background: loadColor }} />
        <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Live Load</span>
      </div>
      <div style={{ flex: 1, height: 8, background: '#1E2940', borderRadius: 4, overflow: 'hidden', minWidth: 120 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: loadColor,
          borderRadius: 4,
          transition: 'width 1s ease, background 0.5s',
          boxShadow: `0 0 8px ${loadColor}88`,
        }} />
      </div>
      <span className="font-data" style={{ fontSize: 15, fontWeight: 700, color: loadColor, flexShrink: 0 }}>
        {powerLoad.toFixed(1)} kW
      </span>
      <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>/ 40 kW target</span>
      {powerLoad > 40 && (
        <Badge color={powerLoad > 45 ? C.red : C.amber}>
          {powerLoad > 45 ? '⚠ OVER LIMIT' : '⚠ CAUTION'}
        </Badge>
      )}
      <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          <span style={{ color: C.text }}>⚡ {normalCount}</span> Normal
        </span>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          <span style={{ color: C.amber }}>⚡ {fastCount}</span> Fast
        </span>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          <span style={{ color: C.blue }}>{slotsOccupied}</span>/50 Slots
        </span>
      </div>
    </div>
  );
}

// ── MODULE: BATTERY STATUS ─────────────────────────────────────────────────────
function BatteryModule({ batteries, role }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const filters = ['All', 'Normal', 'Warning', 'Isolated', 'Fault', 'Charging', 'Spare'];

  const filtered = batteries.filter(b => {
    const matchSearch = b.id.includes(search.toUpperCase()) || (b.vehicleId && b.vehicleId.includes(search.toUpperCase()));
    if (!matchSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'Spare') return b.isSpare;
    if (filter === 'Charging') return b.chargingStatus === 'Charging';
    if (filter === 'Warning') return b.statusTag === 'Warning';
    if (filter === 'Isolated') return b.statusTag === 'Isolated';
    if (filter === 'Fault') return b.chargingStatus === 'Fault';
    if (filter === 'Normal') return b.statusTag === 'Normal';
    return true;
  }).sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (typeof av === 'string') av = av.toLowerCase(), bv = bv?.toLowerCase() ?? '';
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const warnings = batteries.filter(b => b.statusTag === 'Warning').length;
  const isolated = batteries.filter(b => b.statusTag === 'Isolated').length;
  const charging = batteries.filter(b => b.chargingStatus === 'Charging').length;

  function Th({ field, label }) {
    const active = sortField === field;
    return (
      <th
        onClick={() => { setSortField(field); setSortDir(active && sortDir === 'asc' ? 'desc' : 'asc'); }}
        style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: active ? C.blue : C.textMuted,
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
          background: '#0F1117', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    );
  }

  return (
    <div>
      <SectionTitle icon={Battery} title="Battery Status Monitor"
        subtitle={`${batteries.length} total batteries · ${warnings} warnings · ${isolated} isolated · ${charging} charging`}
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[

          { label: 'Total Batteries', value: batteries.length, color: C.blue },

          { label: 'Charging Now', value: charging, color: C.green },

          { label: 'Warnings', value: warnings, color: C.amber },

          { label: 'Isolated', value: isolated, color: C.red },

        ].map(s => (
          <Card key={s.label} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div className="font-data" style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters & search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search BAT-ID or VH-ID..."
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', width: 200,
            fontFamily: 'monospace',
          }}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }}
              style={{
                background: filter === f ? C.blue : C.surface,
                color: filter === f ? '#fff' : C.textMuted,
                border: `1px solid ${filter === f ? C.blue : C.border}`,
                borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              }}>{f}</button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto' }}>
          {filtered.length} results
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <Th field="id" label="Battery ID" />
              <Th field="vehicleId" label="Vehicle" />
              <Th field="soc" label="SoC %" />
              <Th field="temp" label="Temp °C" />
              <Th field="chargingStatus" label="Status" />
              <Th field="chargerType" label="Charger" />
              <Th field="statusTag" label="Tag" />
              <Th field="cycleCount" label="Cycles" />
              <Th field="soh" label="SoH %" />
              <Th field="finishTime" label="Est. Finish" />
              <th style={{ padding: '8px 10px', fontSize: 11, color: C.textMuted, background: '#0F1117',
                borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Fast Charge Risk
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((b, idx) => {
              const fastRisk = b.fastChargeCount > 3;
              const cycleFlagged = b.batteryType === 'NMC' && b.cycleCount > 500;
              const rowBg = idx % 2 === 0 ? C.surface : '#13182200';
              return (
                <tr key={b.id} style={{
                  background: b.statusTag === 'Isolated' ? '#2d0a0d22' : b.statusTag === 'Warning' ? '#2d1e0022' : rowBg,
                  borderBottom: `1px solid ${C.border}22`,
                }}>
                  <td style={{ padding: '7px 10px' }}>
                    <span className="font-data" style={{ color: C.blue, fontWeight: 600 }}>{b.id}</span>
                    {b.isSpare && <span style={{ fontSize: 9, color: C.textMuted, marginLeft: 4 }}>SPARE</span>}
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: C.text }}>{b.vehicleId || '—'}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 36, height: 5, background: '#1E2940', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${b.soc}%`, background: SocColor(b.soc), borderRadius: 3 }} />
                      </div>
                      <span className="font-data" style={{ color: SocColor(b.soc), fontWeight: 600 }}>{b.soc}%</span>
                    </div>
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: TempColor(b.temp), fontWeight: 600 }}>
                    {b.temp}°C
                    {b.temp > 50 && <span style={{ marginLeft: 4, fontSize: 10 }}>🔥</span>}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span className="font-data" style={{
                      color: b.chargingStatus === 'Charging' ? C.blue :
                             b.chargingStatus === 'In Use' ? C.green :
                             b.chargingStatus === 'Isolated' ? C.red :
                             b.chargingStatus === 'Fault' ? C.red : C.textMuted,
                      fontSize: 11, fontWeight: 600
                    }}>{b.chargingStatus}</span>
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: b.chargerType === 'Fast' ? C.amber : C.text, fontSize: 11 }}>
                    {b.chargerType || '—'}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <Badge color={StatusTagColor(b.statusTag)} small>{b.statusTag}</Badge>
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: cycleFlagged ? C.amber : C.text }}>
                    {b.cycleCount}
                    {cycleFlagged && <span title="Cycle limit exceeded for NMC" style={{ marginLeft: 4, color: C.amber }}>⚠</span>}
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: b.soh < 80 ? C.amber : C.text }}>
                    {b.soh}%
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11 }}>
                    {b.chargingStatus === 'Charging' ? fmtTime(b.finishTime) : '—'}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    {fastRisk ? (
                      <Badge color={C.amber} small>{b.fastChargeCount}x in 7d ⚠</Badge>
                    ) : (
                      <span className="font-data" style={{ color: C.textMuted, fontSize: 11 }}>{b.fastChargeCount}x</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12, alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', color: C.text, cursor: 'pointer', fontSize: 12 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: C.textMuted }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', color: C.text, cursor: 'pointer', fontSize: 12 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── MODULE: POWER LOAD ─────────────────────────────────────────────────────────
function PowerModule({ batteries, powerLoad, normalCount, fastCount }) {
  const slotsOccupied = batteries.filter(b => b.chargingStatus === 'Charging').length;
  const pct = Math.min((powerLoad / 50) * 100, 100);
  const loadColor = powerLoad > 45 ? C.red : powerLoad > 40 ? C.amber : C.green;

  // Historical load data (simulated)
  const loadHistory = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    load: i < 8 ? 35 + Math.random() * 8 : i < 18 ? 10 + Math.random() * 15 : 28 + Math.random() * 14,
  }));

  // Charger breakdown
  const breakdown = [

    { name: 'Normal (0.8kW)', count: normalCount, kw: normalCount * 0.8, color: C.blue },

    { name: 'Fast (1.8kW)', count: fastCount, kw: fastCount * 1.8, color: C.amber },

  ];

  return (
    <div>
      <SectionTitle icon={Zap} title="Live Power Load Monitor"
        subtitle="Warehouse charging infrastructure — 40 kW operating target"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Main gauge */}
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Current Warehouse Load</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
            <div className="font-data" style={{ fontSize: 48, fontWeight: 700, color: loadColor, lineHeight: 1 }}>
              {powerLoad.toFixed(1)}
            </div>
            <div style={{ color: C.textMuted, fontSize: 16, paddingBottom: 8 }}>kW</div>
          </div>

          {/* Load bar */}
          <div style={{ position: 'relative', height: 24, background: '#1E2940', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${C.green}, ${loadColor})`,
              borderRadius: 6,
              transition: 'width 1s ease',
              boxShadow: `0 0 12px ${loadColor}66`,
            }} />
            {/* 40kW marker */}
            <div style={{
              position: 'absolute', left: '80%', top: 0, bottom: 0,
              width: 2, background: C.amber, opacity: 0.8
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMuted }}>
            <span>0 kW</span>
            <span style={{ color: C.amber }}>40 kW limit</span>
            <span>50 kW</span>
          </div>

          <div style={{ marginTop: 12 }}>
            {powerLoad > 45 && (
              <div style={{ background: '#2d0a0d', border: `1px solid ${C.red}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.red }}>
                ⚠ CRITICAL: Load exceeds 45 kW. Switch fast chargers to normal mode immediately.
              </div>
            )}
            {powerLoad > 40 && powerLoad <= 45 && (
              <div style={{ background: '#2d1e00', border: `1px solid ${C.amber}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.amber }}>
                ⚠ CAUTION: Approaching limit. Consider deferring {Math.ceil((powerLoad - 40) / 1.0)} charger(s) or switching to normal mode.
              </div>
            )}
            {powerLoad <= 40 && (
              <div style={{ background: '#0a1f1d', border: `1px solid ${C.green}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.green }}>
                ✓ Load within safe operating range
              </div>
            )}
          </div>
        </Card>

        {/* Breakdown */}
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Charger Breakdown</div>
          {breakdown.map(b => (
            <div key={b.name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: C.text }}>{b.name}</span>
                <span className="font-data" style={{ color: b.color, fontWeight: 600 }}>{b.count} active · {b.kw.toFixed(1)} kW</span>
              </div>
              <div style={{ height: 8, background: '#1E2940', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (b.count / 50) * 100)}%`, background: b.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[

                { label: 'Slots Occupied', value: slotsOccupied, total: 50 },

                { label: 'Slots Available', value: 50 - slotsOccupied, total: 50 },

              ].map(s => (
                <div key={s.label} style={{ background: '#0F1117', borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 10, color: C.textMuted }}>{s.label}</div>
                  <div className="font-data" style={{ fontSize: 20, fontWeight: 700, color: C.blue, marginTop: 2 }}>
                    {s.value}<span style={{ fontSize: 12, color: C.textMuted }}>/{s.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 24h load chart */}
      <Card>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>24-Hour Load Profile (simulated)</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={loadHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: C.textMuted }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: C.textMuted }} domain={[0, 50]} />
            <Tooltip
              contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
              formatter={v => [`${v.toFixed(1)} kW`, 'Load']}
            />
            <Bar dataKey="load" radius={[3, 3, 0, 0]}>
              {loadHistory.map((entry, i) => (
                <Cell key={i} fill={entry.load > 45 ? C.red : entry.load > 40 ? C.amber : C.blue} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ── MODULE: VEHICLES ───────────────────────────────────────────────────────────
function VehicleModule({ vehicles, setVehicles, role }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter(v => {
    const ms = search.toLowerCase();
    const matchSearch = !ms || v.id.toLowerCase().includes(ms) || v.riderName.toLowerCase().includes(ms);
    if (!matchSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'High-Mileage') return v.riderType === 'High-Mileage';
    if (filter === 'Standard') return v.riderType === 'Standard';
    if (filter === 'In Field') return v.location === 'In Field';
    if (filter === 'At Warehouse') return v.location === 'At Warehouse';
    if (filter === 'Swap Needed') return v.swapRecommended;
    return true;
  });

  function updateStatus(id, newStatus) {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
  }

  const swapNeeded = vehicles.filter(v => v.swapRecommended).length;

  return (
    <div>
      <SectionTitle icon={Truck} title="Vehicle & Rider Dashboard"
        subtitle={`${vehicles.length} vehicles · ${swapNeeded} swap recommendations`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[

          { label: 'In Field', value: vehicles.filter(v => v.location === 'In Field').length, color: C.green },

          { label: 'At Warehouse', value: vehicles.filter(v => v.location === 'At Warehouse').length, color: C.blue },

          { label: 'High-Mileage Riders', value: vehicles.filter(v => v.riderType === 'High-Mileage').length, color: C.amber },

          { label: 'Swap Recommended', value: swapNeeded, color: C.red },

        ].map(s => (
          <Card key={s.label} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div className="font-data" style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vehicle or rider..."
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', width: 200,
          }}
        />
        {['All', 'High-Mileage', 'Standard', 'In Field', 'At Warehouse', 'Swap Needed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              background: filter === f ? C.blue : C.surface,
              color: filter === f ? '#fff' : C.textMuted,
              border: `1px solid ${filter === f ? C.blue : C.border}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
            }}>{f}</button>
        ))}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0F1117' }}>
              {['Vehicle', 'Rider', 'Type', 'Battery', 'SoC', 'Location', 'Est. Return', 'Daily KM', 'Swap?', role === 'admin' ? 'Action' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: C.textMuted,
                  fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, idx) => (
              <tr key={v.id} style={{
                background: v.swapRecommended ? '#2d1e0011' : idx % 2 === 0 ? C.surface : 'transparent',
                borderBottom: `1px solid ${C.border}22`,
              }}>
                <td className="font-data" style={{ padding: '7px 10px', color: C.blue, fontWeight: 600 }}>{v.id}</td>
                <td style={{ padding: '7px 10px', color: C.textBright, fontSize: 12 }}>{v.riderName}</td>
                <td style={{ padding: '7px 10px' }}>
                  <Badge color={v.riderType === 'High-Mileage' ? C.amber : C.textMuted} small>{v.riderType}</Badge>
                </td>
                <td className="font-data" style={{ padding: '7px 10px', color: C.text, fontSize: 11 }}>{v.batteryId}</td>
                <td style={{ padding: '7px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 32, height: 5, background: '#1E2940', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${v.soc}%`, background: SocColor(v.soc), borderRadius: 3 }} />
                    </div>
                    <span className="font-data" style={{ color: SocColor(v.soc), fontWeight: 600 }}>{v.soc}%</span>
                  </div>
                </td>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{ color: v.location === 'In Field' ? C.green : C.blue, fontSize: 11 }}>
                    {v.location === 'In Field' ? '📍' : '🏭'} {v.location}
                  </span>
                </td>
                <td className="font-data" style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11 }}>
                  {fmtTime(v.returnETA)}
                </td>
                <td className="font-data" style={{ padding: '7px 10px', color: C.text }}>{v.dailyKm} km</td>
                <td style={{ padding: '7px 10px' }}>
                  {v.swapRecommended ? (
                    <Badge color={C.amber} small>⚠ SWAP NOW</Badge>
                  ) : (
                    <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>
                  )}
                </td>
                {role === 'admin' && (
                  <td style={{ padding: '7px 10px' }}>
                    <select
                      value={v.status}
                      onChange={e => updateStatus(v.id, e.target.value)}
                      style={{
                        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4,
                        color: C.text, fontSize: 11, padding: '3px 6px', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      {['Active', 'Returned', 'Delayed', 'Off Duty'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MODULE: DRIVERS ────────────────────────────────────────────────────────────
function DriversModule({ vehicles, setVehicles, incidents, addToast }) {
  const [search, setSearch] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [noteText, setNoteText] = useState('');

  const filtered = vehicles.filter(v =>
    !search || v.riderName.toLowerCase().includes(search.toLowerCase()) ||
    v.riderId.toLowerCase().includes(search.toLowerCase())
  );

  // Count incidents per rider
  const incidentCount = {};
  incidents.forEach(inc => {
    incidentCount[inc.riderId] = (incidentCount[inc.riderId] || 0) + 1;
  });

  function sendAlert(vehicle, type) {
    const messages = {
      'Low Battery': `⚡ Alert: Battery at ${vehicle.soc}% — please return for charging or arrange swap`,
      'Missed Charging': '🔋 Reminder: Ensure battery is plugged in overnight before leaving',
      'Wrong Battery': '⚠ Action Required: Battery mismatch detected on your vehicle',
    };
    setVehicles(prev => prev.map(v => v.id === vehicle.id ? {
      ...v,
      messages: [
        { text: messages[type] || 'Alert sent', time: new Date().toISOString(), type },
        ...v.messages.slice(0, 2)
      ]
    } : v));
    addToast(`Alert sent to ${vehicle.riderName}`, 'success');
  }

  function saveNote(vehicleId) {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, notes: noteText } : v));
    addToast('Note saved', 'success');
    setSelectedRider(null);
  }

  return (
    <div>
      <SectionTitle icon={Users} title="Driver Contact & Communication"
        subtitle="Send alerts and manage rider notes"
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or ID..."
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', width: 240,
          }}
        />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0F1117' }}>
              {['Rider ID', 'Name', 'Phone', 'Vehicle', 'Type', 'Incidents', 'Last Messages', 'Alerts', 'Note'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: C.textMuted,
                  fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, idx) => {
              const iCount = incidentCount[v.riderId] || 0;
              const isRepeat = iCount > 3;
              return (
                <tr key={v.id} style={{
                  background: isRepeat ? '#2d0a0d11' : idx % 2 === 0 ? C.surface : 'transparent',
                  borderBottom: `1px solid ${C.border}22`,
                }}>
                  <td className="font-data" style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11 }}>{v.riderId}</td>
                  <td style={{ padding: '7px 10px', color: C.textBright }}>
                    {v.riderName}
                    {isRepeat && <span style={{ marginLeft: 6, fontSize: 10, color: C.red, fontWeight: 700 }}>REPEAT ⚠</span>}
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: C.text, fontSize: 11 }}>
                    <a href={`tel:${v.phone}`} style={{ color: C.blue, textDecoration: 'none' }}>
                      <Phone size={10} style={{ marginRight: 4 }} />{v.phone}
                    </a>
                  </td>
                  <td className="font-data" style={{ padding: '7px 10px', color: C.blue, fontSize: 11 }}>{v.id}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <Badge color={v.riderType === 'High-Mileage' ? C.amber : C.textMuted} small>{v.riderType}</Badge>
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span className="font-data" style={{ color: isRepeat ? C.red : iCount > 1 ? C.amber : C.text, fontWeight: 600 }}>
                      {iCount}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', maxWidth: 180 }}>
                    {v.messages.length === 0 ? (
                      <span style={{ color: C.textMuted, fontSize: 10 }}>No messages</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {v.messages.slice(0, 2).map((m, mi) => (
                          <div key={mi} style={{ fontSize: 10, color: C.textMuted }}>
                            <span style={{ color: C.blue }}>{fmtTime(m.time)}</span> {m.type}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['Low Battery', 'Missed Charging', 'Wrong Battery'].map(type => (
                        <button key={type}
                          onClick={() => sendAlert(v, type)}
                          style={{
                            background: '#1E2940', border: `1px solid ${C.border}`, borderRadius: 4,
                            padding: '3px 7px', fontSize: 10, color: C.blue, cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Send size={9} style={{ marginRight: 3 }} />{type}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', maxWidth: 160 }}>
                    {selectedRider === v.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add note..."
                          autoFocus
                          style={{
                            background: '#0F1117', border: `1px solid ${C.blue}`, borderRadius: 4,
                            padding: '3px 6px', color: C.text, fontSize: 11, outline: 'none', width: 100,
                          }}
                        />
                        <button onClick={() => saveNote(v.id)}
                          style={{ background: C.blue, border: 'none', borderRadius: 4, padding: '3px 6px', color: '#fff', fontSize: 10, cursor: 'pointer' }}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setSelectedRider(v.id); setNoteText(v.notes || ''); }}
                        style={{ cursor: 'pointer', fontSize: 10, color: v.notes ? C.text : C.textMuted,
                          maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {v.notes || '+ Add note'}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MODULE: INCIDENTS ──────────────────────────────────────────────────────────
function IncidentModule({ incidents, setIncidents, vehicles, role, addToast }) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterResolution, setFilterResolution] = useState('All');
  const [form, setForm] = useState({
    type: INCIDENT_TYPES[0], vehicleId: '', batteryId: '', description: '', severity: 'Medium',
  });

  const filtered = incidents.filter(i => {
    if (filterType !== 'All' && i.type !== filterType) return false;
    if (filterSeverity !== 'All' && i.severity !== filterSeverity) return false;
    if (filterResolution !== 'All' && i.resolution !== filterResolution) return false;
    return true;
  });

  // Stats
  const thisMonth = incidents.filter(i => {
    const d = new Date(i.time);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const typeCounts = {};
  incidents.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Weekly trend (last 4 weeks)
  const weeklyData = Array.from({ length: 4 }, (_, wi) => {
    const end = new Date();
    end.setDate(end.getDate() - wi * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const count = incidents.filter(i => {
      const d = new Date(i.time);
      return d >= start && d <= end;
    }).length;
    return { week: `W-${4 - wi}`, count };
  }).reverse();

  // Rider incident count
  const riderCounts = {};
  incidents.forEach(i => { riderCounts[i.riderId] = (riderCounts[i.riderId] || 0) + 1; });

  function submitIncident() {
    if (!form.vehicleId || !form.description) {
      addToast('Vehicle ID and description are required', 'error');
      return;
    }
    const vehicle = vehicles.find(v => v.id.toUpperCase() === form.vehicleId.toUpperCase());
    const newInc = {
      id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
      type: form.type,
      vehicleId: form.vehicleId.toUpperCase(),
      batteryId: form.batteryId.toUpperCase() || (vehicle?.batteryId ?? '—'),
      riderId: vehicle?.riderId ?? '—',
      riderName: vehicle?.riderName ?? 'Unknown',
      time: new Date().toISOString(),
      description: form.description,
      severity: form.severity,
      tag: AUTO_TAGS[form.type] || 'Operational',
      resolution: 'Open',
      resolutionNote: '',
      autoDetected: false,
    };
    setIncidents(prev => [newInc, ...prev]);
    setForm({ type: INCIDENT_TYPES[0], vehicleId: '', batteryId: '', description: '', severity: 'Medium' });
    setShowForm(false);
    addToast('Incident report submitted', 'success');
  }

  function updateResolution(id, resolution, note) {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolution, resolutionNote: note ?? i.resolutionNote } : i));
  }

  return (
    <div>
      <SectionTitle icon={AlertTriangle} title="Incident Report & Analysis"
        subtitle="Safety events, operational anomalies, and compliance issues"
        right={
          <button onClick={() => setShowForm(!showForm)}
            style={{
              background: C.blue, border: 'none', borderRadius: 6, padding: '7px 14px',
              color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <FileText size={14} /> {showForm ? 'Cancel' : 'Report Incident'}
          </button>
        }
      />

      {/* Submit form */}
      {showForm && (
        <Card style={{ marginBottom: 16, border: `1px solid ${C.blue}44` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, marginBottom: 12 }}>New Incident Report</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Incident Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }}>
                {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }}>
                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Vehicle ID</label>
              <input value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                placeholder="VH-001"
                style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Battery ID (optional)</label>
              <input value={form.batteryId} onChange={e => setForm(f => ({ ...f, batteryId: e.target.value }))}
                placeholder="BAT-001"
                style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what happened..."
                rows={3}
                style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>
              Auto-tag: <Badge color={C.blue} small>{AUTO_TAGS[form.type] || 'Operational'}</Badge>
            </span>
            <button onClick={submitIncident}
              style={{ marginLeft: 'auto', background: C.blue, border: 'none', borderRadius: 6, padding: '7px 20px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
              Submit Report
            </button>
          </div>
        </Card>
      )}

      {/* Stats */}
      {role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 200px', gap: 12, marginBottom: 16 }}>
          {[

            { label: 'This Month', value: thisMonth.length, color: C.blue },

            { label: 'Open', value: incidents.filter(i => i.resolution === 'Open').length, color: C.red },

            { label: 'In Progress', value: incidents.filter(i => i.resolution === 'In Progress').length, color: C.amber },

            { label: 'Resolved', value: incidents.filter(i => i.resolution === 'Resolved').length, color: C.green },

          ].map(s => (
            <Card key={s.label} style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
              <div className="font-data" style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            </Card>
          ))}
          <Card style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Top Issue</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.amber, lineHeight: 1.4 }}>{topType?.[0]}</div>
            <div className="font-data" style={{ fontSize: 18, color: C.amber, marginTop: 2 }}>{topType?.[1]}x</div>
          </Card>
        </div>
      )}

      {/* Trend chart (admin) */}
      {role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Card>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Weekly Incident Trend</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: C.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: C.textMuted }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="count" fill={C.blue} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>By Incident Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: C.text, width: 160, flexShrink: 0 }}>{type}</div>
                  <div style={{ flex: 1, height: 6, background: '#1E2940', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / incidents.length) * 100}%`, background: C.amber, borderRadius: 3 }} />
                  </div>
                  <span className="font-data" style={{ fontSize: 11, color: C.amber, width: 20, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value="All">All Types</option>
          {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value="All">All Severities</option>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterResolution} onChange={e => setFilterResolution(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value="All">All Statuses</option>
          {['Open', 'In Progress', 'Resolved'].map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto', alignSelf: 'center' }}>{filtered.length} incidents</span>
      </div>

      {/* Incidents table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0F1117' }}>
              {['ID', 'Type', 'Vehicle', 'Rider', 'Time', 'Severity', 'Tag', 'Status', role === 'admin' ? 'Action' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: C.textMuted,
                  fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inc, idx) => (
              <tr key={inc.id} style={{
                background: idx % 2 === 0 ? C.surface : 'transparent',
                borderBottom: `1px solid ${C.border}22`,
              }}>
                <td className="font-data" style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11 }}>{inc.id}</td>
                <td style={{ padding: '7px 10px', color: C.textBright, fontSize: 11, maxWidth: 160 }}>
                  {inc.type}
                  {inc.autoDetected && <span style={{ marginLeft: 4, fontSize: 9, color: C.blue }}>AUTO</span>}
                </td>
                <td className="font-data" style={{ padding: '7px 10px', color: C.blue, fontSize: 11 }}>{inc.vehicleId}</td>
                <td style={{ padding: '7px 10px', color: C.text, fontSize: 11 }}>{inc.riderName}</td>
                <td className="font-data" style={{ padding: '7px 10px', color: C.textMuted, fontSize: 10 }}>{fmtDateTime(inc.time)}</td>
                <td style={{ padding: '7px 10px' }}>
                  <Badge color={SeverityColor(inc.severity)} small>{inc.severity}</Badge>
                </td>
                <td style={{ padding: '7px 10px' }}>
                  <Badge color={inc.tag === 'Safety' ? C.red : inc.tag === 'Compliance' ? C.amber : C.blue} small>
                    {inc.tag}
                  </Badge>
                </td>
                <td style={{ padding: '7px 10px' }}>
                  <Badge color={ResolutionColor(inc.resolution)} small>{inc.resolution}</Badge>
                </td>
                {role === 'admin' && (
                  <td style={{ padding: '7px 10px' }}>
                    <select
                      value={inc.resolution}
                      onChange={e => updateResolution(inc.id, e.target.value)}
                      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, padding: '3px 6px', outline: 'none', cursor: 'pointer' }}
                    >
                      {['Open', 'In Progress', 'Resolved'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MODULE: CHARGING SCHEDULE ──────────────────────────────────────────────────
function ChargingModule({ chargingSlots, setChargingSlots, batteries, addToast }) {
  const energyDelivered = chargingSlots
    .filter(s => s.status === 'charging' && s.currentSoc && s.plugInSoc)
    .reduce((sum, s) => sum + ((s.currentSoc - s.plugInSoc) / 100) * 1.8, 0);

  const statusColors = { charging: C.blue, completed: C.green, fault: C.red, empty: C.border };
  const statusLabels = { charging: 'Charging', completed: 'Complete', fault: 'Fault', empty: 'Empty' };

  function swapChargerType(slotId, newType) {
    setChargingSlots(prev => prev.map(s => s.id === slotId ? { ...s, chargerType: newType } : s));
    addToast(`Slot ${slotId}: switched to ${newType} charger`, 'success');
  }

  const chargingCount = chargingSlots.filter(s => s.status === 'charging').length;

  return (
    <div>
      <SectionTitle icon={Calendar} title="Charging Schedule & Slot Management"
        subtitle={`${chargingCount}/50 slots active · ${energyDelivered.toFixed(1)} kWh delivered today`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[

          { label: 'Active Charging', value: chargingSlots.filter(s => s.status === 'charging').length, color: C.blue },

          { label: 'Complete', value: chargingSlots.filter(s => s.status === 'completed').length, color: C.green },

          { label: 'Fault', value: chargingSlots.filter(s => s.status === 'fault').length, color: C.red },

          { label: 'Energy Today', value: `${energyDelivered.toFixed(1)} kWh`, color: C.amber },

        ].map(s => (
          <Card key={s.label} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div className="font-data" style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Slot grid */}
      <Card>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Slot Grid — 50 Warehouse Charging Positions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {chargingSlots.map(slot => (
            <div key={slot.id} style={{
              background: '#0F1117',
              border: `1px solid ${slot.status === 'empty' ? C.border : statusColors[slot.status]}44`,
              borderRadius: 6,
              padding: 8,
              position: 'relative',
              opacity: slot.status === 'empty' ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="font-data" style={{ fontSize: 10, color: C.textMuted }}>{slot.id}</span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: statusColors[slot.status],
                  display: 'inline-block',
                  boxShadow: slot.status === 'charging' ? `0 0 6px ${C.blue}` : 'none',
                }} />
              </div>
              {slot.batteryId ? (
                <>
                  <div className="font-data" style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginBottom: 2 }}>
                    {slot.batteryId}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, height: 4, background: '#1E2940', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${slot.currentSoc || 0}%`, background: SocColor(slot.currentSoc || 0), borderRadius: 2 }} />
                    </div>
                    <span className="font-data" style={{ fontSize: 10, color: SocColor(slot.currentSoc || 0) }}>{slot.currentSoc}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge color={slot.chargerType === 'Fast' ? C.amber : C.blue} small>
                      {slot.chargerType}
                    </Badge>
                    <span className="font-data" style={{ fontSize: 9, color: C.textMuted }}>
                      {slot.finishTime ? fmtTime(slot.finishTime) : '—'}
                    </span>
                  </div>
                  {slot.status === 'charging' && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        onClick={() => swapChargerType(slot.id, slot.chargerType === 'Fast' ? 'Normal' : 'Fast')}
                        style={{
                          width: '100%', background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: 3, padding: '2px 0', fontSize: 9, color: C.textMuted, cursor: 'pointer',
                        }}
                      >
                        Switch to {slot.chargerType === 'Fast' ? 'Normal' : 'Fast'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', paddingTop: 8 }}>— Empty —</div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── MODULE: KPI DASHBOARD ──────────────────────────────────────────────────────
function KPIModule({ batteries, vehicles, incidents }) {
  // Calculate real KPIs from data
  const totalVehicles = vehicles.length;
  const operational = vehicles.filter(v => v.status === 'Active').length;
  const fleetUptime = Math.round((operational / totalVehicles) * 100 * 10) / 10;

  const avgSocStart = Math.round(vehicles.reduce((s, v) => s + v.soc, 0) / vehicles.length);

  const fullyCharged = batteries.filter(b => !b.isSpare && b.soc >= 80).length;
  const chargingRate = Math.round((fullyCharged / 100) * 100);

  const incidentRate = Math.round((incidents.length / (100 * 90)) * 100 * 10) / 10; // per 100 veh-days

  const fastChargeTotal = batteries.reduce((s, b) => s + b.fastChargeCount, 0);
  const fastChargeRate = Math.round((fastChargeTotal / (fastChargeTotal + batteries.filter(b => b.chargingStatus === 'Charging' && b.chargerType === 'Normal').length * 5)) * 100);

  const missedCharging = incidents.filter(i => i.type === 'Missed Overnight Charging' && {
    ...i, monthMatch: (() => {
      const d = new Date(i.time);
      const n = new Date();
      return d.getMonth() === n.getMonth();
    })()
  }.monthMatch).length;

  const avgTemp = Math.round(batteries.filter(b => b.chargingStatus === 'Charging').reduce((s, b) => s + b.temp, 0) /
    Math.max(1, batteries.filter(b => b.chargingStatus === 'Charging').length) * 10) / 10;

  const kpis = [

    { label: 'Fleet Uptime', value: `${fleetUptime}%`, target: '≥95%', met: fleetUptime >= 95, unit: '%', num: fleetUptime, max: 100 },

    { label: 'Avg SoC at Shift Start', value: `${avgSocStart}%`, target: '≥80%', met: avgSocStart >= 80, unit: '%', num: avgSocStart, max: 100 },

    { label: 'Charging Completion Rate', value: `${chargingRate}%`, target: '≥90%', met: chargingRate >= 90, unit: '%', num: chargingRate, max: 100 },

    { label: 'Incident Rate', value: `${incidentRate}`, target: '≤0.3', met: incidentRate <= 0.3, unit: '/100vd', num: incidentRate, max: 1, invert: true },

    { label: 'Fast Charge Usage', value: `${fastChargeRate}%`, target: '≤30%', met: fastChargeRate <= 30, unit: '%', num: fastChargeRate, max: 100, invert: true },

    { label: 'Missed Charging This Month', value: missedCharging, target: '≤5', met: missedCharging <= 5, unit: 'events', num: missedCharging, max: 20, invert: true },

    { label: 'Avg Charging End Temp', value: `${avgTemp}°C`, target: '<40°C', met: avgTemp < 40, unit: '°C', num: avgTemp, max: 60, invert: true },

  ];

  const metCount = kpis.filter(k => k.met).length;
  const readiness = metCount >= 6 ? 'green' : metCount >= 5 ? 'amber' : 'red';
  const readinessColor = readiness === 'green' ? C.green : readiness === 'amber' ? C.amber : C.red;
  const readinessLabel = readiness === 'green' ? 'READY TO SCALE' : readiness === 'amber' ? 'BORDERLINE' : 'NOT READY';

  // Trend data (simulated monthly)
  const trendData = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    uptime: 88 + i * 0.7 + (Math.random() - 0.5) * 3,
    incidents: Math.max(0, 32 - i * 1.8 + (Math.random() - 0.5) * 4),
    chargingRate: 72 + i * 1.9 + (Math.random() - 0.5) * 4,
  }));

  return (
    <div>
      <SectionTitle icon={BarChart3} title="Pilot KPI Dashboard"
        subtitle="3-month EV pilot metrics — scale readiness assessment"
      />

      {/* Scale Readiness */}
      <Card style={{ marginBottom: 16, border: `1px solid ${readinessColor}44`, background: `${readinessColor}08` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: `3px solid ${readinessColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${readinessColor}44`,
            flexShrink: 0,
          }}>
            <Shield size={28} color={readinessColor} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Scale Readiness Indicator</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: readinessColor }}>{readinessLabel}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {metCount} of {kpis.length} KPIs meeting target threshold for 500–1,000 vehicle expansion
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.slice(0, 4).map(k => (
          <Card key={k.label} style={{ padding: 12, border: `1px solid ${k.met ? C.green : C.red}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>{k.label}</div>
              <span style={{ color: k.met ? C.green : C.red, fontSize: 14 }}>{k.met ? '✓' : '✗'}</span>
            </div>
            <div className="font-data" style={{ fontSize: 22, fontWeight: 700, color: k.met ? C.textBright : C.red, marginBottom: 4 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Target: {k.target}</div>
            <div style={{ marginTop: 6, height: 4, background: '#1E2940', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (k.num / k.max) * 100)}%`,
                background: k.met ? C.green : C.red,
                borderRadius: 2,
              }} />
            </div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.slice(4).map(k => (
          <Card key={k.label} style={{ padding: 12, border: `1px solid ${k.met ? C.green : C.amber}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>{k.label}</div>
              <span style={{ color: k.met ? C.green : C.amber, fontSize: 14 }}>{k.met ? '✓' : '⚠'}</span>
            </div>
            <div className="font-data" style={{ fontSize: 22, fontWeight: 700, color: k.met ? C.textBright : C.amber, marginBottom: 4 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Target: {k.target}</div>
          </Card>
        ))}
      </div>

      {/* Trend charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Fleet Uptime & Charging Rate — Pilot Period</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: C.textMuted }} domain={[60, 105]} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="uptime" stroke={C.green} strokeWidth={2} dot={false} name="Uptime %" />
              <Line type="monotone" dataKey="chargingRate" stroke={C.blue} strokeWidth={2} dot={false} name="Charge Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Incident Count — Pilot Period</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: C.textMuted }} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="incidents" fill={C.amber} radius={[3, 3, 0, 0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleLogin() {
    const account = ACCOUNTS[username];
    if (account && account.password === password) {
      onLogin({ username, role: account.role, label: account.label });
    } else {
      setError('Invalid credentials. Try admin/admin123 or operator/operator123');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.03,
        backgroundImage: 'linear-gradient(#2D7DD2 1px, transparent 1px), linear-gradient(90deg, #2D7DD2 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative', width: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '12px 20px', marginBottom: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.blue}, #1a5fa8)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${C.blue}44`,
            }}>
              <Zap size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.textBright, letterSpacing: 1 }}>V-FLEET</div>
              <div style={{ fontSize: 10, color: C.blue, letterSpacing: 2, textTransform: 'uppercase' }}>Logistics</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted }}>EV Fleet Operations Center</div>
          <div style={{ fontSize: 11, color: C.border, marginTop: 4 }}>Hanoi Urban Delivery Pilot — 100 Electric Motorbikes</div>
        </div>

        {/* Login card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 32,
          boxShadow: `0 0 40px rgba(0,0,0,0.5), 0 0 80px ${C.blue}08`,
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Username
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="admin / operator"
              style={{
                width: '100%', background: '#0F1117', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '10px 14px', color: C.textBright, fontSize: 14,
                outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%', background: '#0F1117', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '10px 14px', color: C.textBright, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {error && (
            <div style={{
              background: '#2d0a0d', border: `1px solid ${C.red}`,
              borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.red, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            style={{
              width: '100%', background: `linear-gradient(135deg, ${C.blue}, #1a5fa8)`,
              border: 'none', borderRadius: 8, padding: '12px', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5,
              boxShadow: `0 4px 16px ${C.blue}44`,
            }}
          >
            Access Operations Center
          </button>

          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            {[

              { user: 'admin', pass: 'admin123', label: 'Admin', color: C.blue },

              { user: 'operator', pass: 'operator123', label: 'Operator', color: C.green },

            ].map(preset => (
              <button key={preset.user} onClick={() => { setUsername(preset.user); setPassword(preset.pass); }}
                style={{
                  flex: 1, background: 'transparent', border: `1px solid ${preset.color}44`,
                  borderRadius: 6, padding: '6px', color: preset.color, fontSize: 11, cursor: 'pointer',
                }}>
                {preset.label} Demo
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [activeModule, setActiveModule] = useState('battery');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState(null);
  const toastTimers = useRef([]);

  // Initialize data
  useEffect(() => {
    setData(generateInitialData());
  }, []);

  useEffect(() => {
    setData(generateInitialData());
  }, []);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setData(prev => prev ? { ...prev, toasts: [...prev.toasts, { id, message, type }], toastId: id } : prev);
    const timer = setTimeout(() => {
      setData(prev => prev ? { ...prev, toasts: prev.toasts.filter(t => t.id !== id) } : prev);
    }, 3500);
    toastTimers.current.push(timer);
  }

  function setVehicles(updater) {
    setData(prev => prev ? { ...prev, vehicles: typeof updater === 'function' ? updater(prev.vehicles) : updater } : prev);
  }
  function setIncidents(updater) {
    setData(prev => prev ? { ...prev, incidents: typeof updater === 'function' ? updater(prev.incidents) : updater } : prev);
  }
  function setChargingSlots(updater) {
    setData(prev => prev ? { ...prev, chargingSlots: typeof updater === 'function' ? updater(prev.chargingSlots) : updater } : prev);
  }

  if (!session) return <LoginScreen onLogin={setSession} />;
  if (!data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
      Initializing fleet data...
    </div>
  );

  const { role } = session;
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(role));
  const slotsOccupied = data.batteries.filter(b => b.chargingStatus === 'Charging').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Top header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, zIndex: 100,
      }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
          <Menu size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.blue}, #1a5fa8)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.textBright, letterSpacing: 0.5 }}>V-FLEET</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>Operations Center</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 11, color: C.textMuted }}>LIVE</span>
          <div style={{
            background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: role === 'admin' ? C.blue : C.green }} />
            <span style={{ fontSize: 11, color: C.textBright }}>{session.username}</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>· {session.label}</span>
          </div>
          <button onClick={() => setSession(null)}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.textMuted, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>

      {/* Live Load Bar */}
      <LiveLoadBar
        powerLoad={data.powerLoad}
        normalCount={data.normalChargerCount}
        fastCount={data.fastChargerCount}
        slotsOccupied={slotsOccupied}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 200, background: C.surface, borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', padding: '12px 8px',
            flexShrink: 0, overflowY: 'auto',
          }}>
            {visibleNav.map(item => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                    background: active ? `${C.blue}22` : 'transparent',
                    border: active ? `1px solid ${C.blue}44` : '1px solid transparent',
                    color: active ? C.blue : C.textMuted,
                    cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}

            <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Pilot Status</div>
              <div className="font-data" style={{ fontSize: 11, color: C.green }}>● Active — Day 47/90</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>Hanoi Urban Zone</div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeModule === 'battery' && <BatteryModule batteries={data.batteries} role={role} />}
          {activeModule === 'power' && <PowerModule batteries={data.batteries} powerLoad={data.powerLoad} normalCount={data.normalChargerCount} fastCount={data.fastChargerCount} />}
          {activeModule === 'vehicles' && <VehicleModule vehicles={data.vehicles} setVehicles={setVehicles} role={role} />}
          {activeModule === 'drivers' && <DriversModule vehicles={data.vehicles} setVehicles={setVehicles} incidents={data.incidents} addToast={addToast} />}
          {activeModule === 'incidents' && <IncidentModule incidents={data.incidents} setIncidents={setIncidents} vehicles={data.vehicles} role={role} addToast={addToast} />}
          {activeModule === 'charging' && role === 'admin' && <ChargingModule chargingSlots={data.chargingSlots} setChargingSlots={setChargingSlots} batteries={data.batteries} addToast={addToast} />}
          {activeModule === 'kpi' && role === 'admin' && <KPIModule batteries={data.batteries} vehicles={data.vehicles} incidents={data.incidents} />}
        </div>
      </div>

      <Toast toasts={data.toasts} />
    </div>
  );
}
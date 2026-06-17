import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Battery, Zap, Truck, Users, AlertTriangle, Calendar,
  BarChart3, LogOut, Menu, X, Phone, Send, FileText,
  CheckCircle, Clock, Thermometer, Activity, Shield,
  ChevronDown, ChevronUp, Filter, RefreshCw, Bell,
  MapPin, Settings, TrendingUp, AlertCircle, Info,
  Navigation, Home, Warehouse, Radio, BatteryCharging,
  Car, ClipboardList, PhoneCall, Star, WifiOff, Siren
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { generateInitialData, INCIDENT_TYPES, SEVERITIES, AUTO_TAGS } from './data.js';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const OPERATOR_ACCOUNTS = {
  admin: { password: 'admin123', role: 'admin', label: 'System Administrator' },
};

// Driver accounts – keyed by vehicle ID for easy lookup
// In a real app this would come from a backend; here we use rider index
const DRIVER_ACCOUNTS = (() => {
  const acc = {};
  for (let i = 1; i <= 100; i++) {
    const id = `VH-${String(i).padStart(3, '0')}`;
    acc[id] = { password: 'driver123', role: 'driver', vehicleId: id };
  }
  return acc;
})();

const WAREHOUSE_SLOTS = [
  { id: 'W-A1', zone: 'Zone A', type: 'Normal', status: 'available' },
  { id: 'W-A2', zone: 'Zone A', type: 'Normal', status: 'occupied' },
  { id: 'W-A3', zone: 'Zone A', type: 'Fast',   status: 'available' },
  { id: 'W-B1', zone: 'Zone B', type: 'Normal', status: 'available' },
  { id: 'W-B2', zone: 'Zone B', type: 'Fast',   status: 'maintenance' },
  { id: 'W-B3', zone: 'Zone B', type: 'Normal', status: 'occupied' },
  { id: 'W-C1', zone: 'Zone C', type: 'Normal', status: 'available' },
  { id: 'W-C2', zone: 'Zone C', type: 'Normal', status: 'available' },
  { id: 'W-C3', zone: 'Zone C', type: 'Fast',   status: 'occupied' },
  { id: 'W-D1', zone: 'Zone D', type: 'Normal', status: 'available' },
  { id: 'W-D2', zone: 'Zone D', type: 'Fast',   status: 'available' },
  { id: 'W-D3', zone: 'Zone D', type: 'Normal', status: 'maintenance' },
];

const EMERGENCY_CONTACTS = [
  { label: 'Operations Center', number: '1900 1234', icon: '🏢' },
  { label: 'Emergency Hotline', number: '113',       icon: '🚨' },
  { label: 'Breakdown Rescue',  number: '0901 888 999', icon: '🔧' },
  { label: 'Medical Emergency', number: '115',       icon: '🏥' },
];

const NAV_ITEMS = [
  { id: 'battery',  icon: Battery,    label: 'Battery Status',    roles: ['admin'] },
  { id: 'power',    icon: Zap,        label: 'Power Load',        roles: ['admin'] },
  { id: 'vehicles', icon: Truck,      label: 'Vehicle Dashboard', roles: ['admin'] },
  { id: 'drivers',  icon: Users,      label: 'Driver Contact',    roles: ['admin'] },
  { id: 'incidents',icon: AlertTriangle, label: 'Incident Reports', roles: ['admin'] },
  { id: 'charging', icon: Calendar,   label: 'Charging Schedule', roles: ['admin'] },
  { id: 'kpi',      icon: BarChart3,  label: 'Pilot KPIs',        roles: ['admin'] },
];

const DRIVER_NAV = [
  { id: 'driver-home',      icon: Home,          label: 'My Dashboard' },
  { id: 'driver-battery',   icon: BatteryCharging, label: 'Battery Status' },
  { id: 'driver-warehouse', icon: Warehouse,     label: 'Warehouse / Slots' },
  { id: 'driver-incident',  icon: ClipboardList, label: 'Report Incident' },
  { id: 'driver-emergency', icon: Radio,         label: 'Emergency / SOS' },
  { id: 'driver-contacts',  icon: PhoneCall,     label: 'Emergency Contacts' },
];

const C = {
  bg: '#0F1117', surface: '#161B27', border: '#1E2940',
  blue: '#2D7DD2', amber: '#F4A259', red: '#E63946',
  green: '#2EC4B6', textMuted: '#64748B', text: '#CBD5E1', textBright: '#F1F5F9',
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
function fmtTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
function fmtDateTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
function SocColor(soc) { if (soc >= 50) return C.green; if (soc >= 20) return C.amber; return C.red; }
function TempColor(t) { if (t > 50) return C.red; if (t >= 45) return C.amber; return C.green; }
function StatusTagColor(tag) { if (tag === 'Isolated' || tag === 'Blocked') return C.red; if (tag === 'Warning') return C.amber; if (tag === 'Fault') return C.red; return C.green; }
function SeverityColor(s) { if (s === 'High') return C.red; if (s === 'Medium') return C.amber; return C.green; }
function ResolutionColor(r) { if (r === 'Resolved') return C.green; if (r === 'In Progress') return C.blue; return C.amber; }

// km range estimate from SoC (assume 80 km full charge)
function kmFromSoc(soc) { return Math.round((soc / 100) * 80); }

// ── UI COMPONENTS ──────────────────────────────────────────────────────────────
function Badge({ color, children, small }) {
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4,
      padding: small ? '1px 6px' : '2px 8px', fontSize: small ? 10 : 11,
      fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Card({ children, style, className }) {
  return (
    <div className={className} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, ...style }}>
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
        <div key={t.id} style={{ background: t.type === 'error' ? '#2d0a0d' : t.type === 'warn' ? '#2d1e00' : '#0a2d1f',
          border: `1px solid ${t.type === 'error' ? C.red : t.type === 'warn' ? C.amber : C.green}`,
          borderRadius: 8, padding: '10px 16px', color: C.textBright, fontSize: 13, maxWidth: 340,
          display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
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
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 20px',
      display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div className="blink" style={{ width: 8, height: 8, borderRadius: '50%', background: loadColor }} />
        <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Live Load</span>
      </div>
      <div style={{ flex: 1, height: 8, background: '#1E2940', borderRadius: 4, overflow: 'hidden', minWidth: 120 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: loadColor, borderRadius: 4,
          transition: 'width 1s ease, background 0.5s', boxShadow: `0 0 8px ${loadColor}88` }} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: loadColor, flexShrink: 0 }}>{powerLoad.toFixed(1)} kW</span>
      <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>/ 40 kW target</span>
      {powerLoad > 40 && <Badge color={powerLoad > 45 ? C.red : C.amber}>{powerLoad > 45 ? '⚠ OVER LIMIT' : '⚠ CAUTION'}</Badge>}
      <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.textMuted }}><span style={{ color: C.text }}>⚡ {normalCount}</span> Normal</span>
        <span style={{ fontSize: 11, color: C.textMuted }}><span style={{ color: C.amber }}>⚡ {fastCount}</span> Fast</span>
        <span style={{ fontSize: 11, color: C.textMuted }}><span style={{ color: C.blue }}>{slotsOccupied}</span>/50 Slots</span>
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
    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv?.toLowerCase() ?? ''; }
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
      <th onClick={() => { setSortField(field); setSortDir(active && sortDir === 'asc' ? 'desc' : 'asc'); }}
        style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: active ? C.blue : C.textMuted,
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
          background: '#0F1117', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    );
  }

  return (
    <div>
      <SectionTitle icon={Battery} title="Battery Status Monitor"
        subtitle={`${batteries.length} total · ${warnings} warnings · ${isolated} isolated · ${charging} charging`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Total Batteries', value: batteries.length, color: C.blue },
          { label: 'Charging Now', value: charging, color: C.green },
          { label: 'Warnings', value: warnings, color: C.amber },
          { label: 'Isolated', value: isolated, color: C.red }].map(s => (
          <Card key={s.label} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search BAT-ID or VH-ID..."
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', width: 200, fontFamily: 'monospace' }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }}
              style={{ background: filter === f ? C.blue : C.surface, color: filter === f ? '#fff' : C.textMuted,
                border: `1px solid ${filter === f ? C.blue : C.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
              {f}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto' }}>{filtered.length} results</span>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>
            <Th field="id" label="Battery ID" /><Th field="vehicleId" label="Vehicle" />
            <Th field="soc" label="SoC %" /><Th field="temp" label="Temp °C" />
            <Th field="chargingStatus" label="Status" /><Th field="chargerType" label="Charger" />
            <Th field="statusTag" label="Tag" /><Th field="cycleCount" label="Cycles" />
            <Th field="soh" label="SoH %" /><Th field="finishTime" label="Est. Finish" />
            <th style={{ padding: '8px 10px', fontSize: 11, color: C.textMuted, background: '#0F1117',
              borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fast Charge Risk</th>
          </tr></thead>
          <tbody>
            {paged.map((b, idx) => {
              const fastRisk = b.fastChargeCount > 3;
              const rowBg = idx % 2 === 0 ? C.surface : '#13182200';
              return (
                <tr key={b.id} style={{ background: b.statusTag === 'Isolated' ? '#2d0a0d22' : b.statusTag === 'Warning' ? '#2d1e0022' : rowBg, borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: '7px 10px' }}><span style={{ color: C.blue, fontWeight: 600, fontFamily: 'monospace' }}>{b.id}</span>{b.isSpare && <span style={{ fontSize: 9, color: C.textMuted, marginLeft: 4 }}>SPARE</span>}</td>
                  <td style={{ padding: '7px 10px', color: C.text, fontFamily: 'monospace' }}>{b.vehicleId || '—'}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 36, height: 5, background: '#1E2940', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${b.soc}%`, background: SocColor(b.soc), borderRadius: 3 }} />
                      </div>
                      <span style={{ color: SocColor(b.soc), fontWeight: 600, fontFamily: 'monospace' }}>{b.soc}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px' }}><span style={{ color: TempColor(b.temp), fontFamily: 'monospace' }}>{b.temp}°C</span></td>
                  <td style={{ padding: '7px 10px' }}><Badge color={b.chargingStatus === 'Charging' ? C.green : b.chargingStatus === 'Fault' ? C.red : b.chargingStatus === 'Isolated' ? C.red : C.textMuted} small>{b.chargingStatus}</Badge></td>
                  <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11 }}>{b.chargerType !== 'None' ? b.chargerType : '—'}</td>
                  <td style={{ padding: '7px 10px' }}><Badge color={StatusTagColor(b.statusTag)} small>{b.statusTag}</Badge></td>
                  <td style={{ padding: '7px 10px', color: C.text, fontFamily: 'monospace' }}>{b.cycleCount}</td>
                  <td style={{ padding: '7px 10px', color: b.soh < 80 ? C.amber : C.text, fontFamily: 'monospace' }}>{b.soh}%</td>
                  <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11, fontFamily: 'monospace' }}>{b.finishTime ? fmtTime(b.finishTime) : '—'}</td>
                  <td style={{ padding: '7px 10px' }}>{fastRisk ? <Badge color={C.amber} small>⚠ {b.fastChargeCount}x</Badge> : <span style={{ color: C.textMuted, fontSize: 11 }}>OK</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 12px', color: C.text, fontSize: 12, cursor: 'pointer' }}>← Prev</button>
          <span style={{ fontSize: 12, color: C.textMuted, alignSelf: 'center' }}>{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 12px', color: C.text, fontSize: 12, cursor: 'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── MODULE: POWER LOAD ─────────────────────────────────────────────────────────
function PowerModule({ batteries, powerLoad, normalCount, fastCount }) {
  const chargingBats = batteries.filter(b => b.chargingStatus === 'Charging');
  const hourlyData = Array.from({ length: 10 }, (_, i) => ({
    time: `${String(21 + Math.floor(i / 2)).padStart(2,'0')}:${i % 2 === 0 ? '00' : '30'}`,
    load: 20 + Math.random() * 25,
  }));
  return (
    <div>
      <SectionTitle icon={Zap} title="Power Load Monitor" subtitle="Live charging grid status" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Current Load', value: `${powerLoad.toFixed(1)} kW`, color: powerLoad > 45 ? C.red : powerLoad > 40 ? C.amber : C.green },
          { label: 'Normal Chargers Active', value: normalCount, color: C.blue },
          { label: 'Fast Chargers Active', value: fastCount, color: C.amber }].map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Estimated Load Profile — Tonight</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: C.textMuted }} domain={[0, 50]} />
            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
            <Line type="monotone" dataKey="load" stroke={C.blue} strokeWidth={2} dot={false} name="Load kW" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ── MODULE: VEHICLE DASHBOARD ──────────────────────────────────────────────────
function VehicleModule({ vehicles, setVehicles, role }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const filtered = vehicles.filter(v => {
    if (search && !v.id.includes(search.toUpperCase()) && !v.riderName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'All') return true;
    if (filter === 'Field') return v.location === 'In Field';
    if (filter === 'Warehouse') return v.location === 'At Warehouse';
    if (filter === 'Swap') return v.swapRecommended;
    return true;
  });
  function updateStatus(id, status) { setVehicles(prev => prev.map(v => v.id === id ? { ...v, status } : v)); }
  return (
    <div>
      <SectionTitle icon={Truck} title="Vehicle Dashboard" subtitle={`${vehicles.length} vehicles · ${vehicles.filter(v=>v.location==='In Field').length} in field`} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle or rider..."
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', width: 220 }} />
        {['All','Field','Warehouse','Swap'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter===f ? C.blue : C.surface, color: filter===f ? '#fff' : C.textMuted, border: `1px solid ${filter===f ? C.blue : C.border}`, borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#0F1117' }}>
            {['Vehicle','Rider','Type','Battery','SoC','Location','ETA','Daily Km','Swap','Status'].filter((h,i) => i !== 9 || role === 'admin').map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((v, idx) => (
              <tr key={v.id} style={{ background: v.swapRecommended ? '#2d1e0011' : idx % 2 === 0 ? C.surface : 'transparent', borderBottom: `1px solid ${C.border}22` }}>
                <td style={{ padding: '7px 10px', color: C.blue, fontWeight: 600, fontFamily: 'monospace' }}>{v.id}</td>
                <td style={{ padding: '7px 10px', color: C.textBright, fontSize: 12 }}>{v.riderName}</td>
                <td style={{ padding: '7px 10px' }}><Badge color={v.riderType === 'High-Mileage' ? C.amber : C.textMuted} small>{v.riderType}</Badge></td>
                <td style={{ padding: '7px 10px', color: C.text, fontSize: 11, fontFamily: 'monospace' }}>{v.batteryId}</td>
                <td style={{ padding: '7px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 32, height: 5, background: '#1E2940', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${v.soc}%`, background: SocColor(v.soc), borderRadius: 3 }} />
                    </div>
                    <span style={{ color: SocColor(v.soc), fontWeight: 600, fontFamily: 'monospace' }}>{v.soc}%</span>
                  </div>
                </td>
                <td style={{ padding: '7px 10px' }}><span style={{ color: v.location === 'In Field' ? C.green : C.blue, fontSize: 11 }}>{v.location === 'In Field' ? '📍' : '🏭'} {v.location}</span></td>
                <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11, fontFamily: 'monospace' }}>{fmtTime(v.returnETA)}</td>
                <td style={{ padding: '7px 10px', color: C.text, fontFamily: 'monospace' }}>{v.dailyKm} km</td>
                <td style={{ padding: '7px 10px' }}>{v.swapRecommended ? <Badge color={C.amber} small>⚠ SWAP</Badge> : <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>}</td>
                {role === 'admin' && (
                  <td style={{ padding: '7px 10px' }}>
                    <select value={v.status} onChange={e => updateStatus(v.id, e.target.value)}
                      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, padding: '3px 6px', outline: 'none', cursor: 'pointer' }}>
                      {['Active','Returned','Delayed','Off Duty'].map(s => <option key={s} value={s}>{s}</option>)}
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

// ── MODULE: DRIVERS (OPERATOR VIEW) ───────────────────────────────────────────
function DriversModule({ vehicles, setVehicles, incidents, addToast }) {
  const [search, setSearch] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [noteText, setNoteText] = useState('');
  const filtered = vehicles.filter(v => !search || v.riderName.toLowerCase().includes(search.toLowerCase()) || v.riderId.toLowerCase().includes(search.toLowerCase()));
  const incidentCount = {};
  incidents.forEach(inc => { incidentCount[inc.riderId] = (incidentCount[inc.riderId] || 0) + 1; });
  function sendAlert(vehicle, type) {
    const messages = { 'Low Battery': `⚡ Battery at ${vehicle.soc}% — return for charging`, 'Missed Charging': '🔋 Ensure battery plugged in overnight', 'Wrong Battery': '⚠ Battery mismatch detected' };
    setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, messages: [{ text: messages[type], time: new Date().toISOString(), type }, ...v.messages.slice(0, 2)] } : v));
    addToast(`Alert sent to ${vehicle.riderName}`, 'success');
  }
  function saveNote(vehicleId) { setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, notes: noteText } : v)); addToast('Note saved', 'success'); setSelectedRider(null); }
  return (
    <div>
      <SectionTitle icon={Users} title="Driver Contact & Communication" subtitle="Send alerts and manage rider notes" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..."
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', color: C.text, fontSize: 12, outline: 'none', width: 240 }} />
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#0F1117' }}>
            {['Rider ID','Name','Phone','Vehicle','Type','Incidents','Last Messages','Alerts','Note'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((v, idx) => {
              const iCount = incidentCount[v.riderId] || 0;
              const isRepeat = iCount > 3;
              return (
                <tr key={v.id} style={{ background: isRepeat ? '#2d0a0d11' : idx % 2 === 0 ? C.surface : 'transparent', borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11, fontFamily: 'monospace' }}>{v.riderId}</td>
                  <td style={{ padding: '7px 10px', color: C.textBright }}>{v.riderName}{isRepeat && <span style={{ marginLeft: 6, fontSize: 10, color: C.red, fontWeight: 700 }}>REPEAT ⚠</span>}</td>
                  <td style={{ padding: '7px 10px', color: C.text, fontSize: 11, fontFamily: 'monospace' }}>
                    <a href={`tel:${v.phone}`} style={{ color: C.blue, textDecoration: 'none' }}><Phone size={10} style={{ marginRight: 4 }} />{v.phone}</a>
                  </td>
                  <td style={{ padding: '7px 10px', color: C.blue, fontSize: 11, fontFamily: 'monospace' }}>{v.id}</td>
                  <td style={{ padding: '7px 10px' }}><Badge color={v.riderType === 'High-Mileage' ? C.amber : C.textMuted} small>{v.riderType}</Badge></td>
                  <td style={{ padding: '7px 10px' }}><span style={{ color: isRepeat ? C.red : iCount > 1 ? C.amber : C.text, fontWeight: 600, fontFamily: 'monospace' }}>{iCount}</span></td>
                  <td style={{ padding: '7px 10px', maxWidth: 180 }}>
                    {v.messages.length === 0 ? <span style={{ color: C.textMuted, fontSize: 10 }}>No messages</span> :
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {v.messages.slice(0, 2).map((m, mi) => (<div key={mi} style={{ fontSize: 10, color: C.textMuted }}><span style={{ color: C.blue }}>{fmtTime(m.time)}</span> {m.type}</div>))}
                      </div>}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['Low Battery','Missed Charging','Wrong Battery'].map(type => (
                        <button key={type} onClick={() => sendAlert(v, type)}
                          style={{ background: '#1E2940', border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 7px', fontSize: 10, color: C.blue, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <Send size={9} style={{ marginRight: 3 }} />{type}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', maxWidth: 160 }}>
                    {selectedRider === v.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add note..." autoFocus
                          style={{ background: '#0F1117', border: `1px solid ${C.blue}`, borderRadius: 4, padding: '3px 6px', color: C.text, fontSize: 11, outline: 'none', width: 100 }} />
                        <button onClick={() => saveNote(v.id)} style={{ background: C.blue, border: 'none', borderRadius: 4, padding: '3px 6px', color: '#fff', fontSize: 10, cursor: 'pointer' }}>Save</button>
                      </div>
                    ) : (
                      <div onClick={() => { setSelectedRider(v.id); setNoteText(v.notes || ''); }}
                        style={{ cursor: 'pointer', fontSize: 10, color: v.notes ? C.text : C.textMuted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

// ── MODULE: INCIDENTS (OPERATOR VIEW) ─────────────────────────────────────────
function IncidentModule({ incidents, setIncidents, vehicles, role, addToast }) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterResolution, setFilterResolution] = useState('All');
  const [form, setForm] = useState({ type: INCIDENT_TYPES[0], vehicleId: '', batteryId: '', description: '', severity: 'Medium' });
  const filtered = incidents.filter(i => {
    if (filterType !== 'All' && i.type !== filterType) return false;
    if (filterSeverity !== 'All' && i.severity !== filterSeverity) return false;
    if (filterResolution !== 'All' && i.resolution !== filterResolution) return false;
    return true;
  });
  const thisMonth = incidents.filter(i => { const d = new Date(i.time); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
  const typeCounts = {};
  incidents.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const weeklyData = Array.from({ length: 4 }, (_, wi) => {
    const end = new Date(); end.setDate(end.getDate() - wi * 7);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    return { week: `W-${4-wi}`, count: incidents.filter(i => { const d = new Date(i.time); return d >= start && d <= end; }).length };
  }).reverse();

  function submitIncident() {
    if (!form.vehicleId || !form.description) { addToast('Vehicle ID and description required', 'error'); return; }
    const vehicle = vehicles.find(v => v.id.toUpperCase() === form.vehicleId.toUpperCase());
    const newInc = { id: `INC-${String(incidents.length + 1).padStart(3,'0')}`, type: form.type, vehicleId: form.vehicleId.toUpperCase(), batteryId: form.batteryId.toUpperCase() || (vehicle?.batteryId ?? '—'), riderId: vehicle?.riderId ?? '—', riderName: vehicle?.riderName ?? 'Unknown', time: new Date().toISOString(), description: form.description, severity: form.severity, tag: AUTO_TAGS[form.type] || 'Operational', resolution: 'Open', resolutionNote: '', autoDetected: false };
    setIncidents(prev => [newInc, ...prev]);
    setForm({ type: INCIDENT_TYPES[0], vehicleId: '', batteryId: '', description: '', severity: 'Medium' });
    setShowForm(false);
    addToast('Incident report submitted', 'success');
  }
  function updateResolution(id, resolution) { setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolution } : i)); }

  return (
    <div>
      <SectionTitle icon={AlertTriangle} title="Incident Report & Analysis" subtitle="Safety events, operational anomalies, compliance issues"
        right={<button onClick={() => setShowForm(!showForm)} style={{ background: C.blue, border: 'none', borderRadius: 6, padding: '7px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {showForm ? 'Cancel' : 'Report Incident'}</button>} />
      {showForm && (
        <Card style={{ marginBottom: 16, border: `1px solid ${C.blue}44` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, marginBottom: 12 }}>New Incident Report</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Incident Type</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }}>{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))} style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none' }}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Vehicle ID</label>
              <input value={form.vehicleId} onChange={e => setForm(f => ({...f, vehicleId: e.target.value}))} placeholder="VH-001" style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'monospace' }} /></div>
            <div><label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Battery ID (optional)</label>
              <input value={form.batteryId} onChange={e => setForm(f => ({...f, batteryId: e.target.value}))} placeholder="BAT-001" style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'monospace' }} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe what happened..." rows={3}
                style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} /></div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Auto-tag: <Badge color={C.blue} small>{AUTO_TAGS[form.type] || 'Operational'}</Badge></span>
            <button onClick={submitIncident} style={{ marginLeft: 'auto', background: C.blue, border: 'none', borderRadius: 6, padding: '7px 20px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Submit Report</button>
          </div>
        </Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 200px', gap: 12, marginBottom: 16 }}>
        {[{ label: 'This Month', value: thisMonth.length, color: C.blue }, { label: 'Open', value: incidents.filter(i => i.resolution === 'Open').length, color: C.red }, { label: 'In Progress', value: incidents.filter(i => i.resolution === 'In Progress').length, color: C.amber }, { label: 'Resolved', value: incidents.filter(i => i.resolution === 'Resolved').length, color: C.green }].map(s => (
          <Card key={s.label} style={{ padding: 12 }}><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div><div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div></Card>
        ))}
        <Card style={{ padding: 12 }}><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Top Issue</div><div style={{ fontSize: 11, fontWeight: 600, color: C.amber, lineHeight: 1.4 }}>{topType?.[0]}</div><div style={{ fontSize: 18, color: C.amber, marginTop: 2, fontFamily: 'monospace' }}>{topType?.[1]}x</div></Card>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value="All">All Types</option>{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value="All">All Severities</option>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select>
        <select value={filterResolution} onChange={e => setFilterResolution(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value="All">All Statuses</option>{['Open','In Progress','Resolved'].map(s => <option key={s}>{s}</option>)}</select>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto', alignSelf: 'center' }}>{filtered.length} incidents</span>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#0F1117' }}>
            {['ID','Type','Vehicle','Rider','Time','Severity','Tag','Status','Action'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((inc, idx) => (
              <tr key={inc.id} style={{ background: idx % 2 === 0 ? C.surface : 'transparent', borderBottom: `1px solid ${C.border}22` }}>
                <td style={{ padding: '7px 10px', color: C.blue, fontFamily: 'monospace', fontSize: 11 }}>{inc.id}</td>
                <td style={{ padding: '7px 10px', color: C.text, fontSize: 11 }}>{inc.type}</td>
                <td style={{ padding: '7px 10px', color: C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>{inc.vehicleId}</td>
                <td style={{ padding: '7px 10px', color: C.text, fontSize: 11 }}>{inc.riderName}</td>
                <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 11 }}>{fmtDateTime(inc.time)}</td>
                <td style={{ padding: '7px 10px' }}><Badge color={SeverityColor(inc.severity)} small>{inc.severity}</Badge></td>
                <td style={{ padding: '7px 10px' }}><Badge color={C.blue} small>{inc.tag}</Badge></td>
                <td style={{ padding: '7px 10px' }}><Badge color={ResolutionColor(inc.resolution)} small>{inc.resolution}</Badge></td>
                <td style={{ padding: '7px 10px' }}>
                  <select value={inc.resolution} onChange={e => updateResolution(inc.id, e.target.value)}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, padding: '3px 6px', outline: 'none', cursor: 'pointer' }}>
                    {['Open','In Progress','Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
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
  function swapChargerType(slotId, newType) {
    setChargingSlots(prev => prev.map(s => s.id === slotId ? { ...s, chargerType: newType } : s));
    addToast(`Slot ${slotId} switched to ${newType}`, 'success');
  }
  const occupied = chargingSlots.filter(s => s.status === 'charging').length;
  const empty = chargingSlots.filter(s => s.status === 'empty').length;
  return (
    <div>
      <SectionTitle icon={Calendar} title="Charging Schedule" subtitle={`${occupied} charging · ${empty} empty slots`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Occupied', value: occupied, color: C.green }, { label: 'Empty', value: empty, color: C.textMuted }, { label: 'Total Slots', value: 50, color: C.blue }].map(s => (
          <Card key={s.label} style={{ padding: 12 }}><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div><div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div></Card>
        ))}
      </div>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
          {chargingSlots.map(slot => (
            <div key={slot.id} style={{ background: slot.status === 'empty' ? '#0F1117' : slot.status === 'fault' ? '#2d0a0d' : '#0a1f0a', border: `1px solid ${slot.status === 'empty' ? C.border : slot.status === 'fault' ? C.red : C.green}44`, borderRadius: 6, padding: 8, fontSize: 10 }}>
              <div style={{ fontFamily: 'monospace', color: C.textMuted, marginBottom: 4 }}>{slot.id}</div>
              {slot.status !== 'empty' ? (
                <>
                  <div style={{ color: C.blue, fontFamily: 'monospace', fontSize: 10, marginBottom: 4 }}>{slot.batteryId}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1, height: 4, background: '#1E2940', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${slot.currentSoc || 0}%`, background: SocColor(slot.currentSoc || 0), borderRadius: 2 }} />
                    </div>
                    <span style={{ color: SocColor(slot.currentSoc || 0), fontFamily: 'monospace' }}>{slot.currentSoc}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Badge color={slot.chargerType === 'Fast' ? C.amber : C.blue} small>{slot.chargerType}</Badge>
                    <span style={{ color: C.textMuted, fontFamily: 'monospace' }}>{slot.finishTime ? fmtTime(slot.finishTime) : '—'}</span>
                  </div>
                  {slot.status === 'charging' && (
                    <button onClick={() => swapChargerType(slot.id, slot.chargerType === 'Fast' ? 'Normal' : 'Fast')}
                      style={{ marginTop: 4, width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, padding: '2px 0', fontSize: 9, color: C.textMuted, cursor: 'pointer' }}>
                      → {slot.chargerType === 'Fast' ? 'Normal' : 'Fast'}
                    </button>
                  )}
                </>
              ) : <div style={{ color: C.textMuted, textAlign: 'center', padding: '8px 0' }}>— Empty —</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── MODULE: KPI ────────────────────────────────────────────────────────────────
function KPIModule({ batteries, vehicles, incidents }) {
  const totalVehicles = vehicles.length;
  const operational = vehicles.filter(v => v.status === 'Active').length;
  const fleetUptime = Math.round((operational / totalVehicles) * 100 * 10) / 10;
  const avgSocStart = Math.round(vehicles.reduce((s, v) => s + v.soc, 0) / vehicles.length);
  const fullyCharged = batteries.filter(b => !b.isSpare && b.soc >= 80).length;
  const chargingRate = Math.round((fullyCharged / 100) * 100);
  const incidentRate = Math.round((incidents.length / (100 * 90)) * 100 * 10) / 10;
  const fastChargeTotal = batteries.reduce((s, b) => s + b.fastChargeCount, 0);
  const fastChargeRate = Math.round((fastChargeTotal / Math.max(1, fastChargeTotal + batteries.filter(b => b.chargingStatus === 'Charging' && b.chargerType === 'Normal').length * 5)) * 100);
  const missedCharging = incidents.filter(i => { const d = new Date(i.time); const n = new Date(); return i.type === 'Missed Overnight Charging' && d.getMonth() === n.getMonth(); }).length;
  const avgTemp = Math.round(batteries.filter(b => b.chargingStatus === 'Charging').reduce((s, b) => s + b.temp, 0) / Math.max(1, batteries.filter(b => b.chargingStatus === 'Charging').length) * 10) / 10;
  const kpis = [
    { label: 'Fleet Uptime', value: `${fleetUptime}%`, target: '≥95%', met: fleetUptime >= 95, num: fleetUptime, max: 100 },
    { label: 'Avg SoC at Shift Start', value: `${avgSocStart}%`, target: '≥80%', met: avgSocStart >= 80, num: avgSocStart, max: 100 },
    { label: 'Charging Completion Rate', value: `${chargingRate}%`, target: '≥90%', met: chargingRate >= 90, num: chargingRate, max: 100 },
    { label: 'Incident Rate', value: `${incidentRate}`, target: '≤0.3', met: incidentRate <= 0.3, num: incidentRate, max: 1 },
    { label: 'Fast Charge Usage', value: `${fastChargeRate}%`, target: '≤30%', met: fastChargeRate <= 30, num: fastChargeRate, max: 100 },
    { label: 'Missed Charging This Month', value: missedCharging, target: '≤5', met: missedCharging <= 5, num: missedCharging, max: 20 },
    { label: 'Avg Charging End Temp', value: `${avgTemp}°C`, target: '<40°C', met: avgTemp < 40, num: avgTemp, max: 60 },
  ];
  const metCount = kpis.filter(k => k.met).length;
  const readinessColor = metCount >= 6 ? C.green : metCount >= 5 ? C.amber : C.red;
  const readinessLabel = metCount >= 6 ? 'READY TO SCALE' : metCount >= 5 ? 'BORDERLINE' : 'NOT READY';
  const trendData = Array.from({ length: 12 }, (_, i) => ({ month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], uptime: 88 + i * 0.7 + (Math.random() - 0.5) * 3, incidents: Math.max(0, 32 - i * 1.8 + (Math.random() - 0.5) * 4), chargingRate: 72 + i * 1.9 + (Math.random() - 0.5) * 4 }));
  return (
    <div>
      <SectionTitle icon={BarChart3} title="Pilot KPI Dashboard" subtitle="3-month EV pilot — scale readiness" />
      <Card style={{ marginBottom: 16, border: `1px solid ${readinessColor}44`, background: `${readinessColor}08` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid ${readinessColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${readinessColor}44`, flexShrink: 0 }}>
            <Shield size={28} color={readinessColor} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Scale Readiness Indicator</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: readinessColor }}>{readinessLabel}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{metCount} of {kpis.length} KPIs meeting target for 500–1,000 vehicle expansion</div>
          </div>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.slice(0,4).map(k => (
          <Card key={k.label} style={{ padding: 12, border: `1px solid ${k.met ? C.green : C.red}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>{k.label}</div><span style={{ color: k.met ? C.green : C.red, fontSize: 14 }}>{k.met ? '✓' : '✗'}</span></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.met ? C.textBright : C.red, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Target: {k.target}</div>
            <div style={{ marginTop: 6, height: 4, background: '#1E2940', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (k.num / k.max) * 100)}%`, background: k.met ? C.green : C.red, borderRadius: 2 }} />
            </div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.slice(4).map(k => (
          <Card key={k.label} style={{ padding: 12, border: `1px solid ${k.met ? C.green : C.amber}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>{k.label}</div><span style={{ color: k.met ? C.green : C.amber, fontSize: 14 }}>{k.met ? '✓' : '⚠'}</span></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.met ? C.textBright : C.amber, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Target: {k.target}</div>
          </Card>
        ))}
      </div>
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

// ══════════════════════════════════════════════════════════════════════════════
// ── DRIVER PORTAL MODULES ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── DRIVER: HOME DASHBOARD ─────────────────────────────────────────────────────
function DriverHomeModule({ vehicle, battery, incidents, addToast }) {
  if (!vehicle) return <div style={{ color: C.textMuted }}>Loading vehicle data…</div>;
  const soc = vehicle.soc;
  const km = kmFromSoc(soc);
  const myIncidents = incidents.filter(i => i.vehicleId === vehicle.id);
  const openIncidents = myIncidents.filter(i => i.resolution !== 'Resolved');
  const now = new Date();
  const shiftEnd = new Date(); shiftEnd.setHours(21,0,0,0);
  const hoursLeft = Math.max(0, (shiftEnd - now) / 3600000).toFixed(1);
  const socOk = soc >= 30;

  return (
    <div>
      <SectionTitle icon={Home} title={`Welcome, ${vehicle.riderName}`} subtitle={`Vehicle ${vehicle.id} · ${fmtDateTime(now.toISOString())}`} />

      {/* SoC / Range hero card */}
      <Card style={{ marginBottom: 16, border: `1px solid ${SocColor(soc)}44`, background: `${SocColor(soc)}06` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Big battery ring */}
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <svg viewBox="0 0 80 80" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke={C.border} strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={SocColor(soc)} strokeWidth="8"
                  strokeDasharray={`${(soc / 100) * 213.6} 213.6`} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: SocColor(soc), fontFamily: 'monospace', lineHeight: 1 }}>{soc}%</div>
                <div style={{ fontSize: 9, color: C.textMuted }}>BATTERY</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.textBright, fontFamily: 'monospace' }}>{km} km</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Estimated range remaining</div>
              {battery && <div style={{ fontSize: 11, color: TempColor(battery.temp), marginTop: 4 }}>🌡 Battery temp: {battery.temp}°C</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
            <div style={{ display: 'flex', justify: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Shift ends</div>
              <div style={{ fontSize: 11, color: C.text, fontFamily: 'monospace' }}>21:00 · {hoursLeft}h left</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Today's km</div>
              <div style={{ fontSize: 11, color: C.text, fontFamily: 'monospace' }}>{vehicle.dailyKm} km</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Location</div>
              <div style={{ fontSize: 11, color: vehicle.location === 'In Field' ? C.green : C.blue }}>{vehicle.location === 'In Field' ? '📍 In Field' : '🏭 Warehouse'}</div>
            </div>
          </div>
        </div>
        {!socOk && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#2d1e00', border: `1px solid ${C.amber}44`, borderRadius: 6, fontSize: 12, color: C.amber }}>
            ⚠ Battery below 30% — consider returning to warehouse for a swap or charge.
          </div>
        )}
        {vehicle.swapRecommended && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#2d0a0d', border: `1px solid ${C.red}44`, borderRadius: 6, fontSize: 12, color: C.red }}>
            🔴 Swap recommended — battery level too low for remaining shift hours.
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Check Warehouse', sub: 'View available slots', icon: Warehouse, color: C.blue, action: 'driver-warehouse' },
            { label: 'Report Incident', sub: 'Log an issue', icon: ClipboardList, color: C.amber, action: 'driver-incident' },
            { label: 'SOS / Emergency', sub: 'Urgent help needed', icon: Radio, color: C.red, action: 'driver-emergency' },
          ].map(qa => (
            <button key={qa.label}
              onClick={() => window.dispatchEvent(new CustomEvent('driverNav', { detail: qa.action }))}
              style={{ background: C.surface, border: `1px solid ${qa.color}44`, borderRadius: 10, padding: '14px 12px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s' }}>
              <qa.icon size={20} color={qa.color} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textBright }}>{qa.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{qa.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* My incidents summary */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, marginBottom: 10 }}>My Incident History</div>
        {myIncidents.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted }}>No incidents recorded for your vehicle. Keep it up! ✓</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myIncidents.slice(0, 4).map(inc => (
              <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.border}22` }}>
                <Badge color={SeverityColor(inc.severity)} small>{inc.severity}</Badge>
                <div style={{ flex: 1, fontSize: 12, color: C.text }}>{inc.type}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{fmtDate(inc.time)}</div>
                <Badge color={ResolutionColor(inc.resolution)} small>{inc.resolution}</Badge>
              </div>
            ))}
            {myIncidents.length > 4 && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>+{myIncidents.length - 4} more incidents</div>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── DRIVER: BATTERY STATUS ─────────────────────────────────────────────────────
function DriverBatteryModule({ vehicle, battery }) {
  if (!vehicle || !battery) return <div style={{ color: C.textMuted }}>No battery data.</div>;
  const soc = vehicle.soc;
  const km = kmFromSoc(soc);
  const kmPercentData = Array.from({ length: 11 }, (_, i) => ({ soc: i * 10, km: kmFromSoc(i * 10) }));

  return (
    <div>
      <SectionTitle icon={BatteryCharging} title="My Battery Status" subtitle={`Vehicle ${vehicle.id} · Battery ${vehicle.batteryId}`} />

      {/* Main status panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card style={{ border: `1px solid ${SocColor(soc)}44` }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>State of Charge</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: SocColor(soc), fontFamily: 'monospace', lineHeight: 1.1 }}>{soc}%</div>
          <div style={{ marginTop: 8, height: 10, background: '#1E2940', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${soc}%`, background: SocColor(soc), borderRadius: 5, transition: 'width 0.5s', boxShadow: `0 0 8px ${SocColor(soc)}88` }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
            {soc >= 80 ? '✅ Fully charged — ready for shift' :
             soc >= 50 ? '🟢 Good — sufficient for current route' :
             soc >= 30 ? '🟡 Moderate — plan a charge soon' :
             soc >= 15 ? '🟠 Low — return to warehouse' :
             '🔴 Critical — return immediately!'}
          </div>
        </Card>

        <Card style={{ border: `1px solid ${C.blue}44` }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Estimated Range</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.blue, fontFamily: 'monospace', lineHeight: 1.1 }}>{km} km</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Based on average 80 km per full charge</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Today's distance: <span style={{ color: C.text, fontFamily: 'monospace' }}>{vehicle.dailyKm} km</span></div>
        </Card>
      </div>

      {/* Health & Technical */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Battery Temperature', value: `${battery.temp}°C`, color: TempColor(battery.temp), note: battery.temp > 50 ? 'OVERHEATING — stop use' : battery.temp >= 45 ? 'Warm — monitor closely' : 'Normal' },
          { label: 'State of Health', value: `${battery.soh}%`, color: battery.soh >= 85 ? C.green : battery.soh >= 75 ? C.amber : C.red, note: battery.soh >= 85 ? 'Good condition' : battery.soh >= 75 ? 'Fair — aging' : 'Poor — needs attention' },
          { label: 'Charge Cycles', value: battery.cycleCount, color: battery.cycleCount > 500 ? C.amber : C.text, note: `${Math.max(0, 700 - battery.cycleCount)} cycles remaining` },
        ].map(s => (
          <Card key={s.label} style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{s.note}</div>
          </Card>
        ))}
      </div>

      {/* Range chart */}
      <Card>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Estimated Range at Each Battery Level</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={kmPercentData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="soc" tick={{ fontSize: 10, fill: C.textMuted }} tickFormatter={v => `${v}%`} />
            <YAxis tick={{ fontSize: 10, fill: C.textMuted }} tickFormatter={v => `${v}km`} />
            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} formatter={v => [`${v} km`, 'Range']} labelFormatter={l => `SoC: ${l}%`} />
            <Bar dataKey="km" fill={C.blue} radius={[3, 3, 0, 0]}>
              {kmPercentData.map((entry, index) => (
                <Cell key={index} fill={SocColor(entry.soc)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 8, padding: '8px 12px', background: `${SocColor(soc)}11`, borderRadius: 6, fontSize: 11, color: SocColor(soc) }}>
          📍 Current: <strong>{soc}% → {km} km remaining</strong>
        </div>
      </Card>

      {battery.temp > 45 && (
        <div style={{ marginTop: 12, padding: '12px 16px', background: '#2d0a0d', border: `1px solid ${C.red}44`, borderRadius: 8, fontSize: 12, color: C.red }}>
          ⚠ <strong>High battery temperature detected ({battery.temp}°C).</strong> Avoid fast charging. Park in shade. Contact operations if temp exceeds 55°C.
        </div>
      )}
    </div>
  );
}

// ── DRIVER: WAREHOUSE / SLOTS ──────────────────────────────────────────────────
function DriverWarehouseModule({ addToast }) {
  const [slots] = useState(WAREHOUSE_SLOTS);
  const [reserving, setReserving] = useState(null);
  const [reserved, setReserved] = useState(null);

  const available = slots.filter(s => s.status === 'available');
  const occupied  = slots.filter(s => s.status === 'occupied');
  const maintenance = slots.filter(s => s.status === 'maintenance');

  function reserveSlot(slotId) {
    setReserving(slotId);
    setTimeout(() => {
      setReserved(slotId);
      setReserving(null);
      addToast(`Slot ${slotId} reserved! Please arrive within 30 minutes.`, 'success');
    }, 1200);
  }

  const statusColor = s => s === 'available' ? C.green : s === 'occupied' ? C.red : C.amber;
  const statusLabel = s => s === 'available' ? 'Available' : s === 'occupied' ? 'Occupied' : 'Maintenance';

  return (
    <div>
      <SectionTitle icon={Warehouse} title="Warehouse Availability" subtitle="Check charging slot availability and reserve your spot" />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Available', value: available.length, color: C.green },
          { label: 'Occupied', value: occupied.length, color: C.red },
          { label: 'Maintenance', value: maintenance.length, color: C.amber }].map(s => (
          <Card key={s.label} style={{ padding: 14, border: `1px solid ${s.color}33` }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {reserved && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#0a2d1f', border: `1px solid ${C.green}44`, borderRadius: 8, fontSize: 12, color: C.green }}>
          ✅ <strong>Slot {reserved} is reserved for you.</strong> Please arrive at the warehouse within 30 minutes. Show this confirmation to the attendant.
        </div>
      )}

      {/* Slot grid */}
      {['Zone A','Zone B','Zone C','Zone D'].map(zone => {
        const zoneSlots = slots.filter(s => s.zone === zone);
        return (
          <div key={zone} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textBright, marginBottom: 8 }}>{zone}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {zoneSlots.map(slot => (
                <Card key={slot.id} style={{ border: `1px solid ${statusColor(slot.status)}44`, background: reserved === slot.id ? `${C.green}11` : C.surface }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.textBright }}>{slot.id}</span>
                    <Badge color={statusColor(slot.status)} small>{statusLabel(slot.status)}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>
                    Charger: <span style={{ color: slot.type === 'Fast' ? C.amber : C.blue }}>{slot.type}</span>
                    {slot.type === 'Fast' && <span style={{ color: C.textMuted }}> (1.8 kW)</span>}
                    {slot.type === 'Normal' && <span style={{ color: C.textMuted }}> (0.8 kW)</span>}
                  </div>
                  {slot.status === 'available' && slot.id !== reserved && (
                    <button onClick={() => reserveSlot(slot.id)} disabled={!!reserved || !!reserving}
                      style={{ width: '100%', background: reserved || reserving ? '#1E2940' : `${C.green}22`, border: `1px solid ${C.green}44`, borderRadius: 6, padding: '6px', fontSize: 11, color: C.green, cursor: reserved || reserving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                      {reserving === slot.id ? 'Reserving…' : '+ Reserve This Slot'}
                    </button>
                  )}
                  {reserved === slot.id && <div style={{ textAlign: 'center', fontSize: 11, color: C.green, fontWeight: 600 }}>✅ Reserved by you</div>}
                  {slot.status === 'occupied' && <div style={{ fontSize: 11, color: C.red }}>In use — check another slot</div>}
                  {slot.status === 'maintenance' && <div style={{ fontSize: 11, color: C.amber }}>Under maintenance</div>}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── DRIVER: REPORT INCIDENT ────────────────────────────────────────────────────
function DriverIncidentModule({ vehicle, incidents, setIncidents, addToast }) {
  const [form, setForm] = useState({ type: INCIDENT_TYPES[0], description: '', severity: 'Medium', location: '' });
  const [submitted, setSubmitted] = useState(false);
  const myIncidents = incidents.filter(i => i.vehicleId === vehicle?.id);

  function submitIncident() {
    if (!form.description) { addToast('Please describe what happened', 'error'); return; }
    const newInc = {
      id: `INC-${String(incidents.length + 1).padStart(3,'0')}`,
      type: form.type, vehicleId: vehicle.id, batteryId: vehicle.batteryId,
      riderId: vehicle.riderId, riderName: vehicle.riderName,
      time: new Date().toISOString(), description: form.description,
      severity: form.severity, tag: AUTO_TAGS[form.type] || 'Operational',
      resolution: 'Open', resolutionNote: '', autoDetected: false,
      location: form.location,
    };
    setIncidents(prev => [newInc, ...prev]);
    setForm({ type: INCIDENT_TYPES[0], description: '', severity: 'Medium', location: '' });
    setSubmitted(true);
    addToast('Incident reported — Operations has been notified.', 'success');
    setTimeout(() => setSubmitted(false), 4000);
  }

  const inpStyle = { width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div>
      <SectionTitle icon={ClipboardList} title="Report an Incident" subtitle="Log issues, damage, or operational problems" />

      {submitted && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#0a2d1f', border: `1px solid ${C.green}44`, borderRadius: 8, fontSize: 13, color: C.green }}>
          ✅ Report submitted successfully. Operations team has been notified and will follow up.
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, marginBottom: 14 }}>New Incident Report</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Incident Type</label>
          <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={{ ...inpStyle }}>
            {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Low','Medium','High'].map(s => (
                <button key={s} onClick={() => setForm(f => ({...f, severity: s}))}
                  style={{ flex: 1, background: form.severity === s ? `${SeverityColor(s)}22` : 'transparent', border: `1px solid ${form.severity === s ? SeverityColor(s) : C.border}`, borderRadius: 6, padding: '8px 4px', color: form.severity === s ? SeverityColor(s) : C.textMuted, fontSize: 12, cursor: 'pointer', fontWeight: form.severity === s ? 700 : 400 }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Location (optional)</label>
            <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Hoàn Kiếm intersection" style={{ ...inpStyle }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>What Happened?</label>
          <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe the incident in detail — what happened, when, and any relevant details…" rows={4}
            style={{ ...inpStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>Vehicle: <span style={{ color: C.blue, fontFamily: 'monospace' }}>{vehicle?.id}</span> · Auto-tag: <Badge color={C.blue} small>{AUTO_TAGS[form.type] || 'Operational'}</Badge></span>
          <button onClick={submitIncident} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Submit Report</button>
        </div>
      </Card>

      {/* My history */}
      {myIncidents.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, marginBottom: 10 }}>My Incident History ({myIncidents.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myIncidents.map(inc => (
              <div key={inc.id} style={{ padding: '8px 10px', background: '#0F1117', borderRadius: 6, border: `1px solid ${C.border}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{inc.type}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Badge color={SeverityColor(inc.severity)} small>{inc.severity}</Badge>
                    <Badge color={ResolutionColor(inc.resolution)} small>{inc.resolution}</Badge>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{inc.description}</div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{fmtDateTime(inc.time)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── DRIVER: EMERGENCY / SOS ────────────────────────────────────────────────────
function DriverEmergencyModule({ vehicle, setIncidents, incidents, addToast }) {
  const [sosSent, setSosSent] = useState(false);
  const [sosTime, setSosTime] = useState(null);
  const [location, setLocation] = useState('');
  const [emergencyType, setEmergencyType] = useState('Breakdown');

  const EMERGENCY_TYPES = [
    { id: 'Breakdown', label: 'Vehicle Breakdown', icon: '🔧', color: C.amber, desc: 'Vehicle stopped, unable to continue' },
    { id: 'Battery Fire', label: 'Battery Fire / Smoke', icon: '🔥', color: C.red, desc: 'Battery overheating or fire detected' },
    { id: 'Accident', label: 'Traffic Accident', icon: '🚗', color: C.red, desc: 'Collision or road accident' },
    { id: 'Medical', label: 'Medical Emergency', icon: '🏥', color: C.red, desc: 'Injury or health emergency' },
    { id: 'Theft', label: 'Theft / Security', icon: '🔐', color: C.amber, desc: 'Vehicle or package theft' },
    { id: 'Other', label: 'Other Emergency', icon: '📢', color: C.blue, desc: 'Any other urgent situation' },
  ];

  function sendSOS() {
    const selected = EMERGENCY_TYPES.find(e => e.id === emergencyType);
    const newInc = {
      id: `INC-${String(incidents.length + 1).padStart(3,'0')}`,
      type: selected.label, vehicleId: vehicle.id, batteryId: vehicle.batteryId,
      riderId: vehicle.riderId, riderName: vehicle.riderName,
      time: new Date().toISOString(),
      description: `🚨 SOS ALERT — ${selected.label}${location ? ` at ${location}` : ''}. Sent via driver app.`,
      severity: 'High', tag: 'Safety', resolution: 'Open', resolutionNote: '', autoDetected: false,
    };
    setIncidents(prev => [newInc, ...prev]);
    setSosSent(true);
    setSosTime(new Date().toISOString());
    addToast('🚨 SOS sent — Operations is responding!', 'warn');
  }

  if (sosSent) {
    return (
      <div>
        <SectionTitle icon={Radio} title="SOS Sent" subtitle="Help is on the way" />
        <Card style={{ border: `2px solid ${C.red}`, background: '#2d0a0d', marginBottom: 16 }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🚨</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.red, marginBottom: 4 }}>SOS ALERT SENT</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Sent at {fmtDateTime(sosTime)}</div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 16 }}>The Operations Center has been notified and is responding to your location.</div>
            <div style={{ fontSize: 11, color: C.amber }}>Stay at your location unless unsafe. Keep your phone available.</div>
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EMERGENCY_CONTACTS.map(c => (
            <a key={c.label} href={`tel:${c.number}`} style={{ textDecoration: 'none' }}>
              <Card style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 24 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: C.blue, fontFamily: 'monospace' }}>{c.number}</div>
                </div>
                <Phone size={16} color={C.blue} />
              </Card>
            </a>
          ))}
        </div>
        <button onClick={() => setSosSent(false)} style={{ marginTop: 16, width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px', color: C.textMuted, fontSize: 12, cursor: 'pointer' }}>
          Cancel SOS / I'm Safe Now
        </button>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle icon={Radio} title="Emergency / SOS" subtitle="Report emergencies and get immediate help" />

      <div style={{ padding: '12px 16px', background: '#2d1e00', border: `1px solid ${C.amber}44`, borderRadius: 8, fontSize: 12, color: C.amber, marginBottom: 16 }}>
        ⚠ Use SOS only for genuine emergencies. Pressing the button will immediately alert the Operations Center and may dispatch rescue.
      </div>

      {/* Emergency type selector */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, marginBottom: 12 }}>What is the emergency?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {EMERGENCY_TYPES.map(e => (
            <button key={e.id} onClick={() => setEmergencyType(e.id)}
              style={{ background: emergencyType === e.id ? `${e.color}22` : 'transparent', border: `1px solid ${emergencyType === e.id ? e.color : C.border}`, borderRadius: 8, padding: '10px 12px', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{e.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: emergencyType === e.id ? e.color : C.textBright }}>{e.label}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{e.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Current Location (optional but recommended)</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Trần Hưng Đạo street near Ben Thanh market..."
            style={{ width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <button onClick={sendSOS}
          style={{ width: '100%', background: `linear-gradient(135deg, #c0392b, ${C.red})`, border: 'none', borderRadius: 10, padding: '16px', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: 1, boxShadow: `0 4px 20px ${C.red}66` }}>
          🚨 SEND SOS — REQUEST EMERGENCY HELP
        </button>
      </Card>

      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Direct emergency contacts:</div>
      {EMERGENCY_CONTACTS.map(c => (
        <a key={c.label} href={`tel:${c.number}`} style={{ textDecoration: 'none' }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, cursor: 'pointer' }}>
            <div style={{ fontSize: 20 }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright }}>{c.label}</div>
              <div style={{ fontSize: 12, color: C.blue, fontFamily: 'monospace' }}>{c.number}</div>
            </div>
            <div style={{ padding: '6px 12px', background: `${C.blue}22`, border: `1px solid ${C.blue}44`, borderRadius: 6, fontSize: 11, color: C.blue }}>Call</div>
          </Card>
        </a>
      ))}
    </div>
  );
}

// ── DRIVER: EMERGENCY CONTACTS ─────────────────────────────────────────────────
function DriverContactsModule() {
  const tips = [
    { title: 'Battery overheating (>55°C)', steps: ['Stop immediately in a safe spot', 'Turn off the vehicle', 'Keep away from the battery', 'Call the Emergency Hotline: 1900 1234', 'Do not attempt to charge'] },
    { title: 'Flat tire / breakdown', steps: ['Move to a safe area off the road', 'Turn on hazard lights if available', 'Call Breakdown Rescue: 0901 888 999', 'Report via the SOS button in this app'] },
    { title: 'Low battery mid-route', steps: ['Check nearest warehouse slot availability', 'Request a battery swap if available', 'Contact Operations: 1900 1234', 'Do not run battery below 5%'] },
  ];
  return (
    <div>
      <SectionTitle icon={PhoneCall} title="Emergency Contacts & Safety Tips" subtitle="Stay safe on the road" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {EMERGENCY_CONTACTS.map(c => (
          <a key={c.label} href={`tel:${c.number}`} style={{ textDecoration: 'none' }}>
            <Card style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textBright }}>{c.label}</div>
                <div style={{ fontSize: 16, color: C.blue, fontFamily: 'monospace', fontWeight: 700 }}>{c.number}</div>
              </div>
              <div style={{ padding: '8px 16px', background: `${C.blue}22`, border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 13, color: C.blue, fontWeight: 600 }}>📞 Call</div>
            </Card>
          </a>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textBright, marginBottom: 12 }}>Safety Procedures</div>
      {tips.map(tip => (
        <Card key={tip.title} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.amber, marginBottom: 8 }}>⚡ {tip.title}</div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tip.steps.map((s, i) => <li key={i} style={{ fontSize: 12, color: C.text }}>{s}</li>)}
          </ol>
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState('driver'); // 'driver' | 'operator'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const inpStyle = { width: '100%', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.textBright, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' };

  function handleLogin() {
    setError('');
    if (tab === 'driver') {
      const vid = username.toUpperCase().startsWith('VH-') ? username.toUpperCase() : `VH-${username.padStart(3,'0')}`;
      const acc = DRIVER_ACCOUNTS[vid];
      if (acc && password === acc.password) {
        onLogin({ username: vid, role: 'driver', vehicleId: vid, label: `Driver · ${vid}` });
      } else {
        setError('Invalid vehicle ID or PIN. Try VH-001 / driver123');
      }
    } else {
      const acc = OPERATOR_ACCOUNTS[username];
      if (acc && acc.password === password) {
        onLogin({ username, role: acc.role, label: acc.label });
      } else {
        setError('Invalid credentials. Try admin / admin123');
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      {/* Grid bg */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.03, backgroundImage: 'linear-gradient(#2D7DD2 1px, transparent 1px), linear-gradient(90deg, #2D7DD2 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', width: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `linear-gradient(135deg, ${C.blue}, #1a5fa8)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${C.blue}44` }}>
              <Zap size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.textBright, letterSpacing: 1 }}>V-FLEET</div>
              <div style={{ fontSize: 10, color: C.blue, letterSpacing: 2, textTransform: 'uppercase' }}>Logistics</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted }}>EV Fleet — Hanoi Urban Delivery Pilot</div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 }}>
          {[{ id: 'driver', icon: Truck, label: 'Driver Login' }, { id: 'operator', icon: Shield, label: 'Operations' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(''); setUsername(''); setPassword(''); }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === t.id ? (t.id === 'driver' ? `${C.green}22` : `${C.blue}22`) : 'transparent',
                color: tab === t.id ? (t.id === 'driver' ? C.green : C.blue) : C.textMuted,
                fontWeight: tab === t.id ? 700 : 400, fontSize: 13, transition: 'all 0.2s' }}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* Login card */}
        <div style={{ background: C.surface, border: `1px solid ${tab === 'driver' ? C.green : C.blue}44`, borderRadius: 12, padding: 28, boxShadow: `0 0 40px rgba(0,0,0,0.5), 0 0 80px ${tab === 'driver' ? C.green : C.blue}08` }}>
          {tab === 'driver' ? (
            <>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18, padding: '8px 12px', background: `${C.green}11`, borderRadius: 6, border: `1px solid ${C.green}22` }}>
                🚴 Enter your Vehicle ID and PIN to access the driver dashboard.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Vehicle ID</label>
                <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="e.g. VH-001 or just 001" style={{ ...inpStyle, fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = C.green} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Driver PIN</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••" style={{ ...inpStyle }}
                  onFocus={e => e.target.style.borderColor = C.green} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
              {error && <div style={{ background: '#2d0a0d', border: `1px solid ${C.red}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.red, marginBottom: 16 }}>{error}</div>}
              <button onClick={handleLogin} style={{ width: '100%', background: `linear-gradient(135deg, ${C.green}, #1a8a80)`, border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 16px ${C.green}44` }}>
                🚴 Access Driver Portal
              </button>
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#0F1117', borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>DEMO ACCESS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['001','002','042','075'].map(n => (
                    <button key={n} onClick={() => { setUsername(`VH-${n}`); setPassword('driver123'); }}
                      style={{ background: `${C.green}11`, border: `1px solid ${C.green}33`, borderRadius: 5, padding: '4px 8px', color: C.green, fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
                      VH-{n}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>Click any vehicle ID above, then press Access Driver Portal</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18, padding: '8px 12px', background: `${C.blue}11`, borderRadius: 6, border: `1px solid ${C.blue}22` }}>
                🛡 Operations Center — admin access only.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="admin" style={{ ...inpStyle, fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = C.blue} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••" style={{ ...inpStyle }}
                  onFocus={e => e.target.style.borderColor = C.blue} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
              {error && <div style={{ background: '#2d0a0d', border: `1px solid ${C.red}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.red, marginBottom: 16 }}>{error}</div>}
              <button onClick={handleLogin} style={{ width: '100%', background: `linear-gradient(135deg, ${C.blue}, #1a5fa8)`, border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 16px ${C.blue}44` }}>
                Access Operations Center
              </button>
              <button onClick={() => { setUsername('admin'); setPassword('admin123'); }} style={{ marginTop: 10, width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px', color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>
                Use Admin Demo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DRIVER APP SHELL ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function DriverApp({ session, setSession, data, setData }) {
  const [activeModule, setActiveModule] = useState('driver-home');
  const toastTimers = useRef([]);

  // Listen for quick-action navigation events from within modules
  useEffect(() => {
    const handler = e => setActiveModule(e.detail);
    window.addEventListener('driverNav', handler);
    return () => window.removeEventListener('driverNav', handler);
  }, []);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setData(prev => prev ? { ...prev, toasts: [...prev.toasts, { id, message, type }] } : prev);
    const timer = setTimeout(() => setData(prev => prev ? { ...prev, toasts: prev.toasts.filter(t => t.id !== id) } : prev), 3500);
    toastTimers.current.push(timer);
  }

  function setIncidents(updater) {
    setData(prev => prev ? { ...prev, incidents: typeof updater === 'function' ? updater(prev.incidents) : updater } : prev);
  }

  if (!data) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>Loading fleet data…</div>;

  const vehicle = data.vehicles.find(v => v.id === session.vehicleId);
  const battery = vehicle ? data.batteries.find(b => b.id === vehicle.batteryId) : null;
  const soc = vehicle?.soc ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${C.green}, #1a8a80)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={15} color="#fff" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.textBright }}>V-FLEET</span>
        <span style={{ fontSize: 11, color: C.textMuted }}>Driver Portal</span>

        {/* Battery quick-status in header */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: `${SocColor(soc)}11`, border: `1px solid ${SocColor(soc)}33`, borderRadius: 6 }}>
            <Battery size={12} color={SocColor(soc)} />
            <span style={{ fontSize: 12, fontWeight: 700, color: SocColor(soc), fontFamily: 'monospace' }}>{soc}%</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>{kmFromSoc(soc)} km</span>
          </div>
          <div style={{ padding: '4px 10px', background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.textBright }}>
            {session.vehicleId}
          </div>
          <button onClick={() => setSession(null)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.textMuted, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar nav */}
        <div style={{ width: 190, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '12px 8px', flexShrink: 0, overflowY: 'auto' }}>
          {DRIVER_NAV.map(item => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            const isEmergency = item.id === 'driver-emergency';
            return (
              <button key={item.id} onClick={() => setActiveModule(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  background: active ? (isEmergency ? `${C.red}22` : `${C.green}22`) : 'transparent',
                  border: active ? `1px solid ${isEmergency ? C.red : C.green}44` : '1px solid transparent',
                  color: active ? (isEmergency ? C.red : C.green) : isEmergency ? `${C.red}99` : C.textMuted,
                  cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}>
                <Icon size={15} />
                {item.label}
                {isEmergency && !active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: C.red }} />}
              </button>
            );
          })}

          <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Logged in as</div>
            <div style={{ fontSize: 11, color: C.green, fontFamily: 'monospace' }}>{session.vehicleId}</div>
            {vehicle && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicle.riderName}</div>}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeModule === 'driver-home' && <DriverHomeModule vehicle={vehicle} battery={battery} incidents={data.incidents} addToast={addToast} />}
          {activeModule === 'driver-battery' && <DriverBatteryModule vehicle={vehicle} battery={battery} />}
          {activeModule === 'driver-warehouse' && <DriverWarehouseModule addToast={addToast} />}
          {activeModule === 'driver-incident' && <DriverIncidentModule vehicle={vehicle} incidents={data.incidents} setIncidents={setIncidents} addToast={addToast} />}
          {activeModule === 'driver-emergency' && <DriverEmergencyModule vehicle={vehicle} setIncidents={setIncidents} incidents={data.incidents} addToast={addToast} />}
          {activeModule === 'driver-contacts' && <DriverContactsModule />}
        </div>
      </div>
      <Toast toasts={data.toasts} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── OPERATOR APP SHELL ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function OperatorApp({ session, setSession, data, setData }) {
  const [activeModule, setActiveModule] = useState('battery');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toastTimers = useRef([]);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setData(prev => prev ? { ...prev, toasts: [...prev.toasts, { id, message, type }] } : prev);
    const timer = setTimeout(() => setData(prev => prev ? { ...prev, toasts: prev.toasts.filter(t => t.id !== id) } : prev), 3500);
    toastTimers.current.push(timer);
  }
  function setVehicles(updater) { setData(prev => prev ? { ...prev, vehicles: typeof updater === 'function' ? updater(prev.vehicles) : updater } : prev); }
  function setIncidents(updater) { setData(prev => prev ? { ...prev, incidents: typeof updater === 'function' ? updater(prev.incidents) : updater } : prev); }
  function setChargingSlots(updater) { setData(prev => prev ? { ...prev, chargingSlots: typeof updater === 'function' ? updater(prev.chargingSlots) : updater } : prev); }

  const { role } = session;
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(role));
  const slotsOccupied = data.batteries.filter(b => b.chargingStatus === 'Charging').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 100 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}><Menu size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${C.blue}, #1a5fa8)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.textBright, letterSpacing: 0.5 }}>V-FLEET</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>Operations Center</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 11, color: C.textMuted }}>LIVE</span>
          <div style={{ background: '#0F1117', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
            <span style={{ fontSize: 11, color: C.textBright }}>{session.username}</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>· {session.label}</span>
          </div>
          <button onClick={() => setSession(null)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.textMuted, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>

      <LiveLoadBar powerLoad={data.powerLoad} normalCount={data.normalChargerCount} fastCount={data.fastChargerCount} slotsOccupied={slotsOccupied} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebarOpen && (
          <div style={{ width: 200, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '12px 8px', flexShrink: 0, overflowY: 'auto' }}>
            {visibleNav.map(item => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button key={item.id} onClick={() => setActiveModule(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                    background: active ? `${C.blue}22` : 'transparent', border: active ? `1px solid ${C.blue}44` : '1px solid transparent',
                    color: active ? C.blue : C.textMuted, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}>
                  <Icon size={15} />{item.label}
                </button>
              );
            })}
            <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Pilot Status</div>
              <div style={{ fontSize: 11, color: C.green }}>● Active — Day 47/90</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>Hanoi Urban Zone</div>
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeModule === 'battery'   && <BatteryModule batteries={data.batteries} role={role} />}
          {activeModule === 'power'     && <PowerModule batteries={data.batteries} powerLoad={data.powerLoad} normalCount={data.normalChargerCount} fastCount={data.fastChargerCount} />}
          {activeModule === 'vehicles'  && <VehicleModule vehicles={data.vehicles} setVehicles={setVehicles} role={role} />}
          {activeModule === 'drivers'   && <DriversModule vehicles={data.vehicles} setVehicles={setVehicles} incidents={data.incidents} addToast={addToast} />}
          {activeModule === 'incidents' && <IncidentModule incidents={data.incidents} setIncidents={setIncidents} vehicles={data.vehicles} role={role} addToast={addToast} />}
          {activeModule === 'charging'  && role === 'admin' && <ChargingModule chargingSlots={data.chargingSlots} setChargingSlots={setChargingSlots} batteries={data.batteries} addToast={addToast} />}
          {activeModule === 'kpi'       && role === 'admin' && <KPIModule batteries={data.batteries} vehicles={data.vehicles} incidents={data.incidents} />}
        </div>
      </div>
      <Toast toasts={data.toasts} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN APP ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => { setData(generateInitialData()); }, []);

  if (!session) return <LoginScreen onLogin={setSession} />;
  if (!data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
      Initializing fleet data…
    </div>
  );

  if (session.role === 'driver') {
    return <DriverApp session={session} setSession={setSession} data={data} setData={setData} />;
  }
  return <OperatorApp session={session} setSession={setSession} data={data} setData={setData} />;
}
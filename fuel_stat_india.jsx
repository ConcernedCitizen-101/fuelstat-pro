import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  MapPin, ShieldAlert, FileWarning, TrendingUp, Droplets, Flame, 
  ChevronDown, Building2, Gauge, Activity, Clock, ShieldCheck, X, Zap
} from 'lucide-react';

// --- INITIALIZATION ---
// Note: Firebase config and App ID are provided by the environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fuel-stat-public-v16-agg';

const STATIC_FALLBACK = {
  "Delhi": { "New Delhi": { lpg: { domestic: 913, subsidy: 300, status: "Syncing..." }, petrol: { power: 104.20, normal: 96.72, trend: "0.00" }, diesel: { normal: 89.62, status: "Stable" } } },
  "Maharashtra": { "Mumbai": { lpg: { domestic: 912.50, subsidy: 300, status: "Syncing..." }, petrol: { power: 112.40, normal: 106.31, trend: "0.00" }, diesel: { normal: 94.27, status: "Stable" } } },
  "Karnataka": { "Bengaluru": { lpg: { domestic: 915.50, subsidy: 300, status: "High Demand" }, petrol: { power: 108.50, normal: 101.94, trend: "-0.05" }, diesel: { normal: 87.89, status: "Stable" } } }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [liveLedger, setLiveLedger] = useState({});
  const [state, setState] = useState("Maharashtra");
  const [city, setCity] = useState("Mumbai");
  const [activeTab, setActiveTab] = useState("lpg");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reports, setReports] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ fuelType: 'Domestic LPG', detail: '' });

  // 1. Auth Setup (Rule 3: Auth First)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth context failed", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Live Price Sync (Rule 1: Strict Paths)
  useEffect(() => {
    if (!user) return;
    const ledgerRef = collection(db, 'artifacts', appId, 'public', 'data', 'fuel_rates');
    const unsubscribe = onSnapshot(ledgerRef, (snapshot) => {
      const data = {};
      snapshot.docs.forEach(doc => { data[doc.id] = doc.data(); });
      if (Object.keys(data).length > 0) setLiveLedger(data);
    }, (err) => console.error("Sync Error:", err));
    return () => unsubscribe();
  }, [user]);

  // 3. Citizen Report Feed
  useEffect(() => {
    if (!user) return;
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'surcharge_reports');
    const unsubscribe = onSnapshot(reportsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => console.error("Feed Error:", err));
    return () => unsubscribe();
  }, [user]);

  const currentData = useMemo(() => {
    const source = Object.keys(liveLedger).length > 0 ? liveLedger : STATIC_FALLBACK;
    return source[state]?.[city] || { 
      lpg: { domestic: 0, subsidy: 0, status: "Unknown" },
      petrol: { normal: 0, power: 0, trend: "0.00" },
      diesel: { normal: 0, status: "Unknown" }
    };
  }, [liveLedger, state, city]);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!user || !form.detail) return;
    setIsSubmitting(true);
    try {
      const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'surcharge_reports');
      await addDoc(reportsRef, {
        city, state, fuel: form.fuelType, details: form.detail,
        timestamp: serverTimestamp(), reporterId: user.uid, verified: false
      });
      setShowReportModal(false);
      setForm({ fuelType: 'Domestic LPG', detail: '' });
    } catch (err) { console.error("Broadcast failed", err); }
    finally { setIsSubmitting(false); }
  };

  const PriceCard = ({ label, price, subtext, icon: Icon, colorClass, isLive }) => (
    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl shadow-2xl transition-all duration-500 hover:border-white/20">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</span>
          {isLive && (
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[7px] text-emerald-500 font-black uppercase tracking-widest">Live Sync</span>
            </div>
          )}
        </div>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div className="flex items-baseline gap-1.5 text-white">
        <span className="text-xs font-bold text-slate-500 font-mono">₹</span>
        <span className="text-4xl font-black tracking-tighter tabular-nums">
          {price > 0 ? price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "---"}
        </span>
      </div>
      <p className="mt-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">{subtext}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-slate-300 antialiased font-sans p-6 pb-44 selection:bg-orange-950">
      <header className="max-w-xl mx-auto flex justify-between items-center mb-16 pt-4">
        <div className="flex items-center gap-4">
          <Activity className="text-orange-600 w-8 h-8" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-white leading-none">FuelStat <span className="text-orange-600 italic font-light">Pro</span></h1>
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] mt-1.5">Crisis Surveillance Active</p>
          </div>
        </div>
        <div className="text-emerald-500 flex items-center gap-2">
           <Zap className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">Autopilot Sync</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto space-y-12">
        <section className="bg-[#080808] border border-white/5 rounded-[2.5rem] p-10 shadow-4xl">
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3" /> Regional Sector</label>
              <select className="w-full bg-black text-white text-lg font-black border-none appearance-none cursor-pointer" value={state} onChange={(e) => {
                const s = e.target.value;
                setState(s);
                const source = Object.keys(liveLedger).length > 0 ? liveLedger : STATIC_FALLBACK;
                const cities = Object.keys(source[s] || {});
                if (cities.length > 0) setCity(cities[0]);
              }}>
                {Object.keys(Object.keys(liveLedger).length > 0 ? liveLedger : STATIC_FALLBACK).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-4 border-l border-white/5 pl-10">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Building2 className="w-3 h-3" /> Hub</label>
              <select className="w-full bg-black text-white text-lg font-black border-none appearance-none cursor-pointer" value={city} onChange={(e) => setCity(e.target.value)}>
                {Object.keys((liveLedger[state] || STATIC_FALLBACK[state]) || {}).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        <div className="flex p-1 bg-[#0a0a0a] rounded-2xl border border-white/5 max-w-[240px] mx-auto shadow-inner">
          <button onClick={() => setActiveTab("lpg")} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'lpg' ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>LPG Gas</button>
          <button onClick={() => setActiveTab("liquid")} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'liquid' ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>Liquid Fuel</button>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-in fade-in duration-1000">
          {activeTab === 'lpg' ? (
            <>
              <PriceCard label="Domestic (14.2kg)" price={currentData.lpg.domestic} subtext={currentData.lpg.status} icon={Flame} colorClass="text-orange-500" isLive={Object.keys(liveLedger).length > 0} />
              <PriceCard label="Subsidy Flow" price={currentData.lpg.subsidy} subtext="Direct Verified" icon={TrendingUp} colorClass="text-emerald-500" isLive={Object.keys(liveLedger).length > 0} />
            </>
          ) : (
            <>
              <PriceCard label="Petrol (Normal)" price={currentData.petrol.normal} subtext={`Trend: ${currentData.petrol.trend}`} icon={Droplets} colorClass="text-blue-500" isLive={Object.keys(liveLedger).length > 0} />
              <PriceCard label="Diesel" price={currentData.diesel.normal} subtext={currentData.diesel.status} icon={Gauge} colorClass="text-slate-500" isLive={Object.keys(liveLedger).length > 0} />
            </>
          )}
        </section>

        <section className="space-y-6 pt-12">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-6">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Citizen Intelligence Feed</h2>
          </div>
          <div className="space-y-4">
            {reports.filter(r => r.city === city).length > 0 ? (
              reports.filter(r => r.city === city).map((r, i) => (
                <div key={r.id || i} className="bg-[#080808] p-8 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">{r.fuel} • Hub Report</span>
                    <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">{r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString() : 'Recent'}</span>
                  </div>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">{r.details}</p>
                  <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-slate-700 font-bold uppercase tracking-widest">Reporter Node ID: {r.reporterId?.slice(0, 8)}</div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <ShieldCheck className="w-12 h-12 text-slate-900 mx-auto mb-6 opacity-40" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Hub {city} is currently anomaly-free.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
        <button onClick={() => setShowReportModal(true)} className="w-full bg-white text-black font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-[11px] shadow-4xl hover:scale-[1.02] active:scale-95 transition-all">Submit Evidence</button>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-500">
          <div className="bg-[#0a0a0a] w-full max-w-sm p-12 rounded-[3.5rem] border border-white/10 relative">
            <button onClick={() => setShowReportModal(false)} className="absolute top-10 right-10 text-slate-600 hover:text-white transition-colors"><X /></button>
            <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Citizen Intel</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-12">Reporting for Hub: {city}</p>
            <form onSubmit={handleSubmitReport} className="space-y-8">
              <select className="w-full p-5 bg-black border border-white/5 rounded-2xl text-white font-bold appearance-none cursor-pointer" value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                <option>Domestic LPG</option><option>Normal Petrol</option><option>Diesel</option>
              </select>
              <textarea placeholder="Details of surcharge..." className="w-full p-6 bg-black border border-white/5 rounded-2xl text-white font-medium h-32 resize-none placeholder:text-slate-800" required value={form.detail} onChange={e => setForm({...form, detail: e.target.value})} />
              <button disabled={isSubmitting} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]">{isSubmitting ? "Transmitting..." : "Broadcast Intelligence"}</button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: black; overflow-x: hidden; }
        .shadow-4xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 1); }
        select:focus, textarea:focus { outline: none; }
      `}} />
    </div>
  );
};
export default App;
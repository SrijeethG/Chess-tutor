import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, HelpCircle, Save, Sparkles, Brain, Code, X } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage() {
  const [stockfishPath, setStockfishPath] = useState('');
  const [engineStatus, setEngineStatus] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await api.getStockfishSettings();
        if (settings) {
          setStockfishPath(settings.active_path || '');
          setEngineStatus(settings);
        }
      } catch (err) {
        console.error("Could not load Stockfish settings", err);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const res = await api.updateStockfishPath(stockfishPath);
      if (res.success) {
        setMessage(res.detail);
        const settings = await api.getStockfishSettings();
        setEngineStatus(settings);
      }
    } catch (err) {
      setError(err.message || "Failed to validate the specified executable binary path.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSettings = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.updateStockfishPath('');
      if (res.success) {
        setStockfishPath('');
        setMessage("Stockfish path cleared successfully. Reverted to pure Python Minimax.");
        const settings = await api.getStockfishSettings();
        setEngineStatus(settings);
      }
    } catch (err) {
      setError("Failed to clear path.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Engine Configuration</h2>
        <p className="text-chess-300 text-sm mt-1">Configure advanced chess engine analysis engines and Stockfish pathways.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* ENGINE PATH SAVER CARD */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-base">Stockfish Settings</h3>
          </div>

          {message && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
              {message}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* ACTIVE STATUS GRID CONTAINER */}
          <div className="p-4 rounded-xl border border-white/5 bg-chess-950/20 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <div>
              <span className="text-[10px] uppercase font-black text-chess-500 block">Active Mode Status</span>
              <span className="text-sm font-extrabold text-white mt-1 block">
                {engineStatus ? engineStatus.status : 'Fallback Mode (Minimax Fallback Active)'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${engineStatus && engineStatus.is_configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-[11px] font-black uppercase text-chess-300 tracking-wider">
                {engineStatus && engineStatus.is_configured ? 'UCI Loaded' : 'Local Fallback'}
              </span>
            </div>
          </div>

          {/* PATH SUBMISSION FORM */}
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-indigo-400 block">
                Stockfish Executable File Path (.exe)
              </label>
              
              <input 
                type="text" 
                value={stockfishPath}
                onChange={(e) => setStockfishPath(e.target.value)}
                placeholder="C:\tools\stockfish\stockfish-windows-x86-64-avx2.exe"
                className="glass-input block w-full px-3.5 py-3 rounded-xl text-xs"
              />
              
              <p className="text-[10px] text-chess-500 font-semibold leading-relaxed">
                Provide the absolute local filepath to the downloaded Stockfish binary executable. For example: <code className="text-indigo-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">C:\ChessEngine\stockfish.exe</code>
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md hover-lift transition-colors"
              >
                {loading ? "Validating Path..." : "Save and Validate Path"}
              </button>
              {stockfishPath && (
                <button
                  type="button"
                  onClick={handleClearSettings}
                  disabled={loading}
                  className="py-3 px-5 border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all"
                >
                  Clear Path
                </button>
              )}
            </div>

          </form>

        </div>

        {/* HELP MANUAL DRIVER */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          
          <div className="flex items-center space-x-2.5">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-base">Tutorial: Configuring Stockfish Chess Engine</h3>
          </div>

          <div className="space-y-4 pt-3.5 border-t border-white/5 text-xs text-chess-300 leading-relaxed font-semibold">
            
            <div className="space-y-1">
              <h4 className="text-white font-extrabold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span>1. Download the Engine Binary</span>
              </h4>
              <p className="pl-4">
                Visit the official <a href="https://stockfishchess.org/download/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Stockfish Chess Engine website</a> and download the pre-compiled version for Windows (AVX2 or POPCNT optimized zip).
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-white font-extrabold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span>2. Extract the Executable</span>
              </h4>
              <p className="pl-4">
                Unzip the folder and move the executable file (<code className="text-indigo-400 bg-black/40 px-1 py-0.5 rounded font-mono">.exe</code> format) to a solid folder pathway, e.g. <code className="text-chess-400 bg-black/30 px-1 py-0.5 rounded font-mono">C:\tools\stockfish.exe</code>.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-white font-extrabold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span>3. Apply Path in Form Above</span>
              </h4>
              <p className="pl-4">
                Paste the path into the field above and click save. The system launches uci process tests in the background to verify the connection and instantly integrates Stockfish analysis in your training pages!
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

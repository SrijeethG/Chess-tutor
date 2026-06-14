import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Play, 
  Search, 
  Dribbble, 
  BookOpen, 
  HelpCircle, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  ChevronRight,
  TrendingUp,
  Brain
} from 'lucide-react';
import { api } from '../services/api';

export default function MainLayout({ children, activeTab, setActiveTab, user, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState("Analyzing your latest games...");
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    // Dynamically fetch quick stats & coach prompt for the sidebar
    async function loadStats() {
      try {
        const stats = await api.getStats();
        setUserStats(stats);
        if (stats) {
          if (stats.estimated_elo < 1000) {
            setCoachAdvice("Focus on material safety! Before making a move, ensure your piece is defended.");
          } else if (stats.estimated_elo < 1300) {
            setCoachAdvice("Good progress! Watch out for knight forks and look to double your rooks on open files.");
          } else {
            setCoachAdvice("Superb tactical vision. Start studying deep theoretical opening lines to dominate early.");
          }
        }
      } catch (err) {
        setCoachAdvice("Practice tactical puzzles daily to sharpen your board vision!");
      }
    }
    loadStats();
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Trophy },
    { id: 'play', name: 'Play vs AI', icon: Play },
    { id: 'analysis', name: 'Analysis Board', icon: Search },
    { id: 'puzzles', name: 'Puzzle Trainer', icon: Brain },
    { id: 'openings', name: 'Opening Trainer', icon: BookOpen },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-chess-950 text-chess-100 selection:bg-indigo-500 selection:text-white overflow-hidden">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-white/5 p-5 flex-shrink-0 z-20">
        
        {/* LOGO */}
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-600/30 animate-pulse-slow">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wider text-white">ChessMaster</h1>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">AI Trainer</span>
          </div>
        </div>

        {/* PROFILE QUICK STAT */}
        <div className="glass-card rounded-xl p-4 mb-6 border border-white/5 relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all duration-300"></div>
          <div className="flex items-center space-x-3 relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
              {user ? user.username.slice(0, 2).toUpperCase() : 'G'}
            </div>
            <div>
              <div className="text-sm font-semibold text-white truncate max-w-[130px]">{user ? user.username : 'Guest Mode'}</div>
              <div className="flex items-center space-x-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400">Elo {userStats ? userStats.estimated_elo : '1200'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-l-4 border-indigo-400' 
                    : 'text-chess-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-chess-500 group-hover:text-white'}`} />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 opacity-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'group-hover:opacity-60'}`} />
              </button>
            );
          })}
        </nav>

        {/* AI COACH SIDEBAR CARD */}
        <div className="glass-card rounded-2xl p-4 mt-6 border border-white/5 bg-gradient-to-b from-indigo-950/20 to-violet-950/20 shadow-inner">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
            <div className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center space-x-1">
              <Brain className="w-3 h-3 text-indigo-400" />
              <span>AI Coach Coachy</span>
            </div>
          </div>
          <p className="text-xs text-chess-300 leading-relaxed italic">
            "{coachAdvice}"
          </p>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 glass-panel border-b border-white/5 flex items-center justify-between px-4 z-30">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-indigo-500" />
          <span className="font-extrabold text-sm tracking-wider text-white">ChessMaster</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg bg-white/5 text-chess-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE NAVIGATION DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-chess-950/95 backdrop-blur-xl z-20 p-5 flex flex-col justify-between">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-chess-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
          
          <button 
            onClick={() => {
              onLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-3 py-3 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 relative">
        <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
          {children}
        </div>
      </main>
      
    </div>
  );
}

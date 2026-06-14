import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Brain, 
  BookOpen, 
  Clock, 
  ShieldCheck, 
  Award, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  TrendingUp, 
  Zap 
} from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ setActiveTab, setSelectPuzzleId }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [games, setGames] = useState([]);
  
  // Custom checklist state preserved in localStorage
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem("chess_training_checklist");
    if (saved) return JSON.parse(saved);
    return Array(7).fill(false);
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const userStats = await api.getStats();
        setStats(userStats);
        
        const coachReport = await api.getCoachReport();
        setReport(coachReport);
        
        const history = await api.getGames();
        setGames(history);
      } catch (err) {
        console.error("Dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleChecklist = (idx) => {
    const updated = [...checklist];
    updated[idx] = !updated[idx];
    setChecklist(updated);
    localStorage.setItem("chess_training_checklist", JSON.stringify(updated));
  };

  // Calculates basic statistics
  const totalGames = games.length;
  const wins = games.filter(g => {
    const isWhite = g.pgn.includes('White "demo"') || g.pgn.includes('White "Guest User"');
    if (g.result === "1-0") return isWhite;
    if (g.result === "0-1") return !isWhite;
    return false;
  }).length;
  const draws = games.filter(g => g.result === "1/2-1/2" || g.result === "1/2").length;
  const losses = Math.max(0, totalGames - wins - draws);
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  
  const avgAccuracy = totalGames > 0 
    ? Math.round(games.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / totalGames)
    : stats ? Math.round(stats.accuracy_score) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-chess-300 font-medium">Gathering training logs...</p>
      </div>
    );
  }

  // Generate SVG line chart points for Accuracy and Elo trends
  const renderTrendChart = (data, colorClass, minVal = 0, maxVal = 100) => {
    if (!data || data.length < 2) {
      data = [minVal, ...data, maxVal]; // Padding for blank states
    }
    const width = 500;
    const height = 150;
    const padding = 20;
    
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const pointsCount = data.length;
    const stepX = chartWidth / (pointsCount - 1);
    
    const maxData = Math.max(...data) + 5;
    const minData = Math.max(0, Math.min(...data) - 5);
    const dataRange = (maxData - minData) || 1;
    
    const points = data.map((val, idx) => {
      const x = padding + idx * stepX;
      const y = padding + chartHeight - ((val - minData) / dataRange) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* Draw grid lines */}
        <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
        <line x1={padding} y1={padding+chartHeight/2} x2={width-padding} y2={padding+chartHeight/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
        <line x1={padding} y1={padding+chartHeight} x2={width-padding} y2={padding+chartHeight} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
        
        {/* Polyline */}
        <polyline
          fill="none"
          stroke={colorClass === 'indigo' ? '#6366f1' : '#10b981'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        
        {/* Draw dots */}
        {data.map((val, idx) => {
          const x = padding + idx * stepX;
          const y = padding + chartHeight - ((val - minData) / dataRange) * chartHeight;
          return (
            <g key={idx} className="group cursor-pointer">
              <circle cx={x} cy={y} r="4" fill={colorClass === 'indigo' ? '#6366f1' : '#10b981'} />
              <circle cx={x} cy={y} r="8" fill={colorClass === 'indigo' ? '#6366f1' : '#10b981'} opacity="0.3" className="hover:scale-150 transition-transform" />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Your Training Hub</h2>
          <p className="text-chess-300 text-sm mt-1">Review stats, track weakness reports, and practice structured daily lessons.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab('play')}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover-lift"
          >
            <Zap className="w-4.5 h-4.5" />
            <span>Play vs AI</span>
          </button>
          <button 
            onClick={() => setActiveTab('puzzles')}
            className="flex items-center space-x-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <Brain className="w-4.5 h-4.5 text-indigo-400" />
            <span>Tactical Puzzles</span>
          </button>
        </div>
      </div>

      {/* CORE FOUR STATISTICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* ELO */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover-lift">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Estimated ELO</span>
          </div>
          <div className="text-3xl font-black text-white">{stats ? stats.estimated_elo : '1220'}</div>
          <div className="text-[11px] font-semibold text-emerald-400 mt-1 flex items-center space-x-1">
            <span>Progress: Active Learner</span>
          </div>
        </div>

        {/* WIN RATE */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover-lift">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Win Rate</span>
          </div>
          <div className="text-3xl font-black text-white">{winRate}%</div>
          <div className="text-[11px] font-semibold text-chess-500 mt-1">
            {wins} W - {draws} D - {losses} L
          </div>
        </div>

        {/* ACCURACY */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover-lift">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Avg Accuracy</span>
          </div>
          <div className="text-3xl font-black text-white">{avgAccuracy}%</div>
          <div className="text-[11px] font-semibold text-amber-400 mt-1">
            Across {totalGames} analyzed games
          </div>
        </div>

        {/* PUZZLE RATING */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover-lift">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl group-hover:bg-violet-500/10 transition-colors" />
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Tactics Rating</span>
          </div>
          <div className="text-3xl font-black text-white">{stats ? Math.round(stats.tactics_score) : '1250'}</div>
          <div className="text-[11px] font-semibold text-violet-400 mt-1">
            Based on puzzle attempts
          </div>
        </div>

      </div>

      {/* CORE LAYOUT: CHARTS AND COACHING ADVICE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG PERFORMANCE CHARTS */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-white text-base">Game-by-Game Accuracy Trend</h3>
                <p className="text-xs text-chess-500 mt-0.5">Move accuracy score (%) of your last matches</p>
              </div>
              <div className="text-xs font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg">
                Avg: {avgAccuracy}%
              </div>
            </div>
            <div className="h-40 flex items-end">
              {renderTrendChart(
                games.length ? games.map(g => g.accuracy || 50.0).slice(-10) : [60, 68, 62, 74, 84],
                'emerald',
                50,
                100
              )}
            </div>
          </div>

          {/* ELO PROGRESSION */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-white text-base">Estimated Elo Progression</h3>
                <p className="text-xs text-chess-500 mt-0.5">Performance rating index over game milestones</p>
              </div>
              <div className="text-xs font-bold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg">
                Peak: {stats ? stats.estimated_elo : '1220'}
              </div>
            </div>
            <div className="h-40 flex items-end">
              {renderTrendChart(
                games.length ? games.map((g, idx) => 1200 + (g.result === '1-0' ? 15 : -15) * idx).slice(-10) : [1180, 1195, 1180, 1205, 1220],
                'indigo',
                1000,
                1500
              )}
            </div>
          </div>

        </div>

        {/* AI COACH AND WEEK PLAN CARD */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-5 flex flex-col h-full">
          
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 animate-pulse-slow">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">AI Performance Review</h3>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">Weekly Coached Advice</p>
            </div>
          </div>

          {/* ADVICE BALLOON */}
          <div className="glass-card p-4 rounded-xl border border-white/5 bg-gradient-to-r from-indigo-950/20 to-violet-950/10 relative">
            <p className="text-xs text-chess-300 leading-relaxed italic">
              "{report ? report.advice : 'Analyzing your performance statistics. Complete a game vs AI to generate personalized suggestions.'}"
            </p>
          </div>

          {/* STRENGTHS AND WEAKNESSES */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Detected Strengths</h4>
              <ul className="space-y-1.5">
                {report && report.strengths.map((str, idx) => (
                  <li key={idx} className="text-xs text-chess-300 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span>{str}</span>
                  </li>
                ))}
                {(!report || !report.strengths.length) && (
                  <li className="text-xs text-chess-500 italic">No historical matches to gauge strength yet.</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Primary Weaknesses</h4>
              <ul className="space-y-1.5">
                {report && report.weaknesses.map((weak, idx) => (
                  <li key={idx} className="text-xs text-chess-300 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                    <span>{weak}</span>
                  </li>
                ))}
                {(!report || !report.weaknesses.length) && (
                  <li className="text-xs text-chess-500 italic">Play games to identify tactical oversights.</li>
                )}
              </ul>
            </div>
          </div>

        </div>

      </div>

      {/* WEEKLY PLAN AND CHECKLIST SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DYNAMIC 7-DAY SCHEDULE */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/5">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-base">Weekly Personal Training Checklist</h3>
          </div>
          
          <div className="space-y-3">
            {report && report.training_plan.week_plan.map((dayPlan, idx) => (
              <div 
                key={idx}
                onClick={() => toggleChecklist(idx)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all duration-200 ${
                  checklist[idx] 
                    ? 'border-indigo-500/30 bg-indigo-500/5' 
                    : 'border-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={checklist[idx]} 
                    readOnly
                    className="rounded border-white/10 text-indigo-600 focus:ring-transparent bg-transparent h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-black text-indigo-400 mr-2">{dayPlan.day}:</span>
                    <span className={`text-xs font-bold text-white ${checklist[idx] ? 'line-through opacity-50' : ''}`}>{dayPlan.topic}</span>
                    <p className={`text-[11px] text-chess-300 mt-0.5 ${checklist[idx] ? 'line-through opacity-40' : ''}`}>{dayPlan.activity}</p>
                  </div>
                </div>
                {checklist[idx] && <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 px-2 py-0.5 bg-indigo-600/10 rounded-lg">Done</span>}
              </div>
            ))}
            {!report && (
              <div className="text-center py-6 text-xs text-chess-500 italic">Complete matches vs AI to schedule a custom week study plan.</div>
            )}
          </div>
        </div>

        {/* AI TRAINING ENGINE RECOMMENDATIONS */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-base">Plan Recommendations</h3>
          </div>

          <div className="space-y-4">
            
            {/* PUZZLES RECS */}
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 block mb-2">Solve Weak Area Puzzles</span>
              <div className="space-y-2">
                {report && report.training_plan.recommended_puzzles.map((puzId) => (
                  <button
                    key={puzId}
                    onClick={() => {
                      setSelectPuzzleId(puzId);
                      setActiveTab('puzzles');
                    }}
                    className="w-full text-left p-3 rounded-xl border border-white/5 glass-card hover:border-indigo-500/30 flex items-center justify-between group transition-colors hover-lift"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">Seeded Puzzle #{puzId}</span>
                      <span className="text-[10px] text-chess-500">Targets: Forks / Tacticals</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-chess-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
                {(!report || !report.training_plan.recommended_puzzles.length) && (
                  <button 
                    onClick={() => setActiveTab('puzzles')}
                    className="w-full text-center p-3 rounded-xl border border-white/5 glass-card text-xs text-chess-300 hover:text-white transition-colors"
                  >
                    Load Puzzle Trainer
                  </button>
                )}
              </div>
            </div>

            {/* OPENING RECS */}
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 block mb-2">Practice Openings Book</span>
              <div className="space-y-2">
                {report && report.training_plan.recommended_openings.map((opName, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab('openings')}
                    className="w-full text-left p-3 rounded-xl border border-white/5 glass-card hover:border-indigo-500/30 flex items-center justify-between group transition-colors hover-lift"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{opName}</span>
                      <span className="text-[10px] text-chess-500">Perfect your theoretical variations</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-chess-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
                {(!report || !report.training_plan.recommended_openings.length) && (
                  <button 
                    onClick={() => setActiveTab('openings')}
                    className="w-full text-center p-3 rounded-xl border border-white/5 glass-card text-xs text-chess-300 hover:text-white transition-colors"
                  >
                    Load Opening Trainer
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

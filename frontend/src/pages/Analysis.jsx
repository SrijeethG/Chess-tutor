import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Sparkles, 
  Brain, 
  Play, 
  Zap, 
  ShieldAlert, 
  CheckCircle, 
  TrendingUp, 
  Eye 
} from 'lucide-react';
import { api } from '../services/api';

export default function Analysis() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  
  // Custom manual PGN input states
  const [manualPgn, setManualPgn] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);

  // Active replay states
  const [activeMoveIndex, setActiveMoveIndex] = useState(-1);
  const [activeFen, setActiveFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [squareHeat, setSquareHeat] = useState({});

  useEffect(() => {
    async function loadGames() {
      try {
        const history = await api.getGames();
        setGames(history);
        if (history.length > 0) {
          handleSelectGame(history[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadGames();
  }, []);

  const handleSelectGame = async (gameObj) => {
    setSelectedGame(gameObj);
    if (gameObj.analysis_json) {
      const parsed = JSON.parse(gameObj.analysis_json);
      setAnalysisReport(parsed);
      setupActiveReplay(parsed, -1);
    } else {
      // If not pre-analyzed, analyze it now!
      setLoading(true);
      try {
        const report = await api.reviewGame(gameObj.pgn);
        setAnalysisReport(report);
        setupActiveReplay(report, -1);
      } catch (e) {
        console.error("Manual review failed", e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManualReviewSubmit = async (e) => {
    e.preventDefault();
    if (!manualPgn) return;
    setLoading(true);
    try {
      const report = await api.reviewGame(manualPgn);
      setAnalysisReport(report);
      setSelectedGame({ pgn: manualPgn, opponent_strength: 1500 });
      setupActiveReplay(report, -1);
    } catch (err) {
      alert("Invalid PGN format. Could not compile analysis.");
    } finally {
      setLoading(false);
    }
  };

  const setupActiveReplay = (report, moveIdx) => {
    setActiveMoveIndex(moveIdx);
    if (moveIdx === -1) {
      setActiveFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      setSquareHeat({});
      return;
    }
    const moveReview = report.reviews[moveIdx];
    if (moveReview) {
      setActiveFen(moveReview.fen);
      
      // Calculate visual highlights for move reviewed (from/to squares)
      const uci = moveReview.move_uci;
      if (uci && uci.length >= 4) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        
        // Setup simple green/blue colors for best moves vs normal reviews
        const color = getMoveColor(moveReview.classification);
        setSquareHeat({
          [from]: { backgroundColor: `${color}40` },
          [to]: { backgroundColor: `${color}60` }
        });
      }
    }
  };

  // Compile a move heatmap showing occupancy throughout the entire game
  const generateMoveHeatmap = () => {
    if (!analysisReport) return {};
    
    const countMap = {};
    analysisReport.reviews.forEach((rev) => {
      const uci = rev.move_uci;
      if (uci && uci.length >= 4) {
        const toSquare = uci.slice(2, 4);
        countMap[toSquare] = (countMap[toSquare] || 0) + 1;
      }
    });

    // Translate counts to customized CSS opacity highlights
    const styles = {};
    const maxVal = Math.max(...Object.values(countMap), 1);
    
    Object.keys(countMap).forEach((sq) => {
      const density = countMap[sq] / maxVal;
      // Vibrant yellow/red indicator based on piece visit counts
      styles[sq] = {
        backgroundColor: `rgba(239, 68, 68, ${density * 0.4})`,
        border: `1px solid rgba(239, 68, 68, ${density * 0.3})`
      };
    });
    return styles;
  };

  const toggleHeatmap = () => {
    const activeHeat = generateMoveHeatmap();
    // Toggle between regular move highlights or the full game heatmap
    if (Object.keys(squareHeat).length > 2) {
      setupActiveReplay(analysisReport, activeMoveIndex); // revert
    } else {
      setSquareHeat(activeHeat);
    }
  };

  const getMoveColor = (classification) => {
    switch (classification) {
      case 'brilliant': return 'rgba(168, 85, 247, '; // purple
      case 'great': return 'rgba(59, 130, 246, '; // blue
      case 'best': return 'rgba(16, 185, 129, '; // emerald
      case 'excellent': return 'rgba(52, 211, 153, '; // light emerald
      case 'book': return 'rgba(100, 116, 139, '; // slate
      case 'inaccuracy': return 'rgba(234, 179, 8, '; // amber
      case 'mistake': return 'rgba(249, 115, 22, '; // orange
      case 'blunder':
      case 'missed_win': return 'rgba(239, 68, 68, '; // red
      default: return 'rgba(255, 255, 255, ';
    }
  };

  const getMoveBadge = (classification) => {
    const base = "text-[10px] font-black px-2 py-0.5 rounded-lg select-none uppercase tracking-wider ";
    switch (classification) {
      case 'brilliant': return base + "bg-purple-500/15 text-purple-400 border border-purple-500/20";
      case 'great': return base + "bg-blue-500/15 text-blue-400 border border-blue-500/20";
      case 'best': return base + "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
      case 'excellent': return base + "bg-teal-500/15 text-teal-400 border border-teal-500/20";
      case 'book': return base + "bg-slate-500/15 text-slate-400 border border-slate-500/20";
      case 'inaccuracy': return base + "bg-amber-500/15 text-amber-400 border border-amber-500/20";
      case 'mistake': return base + "bg-orange-500/15 text-orange-400 border border-orange-500/20";
      case 'blunder': return base + "bg-rose-500/15 text-rose-400 border border-rose-500/20";
      case 'missed_win': return base + "bg-red-500/15 text-red-400 border border-red-500/20";
      default: return base + "bg-white/5 text-chess-300";
    }
  };

  const getBriefSymbol = (classification) => {
    switch (classification) {
      case 'brilliant': return '!!';
      case 'great': return '!';
      case 'best': return '★';
      case 'inaccuracy': return '?!';
      case 'mistake': return '?';
      case 'blunder': return '??';
      case 'missed_win': return '❌';
      default: return '';
    }
  };

  // Render post-game interactive SVG evaluation curve
  const renderEvaluationCurve = () => {
    if (!analysisReport || !analysisReport.eval_curve) return null;
    const curve = analysisReport.eval_curve;
    
    const width = 600;
    const height = 120;
    const padding = 15;
    
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const centerY = padding + chartHeight / 2;
    
    const stepsCount = curve.length;
    const stepX = chartWidth / (stepsCount - 1);
    
    // Scale curve limit to [-5.0, 5.0]
    const scaleFactor = chartHeight / 10.0;
    
    const points = curve.map((val, idx) => {
      const x = padding + idx * stepX;
      // Cap val
      const capped = Math.max(-5.0, Math.min(5.0, val));
      const y = centerY - capped * scaleFactor;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* Center baseline representing equal position */}
        <line x1={padding} y1={centerY} x2={width-padding} y2={centerY} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3,3" />
        
        {/* Shaded Area between curve and baseline */}
        <path
          d={`M ${padding},${centerY} ` + curve.map((val, idx) => {
            const x = padding + idx * stepX;
            const capped = Math.max(-5.0, Math.min(5.0, val));
            const y = centerY - capped * scaleFactor;
            return `L ${x},${y}`;
          }).join(' ') + ` L ${padding + (stepsCount - 1) * stepX},${centerY} Z`}
          fill="rgba(99, 102, 241, 0.06)"
        />
        
        {/* The line */}
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          points={points}
        />
        
        {/* Clickable node points */}
        {curve.map((val, idx) => {
          const x = padding + idx * stepX;
          const capped = Math.max(-5.0, Math.min(5.0, val));
          const y = centerY - capped * scaleFactor;
          const isActive = idx === (activeMoveIndex + 1); // index shift
          return (
            <g 
              key={idx} 
              className="cursor-pointer"
              onClick={() => setupActiveReplay(analysisReport, idx - 1)}
            >
              <circle cx={x} cy={y} r={isActive ? "6" : "3"} fill={isActive ? "#10b981" : "#6366f1"} />
              {isActive && <circle cx={x} cy={y} r="10" fill="#10b981" opacity="0.3" />}
            </g>
          );
        })}
      </svg>
    );
  };

  const activeReview = activeMoveIndex !== -1 && analysisReport ? analysisReport.reviews[activeMoveIndex] : null;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Post-Game Move Analysis</h2>
        <p className="text-chess-300 text-sm mt-1">Review move quality indices, identify blunders, and explore heatmaps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CORE INTERACTIVE BOARD AND TIMELINE GRAPH */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          
          <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0">
            
            {/* CHESSBOARD CONTAINER */}
            <div className="w-full max-w-[450px] chessboard-shadow bg-chess-900 border border-white/5 relative flex-shrink-0">
              <Chessboard 
                position={activeFen}
                boardOrientation={boardOrientation}
                arePiecesDraggable={false}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#1E293B' }}
                customLightSquareStyle={{ backgroundColor: '#E2E8F0' }}
                customSquareStyles={squareHeat}
              />
            </div>

            {/* ENGINE HUD PANEL */}
            <div className="flex-1 w-full space-y-4">
              
              {/* ACCURACY GLASS BADGE */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-gradient-to-tr from-indigo-950/20 to-violet-950/10">
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Review Accuracy</span>
                <div className="flex items-baseline space-x-3 mt-1">
                  <span className="text-4xl font-black text-white">{analysisReport ? analysisReport.accuracy : '0.0'}%</span>
                  <span className="text-xs text-chess-300">Accuracy Index</span>
                </div>
              </div>

              {/* ACTIVE MOVE DETAILS PANEL */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 h-44 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-chess-500">Active Move Summary</span>
                    {activeReview && (
                      <span className={getMoveBadge(activeReview.classification)}>
                        {activeReview.classification} {getBriefSymbol(activeReview.classification)}
                      </span>
                    )}
                  </div>
                  
                  {activeReview ? (
                    <div className="space-y-1">
                      <span className="text-sm font-extrabold text-white">Played move: {activeReview.move_san}</span>
                      <p className="text-xs text-chess-300 leading-relaxed">{activeReview.description}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-chess-500 italic">Select a move in the PGN sidebar or graph node to inspect position annotations.</p>
                  )}
                </div>

                {activeReview && activeReview.classification !== 'best' && (
                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-chess-500">Engine Suggestion:</span>
                    <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                      {activeReview.best_move_san}
                    </span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* DYNAMIC INTERACTIVE ADVANTAGE TIMELINE GRAPH */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-white text-sm">Interactive Game Advantage Curve</h3>
                <p className="text-[10px] text-chess-500">Click graph nodes to jump instantly to move positions</p>
              </div>
              <button 
                onClick={toggleHeatmap}
                className="px-3 py-1 border border-white/10 hover:bg-white/5 rounded-lg text-[10px] uppercase font-bold text-chess-300 transition-colors"
              >
                Toggle Heatmap
              </button>
            </div>
            <div className="h-28 flex items-end">
              {renderEvaluationCurve()}
            </div>
          </div>

        </div>

        {/* SIDEBAR PGNS / GAMES SELECTOR AND MOVE REVIEWS */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* SELECT OR PASTE PGN MATCHES */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <h3 className="font-extrabold text-white text-sm mb-3">Select Analyzed Match</h3>
            
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGame(g)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between group transition-all duration-200 ${
                    selectedGame && selectedGame.id === g.id
                      ? 'border-indigo-500/30 bg-indigo-500/5'
                      : 'border-white/5 bg-chess-950/20 hover:border-white/15'
                  }`}
                >
                  <div className="truncate max-w-[170px]">
                    <span className="text-xs font-bold text-white block truncate">vs AI Coach</span>
                    <span className="text-[10px] text-chess-500 block truncate">{new Date(g.created_at).toLocaleDateString()} ({g.result})</span>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                    {g.accuracy ? `${g.accuracy}%` : 'Pending'}
                  </span>
                </button>
              ))}
              {games.length === 0 && (
                <p className="text-xs text-chess-500 italic text-center py-4">No completed games loaded.</p>
              )}
            </div>

            {/* MANUAL PGN ANALYZER */}
            <form onSubmit={handleManualReviewSubmit} className="mt-4 pt-4 border-t border-white/5 space-y-3">
              <label className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-400 block">Or Paste PGN to Analyze</label>
              <textarea
                rows="2"
                value={manualPgn}
                onChange={(e) => setManualPgn(e.target.value)}
                placeholder="1. e4 e5 2. Nf3 Nc6..."
                className="glass-input block w-full px-3 py-2.5 rounded-xl text-xs resize-none"
              />
              <button
                type="submit"
                disabled={loading || !manualPgn}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow transition-colors"
              >
                {loading ? "Analyzing..." : "Review PGN"}
              </button>
            </form>
          </div>

          {/* SCROLLABLE MOVE-BY-MOVE REVIEW TIMELINE */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Move-by-Move Log</span>
              <button 
                onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
                className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300"
              >
                Flip View
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-1.5 pr-2">
              {analysisReport && analysisReport.reviews.map((rev, idx) => {
                const isActive = idx === activeMoveIndex;
                const isWhite = idx % 2 === 0;
                const color = getMoveColor(rev.classification);
                
                return (
                  <div 
                    key={idx}
                    onClick={() => setupActiveReplay(analysisReport, idx)}
                    className={`p-2.5 rounded-xl border cursor-pointer hover:bg-white/5 flex items-center justify-between transition-colors ${
                      isActive 
                        ? 'border-indigo-500 bg-indigo-500/10' 
                        : 'border-white/5 bg-chess-950/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[10px] font-black text-chess-500 w-6 text-right">
                        {isWhite ? `${Math.floor(idx/2)+1}.` : ''}
                      </span>
                      <span className={`text-xs font-bold text-white ${!isWhite ? 'ml-6' : ''}`}>{rev.move_san}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black text-chess-400">
                        {rev.eval_after >= 0 ? `+${rev.eval_after.toFixed(1)}` : rev.eval_after.toFixed(1)}
                      </span>
                      <span 
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-chess-950 text-center"
                        style={{ backgroundColor: color + '1)' }}
                      >
                        {getBriefSymbol(rev.classification) ? getBriefSymbol(rev.classification).slice(0,1) : '★'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {!analysisReport && (
                <div className="text-center py-12 text-xs text-chess-500 italic">Select an analyzed game to populate move reviews.</div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setupActiveReplay(analysisReport, Math.max(-1, activeMoveIndex - 1))}
                disabled={!analysisReport || activeMoveIndex === -1}
                className="flex items-center space-x-1 py-1.5 px-3 border border-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setupActiveReplay(analysisReport, Math.min(analysisReport.reviews.length - 1, activeMoveIndex + 1))}
                disabled={!analysisReport || activeMoveIndex === analysisReport.reviews.length - 1}
                className="flex items-center space-x-1 py-1.5 px-3 border border-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { 
  Brain, 
  Clock, 
  HelpCircle, 
  RefreshCw, 
  ChevronRight, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Search 
} from 'lucide-react';
import { api } from '../services/api';

export default function Puzzles({ activePuzzleId, setSelectPuzzleId }) {
  const [categories, setCategories] = useState(["Mate in 1", "Mate in 2", "Forks", "Pins", "Skewers", "Double attacks", "Endgames"]);
  const [selectedCategory, setSelectedCategory] = useState("Mate in 1");
  const [puzzles, setPuzzles] = useState([]);
  
  // Game states
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [game, setGame] = useState(null);
  const [fen, setFen] = useState('');
  
  // Puzzle solve tracking
  const [expectedMoves, setExpectedMoves] = useState([]); // Array of correct moves: ['e2e4', 'e7e5']
  const [playedMoves, setPlayedMoves] = useState([]);
  const [solveState, setSolveState] = useState('idle'); // 'idle', 'correct', 'failed', 'progress'
  const [squareStyles, setSquareStyles] = useState({});

  // Timer states
  const [timerCount, setTimerCount] = useState(0);
  const timerIntervalRef = useRef(null);

  // Load puzzles on category change
  useEffect(() => {
    async function loadCategoryData() {
      try {
        const data = await api.getPuzzles(selectedCategory);
        setPuzzles(data);
        
        // If activePuzzleId is provided from dashboard, select that puzzle!
        if (activePuzzleId) {
          const matched = data.find(p => p.id === activePuzzleId);
          if (matched) {
            handlePlayPuzzle(matched);
            setSelectPuzzleId(null); // Clear recommendation
            return;
          }
        }
        
        if (data.length > 0) {
          handlePlayPuzzle(data[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCategoryData();
  }, [selectedCategory, activePuzzleId]);

  // Handle timer
  const startTimer = () => {
    stopTimer();
    setTimerCount(0);
    timerIntervalRef.current = setInterval(() => {
      setTimerCount(t => t + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayPuzzle = (puzObj) => {
    stopTimer();
    setActivePuzzle(puzObj);
    
    // Set up chess.js game state
    const cGame = new Chess(puzObj.fen);
    chessGameRef.current = cGame;
    
    setGame(new Chess(puzObj.fen));
    setFen(puzObj.fen);
    setPlayedMoves([]);
    setSquareStyles({});
    setSolveState('idle');
    
    // Parse moves: e.g. "h5f7" or "e5f3 g2f3" -> split into steps
    const movesList = puzObj.moves.split(' ');
    setExpectedMoves(movesList);
    
    startTimer();
  };

  const chessGameRef = useRef(null);

  // Validate drag and drop puzzle moves
  const onDrop = (sourceSquare, targetSquare, piece) => {
    if (solveState === 'correct' || solveState === 'failed') return false;
    
    const nextMoveIndex = playedMoves.length;
    const expectedMoveUci = expectedMoves[nextMoveIndex];
    
    if (!expectedMoveUci) return false;
    
    const playedMoveUci = `${sourceSquare}${targetSquare}`;
    
    // Check if correct UCI move played
    // We also support promotion characters (e.g. e7e8q) if needed
    const isCorrectMove = playedMoveUci === expectedMoveUci || 
                          (expectedMoveUci.length > 4 && playedMoveUci === expectedMoveUci.slice(0, 4));
                          
    if (!isCorrectMove) {
      // Puzzle Failed
      setSolveState('failed');
      stopTimer();
      setSquareStyles({
        [sourceSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
        [targetSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
      });
      // Submit attempt
      api.submitPuzzleAttempt(activePuzzle.id, false, timerCount);
      return false;
    }

    // Correct Move! Execute on chessRef
    try {
      const promotion = expectedMoveUci.length > 4 ? expectedMoveUci.charAt(4) : undefined;
      const move = chessGameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion
      });

      if (!move) return false;

      // Update state
      const newPlayed = [...playedMoves, playedMoveUci];
      setPlayedMoves(newPlayed);
      setGame(new Chess(chessGameRef.current.fen()));
      setFen(chessGameRef.current.fen());
      
      setSquareStyles({
        [sourceSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
        [targetSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.5)' }
      });

      // Check if puzzle is fully solved
      if (newPlayed.length === expectedMoves.length) {
        setSolveState('correct');
        stopTimer();
        // Submit successful attempt
        api.submitPuzzleAttempt(activePuzzle.id, true, timerCount);
      } else {
        // AI response move in the puzzle (if it is a multi-move puzzle)
        // Auto-plays the opponent's next move after a short delay
        const oppMoveIndex = newPlayed.length;
        const oppMoveUci = expectedMoves[oppMoveIndex];
        
        if (oppMoveUci) {
          setSolveState('progress');
          setTimeout(() => {
            try {
              const oppFrom = oppMoveUci.slice(0, 2);
              const oppTo = oppMoveUci.slice(2, 4);
              const oppPromotion = oppMoveUci.length > 4 ? oppMoveUci.charAt(4) : undefined;
              
              const oppMove = chessGameRef.current.move({
                from: oppFrom,
                to: oppTo,
                promotion: oppPromotion
              });
              
              if (oppMove) {
                setPlayedMoves(prev => [...prev, oppMoveUci]);
                setGame(new Chess(chessGameRef.current.fen()));
                setFen(chessGameRef.current.fen());
                
                // Highlight opponent's move
                setSquareStyles({
                  [oppFrom]: { backgroundColor: 'rgba(99, 102, 241, 0.4)' },
                  [oppTo]: { backgroundColor: 'rgba(99, 102, 241, 0.4)' }
                });
              }
            } catch (e) {
              console.error("Puzzle opponent move failed", e);
            }
          }, 600);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Tactical Puzzle Trainer</h2>
        <p className="text-chess-300 text-sm mt-1">Hone your calculation skills, solve checks, and practice dynamic mate patterns.</p>
      </div>

      {/* FILTER BUTTONS ROW */}
      <div className="flex flex-wrap gap-2.5 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/20'
                : 'bg-white/5 border border-white/5 text-chess-300 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* INTERACTIVE PUZZLE BOARD */}
        <div className="lg:col-span-8 flex justify-center items-center">
          <div className="w-full max-w-[500px] chessboard-shadow bg-chess-900 border border-white/5 relative">
            
            {/* HUD Status Bar overlay on top of the board */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-15 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/5 shadow-md">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-black text-white">{formatTimer(timerCount)}</span>
              </div>
              
              <div className="text-[10px] uppercase font-black text-indigo-400">
                {activePuzzle ? `${activePuzzle.category} (${activePuzzle.difficulty} ELO)` : 'No active puzzle'}
              </div>
            </div>

            {fen && (
              <Chessboard 
                position={fen} 
                onPieceDrop={onDrop}
                boardOrientation={activePuzzle && activePuzzle.fen.includes(' b ') ? 'black' : 'white'}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#1E293B' }}
                customLightSquareStyle={{ backgroundColor: '#E2E8F0' }}
                customSquareStyles={squareStyles}
              />
            )}

            {/* Solved / Failed visual feedback overlays */}
            {solveState === 'correct' && (
              <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10 p-5 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
                <h4 className="text-xl font-extrabold text-white">Puzzle Solved!</h4>
                <p className="text-xs text-emerald-300 mt-1 max-w-[280px]">Excellent calculations! Your tactical Elo has been updated.</p>
              </div>
            )}

            {solveState === 'failed' && (
              <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10 p-5 text-center">
                <XCircle className="w-16 h-16 text-rose-400 mb-3 animate-pulse" />
                <h4 className="text-xl font-extrabold text-white">Incorrect Solution</h4>
                <p className="text-xs text-rose-300 mt-1 max-w-[280px]">That wasn't the winning line. Review the explanation on the right.</p>
              </div>
            )}

          </div>
        </div>

        {/* SIDEBAR TACTICAL HUD */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* PUZZLE SELECTOR DIRECTORY */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Seeded Puzzles</span>
              <span className="text-[10px] text-chess-500 font-bold">{puzzles.length} Available</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1">
              {puzzles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlayPuzzle(p)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between group transition-colors hover-lift ${
                    activePuzzle && activePuzzle.id === p.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/5 bg-chess-950/20 hover:border-white/10'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">Puzzle #{p.id}</span>
                    <span className="text-[10px] text-chess-500">Difficulty: {p.difficulty} ELO</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-chess-500 group-hover:text-white transition-colors" />
                </button>
              ))}
              {puzzles.length === 0 && (
                <div className="text-center py-8 text-xs text-chess-500 italic">No puzzles found in database.</div>
              )}
            </div>
          </div>

          {/* HINTS AND DYNAMIC EXPLANATIONS */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-indigo-500/15 p-2 rounded-xl text-indigo-400">
                <Brain className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">Tactical HUD</h3>
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400">Explanation & Hints</p>
              </div>
            </div>

            <div className="space-y-4 pt-2.5 border-t border-white/5 text-xs">
              
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-chess-500">Objective</span>
                <p className="text-chess-300 mt-1 font-medium leading-relaxed">
                  {activePuzzle ? activePuzzle.description : 'Select a puzzle to view targets.'}
                </p>
              </div>

              {/* SOLUTION EXPLANATION BOX */}
              {(solveState === 'correct' || solveState === 'failed') && activePuzzle && (
                <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <div className="flex items-center space-x-1 text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Solution Explanation</span>
                  </div>
                  <p className="text-[11px] text-chess-300 leading-relaxed font-semibold">
                    The winning line involves <span className="text-indigo-400 font-bold">{expectedMoves.join(' -> ')}</span>.
                    This sequence forces checks, wins key material, or leads to a quick checkmate that cannot be defended!
                  </p>
                </div>
              )}

              {/* NEXT PUZZLE ACTION BUTTON */}
              {(solveState === 'correct' || solveState === 'failed') && (
                <button
                  onClick={() => {
                    const currentIdx = puzzles.findIndex(p => p.id === activePuzzle.id);
                    if (currentIdx !== -1 && currentIdx + 1 < puzzles.length) {
                      handlePlayPuzzle(puzzles[currentIdx + 1]);
                    } else if (puzzles.length > 0) {
                      handlePlayPuzzle(puzzles[0]); // Wrap around
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow text-xs transition-colors hover-lift"
                >
                  Load Next Puzzle
                </button>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

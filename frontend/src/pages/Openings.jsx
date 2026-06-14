import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { 
  BookOpen, 
  ChevronRight, 
  Sparkles, 
  TrendingUp, 
  RotateCcw, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle, 
  Play 
} from 'lucide-react';
import { api } from '../services/api';

export default function Openings() {
  const [openings, setOpenings] = useState([]);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [successRate, setSuccessRate] = useState({ white: 40, black: 35, draw: 25 });
  
  // Practice Mode states
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceGame, setPracticeGame] = useState(null);
  const [practiceFen, setPracticeFen] = useState('');
  const [practiceMovesPlayed, setPracticeMovesPlayed] = useState([]);
  const [practiceStatus, setPracticeStatus] = useState("Make the first move!");
  const [practiceState, setPracticeState] = useState('progress'); // 'progress', 'completed', 'failed'
  const [squareStyles, setSquareStyles] = useState({});

  useEffect(() => {
    async function loadOpenings() {
      try {
        const data = await api.getOpenings();
        setOpenings(data);
        if (data.length > 0) {
          handleSelectOpening(data[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadOpenings();
  }, []);

  const handleSelectOpening = async (opObj) => {
    setSelectedOpening(opObj);
    setIsPracticeMode(false);
    
    // Fetch stats
    try {
      const match = await api.matchOpening(opObj.moves);
      if (match && match.success_rate) {
        setSuccessRate(match.success_rate);
      }
    } catch {
      // Use fallback
      setSuccessRate({ white: 40, black: 35, draw: 25 });
    }
  };

  const startPracticeMode = () => {
    setIsPracticeMode(true);
    setPracticeState('progress');
    setPracticeMovesPlayed([]);
    setSquareStyles({});
    
    const pGame = new Chess();
    practiceChessGameRef.current = pGame;
    
    setPracticeGame(new Chess());
    setPracticeFen(pGame.fen());
    setPracticeStatus(`Play White's move: ${selectedOpening.moves[0]}`);
  };

  const practiceChessGameRef = useRef(null);

  // Validate practice mode drag drops
  const onDrop = (sourceSquare, targetSquare, piece) => {
    if (practiceState !== 'progress') return false;
    
    const expectedMoveIndex = practiceMovesPlayed.length;
    const expectedMoveUci = selectedOpening.moves[expectedMoveIndex];
    
    if (!expectedMoveUci) return false;
    
    const playedMoveUci = `${sourceSquare}${targetSquare}`;
    
    if (playedMoveUci !== expectedMoveUci) {
      // Practice blunder
      setPracticeState('failed');
      setPracticeStatus(`Mistake! Expected move was: ${expectedMoveUci}. Press restart to try again!`);
      setSquareStyles({
        [sourceSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
        [targetSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
      });
      return false;
    }

    // Correct Move! Execute
    try {
      const move = practiceChessGameRef.current.move({
        from: sourceSquare,
        to: targetSquare
      });
      
      if (!move) return false;
      
      const newMoves = [...practiceMovesPlayed, playedMoveUci];
      setPracticeMovesPlayed(newMoves);
      setPracticeGame(new Chess(practiceChessGameRef.current.fen()));
      setPracticeFen(practiceChessGameRef.current.fen());
      
      setSquareStyles({
        [sourceSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
        [targetSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.5)' }
      });
      
      // Check if complete
      if (newMoves.length === selectedOpening.moves.length) {
        setPracticeState('completed');
        setPracticeStatus("Excellent! You've perfectly completed the theoretical opening sequence!");
      } else {
        // Play next move in sequence automatically if it is Black's turn in sequence
        const blackMoveIndex = newMoves.length;
        const blackMoveUci = selectedOpening.moves[blackMoveIndex];
        
        if (blackMoveUci) {
          setPracticeStatus("Opponent plays the theoretical book reply...");
          setTimeout(() => {
            try {
              const bFrom = blackMoveUci.slice(0, 2);
              const bTo = blackMoveUci.slice(2, 4);
              
              const bMove = practiceChessGameRef.current.move({
                from: bFrom,
                to: bTo
              });
              
              if (bMove) {
                const nextMoves = [...newMoves, blackMoveUci];
                setPracticeMovesPlayed(nextMoves);
                setPracticeGame(new Chess(practiceChessGameRef.current.fen()));
                setPracticeFen(practiceChessGameRef.current.fen());
                
                setSquareStyles({
                  [bFrom]: { backgroundColor: 'rgba(99, 102, 241, 0.4)' },
                  [bTo]: { backgroundColor: 'rgba(99, 102, 241, 0.4)' }
                });
                
                if (nextMoves.length === selectedOpening.moves.length) {
                  setPracticeState('completed');
                  setPracticeStatus("Excellent! You've perfectly completed the theoretical opening sequence!");
                } else {
                  // User's turn again
                  const userNextUci = selectedOpening.moves[nextMoves.length];
                  setPracticeStatus(`Play White's move: ${userNextUci}`);
                }
              }
            } catch (e) {
              console.error(e);
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
        <h2 className="text-3xl font-extrabold text-white">Opening Theory Trainer</h2>
        <p className="text-chess-300 text-sm mt-1">Study historical opening lines, inspect statistics, and test sequences in active practice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* OPENING LIST AND PRACTICE BOARD */}
        <div className="lg:col-span-8 flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0">
          
          {/* BOARD PANEL */}
          <div className="w-full max-w-[420px] chessboard-shadow bg-chess-900 border border-white/5 relative flex-shrink-0">
            {isPracticeMode ? (
              <div>
                <Chessboard 
                  position={practiceFen}
                  onPieceDrop={onDrop}
                  customBoardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                  }}
                  customDarkSquareStyle={{ backgroundColor: '#1E293B' }}
                  customLightSquareStyle={{ backgroundColor: '#E2E8F0' }}
                  customSquareStyles={squareStyles}
                />
                
                {/* HUD STATUS DRAWER */}
                <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[11px] font-bold text-white leading-tight">{practiceStatus}</p>
                </div>
              </div>
            ) : (
              // Static Preview FEN Board
              <Chessboard 
                position={selectedOpening ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
                arePiecesDraggable={false}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#1E293B' }}
                customLightSquareStyle={{ backgroundColor: '#E2E8F0' }}
              />
            )}
          </div>

          {/* OPENING SEED DIRECTORY */}
          <div className="flex-1 w-full glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[420px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Opening Catalog</span>
              <span className="text-[10px] text-chess-500 font-bold">{openings.length} Seeded</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1">
              {openings.map((op) => (
                <button
                  key={op.name}
                  onClick={() => handleSelectOpening(op)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between group transition-colors hover-lift ${
                    selectedOpening && selectedOpening.name === op.name && !isPracticeMode
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/5 bg-chess-950/20 hover:border-white/10'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{op.name}</span>
                    <span className="text-[10px] text-chess-500">ECO: {op.eco} | Moves: {op.moves.slice(0, 3).join(' -> ')}...</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-chess-500 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* SIDEBAR DESCRIPTION AND DETAILS */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {selectedOpening && (
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-5 flex-1">
              
              <div>
                <h3 className="text-lg font-black text-white">{selectedOpening.name}</h3>
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">ECO: {selectedOpening.eco}</span>
              </div>

              {/* SUCCESS STATISTICS GRID CHARTS */}
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-chess-500 block mb-2.5">Theoretical Success Rate</span>
                <div className="w-full h-5 bg-chess-950 rounded-xl overflow-hidden flex font-bold text-[10px] text-center text-white select-none">
                  {/* White Wins */}
                  <div className="bg-indigo-600 flex items-center justify-center transition-all" style={{ width: `${successRate.white}%` }}>
                    W {successRate.white}%
                  </div>
                  {/* Draws */}
                  <div className="bg-slate-700 flex items-center justify-center transition-all" style={{ width: `${successRate.draw}%` }}>
                    D {successRate.draw}%
                  </div>
                  {/* Black Wins */}
                  <div className="bg-rose-600 flex items-center justify-center transition-all" style={{ width: `${successRate.black}%` }}>
                    B {successRate.black}%
                  </div>
                </div>
              </div>

              {/* PLANS BRIEF */}
              <div className="space-y-3.5 pt-4 border-t border-white/5 text-xs">
                
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-chess-500">System Definition</span>
                  <p className="text-chess-300 mt-1 leading-relaxed">{selectedOpening.description}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">White's Strategy</span>
                  <p className="text-chess-300 mt-1 leading-relaxed font-semibold">{selectedOpening.white_plan}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-rose-400">Black's Strategy</span>
                  <p className="text-chess-300 mt-1 leading-relaxed font-semibold">{selectedOpening.black_plan}</p>
                </div>

              </div>

              {/* PRACTICE OR RESTART CONTROLS */}
              <div className="pt-4 border-t border-white/5">
                {isPracticeMode ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={startPracticeMode}
                      className="flex-1 py-2.5 border border-indigo-500/30 text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl font-bold text-xs shadow-md transition-colors"
                    >
                      Restart Practice
                    </button>
                    <button
                      onClick={() => setIsPracticeMode(false)}
                      className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-chess-300 rounded-xl font-bold text-xs transition-colors"
                    >
                      Exit Mode
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startPracticeMode}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md hover-lift flex items-center justify-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Launch Practice Mode</span>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

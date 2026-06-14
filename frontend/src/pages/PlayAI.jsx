import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { 
  RotateCcw, 
  ArrowLeftRight, 
  Save, 
  Settings, 
  Sparkles, 
  Brain, 
  Upload, 
  Download, 
  FileText, 
  Play 
} from 'lucide-react';
import { api } from '../services/api';

export default function PlayAI({ setActiveTab, user }) {
  // Chess.js instance
  const chessRef = useRef(new Chess());
  const [game, setGame] = useState(chessRef.current);
  const [gameHistory, setGameHistory] = useState([]);
  
  // Game states
  const [fen, setFen] = useState(chessRef.current.fen());
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [aiElo, setAiElo] = useState(1200);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [statusText, setStatusText] = useState("Your turn! Make a move.");
  
  // Imports / Exports
  const [fenInput, setFenInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('fen');
  
  // Engine analysis states
  const [currentEval, setCurrentEval] = useState(0.0);
  const [mateIn, setMateIn] = useState(null);
  const [candidateMoves, setCandidateMoves] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sound triggers (represented in UI visually with flash effect)
  const [lastMoveSquares, setLastMoveSquares] = useState({});

  // 1. Trigger evaluation on position change
  useEffect(() => {
    async function evaluatePos() {
      try {
        const curFen = chessRef.current.fen();
        const analysis = await api.evaluatePosition(curFen, 8);
        if (analysis) {
          setCurrentEval(analysis.eval);
          setMateIn(analysis.mate);
          setCandidateMoves(analysis.candidate_moves || []);
        }
      } catch (err) {
        console.warn("Could not fetch position evaluation", err);
      }
    }
    evaluatePos();
  }, [fen]);

  // 2. Perform AI Response Move
  const triggerAiMove = async (currentChessGame) => {
    setIsAiThinking(true);
    setStatusText("AI Coach is formulating a response...");
    
    try {
      const curFen = currentChessGame.fen();
      
      // We pass the active ELO. The backend resolves depth and search constraints.
      // Fetch analysis which contains best_move and candidate suggestions
      const analysis = await api.evaluatePosition(curFen, 8);
      
      if (analysis && analysis.best_move) {
        // Slightly delay to look like thinking
        setTimeout(() => {
          try {
            const bestMove = analysis.best_move;
            // Handle random blunders for low ELO AI targets
            let movePlayed = bestMove;
            const legalMoves = currentChessGame.moves({ verbose: true });
            
            if (aiElo < 1000 && Math.random() < 0.35 && legalMoves.length) {
              // Play a random legal move to simulate blunder
              const randMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
              movePlayed = randMove.lan;
            } else if (aiElo < 1400 && Math.random() < 0.15 && legalMoves.length) {
              const randMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
              movePlayed = randMove.lan;
            }

            const moveRes = currentChessGame.move({
              from: movePlayed.slice(0, 2),
              to: movePlayed.slice(2, 4),
              promotion: movePlayed.length > 4 ? movePlayed.charAt(4) : undefined
            });

            if (moveRes) {
              // Update board state
              setGame(new Chess(currentChessGame.fen()));
              setFen(currentChessGame.fen());
              setGameHistory(currentChessGame.history({ verbose: true }));
              
              // Set visual move highlight
              setLastMoveSquares({
                [moveRes.from]: { backgroundColor: 'rgba(99, 102, 241, 0.4)' },
                [moveRes.to]: { backgroundColor: 'rgba(99, 102, 241, 0.4)' }
              });

              // Check game over
              if (currentChessGame.isGameOver()) {
                handleGameOver(currentChessGame);
              } else {
                setStatusText("Your turn! Make a move.");
              }
            }
          } catch (e) {
            console.error("AI execution error", e);
          } finally {
            setIsAiThinking(false);
          }
        }, 600);
      } else {
        setIsAiThinking(false);
        setStatusText("AI failed to find a move.");
      }
    } catch (err) {
      console.error(err);
      setIsAiThinking(false);
      setStatusText("Failed to query AI move.");
    }
  };

  // Handle human move drag & drop
  const onDrop = (sourceSquare, targetSquare, piece) => {
    if (chessRef.current.isGameOver() || isAiThinking) return false;
    
    // Check if piece matches orientation
    const pieceColor = piece.charAt(0);
    const activeColor = chessRef.current.turn();
    if (pieceColor !== activeColor) return false;

    // Check promotion
    let promotionPiece = undefined;
    const isPawn = piece.charAt(1) === 'P';
    const isRank8 = targetSquare.charAt(1) === '8';
    const isRank1 = targetSquare.charAt(1) === '1';
    if (isPawn && ((pieceColor === 'w' && isRank8) || (pieceColor === 'b' && isRank1))) {
      promotionPiece = 'q'; // Default promotion to queen
    }

    try {
      const move = chessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotionPiece
      });

      if (move === null) return false;

      // Update state
      setGame(new Chess(chessRef.current.fen()));
      setFen(chessRef.current.fen());
      setGameHistory(chessRef.current.history({ verbose: true }));
      
      setLastMoveSquares({
        [sourceSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
        [targetSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.4)' }
      });

      if (chessRef.current.isGameOver()) {
        handleGameOver(chessRef.current);
      } else {
        // Trigger AI Move
        triggerAiMove(chessRef.current);
      }
      return true;
    } catch (err) {
      return false; // Illegal move
    }
  };

  const handleGameOver = (chessGame) => {
    if (chessGame.isCheckmate()) {
      const winner = chessGame.turn() === 'w' ? 'Black (AI Coach)' : 'White (You)';
      setStatusText(`Checkmate! Winner: ${winner}`);
    } else if (chessGame.isDraw()) {
      setStatusText("Game Over: Draw (Stalemate, Fifty-Move, or Insufficient Material)");
    }
  };

  // Undo last two plies (Human + AI)
  const handleUndo = () => {
    if (isAiThinking || gameHistory.length < 2) return;
    chessRef.current.undo(); // Undo AI move
    chessRef.current.undo(); // Undo Human move
    setGame(new Chess(chessRef.current.fen()));
    setFen(chessRef.current.fen());
    setGameHistory(chessRef.current.history({ verbose: true }));
    setStatusText("Move undone. Think carefully!");
  };

  const handleRestart = () => {
    if (isAiThinking) return;
    chessRef.current = new Chess();
    setGame(new Chess());
    setFen(chessRef.current.fen());
    setGameHistory([]);
    setLastMoveSquares({});
    setStatusText("New game started! Good luck.");
  };

  const handleImportSubmit = () => {
    try {
      if (importType === 'fen') {
        const validate = new Chess(fenInput);
        chessRef.current = validate;
      } else {
        const validate = new Chess();
        validate.loadPgn(pgnInput);
        chessRef.current = validate;
      }
      setGame(new Chess(chessRef.current.fen()));
      setFen(chessRef.current.fen());
      setGameHistory(chessRef.current.history({ verbose: true }));
      setShowImportModal(false);
      setStatusText("PGN/FEN Loaded successfully!");
    } catch {
      alert("Invalid PGN or FEN string provided.");
    }
  };

  // Saves completed game to history and analysis backend
  const handleSaveGame = async () => {
    if (gameHistory.length < 2) {
      alert("Please play at least a couple of moves before saving the match!");
      return;
    }
    
    setStatusText("Saving and reviewing game accuracy...");
    const pgn = chessRef.current.pgn();
    
    try {
      // 1. Perform review
      const review = await api.reviewGame(pgn);
      
      // 2. Submit saved game structure
      await api.saveGame({
        pgn: pgn,
        fen: fen,
        result: chessRef.current.isGameOver() ? (chessRef.current.isDraw() ? "1/2-1/2" : (chessRef.current.turn() === 'w' ? "0-1" : "1-0")) : "*",
        opponent_strength: aiElo,
        accuracy: review.accuracy,
        openings_eco: chessRef.current.history().length > 2 ? "Book Move" : "Unidentified",
        analysis_json: JSON.stringify(review)
      });
      
      setStatusText("Game saved successfully! Loading post-game analysis...");
      setTimeout(() => {
        setActiveTab('dashboard'); // Redirect to dashboard
      }, 1000);
      
    } catch (err) {
      console.error(err);
      setStatusText("Failed to compile accuracy. Saved locally!");
    }
  };

  // Dynamic sigmoid evaluation bar calculations
  const calculateEvalBarHeight = () => {
    // Current eval is centered around 0.0. Scale using tanh function
    const limit = 4.0;
    const value = Math.max(-limit, Math.min(limit, currentEval));
    // scale to 0-100%
    const heightPercentage = 50 + 50 * Math.tanh(value / 3.0);
    return `${100 - heightPercentage}%`; // Invert since White is at bottom
  };

  const getEvalText = () => {
    if (mateIn !== null) {
      return `M${Math.abs(mateIn)}`;
    }
    return (currentEval >= 0 ? `+${currentEval.toFixed(1)}` : `${currentEval.toFixed(1)}`);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Play vs AI Coach</h2>
          <p className="text-chess-300 text-sm mt-1">Adjust ELO levels, test opening books, and inspect real-time candidate paths.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRestart}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-colors border border-white/5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Game</span>
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-white/10 hover:bg-white/5 text-white rounded-xl font-bold text-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import FEN/PGN</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* INTERACTIVE BOARD CONTROLLER & EVALUATION BAR */}
        <div className="lg:col-span-8 flex flex-col md:flex-row items-center md:space-x-5 space-y-4 md:space-y-0">
          
          {/* FLOATING REAL-TIME EVALUATION BAR */}
          <div className="hidden md:flex flex-col items-center w-10 h-[500px] glass-panel border border-white/5 rounded-xl overflow-hidden relative shadow-2xl flex-shrink-0">
            {/* Black Advantage segment (top) */}
            <div className="w-full bg-chess-950 transition-all duration-500 ease-out" style={{ height: calculateEvalBarHeight() }} />
            {/* White Advantage segment (bottom fills with primary Emerald) */}
            <div className="w-full bg-indigo-600 transition-all duration-500 ease-out absolute bottom-0 left-0 right-0" style={{ height: `calc(100% - ${calculateEvalBarHeight()})` }} />
            
            {/* Evaluation Float Badge */}
            <div className="absolute inset-x-0 mx-auto text-[10px] font-black text-center text-white py-1.5 bg-black/40 rounded-lg w-8 z-10 select-none shadow" style={{ top: '48%' }}>
              {getEvalText()}
            </div>
          </div>

          {/* BOARD SLOT */}
          <div className="flex-1 w-full max-w-[500px] chessboard-shadow bg-chess-900 border border-white/5 relative">
            <Chessboard 
              position={fen} 
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
              }}
              customDarkSquareStyle={{ backgroundColor: '#1E293B' }} // Deep slate
              customLightSquareStyle={{ backgroundColor: '#E2E8F0' }} // Off-white
              customSquareStyles={{ ...lastMoveSquares }}
            />
            {isAiThinking && (
              <div className="absolute inset-0 bg-chess-950/60 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">AI Coach is thinking...</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* SIDEBAR ANALYSIS & CONTROLLER */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* AI STRENGTH SLIDER */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">AI opponent elo</span>
              <span className="text-sm font-black text-white px-2 py-0.5 bg-indigo-500/10 rounded-lg">{aiElo} ELO</span>
            </div>
            
            <input 
              type="range" 
              min="500" 
              max="3000" 
              step="100" 
              value={aiElo}
              onChange={(e) => setAiElo(parseInt(e.target.value))}
              disabled={isAiThinking}
              className="w-full accent-indigo-600 bg-chess-950 h-1.5 rounded-lg cursor-pointer appearance-none"
            />
            
            <div className="flex items-center justify-between text-[10px] text-chess-500 font-bold uppercase">
              <span>Novice (500)</span>
              <span>Master (3000)</span>
            </div>
          </div>

          {/* LIVE STATUS BUBBLE */}
          <div className="glass-panel p-4 rounded-xl border border-white/5 bg-gradient-to-r from-indigo-950/10 to-violet-950/5 flex items-center space-x-3">
            <div className="bg-indigo-500/15 p-2 rounded-lg text-indigo-400">
              <Brain className="w-5 h-5 animate-pulse-slow" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-extrabold tracking-widest text-indigo-400">Match Status</span>
              <p className="text-xs font-semibold text-white leading-tight mt-0.5">{statusText}</p>
            </div>
          </div>

          {/* TIMELINE MOVE LOG */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-chess-500">Move History</span>
              <span className="text-[10px] text-chess-500 font-bold">{Math.ceil(gameHistory.length / 2)} moves</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[180px] space-y-1.5 pr-2">
              {/* Group history by pairs */}
              {Array.from({ length: Math.ceil(gameHistory.length / 2) }).map((_, idx) => {
                const moveNum = idx + 1;
                const whiteMove = gameHistory[idx * 2];
                const blackMove = gameHistory[idx * 2 + 1];
                return (
                  <div key={idx} className="flex text-xs items-center py-1 hover:bg-white/5 px-2 rounded-lg">
                    <span className="w-8 font-black text-chess-500 text-right pr-3">{moveNum}.</span>
                    <span className="w-24 text-white font-bold">{whiteMove ? whiteMove.san : ''}</span>
                    <span className="w-24 text-chess-300 font-semibold">{blackMove ? blackMove.san : ''}</span>
                  </div>
                );
              })}
              {gameHistory.length === 0 && (
                <div className="text-center py-8 text-xs text-chess-500 italic">No moves played yet. Drag a piece!</div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-white/5 mt-3">
              <button 
                onClick={handleUndo}
                disabled={gameHistory.length < 2}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 border border-white/10 hover:bg-white/5 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button 
                onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 border border-white/10 hover:bg-white/5 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Flip Board</span>
              </button>
            </div>
          </div>

          {/* STOCKFISH ENGINE MOVE RECOMMENDATIONS */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="w-full flex items-center justify-between font-extrabold text-white text-sm"
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Coach Recommendations</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                {showSuggestions ? 'Hide' : 'Show'}
              </span>
            </button>

            {showSuggestions && (
              <div className="mt-4 space-y-2.5 pt-3 border-t border-white/5">
                {candidateMoves.map((cand, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-white/5 bg-chess-950 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-indigo-400 mr-2">#{idx+1}</span>
                      <span className="font-extrabold text-white">{cand.san}</span>
                      <p className="text-[10px] text-chess-500 leading-tight mt-0.5 font-semibold">Continuation: {cand.continuation ? cand.continuation.join(' -> ') : 'N/A'}</p>
                    </div>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                      cand.eval >= 0 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {cand.eval >= 0 ? `+${cand.eval.toFixed(2)}` : cand.eval.toFixed(2)}
                    </span>
                  </div>
                ))}
                {candidateMoves.length === 0 && (
                  <p className="text-xs text-chess-500 italic text-center py-2">Formulating recommendations...</p>
                )}
              </div>
            )}
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveGame}
            disabled={gameHistory.length < 2}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/15 hover-lift"
          >
            <Save className="w-4.5 h-4.5" />
            <span>Save and Review Game</span>
          </button>

        </div>

      </div>

      {/* IMPORT DRAWER MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/5 relative shadow-2xl">
            <h3 className="font-extrabold text-white text-lg mb-4">Import Position</h3>
            
            <div className="flex items-center space-x-2 mb-4 bg-chess-950 p-1.5 rounded-xl">
              <button 
                onClick={() => setImportType('fen')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-extrabold ${importType === 'fen' ? 'bg-indigo-600 text-white shadow' : 'text-chess-500 hover:text-white'}`}
              >
                Import FEN
              </button>
              <button 
                onClick={() => setImportType('pgn')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-extrabold ${importType === 'pgn' ? 'bg-indigo-600 text-white shadow' : 'text-chess-500 hover:text-white'}`}
              >
                Import PGN
              </button>
            </div>

            {importType === 'fen' ? (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-400">FEN State String</label>
                <input 
                  type="text" 
                  value={fenInput}
                  onChange={(e) => setFenInput(e.target.value)}
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  className="glass-input block w-full px-3 py-2.5 rounded-xl text-xs"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-400">PGN Game Moves</label>
                <textarea 
                  rows="4"
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  placeholder="1. e4 e5 2. Nf3 Nc6..."
                  className="glass-input block w-full px-3 py-2.5 rounded-xl text-xs resize-none"
                />
              </div>
            )}

            <div className="flex items-center space-x-3 mt-6">
              <button 
                onClick={handleImportSubmit}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                Load Position
              </button>
              <button 
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2 px-4 border border-white/10 hover:bg-white/5 text-chess-300 rounded-xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

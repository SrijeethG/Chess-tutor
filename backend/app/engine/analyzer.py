import chess
import chess.engine
import os
import logging
from backend.app.engine import evaluator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chess_analyzer")

# Default binary search paths or user setting
STOCKFISH_PATH = os.environ.get("STOCKFISH_PATH", "")

def set_stockfish_path(path: str) -> bool:
    """Sets and validates the Stockfish binary path."""
    global STOCKFISH_PATH
    if not path:
        STOCKFISH_PATH = ""
        return True
        
    if os.path.exists(path) and os.path.isfile(path):
        STOCKFISH_PATH = path
        logger.info(f"Stockfish path configured successfully: {path}")
        return True
    else:
        logger.warning(f"Invalid Stockfish path provided: {path}")
        return False

def get_stockfish_path() -> str:
    """Gets the active Stockfish path."""
    return STOCKFISH_PATH

async def analyze_position(fen: str, depth: int = 10, limit_ms: int = 500) -> dict:
    """
    Analyzes a position using Stockfish if available, or falls back to our pure-Python engine.
    Returns:
        {
            "eval": float,        # evaluation score (positive for White, negative for Black)
            "mate": int | None,   # moves to mate if forced
            "best_move": str,     # UCI format best move, e.g. "e2e4"
            "best_move_san": str, # SAN format best move, e.g. "e4"
            "candidate_moves": [  # Top 3 candidate moves
                {"move": "e2e4", "san": "e4", "eval": 0.25, "mate": None, "continuation": [...]}
            ]
        }
    """
    board = chess.Board(fen)
    
    # Try Stockfish
    if STOCKFISH_PATH:
        try:
            # Setup engine connection
            # Executable path is provided, run in UCI mode
            transport, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
            
            # Request analysis
            # Depth limit or time limit (whichever is reached first)
            limit = chess.engine.Limit(depth=depth, time=limit_ms / 1000.0)
            
            # Get multi-pv (multiple candidate moves)
            analysis = await engine.analyse(
                board,
                limit,
                multipv=3
            )
            
            await engine.quit()
            
            if analysis:
                candidate_moves = []
                best_info = analysis[0]
                
                # Retrieve best move info
                best_move = best_info.get("pv")[0] if best_info.get("pv") else None
                if not best_move:
                    # No moves (game over)
                    return {
                        "eval": evaluator.evaluate_board(board),
                        "mate": 0 if board.is_checkmate() else None,
                        "best_move": "",
                        "best_move_san": "",
                        "candidate_moves": []
                    }
                
                # Format evaluation
                score = best_info.get("score")
                score_white = score.white()
                
                eval_val = 0.0
                mate_val = None
                if score_white.is_mate():
                    mate_val = score_white.mate()
                    eval_val = 999.0 if mate_val > 0 else -999.0
                else:
                    eval_val = score_white.score() / 100.0
                
                # Compile top 3 candidate moves
                for idx, entry in enumerate(analysis):
                    pv = entry.get("pv")
                    if not pv:
                        continue
                    m = pv[0]
                    
                    # Score formatting for candidates
                    entry_score = entry.get("score").white()
                    m_eval = 0.0
                    m_mate = None
                    if entry_score.is_mate():
                        m_mate = entry_score.mate()
                        m_eval = 999.0 if m_mate > 0 else -999.0
                    else:
                        m_eval = entry_score.score() / 100.0
                        
                    # Continuation moves list
                    continuation_sans = []
                    # Keep track of board state during continuation
                    temp_board = board.copy()
                    for c_move in pv[:4]:  # Show up to 4 moves in the line
                        continuation_sans.append(temp_board.san(c_move))
                        temp_board.push(c_move)
                        
                    candidate_moves.append({
                        "move": m.uci(),
                        "san": board.san(m),
                        "eval": m_eval,
                        "mate": m_mate,
                        "continuation": continuation_sans
                    })
                
                # Make sure candidates are sorted by strength based on turn
                maximizing = board.turn == chess.WHITE
                candidate_moves.sort(key=lambda x: x["eval"], reverse=maximizing)
                
                return {
                    "eval": eval_val,
                    "mate": mate_val,
                    "best_move": best_move.uci(),
                    "best_move_san": board.san(best_move),
                    "candidate_moves": candidate_moves
                }
                
        except Exception as e:
            logger.error(f"Stockfish analysis failed: {str(e)}. Falling back to Python Minimax engine.")
            # Fall through to Minimax fallback
            
    # --- Minimax Fallback ---
    # Depth is adjusted for fallback (typically depth 3 or 4 is fast enough in Python)
    fallback_depth = 3 if board.legal_moves.count() > 10 else 4
    
    best_move, score = evaluator.get_best_move(board, depth=fallback_depth)
    candidates = evaluator.get_top_moves(board, depth=fallback_depth, count=3)
    
    # Check mate
    mate_val = None
    if board.is_checkmate():
        mate_val = 0
        
    return {
        "eval": score,
        "mate": mate_val,
        "best_move": best_move.uci() if best_move else "",
        "best_move_san": board.san(best_move) if best_move else "",
        "candidate_moves": candidates
    }

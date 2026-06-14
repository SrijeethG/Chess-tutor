import io
import chess
import chess.pgn
import json
import math
from backend.app.engine import analyzer
from backend.app.openings import book

def get_numerical_score(eval_score: float, mate: int | None, turn: bool) -> float:
    """
    Converts raw evaluations and mate states to a continuous numerical scale.
    Positive favors White, negative favors Black.
    """
    if mate is not None:
        if mate == 0:
            return -99.0 if turn == chess.WHITE else 99.0
        # White turn to move
        if turn == chess.WHITE:
            # If White has forced mate (mate > 0)
            if mate > 0:
                return max(15.0, 30.0 - mate)
            else:
                return min(-15.0, -30.0 - mate)
        else: # Black turn to move
            # If Black has forced mate (mate is negative for White, but let's look at absolute values)
            if mate > 0:
                # White mate (positive) during Black's turn means Black is losing
                return max(15.0, 30.0 - mate)
            else:
                # Black mate (negative) during Black's turn means Black is winning
                return min(-15.0, -30.0 - mate)
    return eval_score

def calculate_accuracy(centipawn_losses: list[float]) -> float:
    """
    Calculates the chess.com style game accuracy percentage.
    Uses an exponential decay curve to model average centipawn loss.
    """
    if not centipawn_losses:
        return 100.0
        
    avg_loss = sum(centipawn_losses) / len(centipawn_losses)
    # Average centipawn loss of 0 -> 100%
    # Average loss of 100 cp (1 pawn) -> ~22%
    # Average loss of 30 cp -> ~63%
    # Formula: 100 * exp(-0.015 * avg_loss)
    accuracy = 100.0 * math.exp(-0.015 * avg_loss)
    return round(max(0.0, min(100.0, accuracy)), 1)

async def review_game(pgn_str: str) -> dict:
    """
    Analyzes all moves in a PGN string.
    Evaluates each position, classifies all moves, and computes statistics.
    """
    pgn_io = io.StringIO(pgn_str)
    game = chess.pgn.read_game(pgn_io)
    
    if not game:
        raise ValueError("Invalid PGN provided")
        
    board = game.board()
    moves = list(game.mainline_moves())
    
    reviews = []
    centipawn_losses = []
    
    blunders = 0
    mistakes = 0
    inaccuracies = 0
    brilliant = 0
    great = 0
    missed_wins = 0
    book_moves = 0
    
    eval_curve = [0.0]  # Starting position evaluation is ~0.0
    move_history_uci = []
    
    # Loop over all moves in the game
    for index, move in enumerate(moves):
        fen_before = board.fen()
        turn_before = board.turn
        move_san = board.san(move)
        move_uci = move.uci()
        
        # 1. Analyze position BEFORE the move
        analysis_before = await analyzer.analyze_position(fen_before, depth=8, limit_ms=300)
        eval_before = analysis_before["eval"]
        mate_before = analysis_before["mate"]
        best_move_uci = analysis_before["best_move"]
        best_move_san = analysis_before["best_move_san"]
        
        # 2. Push move and analyze AFTER position
        board.push(move)
        fen_after = board.fen()
        move_history_uci.append(move_uci)
        
        # Quick check if it is a checkmate (no need for deep engine search if checkmate)
        if board.is_checkmate():
            eval_after = 99.0 if turn_before == chess.WHITE else -99.0
            mate_after = 0
            analysis_after = {
                "eval": eval_after,
                "mate": mate_after,
                "best_move": "",
                "best_move_san": "",
                "candidate_moves": []
            }
        else:
            analysis_after = await analyzer.analyze_position(fen_after, depth=8, limit_ms=300)
            eval_after = analysis_after["eval"]
            mate_after = analysis_after["mate"]
            
        # 3. Calculate centipawn evaluation transition
        score_before = get_numerical_score(eval_before, mate_before, turn_before)
        score_after = get_numerical_score(eval_after, mate_after, turn_before)
        
        # Positive score is good for White. Centipawn loss is how much the active player's score dropped.
        if turn_before == chess.WHITE:
            loss = score_before - score_after
        else:
            loss = score_after - score_before  # For Black, lower is better, so increase represents loss
            
        # Normalize negative loss (improved score due to shallow search variance) to 0.0
        loss = max(0.0, loss)
        centipawn_losses.append(loss * 100.0)  # Convert to centipawn scale (e.g. 1.0 pawn = 100 centipawns)
        
        # Add to evaluation curve
        eval_curve.append(eval_after)
        
        # 4. Determine Classification
        classification = "excellent"
        description = "A strong and highly natural positional move."
        
        legal_moves_count = len(list(chess.Board(fen_before).legal_moves))
        
        # Heuristic rules
        if legal_moves_count == 1:
            classification = "forced"
            description = "The only legal move available in this position."
        elif book.is_book_move(move_history_uci):
            classification = "book"
            description = "Matches standard theoretical openings book lines."
            book_moves += 1
        elif move_uci == best_move_uci:
            classification = "best"
            description = "The absolute best move recommended by the chess engine."
        elif loss <= 0.08:
            classification = "excellent"
            description = "An excellent move that maintains your position's integrity."
        elif loss > 2.0:
            classification = "blunder"
            description = "A massive blunder that critically damages your position or loses material!"
            blunders += 1
        elif loss > 0.80:
            # Check if this was a Missed Win
            # Active player was completely winning (e.g. score > 2.5), but dropped to drawing/losing
            is_winning_before = (score_before >= 2.5) if turn_before == chess.WHITE else (score_before <= -2.5)
            is_winning_after = (score_after >= 1.0) if turn_before == chess.WHITE else (score_after <= -1.0)
            if is_winning_before and not is_winning_after:
                classification = "missed_win"
                description = "A missed opportunity to lock in a decisive, winning advantage!"
                missed_wins += 1
            else:
                classification = "mistake"
                description = "A tactical mistake that gives your opponent an opening or advantage."
                mistakes += 1
        elif loss > 0.25:
            classification = "inaccuracy"
            description = "An inaccuracy. There were slightly better positional squares."
            inaccuracies += 1
            
        # Check for Brilliant and Great move upgrades
        if classification in ["best", "excellent", "book"] and legal_moves_count > 1:
            # Brilliant Heuristic: A piece sacrifice that holds or improves the evaluation!
            board_before = chess.Board(fen_before)
            is_capture = board_before.is_capture(move)
            
            # Check if we sacrificed a piece (moved a valuable piece into attack, or captured something smaller)
            is_sacrifice = False
            attacker_val = evaluator.PIECE_VALUES.get(board_before.piece_type_at(move.from_square), 100)
            
            # If moving a major piece (knight, bishop, rook, queen) into an attacked square
            if attacker_val >= 300 and board_before.is_attacked_by(not turn_before, move.to_square):
                is_sacrifice = True
                
            if is_sacrifice and loss <= 0.05:
                classification = "brilliant"
                description = "Brilliant! An exceptional, high-level tactical sacrifice that improves your position!"
                brilliant += 1
            else:
                # Great Heuristic: The ONLY good move. The second-best candidate move drops eval by >= 1.2 pawns!
                candidates = analysis_before.get("candidate_moves", [])
                if len(candidates) >= 2:
                    # Candidates are sorted by strength. Best move is index 0.
                    # Difference between index 0 (best) and index 1 (second best)
                    first_eval = candidates[0]["eval"]
                    second_eval = candidates[1]["eval"]
                    diff = abs(first_eval - second_eval)
                    
                    if diff >= 1.2 and move_uci == best_move_uci:
                        classification = "great"
                        description = "Great move! The single, unique path that preserves your advantage!"
                        great += 1
                        
        reviews.append({
            "move_index": index,
            "move_san": move_san,
            "move_uci": move_uci,
            "fen": fen_after,
            "eval_before": eval_before,
            "eval_after": eval_after,
            "mate_before": mate_before,
            "mate_after": mate_after,
            "classification": classification,
            "best_move_uci": best_move_uci,
            "best_move_san": best_move_san,
            "description": description
        })
        
    accuracy = calculate_accuracy(centipawn_losses)
    
    return {
        "accuracy": accuracy,
        "reviews": reviews,
        "blunders_count": blunders,
        "mistakes_count": mistakes,
        "inaccuracies_count": inaccuracies,
        "brilliant_count": brilliant,
        "great_count": great,
        "missed_wins_count": missed_wins,
        "book_moves_count": book_moves,
        "eval_curve": eval_curve
    }

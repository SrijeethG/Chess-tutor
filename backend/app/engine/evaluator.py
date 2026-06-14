import chess
import random

# Material values
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

# Piece-Square Tables: encourage pieces to be placed on active squares.
# Values are from White's perspective. Black values are flipped vertically.
PAWN_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
]

KNIGHT_PST = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
]

BISHOP_PST = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
]

ROOK_PST = [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  5,  0,  0
]

QUEEN_PST = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  5,-10,
    -10,  0,  5,  0,  0,  5,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
]

# King Middlegame (encourages castling and shelter)
KING_MIDDLE_PST = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
]

# King Endgame (encourages king activity to support pawns)
KING_END_PST = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
]

def evaluate_square(piece: chess.Piece, square: int, is_endgame: bool = False) -> int:
    """Evaluates the positional value of a piece on a square based on Piece-Square Tables."""
    pt = piece.piece_type
    color = piece.color
    
    # Flat lists are index-addressed: 0 is a1, 63 is h8.
    # PST lists are defined with 0 as a8 (top-left) and 63 as h1 (bottom-right).
    # To map standard square indices to the PST index:
    # index = (7 - rank) * 8 + file
    file = chess.square_file(square)
    rank = chess.square_rank(square)
    pst_idx = (7 - rank) * 8 + file
    
    # If Black, flip rank horizontally (reflect along Y axis/rank) to get Black's perspective
    if color == chess.BLACK:
        pst_idx = rank * 8 + file
        
    score = PIECE_VALUES[pt]
    
    if pt == chess.PAWN:
        score += PAWN_PST[pst_idx]
    elif pt == chess.KNIGHT:
        score += KNIGHT_PST[pst_idx]
    elif pt == chess.BISHOP:
        score += BISHOP_PST[pst_idx]
    elif pt == chess.ROOK:
        score += ROOK_PST[pst_idx]
    elif pt == chess.QUEEN:
        score += QUEEN_PST[pst_idx]
    elif pt == chess.KING:
        if is_endgame:
            score += KING_END_PST[pst_idx]
        else:
            score += KING_MIDDLE_PST[pst_idx]
            
    return score

def is_endgame_position(board: chess.Board) -> bool:
    """Determines if a position is in the endgame (few major pieces left)."""
    major_pieces = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece and piece.piece_type in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]:
            major_pieces += 1
    return major_pieces <= 6

def evaluate_board(board: chess.Board) -> float:
    """
    Evaluates the complete board state.
    Returns a score from White's perspective.
    Positive scores favor White, negative scores favor Black.
    """
    if board.is_checkmate():
        # If it's White's turn and checkmate, Black won (return large negative value)
        return -99999 if board.turn == chess.WHITE else 99999
        
    if board.is_stalemate() or board.is_insufficient_material() or board.is_fifty_moves():
        return 0.0

    score = 0.0
    is_endgame = is_endgame_position(board)
    
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            val = evaluate_square(piece, square, is_endgame)
            if piece.color == chess.WHITE:
                score += val
            else:
                score -= val
                
    # Extra evaluation factors
    # King safety check (checks increase danger)
    if board.is_check():
        if board.turn == chess.WHITE:
            score -= 50
        else:
            score += 50
            
    return score / 100.0  # Convert to centipawn-equivalent scale

def score_move(board: chess.Board, move: chess.Move) -> int:
    """
    Heuristically scores a move for ordering purposes.
    Captures of high value pieces with lower value pieces, and checks are put first.
    """
    score = 0
    
    # If it is a capture, prioritize MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if board.is_capture(move):
        attacker = board.piece_at(move.from_square)
        victim = board.piece_at(move.to_square)
        
        attacker_val = PIECE_VALUES[attacker.piece_type] if attacker else 100
        victim_val = PIECE_VALUES[victim.piece_type] if victim else 100
        
        # Capture weight is 10 * victim - attacker
        score += 1000 + (10 * victim_val - attacker_val)
        
    # Promoting moves are very important
    if move.promotion:
        score += 900
        
    # Moving out of check or giving check
    board.push(move)
    if board.is_check():
        score += 500
    board.pop()
    
    # Avoid moving pieces into attacked squares if possible (simple heuristic)
    return score

def minimax(board: chess.Board, depth: int, alpha: float, beta: float, maximizing: bool) -> tuple[float, chess.Move | None]:
    """
    Executes standard Minimax search with Alpha-Beta pruning and move ordering.
    Returns (best_score, best_move).
    """
    if depth == 0 or board.is_game_over():
        return evaluate_board(board), None
        
    # Generate legal moves
    moves = list(board.legal_moves)
    if not moves:
        return evaluate_board(board), None
        
    # Order moves heuristically to maximize alpha-beta pruning efficiency
    moves.sort(key=lambda m: score_move(board, m), reverse=True)
    
    best_move = None
    
    if maximizing:
        max_eval = -float('inf')
        for move in moves:
            board.push(move)
            eval_val, _ = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            
            if eval_val > max_eval:
                max_eval = eval_val
                best_move = move
            alpha = max(alpha, eval_val)
            if beta <= alpha:
                break  # Beta cutoff
        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in moves:
            board.push(move)
            eval_val, _ = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            
            if eval_val < min_eval:
                min_eval = eval_val
                best_move = move
            beta = min(beta, eval_val)
            if beta <= alpha:
                break  # Alpha cutoff
        return min_eval, best_move

def get_best_move(board: chess.Board, depth: int = 3) -> tuple[chess.Move, float]:
    """
    Returns the best move and its evaluation score.
    Turn indicates who is moving (True for White, False for Black).
    """
    maximizing = board.turn == chess.WHITE
    score, move = minimax(board, depth, -float('inf'), float('inf'), maximizing)
    
    # If somehow no move is returned, pick a random legal move
    if not move:
        move = random.choice(list(board.legal_moves))
        score = evaluate_board(board)
        
    return move, score

def get_top_moves(board: chess.Board, depth: int = 3, count: int = 3) -> list[dict]:
    """
    Returns the top 'count' moves with their evaluations and continuations.
    Matches the structure required for the frontend suggestions.
    """
    moves = list(board.legal_moves)
    if not moves:
        return []
        
    # Simple ordering
    moves.sort(key=lambda m: score_move(board, m), reverse=True)
    
    move_scores = []
    maximizing = board.turn == chess.WHITE
    
    # Search each candidate move one level deep using minimax
    for move in moves[:10]:  # Limit to top 10 heuristically ordered moves to keep it fast
        board.push(move)
        score, _ = minimax(board, depth - 1, -float('inf'), float('inf'), not maximizing)
        
        # Generate short continuation of 2 plies
        continuation = []
        if not board.is_game_over():
            temp_moves = list(board.legal_moves)
            if temp_moves:
                temp_moves.sort(key=lambda m: score_move(board, m), reverse=True)
                next_move = temp_moves[0]
                continuation.append(board.san(next_move))
                board.push(next_move)
                if not board.is_game_over():
                    temp_moves2 = list(board.legal_moves)
                    if temp_moves2:
                        temp_moves2.sort(key=lambda m: score_move(board, m), reverse=True)
                        continuation.append(board.san(temp_moves2[0]))
                board.pop()
        board.pop()
        
        move_scores.append({
            "move": move.uci(),
            "san": board.san(move),
            "eval": score,
            "mate": None,
            "continuation": continuation
        })
        
    # Sort by score depending on whose turn it is
    move_scores.sort(key=lambda x: x["eval"], reverse=maximizing)
    return move_scores[:count]

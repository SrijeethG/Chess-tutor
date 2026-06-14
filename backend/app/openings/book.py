import chess

# Predefined classic opening database
OPENING_BOOK = [
    {
        "name": "Ruy Lopez",
        "eco": "C60",
        "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "b1b5"],
        "description": "One of the oldest and most popular openings, focusing on classical center control and putting immediate pressure on Black's e5 pawn defender.",
        "white_plan": "Castle early, construct a strong pawn center with c3 and d4, and expand on the kingside.",
        "black_plan": "Defend the e5 pawn, break with a7-a6 and b7-b5 to neutralize the bishop, and strike back in the center with d7-d5."
    },
    {
        "name": "Italian Game",
        "eco": "C50",
        "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
        "description": "An open game focusing on rapid kingside development and targeting Black's vulnerable f7 square.",
        "white_plan": "Develop actively, attack f7, castle quickly, and fight for the center with c3/d4 or play quietly with d3.",
        "black_plan": "Counter-develop with Bc5 (Giuoco Piano) or Nf6 (Two Knights Defense) and establish equal center control."
    },
    {
        "name": "Sicilian Defense",
        "eco": "B20",
        "moves": ["e2e4", "c7c5"],
        "description": "The most popular asymmetrical response to 1.e4, fighting for the d4 square using a flank pawn and generating sharp double-edged play.",
        "white_plan": "Develop knights to f3 and c3, open the center with d4, and launch aggressive kingside attacks.",
        "black_plan": "Utilize the semi-open c-file, attack the queenside, and break in the center with d7-d5 or e7-e5 in the endgame."
    },
    {
        "name": "French Defense",
        "eco": "C00",
        "moves": ["e2e4", "e7e6"],
        "description": "A solid, defensive opening. Black allows White a space advantage in the center in exchange for building a robust defensive pawn chain.",
        "white_plan": "Advance e4-e5 to lock the center, secure a space advantage, and launch a kingside pawn storm.",
        "black_plan": "Undermine White's center with c7-c5 and f7-f6, and develop counterplay along the semi-open c-file."
    },
    {
        "name": "Caro-Kann",
        "eco": "B12",
        "moves": ["e2e4", "c7c6"],
        "description": "An extremely solid defense similar to the French but avoiding trapping the light-squared bishop inside the pawn chain.",
        "white_plan": "Seize center space, develop pieces actively, and pressure Black's kingside.",
        "black_plan": "Challenge White's e4 pawn with d7-d5, develop the light-squared bishop to f5 or g4, and chip away with c6-c5."
    },
    {
        "name": "Scandinavian Defense",
        "eco": "B01",
        "moves": ["e2e4", "d7d5"],
        "description": "An immediate counterattack in the center. Black forces open lines right from move one.",
        "white_plan": "Capture on d5, exploit the early queen development by developing Nb1-c3 with a tempo, and control the center.",
        "black_plan": "Recapture with Qxd5 (withdrawing safely to a5, d6, or d8) or Nf6 (attacking d5 with pieces) and aim for quick development."
    },
    {
        "name": "Queen's Gambit",
        "eco": "D06",
        "moves": ["d2d4", "d7d5", "c2c4"],
        "description": "One of the most classical openings. White offers a temporary wing pawn sacrifice to secure superior central control and space.",
        "white_plan": "Seize the center with d4/e4, develop knights and bishops actively, and pressure the queenside.",
        "black_plan": "Hold the center with e7-e6 (Declined) or c7-c6 (Slav), or capture on c4 (Accepted) and try to counter-strike later."
    },
    {
        "name": "King's Indian Defense",
        "eco": "E60",
        "moves": ["d2d4", "g8f6", "c2c4", "g7g6"],
        "description": "A hypermodern defense where Black allows White a massive classical pawn center, intending to undermine it later with piece activity.",
        "white_plan": "Build a giant pawn center, castle kingside, and expand on the queenside.",
        "black_plan": "Fianchetto the dark-squared bishop, castle, and launch a powerful kingside counterstrike with e7-e5 or c7-c5."
    },
    {
        "name": "London System",
        "eco": "D02",
        "moves": ["d2d4", "d7d5", "g1f3", "g8f6", "c1f4"],
        "description": "A highly solid, easy-to-learn system for White. Creates a reliable, bulletproof pyramid pawn structure.",
        "white_plan": "Develop bishop to f4, establish a pawn chain with e3 and c3, tuck the knight into e5, and play solid positionally.",
        "black_plan": "Develop actively, challenge White's active f4 bishop with Bd6, and break in the center with c7-c5."
    },
    {
        "name": "English Opening",
        "eco": "A10",
        "moves": ["c2c4"],
        "description": "A flexible flank opening. White fights for the d5 center square from the side, keeping options open for d4 or e4 transition.",
        "white_plan": "Fianchetto the light-squared bishop, control d5, and expand on the queenside.",
        "black_plan": "Control the center classical-style with e7-e5, or symmetrical c7-c5, developing solid piece structures."
    }
]

def match_opening(move_history_uci: list[str]) -> dict | None:
    """
    Matches a sequence of played moves (in UCI format) against the opening book.
    Returns the opening info if matched, otherwise None.
    Checks prefix matching (e.g. if the game moves start with the opening moves).
    """
    if not move_history_uci:
        return None
        
    best_match = None
    max_len = 0
    
    for opening in OPENING_BOOK:
        op_moves = opening["moves"]
        op_len = len(op_moves)
        
        # Check if game history starts with this opening sequence
        if len(move_history_uci) >= op_len:
            if move_history_uci[:op_len] == op_moves:
                if op_len > max_len:
                    max_len = op_len
                    best_match = opening
                    
    return best_match

def is_book_move(move_history_uci: list[str]) -> bool:
    """
    Checks if a move history represents a path in any opening book.
    Used during game review to classify "book moves".
    """
    if not move_history_uci:
        return False
        
    for opening in OPENING_BOOK:
        op_moves = opening["moves"]
        # If this sequence matches the start of an opening book
        if len(op_moves) >= len(move_history_uci):
            if op_moves[:len(move_history_uci)] == move_history_uci:
                return True
                
    return False

def get_opening_by_name(name: str) -> dict | None:
    """Retrieves opening details by name."""
    for op in OPENING_BOOK:
        if op["name"].lower() == name.lower():
            return op
    return None

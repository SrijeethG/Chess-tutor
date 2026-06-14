import sys
import os
import datetime
from sqlalchemy.orm import Session
import bcrypt

# Add parent directory to path to ensure backend imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from backend.app.database.connection import SessionLocal, engine, Base
from backend.app.models.database_models import User, Puzzle, TrainingStats, Game

# --- SEED PUZZLES ---
PUZZLES_DATA = [
    # MATE IN 1
    {
        "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        "moves": "h5f7",
        "category": "Mate in 1",
        "difficulty": 600,
        "description": "Scholar's Mate: Deliver checkmate on the weak f7 square with your queen."
    },
    {
        "fen": "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
        "moves": "d1d8",
        "category": "Mate in 1",
        "difficulty": 700,
        "description": "Back rank mate: Exploit Black's trapped king behind the pawn shield."
    },
    {
        "fen": "r4rk1/ppp2ppp/2nb4/4p3/4P1q1/3P1N1n/PPP2P1K/RNBQ1R2 b - - 3 13",
        "moves": "h3f4",
        "category": "Mate in 1",
        "difficulty": 800,
        "description": "Spot the immediate checkmate delivered by the knight supported by the queen."
    },
    
    # MATE IN 2
    {
        "fen": "r1b1kb1r/pppp1ppp/5q2/4n3/3QP3/2N5/PPP2PPP/R1B1KB1R b KQkq - 4 7",
        "moves": "e5f3 g2f3 f6d4",
        "category": "Forks",
        "difficulty": 900,
        "description": "Spot the knight fork on d4. Sacrifice the knight to capture the enemy queen."
    },
    {
        "fen": "r3k2r/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPP2PPP/R3K2R w KQkq - 4 8",
        "moves": "g5f6 g4f3 f6g7 h8g8",
        "category": "Pins",
        "difficulty": 1000,
        "description": "A tactical exchange sequence utilizing pinning logic."
    },
    {
        "fen": "6k1/Q4ppp/8/8/8/8/2r2qPP/5R1K b - - 0 1",
        "moves": "f2g2",
        "category": "Mate in 2",
        "difficulty": 800,
        "description": "Deliver a quick mate in 2 using the queen on the vulnerable g2 square."
    },
    {
        "fen": "r1bqk2r/ppp2ppp/2np4/2b1p3/2B1P1n1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 7",
        "moves": "c4f7 e8f7",
        "category": "Double attacks",
        "difficulty": 1100,
        "description": "White sacrifices the bishop on f7 to disrupt Black's king safety."
    },
    
    # FORKS
    {
        "fen": "r2qk2r/ppp2ppp/2np1n2/1B2p3/1b2P1b1/2NP1N2/PPPB1PPP/R2QK2R b KQkq - 3 7",
        "moves": "b4c3 d2c3",
        "category": "Forks",
        "difficulty": 1000,
        "description": "Resolve the double attack on c3."
    },
    {
        "fen": "r3k2r/ppq2ppp/2n1pn2/1B1p1b2/3P4/P1N1PN2/1P3PPP/R2QK2R w KQkq - 2 11",
        "moves": "f3e5 e8g8 b5c6",
        "category": "Pins",
        "difficulty": 1200,
        "description": "Pins and trade sequences in the Queen's Gambit Declined."
    },
    {
        "fen": "4r1k1/pp3ppp/2p5/3p4/8/1P1P1qPb/PBPQ1P1P/R5K1 b - - 1 20",
        "moves": "f3g2",
        "category": "Mate in 1",
        "difficulty": 800,
        "description": "Spot the immediate checkmate on g2 supported by the dark-squared bishop."
    },
    {
        "fen": "2r3k1/pb3ppp/1p2pn2/8/2P1n3/4PN2/PB2BPPP/3R2K1 w - - 1 18",
        "moves": "d1d4 e4c5",
        "category": "Endgames",
        "difficulty": 1300,
        "description": "Strategic maneuvering in minor piece endgames."
    },
    {
        "fen": "rn1qkb1r/pb1p1ppp/4pn2/2p5/2P5/2N2NP1/PP2PPBP/R1BQK2R b KQkq - 3 7",
        "moves": "b8a6 e1g1",
        "category": "Discovered attacks",
        "difficulty": 1400,
        "description": "Positional opening prep in the Symmetrical English."
    },
    
    # SKEWERS AND TACTICS
    {
        "fen": "2k5/8/8/8/8/8/r7/3R2K1 w - - 0 1",
        "moves": "d1c1 c8d7 c1c2 a2c2",
        "category": "Skewers",
        "difficulty": 1200,
        "description": "Utilize file pinning to isolate and force king movements."
    },
    {
        "fen": "8/8/2k5/8/8/r7/8/3R2K1 w - - 0 1",
        "moves": "d1c1 c6b5 c1c2",
        "category": "Skewers",
        "difficulty": 1350,
        "description": "Defend the rook with long-range board placement."
    },
    {
        "fen": "8/4k3/8/8/8/8/4r3/3R2K1 w - - 0 1",
        "moves": "d1b1 e7e6",
        "category": "Endgames",
        "difficulty": 1250,
        "description": "Hold the draw in rook and pawn endgames."
    }
]

def seed_database():
    db = SessionLocal()
    
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    try:
        # 1. Seed Puzzles
        db.query(Puzzle).delete()
        for puzzle_data in PUZZLES_DATA:
            puzzle = Puzzle(
                fen=puzzle_data["fen"],
                moves=puzzle_data["moves"],
                category=puzzle_data["category"],
                difficulty=puzzle_data["difficulty"],
                description=puzzle_data["description"]
            )
            db.add(puzzle)
        print(f"Seeded {len(PUZZLES_DATA)} tactical puzzles.")
        
        # 2. Seed Default Demo User
        demo_user = db.query(User).filter(User.username == "demo").first()
        if not demo_user:
            hashed_pwd = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            demo_user = User(
                username="demo",
                email="demo@example.com",
                password_hash=hashed_pwd
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print("Seeded default User: demo / password123")
            
            # 3. Seed Default Training Stats for Demo User
            demo_stats = TrainingStats(
                user_id=demo_user.id,
                opening_score=1180.0,
                tactics_score=1250.0,
                endgame_score=1050.0,
                accuracy_score=68.5,
                estimated_elo=1220,
                weakness_json=json.dumps({
                    "weak_tactics": ["Forks", "Endgames"],
                    "weak_openings": ["Sicilian Defense"],
                    "strong_openings": ["Ruy Lopez"]
                })
            )
            db.add(demo_stats)
            
            # 4. Seed a couple of default games to populate graphs
            game1 = Game(
                user_id=demo_user.id,
                pgn='[Event "Casual Match"]\n[White "demo"]\n[Black "AI Trainer"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0',
                fen="r1bq1rk1/2pnbppp/p2p1n2/1p2p3/3PP3/1BP2N1P/PP3PP1/RNBQR1K1 b - - 1 10",
                result="1-0",
                accuracy=84.5,
                opponent_strength=1000,
                openings_eco="C60",
                analysis_json=json.dumps({
                    "accuracy": 84.5,
                    "blunders_count": 0,
                    "mistakes_count": 1,
                    "inaccuracies_count": 2,
                    "brilliant_count": 0,
                    "great_count": 1,
                    "book_moves_count": 8,
                    "eval_curve": [0.0, 0.2, 0.1, 0.3, 0.2, 0.4, 0.3, 0.5, 0.4, 0.6, 0.5, 0.8, 0.7, 1.2, 1.5]
                })
            )
            game2 = Game(
                user_id=demo_user.id,
                pgn='[Event "Casual Match"]\n[White "AI Trainer"]\n[Black "demo"]\n[Result "0-1"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Qb6 8. Qd2 Qxb2 9. Rb1 Qa3 10. e5 dxe5 11. fxe5 Nfd7 0-1',
                fen="rn2kb1r/1p1n1ppp/p3p3/4P1B1/3N4/q1N5/P1PQ2PP/1R2KB1R w Kkq - 0 12",
                result="0-1",
                accuracy=76.2,
                opponent_strength=1200,
                openings_eco="B96",
                analysis_json=json.dumps({
                    "accuracy": 76.2,
                    "blunders_count": 1,
                    "mistakes_count": 2,
                    "inaccuracies_count": 1,
                    "brilliant_count": 1,
                    "great_count": 0,
                    "book_moves_count": 9,
                    "eval_curve": [0.0, -0.1, 0.0, -0.2, -0.1, -0.3, -0.2, -0.4, -0.3, -0.8, -1.2, -1.5, -2.1]
                })
            )
            db.add(game1)
            db.add(game2)
            db.commit()
            print("Seeded default historical games and training stats for 'demo' user.")
        else:
            print("Demo user already exists. Skipping user seed.")
            db.commit()
            
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

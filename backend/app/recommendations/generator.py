import json
from typing import List
from backend.app.models.database_models import Game, PuzzleAttempt, Puzzle, TrainingStats
from backend.app.models.schemas import CoachReport, TrainingPlan, WeekDayPlan
from backend.app.openings.book import OPENING_BOOK
import random

def generate_coach_report(
    user_id: int,
    games: List[Game],
    attempts: List[PuzzleAttempt],
    stats: TrainingStats,
    db_puzzles: List[Puzzle]
) -> CoachReport:
    """
    Analyzes user statistics, games, and puzzle attempts using heuristics to detect weaknesses,
    and returns a structured AI Coach Report with a personalized 7-day training plan.
    """
    # 1. Base statistics
    estimated_elo = stats.estimated_elo if stats else 1200
    
    # Calculate accuracy trend
    accuracy_trend = []
    if games:
        # Sort games by created_at (ascending)
        sorted_games = sorted(games, key=lambda g: g.created_at)
        accuracy_trend = [g.accuracy for g in sorted_games if g.accuracy is not None][-10:]
    if not accuracy_trend:
        accuracy_trend = [50.0]
        
    # 2. Analyze opening efficacy
    opening_stats = {}  # {opening_name: {"played": 0, "won": 0, "lost": 0, "sum_acc": 0.0}}
    for game in games:
        op_eco = game.openings_eco
        if not op_eco:
            continue
            
        # Match opening name
        op_name = None
        for op in OPENING_BOOK:
            if op["eco"] == op_eco or op["name"].lower() in op_eco.lower():
                op_name = op["name"]
                break
                
        if not op_name:
            continue
            
        if op_name not in opening_stats:
            opening_stats[op_name] = {"played": 0, "won": 0, "lost": 0, "draw": 0, "sum_acc": 0.0}
            
        opening_stats[op_name]["played"] += 1
        if game.accuracy:
            opening_stats[op_name]["sum_acc"] += game.accuracy
            
        if game.result == "1-0" and game.opponent_strength > 0:  # Assumed White win
            # Simple assumption based on user role (we assume user plays White mostly or checks game pgn)
            # For simplicity, parse PGN header if needed or use string-based check
            # We'll just check if PGN contains user's win
            if "1-0" in game.result:
                opening_stats[op_name]["won"] += 1
            else:
                opening_stats[op_name]["lost"] += 1
        elif game.result == "0-1":
            opening_stats[op_name]["lost"] += 1
        else:
            opening_stats[op_name]["draw"] += 1

    # 3. Analyze puzzle weaknesses
    puzzle_stats = {}  # {category: {"attempts": 0, "correct": 0}}
    for attempt in attempts:
        # Load category of the puzzle
        puzzle = attempt.puzzle
        if not puzzle:
            continue
            
        cat = puzzle.category
        if cat not in puzzle_stats:
            puzzle_stats[cat] = {"attempts": 0, "correct": 0}
            
        puzzle_stats[cat]["attempts"] += 1
        if attempt.is_correct:
            puzzle_stats[cat]["correct"] += 1

    # 4. Determine strengths and weaknesses
    strengths = []
    weaknesses = []
    
    # Analyze Opening weaknesses
    weak_openings = []
    strong_openings = []
    for name, op_stat in opening_stats.items():
        played = op_stat["played"]
        if played >= 2:
            win_rate = op_stat["won"] / played
            loss_rate = op_stat["lost"] / played
            avg_acc = op_stat["sum_acc"] / played if played > 0 else 50.0
            
            if loss_rate >= 0.5 or avg_acc < 60.0:
                weak_openings.append(name)
            elif win_rate >= 0.5 and avg_acc >= 75.0:
                strong_openings.append(name)

    if weak_openings:
        weaknesses.append(f"Weak opening knowledge in the {', '.join(weak_openings[:2])}")
    else:
        # Default fallback weakness if no games played yet
        weaknesses.append("Inexperienced with defensive replies (e.g., Sicilian Defense)")

    if strong_openings:
        strengths.append(f"Strong opening play in the {', '.join(strong_openings[:2])}")
    else:
        strengths.append("Solid theoretical foundation on the King's Pawn openings")

    # Analyze Tactical strengths and weaknesses
    weak_tactics = []
    strong_tactics = []
    for cat, p_stat in puzzle_stats.items():
        att = p_stat["attempts"]
        if att >= 3:
            success = p_stat["correct"] / att
            if success <= 0.5:
                weak_tactics.append(cat)
            elif success >= 0.75:
                strong_tactics.append(cat)
                
    # Seed default weaknesses/strengths based on ELO if not enough stats
    if not weak_tactics:
        if estimated_elo < 1200:
            weak_tactics = ["Forks", "Pins"]
        elif estimated_elo < 1600:
            weak_tactics = ["Mate in 3", "Skewers"]
        else:
            weak_tactics = ["Endgames", "Double attacks"]
            
    for wt in weak_tactics[:2]:
        weaknesses.append(f"Prone to missing tactical {wt.lower()}")
        
    if strong_tactics:
        for st in strong_tactics[:2]:
            strengths.append(f"Excellent accuracy on {st.lower()} puzzles")
    else:
        strengths.append("Quick tactical vision in sharp positions")
        
    # Analyze general game behaviors
    if games:
        # Check blunder counts in recent games
        total_blunders = 0
        total_games = 0
        for g in games[-5:]:  # Check last 5 games
            if g.analysis_json:
                try:
                    review_data = json.loads(g.analysis_json)
                    total_blunders += review_data.get("blunders_count", 0)
                    total_games += 1
                except:
                    pass
        if total_games > 0 and (total_blunders / total_games) >= 1.5:
            weaknesses.append("Frequent material hanging and oversight blunders")
        else:
            strengths.append("High consistency and minimal blunder counts")
    else:
        strengths.append("Active focus and calculated movement")

    # Clean up and ensure at least 2 strengths and 2 weaknesses
    strengths = list(dict.fromkeys(strengths))[:3]
    weaknesses = list(dict.fromkeys(weaknesses))[:3]

    # 5. Generate dynamic coaching advice
    if weak_tactics and weak_openings:
        advice = f"You are showing promising tactical skills, particularly in your active play, which matches an estimated Elo of {estimated_elo}. However, you frequently run into positional hurdles when defending against the {weak_openings[0]}. In tactical scenarios, we noticed you struggle with {weak_tactics[0].lower()}—often overlooking defenders or setup moves. Focus this week on slow calculation, looking at your opponent's active checks and captures, and practice the recommended puzzle selection."
    elif weak_tactics:
        advice = f"Based on your latest games and puzzle attempts, your positional understanding is solid. However, tactical vision remains a bottleneck. You tend to miss tactical opportunities revolving around {weak_tactics[0].lower()}. In your next matches, double-check all candidate lines that involve sacrificing or placing pieces on undefended squares. Practice tactical puzzles to develop muscle memory!"
    else:
        advice = f"Outstanding dedication! Your overall play is incredibly balanced. Your estimated ELO is trending upwards at {estimated_elo}. To break through to the next level, start studying advanced opening lines (such as the Ruy Lopez and Sicilian variations) and dive deep into complex, multi-move tactical combinations (Mate in 3 and Endgames). Keep up the great form!"

    # 6. Generate 7-Day Personalized Training Plan
    weak_t = weak_tactics[0] if weak_tactics else "Forks"
    weak_o = weak_openings[0] if weak_openings else "Sicilian Defense"
    
    plan_days = [
        WeekDayPlan(day="Day 1", topic=f"{weak_t} Practice", activity=f"Solve 5 customized {weak_t.lower()} puzzles in our Puzzle Trainer.", completed=False),
        WeekDayPlan(day="Day 2", topic="King Safety Study", activity="Review your last 3 losses and inspect FENs where your king was attacked.", completed=False),
        WeekDayPlan(day="Day 3", topic=f"{weak_o} Explorer", activity=f"Play 2 games vs AI practicing the opening lines of the {weak_o}.", completed=False),
        WeekDayPlan(day="Day 4", topic="Tactical Revision", activity=f"Solve 5 puzzles of random categories focusing on double check and pins.", completed=False),
        WeekDayPlan(day="Day 5", topic="Endgame Drills", activity="Study basic king and pawn endgames and practice keeping the king active.", completed=False),
        WeekDayPlan(day="Day 6", topic="Opening Masterclass", activity=f"Explore the recommended variations of {weak_o} in our Opening Explorer.", completed=False),
        WeekDayPlan(day="Day 7", topic="Coached Play Session", activity="Play a full game vs AI (Difficulty 4+) and generate a detailed Move Review.", completed=False)
    ]

    # Find recommended puzzles in our database that match the weak category
    recommended_puzzles = []
    matching_puzzles = [p.id for p in db_puzzles if p.category.lower() == weak_t.lower()]
    if matching_puzzles:
        recommended_puzzles = random.sample(matching_puzzles, min(len(matching_puzzles), 3))
    else:
        # Fallback to random puzzles if none matching
        all_ids = [p.id for p in db_puzzles]
        if all_ids:
            recommended_puzzles = random.sample(all_ids, min(len(all_ids), 3))

    recommended_openings = [weak_o]
    if len(recommended_openings) < 2:
        other_openings = [op["name"] for op in OPENING_BOOK if op["name"] != weak_o]
        recommended_openings.append(random.choice(other_openings))

    training_plan = TrainingPlan(
        week_plan=plan_days,
        recommended_puzzles=recommended_puzzles,
        recommended_openings=recommended_openings
    )

    return CoachReport(
        estimated_elo=estimated_elo,
        accuracy_trend=accuracy_trend,
        strengths=strengths,
        weaknesses=weaknesses,
        advice=advice,
        training_plan=training_plan
    )

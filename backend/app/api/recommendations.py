from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.database_models import Game, PuzzleAttempt, Puzzle, TrainingStats, User
from backend.app.models.schemas import TrainingStatsOut, CoachReport
from backend.app.api.auth import get_current_user
from backend.app.recommendations.generator import generate_coach_report

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

@router.get("/stats", response_model=TrainingStatsOut)
def get_user_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieves the current training statistics and Elo ratings for the user."""
    stats = db.query(TrainingStats).filter(TrainingStats.user_id == current_user.id).first()
    if not stats:
        # Create default stats if missing
        stats = TrainingStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats

@router.get("/report", response_model=CoachReport)
def get_coach_report(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Triggers the AI Chess Coach statistical engine.
    Analyzes historical matches and puzzle attempts to compile a dynamic coaching report.
    """
    stats = db.query(TrainingStats).filter(TrainingStats.user_id == current_user.id).first()
    if not stats:
        stats = TrainingStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
        
    # Load user games
    games = db.query(Game).filter(Game.user_id == current_user.id).all()
    
    # Load user puzzle attempts
    attempts = db.query(PuzzleAttempt).filter(PuzzleAttempt.user_id == current_user.id).all()
    
    # Load seeded puzzles (to suggest relevant puzzles)
    puzzles = db.query(Puzzle).all()
    
    # Generate report
    report = generate_coach_report(current_user.id, games, attempts, stats, puzzles)
    return report

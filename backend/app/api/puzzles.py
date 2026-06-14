from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import random

from backend.app.database.connection import get_db
from backend.app.models.database_models import Puzzle, PuzzleAttempt, TrainingStats, User
from backend.app.models.schemas import PuzzleOut, PuzzleAttemptCreate, PuzzleAttemptOut
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/api/puzzles", tags=["puzzles"])

@router.get("", response_model=List[PuzzleOut])
def list_puzzles(
    category: Optional[str] = None,
    min_difficulty: Optional[int] = None,
    max_difficulty: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Puzzle)
    if category:
        query = query.filter(Puzzle.category == category)
    if min_difficulty is not None:
        query = query.filter(Puzzle.difficulty >= min_difficulty)
    if max_difficulty is not None:
        query = query.filter(Puzzle.difficulty <= max_difficulty)
    return query.all()

@router.get("/random", response_model=PuzzleOut)
def get_random_puzzle(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Puzzle)
    if category:
        query = query.filter(Puzzle.category == category)
    puzzles = query.all()
    if not puzzles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No puzzles found matching the filters"
        )
    return random.choice(puzzles)

@router.get("/categories", response_model=List[str])
def get_puzzle_categories(db: Session = Depends(get_db)):
    categories = db.query(Puzzle.category).distinct().all()
    return [c[0] for c in categories]

@router.get("/{puzzle_id}", response_model=PuzzleOut)
def get_puzzle(puzzle_id: int, db: Session = Depends(get_db)):
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    return puzzle

@router.post("/{puzzle_id}/attempt", response_model=PuzzleAttemptOut)
def submit_attempt(
    puzzle_id: int,
    attempt_in: PuzzleAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
        
    # 1. Log the attempt
    new_attempt = PuzzleAttempt(
        user_id=current_user.id,
        puzzle_id=puzzle_id,
        is_correct=attempt_in.is_correct,
        time_spent=attempt_in.time_spent
    )
    db.add(new_attempt)
    
    # 2. Update user's tactics score and overall Elo dynamically
    stats = db.query(TrainingStats).filter(TrainingStats.user_id == current_user.id).first()
    if not stats:
        stats = TrainingStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
        
    puz_diff = puzzle.difficulty
    tact_rating = stats.tactics_score
    
    # Calculate Elo change using expected outcomes
    expected = 1 / (1 + 10 ** ((puz_diff - tact_rating) / 400))
    k_factor = 16  # Slightly lower K-factor for puzzle attempts to prevent wild rating swings
    
    actual = 1.0 if attempt_in.is_correct else 0.0
    rating_change = int(k_factor * (actual - expected))
    
    stats.tactics_score = max(500.0, stats.tactics_score + rating_change)
    
    # Also adjust estimated ELO by a fraction of the tactical swing
    stats.estimated_elo = max(500, stats.estimated_elo + int(rating_change / 3))
    
    db.commit()
    db.refresh(new_attempt)
    return new_attempt

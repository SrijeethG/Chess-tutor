from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


# --- GAME SCHEMAS ---
class GameCreate(BaseModel):
    pgn: str
    fen: str
    result: str
    opponent_strength: int
    openings_eco: Optional[str] = None
    accuracy: Optional[float] = None
    analysis_json: Optional[str] = None

class GameOut(BaseModel):
    id: int
    user_id: int
    pgn: str
    fen: str
    result: str
    accuracy: Optional[float]
    opponent_strength: int
    openings_eco: Optional[str]
    analysis_json: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- PUZZLE SCHEMAS ---
class PuzzleOut(BaseModel):
    id: int
    fen: str
    moves: str  # Space-separated moves, e.g. "e2e4 e7e5"
    category: str
    difficulty: int
    description: Optional[str]

    class Config:
        from_attributes = True

class PuzzleAttemptCreate(BaseModel):
    puzzle_id: int
    is_correct: bool
    time_spent: int

class PuzzleAttemptOut(BaseModel):
    id: int
    user_id: int
    puzzle_id: int
    is_correct: bool
    time_spent: int
    attempted_at: datetime

    class Config:
        from_attributes = True


# --- STATS AND COACH SCHEMAS ---
class TrainingStatsOut(BaseModel):
    id: int
    user_id: int
    opening_score: float
    tactics_score: float
    endgame_score: float
    accuracy_score: float
    estimated_elo: int
    weakness_json: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True

class WeekDayPlan(BaseModel):
    day: str
    topic: str
    activity: str
    completed: bool = False

class TrainingPlan(BaseModel):
    week_plan: List[WeekDayPlan]
    recommended_puzzles: List[int]
    recommended_openings: List[str]

class CoachReport(BaseModel):
    estimated_elo: int
    accuracy_trend: List[float]
    strengths: List[str]
    weaknesses: List[str]
    advice: str
    training_plan: TrainingPlan


# --- BOOKMARK SCHEMAS ---
class BookmarkCreate(BaseModel):
    fen: str
    title: str
    notes: Optional[str] = None

class BookmarkOut(BaseModel):
    id: int
    user_id: int
    fen: str
    title: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- ENGINE AND ANALYSIS SCHEMAS ---
class CandidateMove(BaseModel):
    move: str
    san: str
    eval: float
    mate: Optional[int] = None
    continuation: List[str]

class EngineAnalysisResponse(BaseModel):
    eval: float
    mate: Optional[int] = None
    best_move: str
    best_move_san: str
    candidate_moves: List[CandidateMove]

class PostGameReviewRequest(BaseModel):
    pgn: str

class MoveReviewItem(BaseModel):
    move_index: int
    move_san: str
    move_uci: str
    fen: str
    eval_before: float
    eval_after: float
    mate_before: Optional[int] = None
    mate_after: Optional[int] = None
    classification: str  # "brilliant", "great", "best", "excellent", "book", "inaccuracy", "mistake", "blunder", "missed_win", "forced"
    best_move_uci: str
    best_move_san: str
    description: str

class PostGameReviewResponse(BaseModel):
    accuracy: float
    reviews: List[MoveReviewItem]
    blunders_count: int
    mistakes_count: int
    inaccuracies_count: int
    brilliant_count: int
    great_count: int
    missed_wins_count: int
    book_moves_count: int
    eval_curve: List[float]

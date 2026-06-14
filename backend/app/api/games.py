from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from backend.app.database.connection import get_db
from backend.app.models.database_models import Game, TrainingStats, User
from backend.app.models.schemas import GameCreate, GameOut
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/api/games", tags=["games"])

@router.post("", response_model=GameOut)
def save_game(game_in: GameCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate Elo change based on results
    stats = db.query(TrainingStats).filter(TrainingStats.user_id == current_user.id).first()
    if not stats:
        stats = TrainingStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
        
    # Standard Elo adjustment
    elo_change = 0
    res = game_in.result
    
    # We assume player is White in our single-player setup or we inspect result
    # "1-0" means White wins, "0-1" means Black wins, "1/2-1/2" is a draw
    user_won = False
    user_lost = False
    is_draw = False
    
    # Determine who won: Play vs AI is single-player.
    # PGN White header is typically "demo" or user's name.
    # In Play VS AI, let's assume the user is playing against the AI.
    # The frontend knows whether the user won and can set the result.
    # We'll check if "1-0" (if user was white) or "0-1" (if user was black)
    # Let's inspect the PGN to see if White is current_user.username
    is_white = True
    if f'[White "{current_user.username}"]' in game_in.pgn:
        is_white = True
    elif f'[Black "{current_user.username}"]' in game_in.pgn:
        is_white = False
        
    if res == "1-0":
        user_won = is_white
        user_lost = not is_white
    elif res == "0-1":
        user_won = not is_white
        user_lost = is_white
    elif res == "1/2-1/2":
        is_draw = True
        
    # Elo calculation logic
    opp_elo = game_in.opponent_strength
    user_elo = stats.estimated_elo
    
    # Expected outcome
    expected = 1 / (1 + 10 ** ((opp_elo - user_elo) / 400))
    k_factor = 32
    
    if user_won:
        elo_change = int(k_factor * (1 - expected))
    elif user_lost:
        elo_change = int(k_factor * (0 - expected))
    elif is_draw:
        elo_change = int(k_factor * (0.5 - expected))
        
    # Update Stats
    stats.estimated_elo = max(500, stats.estimated_elo + elo_change)
    
    # Recalculate average accuracy
    all_accuracies = [g.accuracy for g in current_user.games if g.accuracy is not None]
    if game_in.accuracy is not None:
        all_accuracies.append(game_in.accuracy)
        
    if all_accuracies:
        stats.accuracy_score = sum(all_accuracies) / len(all_accuracies)
        
    # Update scores based on category blunders if available in analysis
    if game_in.analysis_json:
        try:
            analysis = json.loads(game_in.analysis_json)
            # Adjust tactical score slightly down for high blunder count
            blunders = analysis.get("blunders_count", 0)
            stats.tactics_score = max(500.0, stats.tactics_score - (blunders * 5.0) + (10.0 if blunders == 0 else 0.0))
            
            # Simple opening score updates based on book moves played
            book_moves = analysis.get("book_moves_count", 0)
            stats.opening_score = min(3000.0, stats.opening_score + (book_moves * 2.0))
        except:
            pass
            
    db.commit()
    
    # Save the Game record
    new_game = Game(
        user_id=current_user.id,
        pgn=game_in.pgn,
        fen=game_in.fen,
        result=game_in.result,
        accuracy=game_in.accuracy,
        opponent_strength=game_in.opponent_strength,
        openings_eco=game_in.openings_eco,
        analysis_json=game_in.analysis_json
    )
    
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game

@router.get("", response_model=List[GameOut])
def list_games(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Game).filter(Game.user_id == current_user.id).order_by(Game.created_at.desc()).all()

@router.get("/{game_id}", response_model=GameOut)
def get_game(game_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id, Game.user_id == current_user.id).first()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found or unauthorized"
        )
    return game

@router.delete("/{game_id}")
def delete_game(game_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id, Game.user_id == current_user.id).first()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found or unauthorized"
        )
    db.delete(game)
    db.commit()
    return {"detail": "Game deleted successfully"}

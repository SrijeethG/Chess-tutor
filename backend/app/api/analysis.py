from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from backend.app.models.schemas import EngineAnalysisResponse, PostGameReviewRequest, PostGameReviewResponse
from backend.app.api.auth import get_current_user
from backend.app.engine import analyzer
from backend.app.analysis import game_review

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/evaluate", response_model=EngineAnalysisResponse)
async def evaluate_position(
    fen: str,
    depth: int = 10,
    limit_ms: int = 500,
    current_user = Depends(get_current_user)
):
    """
    Evaluates a chess position (FEN) in real-time.
    Returns: Current evaluation, best move, and top candidate continuations.
    """
    try:
        result = await analyzer.analyze_position(fen, depth=depth, limit_ms=limit_ms)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Engine evaluation failed: {str(e)}"
        )

@router.post("/review", response_model=PostGameReviewResponse)
async def review_game(
    payload: PostGameReviewRequest,
    current_user = Depends(get_current_user)
):
    """
    Performs full post-game analysis on a completed PGN.
    Returns: Detailed move-by-move classification, accuracy index, and advantages curve.
    """
    try:
        report = await game_review.review_game(payload.pgn)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Post-game review compilation failed: {str(e)}"
        )

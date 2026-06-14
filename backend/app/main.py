from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

from backend.app.database.connection import engine, Base, get_db
from backend.app.api import auth, games, puzzles, openings, recommendations, analysis
from backend.app.engine import analyzer
from backend.app.api.auth import get_current_user

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChessMaster AI Trainer API",
    description="Asynchronous backend API supporting play, analysis, puzzles, openings, and personalized AI coaching.",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173", # Default Vite local dev server port
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bind Router Endpoints
app.include_router(auth.router)
app.include_router(games.router)
app.include_router(puzzles.router)
app.include_router(openings.router)
app.include_router(recommendations.router)
app.include_router(analysis.router)

class StockfishPathSettings(BaseModel):
    path: str

@app.post("/api/settings/stockfish")
def update_stockfish_path(settings: StockfishPathSettings, current_user = Depends(get_current_user)):
    """Sets and validates a custom local Stockfish binary executable path."""
    success = analyzer.set_stockfish_path(settings.path)
    if not success and settings.path != "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified path does not exist or is not a valid executable file."
        )
    return {
        "success": True,
        "detail": "Stockfish path updated successfully." if settings.path else "Stockfish path cleared. Using Minimax fallback.",
        "active_path": analyzer.get_stockfish_path()
    }

@app.get("/api/settings/stockfish")
def get_stockfish_settings(current_user = Depends(get_current_user)):
    """Retrieves the current Stockfish settings status."""
    path = analyzer.get_stockfish_path()
    return {
        "active_path": path,
        "is_configured": bool(path),
        "status": "Active UCI Engine" if path else "Using Minimax Fallback Engine"
    }

@app.get("/")
def read_root():
    return {
        "app": "ChessMaster AI Trainer API",
        "status": "Running",
        "stockfish_status": "Configured" if analyzer.get_stockfish_path() else "Fallback Mode (Pure Python Minimax active)"
    }

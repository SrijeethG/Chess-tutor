import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    games = relationship("Game", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("PuzzleAttempt", back_populates="user", cascade="all, delete-orphan")
    training_stats = relationship("TrainingStats", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pgn = Column(Text, nullable=False)
    fen = Column(String, nullable=False)
    result = Column(String, nullable=False)  # "1-0", "0-1", "1/2-1/2", or "*" (active)
    accuracy = Column(Float, nullable=True)  # Computed game accuracy score (0-100)
    opponent_strength = Column(Integer, nullable=False)  # AI Elo (500-3000)
    openings_eco = Column(String, nullable=True)  # Opening ECO code or name, e.g. "C00" or "French Defense"
    analysis_json = Column(Text, nullable=True)  # Detailed JSON move classifications, eval curves
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="games")


class Puzzle(Base):
    __tablename__ = "puzzles"

    id = Column(Integer, primary_key=True, index=True)
    fen = Column(String, nullable=False)
    moves = Column(String, nullable=False)  # Space-separated list of correct moves, e.g., "e2e4 e7e5"
    category = Column(String, nullable=False)  # "Mate in 1", "Forks", "Pins", etc.
    difficulty = Column(Integer, nullable=False)  # Estimated rating/difficulty (e.g. 800, 1500, 2000)
    description = Column(String, nullable=True)  # Helpful text description of the puzzle theme

    # Relationships
    attempts = relationship("PuzzleAttempt", back_populates="puzzle", cascade="all, delete-orphan")


class PuzzleAttempt(Base):
    __tablename__ = "puzzle_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    puzzle_id = Column(Integer, ForeignKey("puzzles.id", ondelete="CASCADE"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_spent = Column(Integer, nullable=False)  # in seconds
    attempted_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="attempts")
    puzzle = relationship("Puzzle", back_populates="attempts")


class TrainingStats(Base):
    __tablename__ = "training_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    opening_score = Column(Float, default=1200.0)  # Estimated skill levels across dimensions
    tactics_score = Column(Float, default=1200.0)
    endgame_score = Column(Float, default=1200.0)
    accuracy_score = Column(Float, default=50.0)    # Average accuracy score
    estimated_elo = Column(Integer, default=1200)
    weakness_json = Column(Text, nullable=True)      # Detailed JSON of weak tactics and opening stats
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="training_stats")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fen = Column(String, nullable=False)
    title = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bookmarks")

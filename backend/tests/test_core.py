import sys
import os
import chess
import unittest

# Add parent directory to path to ensure backend imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.app.engine import evaluator
from backend.app.openings import book
from backend.app.analysis import game_review

class TestChessMasterBackend(unittest.TestCase):

    def test_board_evaluation(self):
        """Tests that the evaluation engine detects basic material and positional states."""
        # Starting position should be equal (~0.0)
        board = chess.Board()
        score = evaluator.evaluate_board(board)
        self.assertAlmostEqual(score, 0.0, delta=0.5)

        # White is up a queen
        board = chess.Board("rnb1kbnr/pppppppp/8/8/8/8/PPPPQPPP/RNB1KBNR w KQkq - 0 1")
        score = evaluator.evaluate_board(board)
        self.assertGreater(score, 8.0) # Queen is worth 9

        # Black is up a rook (White is missing its a1 rook)
        board = chess.Board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w Kkq - 0 1")
        score = evaluator.evaluate_board(board)
        self.assertLess(score, -4.0) # Rook is worth 5

    def test_minimax_mate_in_1(self):
        """Tests if the minimax algorithm successfully finds a forced checkmate in 1."""
        # Fool's Mate setup for White to deliver checkmate on h5
        # 1. f3 e5 2. g4 Qh4#
        board = chess.Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        # Board is in checkmate. Score should represent mate.
        score = evaluator.evaluate_board(board)
        self.assertEqual(score, -99999.0) # Black won

        # Test solver on simple mate in 1 position
        # White Q on f7, Bishop on c4, Black King on e8. White turn.
        board = chess.Board("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4")
        best_move, _ = evaluator.get_best_move(board, depth=1)
        self.assertEqual(best_move.uci(), "h5f7")

    def test_opening_matching(self):
        """Tests if the opening books prefix matching identifies lines correctly."""
        # Sicilian Defense: 1. e4 c5
        moves = ["e2e4", "c7c5"]
        match = book.match_opening(moves)
        self.assertIsNotNone(match)
        self.assertEqual(match["name"], "Sicilian Defense")
        self.assertEqual(match["eco"], "B20")

        # Ruy Lopez: 1. e4 e5 2. Nf3 Nc6 3. Bb5
        moves = ["e2e4", "e7e5", "g1f3", "b8c6", "b1b5"]
        match = book.match_opening(moves)
        self.assertIsNotNone(match)
        self.assertEqual(match["name"], "Ruy Lopez")

        # Invalid random moves
        moves = ["a2a3", "h7h6"]
        match = book.match_opening(moves)
        self.assertIsNone(match)

    def test_game_review_accuracy(self):
        """Tests that game replay calculates accuracy decay curves accurately."""
        # Replay scholar's mate game
        # 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
        pgn = '[Event "Scholar\'s Mate"]\n[White "White Player"]\n[Black "Black Player"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0'
        
        # Test accuracy calculation with realistic cp losses
        losses = [10.0, 20.0, 30.0, 15.0, 45.0] # some cp losses
        acc = game_review.calculate_accuracy(losses)
        self.assertLess(acc, 95.0)
        self.assertGreater(acc, 50.0)

if __name__ == "__main__":
    unittest.main()

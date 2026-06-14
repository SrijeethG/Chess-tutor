const API_BASE_URL = "http://localhost:8000";

// Heuristic mock database seeder for localStorage when running in pure local Guest Mode
const getLocalStats = () => {
  const stats = localStorage.getItem("chess_guest_stats");
  if (stats) return JSON.parse(stats);
  
  const defaultStats = {
    opening_score: 1150.0,
    tactics_score: 1200.0,
    endgame_score: 1050.0,
    accuracy_score: 64.2,
    estimated_elo: 1180,
    weakness_json: JSON.stringify({
      weak_tactics: ["Forks"],
      weak_openings: ["Sicilian Defense"],
      strong_openings: ["Ruy Lopez"]
    })
  };
  localStorage.setItem("chess_guest_stats", JSON.stringify(defaultStats));
  return defaultStats;
};

const getLocalGames = () => {
  const games = localStorage.getItem("chess_guest_games");
  if (games) return JSON.parse(games);
  
  const defaultGames = [
    {
      id: 1,
      pgn: '[Event "Casual Match"]\n[White "Guest User"]\n[Black "AI Coach"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 1-0',
      fen: "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
      result: "1-0",
      accuracy: 82.5,
      opponent_strength: 1000,
      openings_eco: "C60",
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ];
  localStorage.setItem("chess_guest_games", JSON.stringify(defaultGames));
  return defaultGames;
};

const getLocalAttempts = () => {
  const attempts = localStorage.getItem("chess_guest_attempts");
  if (attempts) return JSON.parse(attempts);
  return [];
};

// Helper to attach authorization header
const getHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("chess_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // --- AUTH ENDPOINTS ---
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Authentication failed");
      }
      const data = await response.json();
      localStorage.setItem("chess_token", data.access_token);
      localStorage.setItem("chess_user", username);
      return data;
    } catch (err) {
      // Offline fallback: Login guest
      if (username === "demo" && password === "password123") {
        localStorage.setItem("chess_token", "mock-guest-token");
        localStorage.setItem("chess_user", "demo");
        return { access_token: "mock-guest-token", token_type: "bearer" };
      }
      throw err;
    }
  },

  register: async (username, email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }
    const data = await response.json();
    localStorage.setItem("chess_token", data.access_token);
    localStorage.setItem("chess_user", username);
    return data;
  },

  loginDemo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/demo`, { method: "POST" });
      if (!response.ok) throw new Error("Demo login failed");
      const data = await response.json();
      localStorage.setItem("chess_token", data.access_token);
      localStorage.setItem("chess_user", "demo");
      return data;
    } catch (err) {
      // Local Guest mode login
      localStorage.setItem("chess_token", "mock-guest-token");
      localStorage.setItem("chess_user", "demo (Guest)");
      return { access_token: "mock-guest-token", token_type: "bearer" };
    }
  },

  logout: () => {
    localStorage.removeItem("chess_token");
    localStorage.removeItem("chess_user");
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem("chess_token");
    if (!token) return null;
    if (token === "mock-guest-token") {
      return { id: 0, username: localStorage.getItem("chess_user") || "demo", email: "guest@example.com" };
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getHeaders()
    });
    if (!response.ok) {
      api.logout();
      return null;
    }
    return response.json();
  },

  // --- GAMES ENDPOINTS ---
  saveGame: async (gameData) => {
    const token = localStorage.getItem("chess_token");
    if (!token || token === "mock-guest-token") {
      // Guest mode: save to localStorage
      const games = getLocalGames();
      const newGame = {
        id: Date.now(),
        user_id: 0,
        pgn: gameData.pgn,
        fen: gameData.fen,
        result: gameData.result,
        accuracy: gameData.accuracy,
        opponent_strength: gameData.opponent_strength,
        openings_eco: gameData.openings_eco,
        analysis_json: gameData.analysis_json,
        created_at: new Date().toISOString()
      };
      games.push(newGame);
      localStorage.setItem("chess_guest_games", JSON.stringify(games));
      
      // Update local guest stats
      const stats = getLocalStats();
      const eloDiff = newGame.result === "1-0" ? 15 : newGame.result === "0-1" ? -15 : 0;
      stats.estimated_elo = Math.max(500, stats.estimated_elo + eloDiff);
      
      const accs = games.map(g => g.accuracy).filter(a => a !== undefined);
      stats.accuracy_score = accs.reduce((a, b) => a + b, 0) / accs.length;
      
      localStorage.setItem("chess_guest_stats", JSON.stringify(stats));
      return newGame;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/games`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(gameData)
    });
    return response.json();
  },

  getGames: async () => {
    const token = localStorage.getItem("chess_token");
    if (!token || token === "mock-guest-token") {
      return getLocalGames().reverse();
    }
    const response = await fetch(`${API_BASE_URL}/api/games`, {
      headers: getHeaders()
    });
    return response.json();
  },

  // --- PUZZLES ENDPOINTS ---
  getPuzzles: async (category = "") => {
    try {
      const url = category ? `${API_BASE_URL}/api/puzzles?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/api/puzzles`;
      const response = await fetch(url);
      return response.json();
    } catch {
      // Local seed mock puzzles if API is offline
      return [
        { id: 1, fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", moves: "h5f7", category: "Mate in 1", difficulty: 600, description: "Deliver Scholar's Mate on f7." },
        { id: 2, fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1", moves: "d1d8", category: "Mate in 1", difficulty: 700, description: "Deliver back rank mate." },
        { id: 3, fen: "r1b1kb1r/pppp1ppp/5q2/4n3/3QP3/2N5/PPP2PPP/R1B1KB1R b KQkq - 4 7", moves: "e5f3 g2f3 f6d4", category: "Forks", difficulty: 900, description: "Find the tactical knight fork." }
      ];
    }
  },

  submitPuzzleAttempt: async (puzzleId, isCorrect, timeSpent) => {
    const token = localStorage.getItem("chess_token");
    if (!token || token === "mock-guest-token") {
      const attempts = getLocalAttempts();
      const newAttempt = {
        id: Date.now(),
        user_id: 0,
        puzzle_id: puzzleId,
        is_correct: isCorrect,
        time_spent: timeSpent,
        attempted_at: new Date().toISOString()
      };
      attempts.push(newAttempt);
      localStorage.setItem("chess_guest_attempts", JSON.stringify(attempts));
      
      // Update local tactics score
      const stats = getLocalStats();
      const change = isCorrect ? 12 : -8;
      stats.tactics_score = Math.max(500, stats.tactics_score + change);
      localStorage.setItem("chess_guest_stats", JSON.stringify(stats));
      return newAttempt;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/puzzles/${puzzleId}/attempt`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ puzzle_id: puzzleId, is_correct: isCorrect, time_spent: timeSpent })
    });
    return response.json();
  },

  // --- RECS AND COACH ENDPOINTS ---
  getCoachReport: async () => {
    const token = localStorage.getItem("chess_token");
    if (!token || token === "mock-guest-token") {
      // Local Guest report compiler
      const stats = getLocalStats();
      const games = getLocalGames();
      const accTrend = games.map(g => g.accuracy).slice(-5);
      return {
        estimated_elo: stats.estimated_elo,
        accuracy_trend: accTrend.length ? accTrend : [64.2],
        strengths: ["Solid structural center play", "Fast endgame calculation"],
        weaknesses: ["Vulnerable to knight forks in open files", "Slightly passive rook activation"],
        advice: "You are making steady progress! We noticed excellent board vision in endgame pawn conversion. However, tactical defense remains your bottleneck. Pay close attention to knight structures that leave pieces undefended, and practice the recommended fork puzzles below.",
        training_plan: {
          week_plan: [
            { day: "Day 1", topic: "Forks Practice", activity: "Solve 5 tactical fork puzzles.", completed: false },
            { day: "Day 2", topic: "Caro-Kann Review", activity: "Practice solid pawn defenses vs AI (level 3).", completed: false },
            { day: "Day 3", topic: "Endgame Drills", activity: "Study fundamental king and pawn positions.", completed: false }
          ],
          recommended_puzzles: [3],
          recommended_openings: ["Sicilian Defense"]
        }
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/recommendations/report`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error("Could not fetch Coach Report");
    return response.json();
  },

  getStats: async () => {
    const token = localStorage.getItem("chess_token");
    if (!token || token === "mock-guest-token") {
      return getLocalStats();
    }
    const response = await fetch(`${API_BASE_URL}/api/recommendations/stats`, {
      headers: getHeaders()
    });
    return response.json();
  },

  // --- OPENINGS ENDPOINTS ---
  getOpenings: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/openings`);
      return response.json();
    } catch {
      // Fallback
      return [
        { name: "Ruy Lopez", eco: "C60", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1b5"], description: "Classical white bishop pressure opening." },
        { name: "Sicilian Defense", eco: "B20", moves: ["e2e4", "c7c5"], description: "Sharp, double-edged asymmetrical defense." }
      ];
    }
  },

  matchOpening: async (moves) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/openings/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves })
      });
      return response.json();
    } catch {
      // Pure guest matcher
      if (moves[0] === "e2e4" && moves[1] === "c5") {
        return { matched: true, opening: { name: "Sicilian Defense", eco: "B20" }, success_rate: { white: 37, black: 42, draw: 21 } };
      }
      return { matched: false, opening: null, success_rate: { white: 40, black: 35, draw: 25 } };
    }
  },

  // --- ENGINE AND REVIEW ENDPOINTS ---
  evaluatePosition: async (fen, depth = 8) => {
    const response = await fetch(`${API_BASE_URL}/api/analysis/evaluate?fen=${encodeURIComponent(fen)}&depth=${depth}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error("Evaluation request failed");
    return response.json();
  },

  reviewGame: async (pgn) => {
    const response = await fetch(`${API_BASE_URL}/api/analysis/review`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ pgn })
    });
    if (!response.ok) throw new Error("Game review compilation failed");
    return response.json();
  },

  updateStockfishPath: async (path) => {
    const response = await fetch(`${API_BASE_URL}/api/settings/stockfish`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ path })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Settings update failed");
    }
    return response.json();
  },

  getStockfishSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/api/settings/stockfish`, {
      headers: getHeaders()
    });
    return response.json();
  }
};

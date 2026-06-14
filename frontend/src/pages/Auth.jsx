import React, { useState } from 'react';
import { Trophy, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { api } from '../services/api';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || (!isLogin && !email)) {
      setError("Please fill out all fields.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await api.login(username, password);
      } else {
        await api.register(username, email, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await api.loginDemo();
      onLoginSuccess();
    } catch (err) {
      setError("Could not launch demo sandbox.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chess-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-950/20 via-chess-950 to-violet-950/25 z-0" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-600/20 animate-float">
            <Trophy className="w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight font-sans">
          ChessMaster AI Trainer
        </h2>
        <p className="mt-2 text-center text-sm text-chess-300">
          Play chess, solve tactical puzzles, and receive coached suggestions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                Username
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-chess-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm"
                  placeholder="MagnusCarlsen"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-chess-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm"
                    placeholder="magnus@example.com"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-chess-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-md text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                {loading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : isLogin ? (
                  <span className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* TOGGLE */}
          <div className="mt-6 flex items-center justify-between text-xs">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              {isLogin ? "Need an account? Sign up" : "Already registered? Sign in"}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3 bg-chess-900 text-chess-500 font-extrabold tracking-wider">
                  Or Sandbox Mode
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl border border-indigo-500/30 text-sm font-extrabold text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 focus:outline-none transition-all duration-200 hover-lift"
              >
                Explore Sandbox (Guest / Seeded Demo)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

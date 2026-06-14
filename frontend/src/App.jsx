import React, { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import PlayAI from './pages/PlayAI';
import Analysis from './pages/Analysis';
import Puzzles from './pages/Puzzles';
import Openings from './pages/Openings';
import SettingsPage from './pages/Settings';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // High-level parameter pass when clicking recommended puzzles from dashboard
  const [selectPuzzleId, setSelectPuzzleId] = useState(null);

  // Check auth session on startup
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  const handleLoginSuccess = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
      setActiveTab('dashboard');
    } catch {
      setUser({ username: "Guest User" });
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-chess-950 flex flex-col justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
        <span className="text-xs text-chess-300 uppercase tracking-widest font-black animate-pulse">Initializing ChessMaster...</span>
      </div>
    );
  }

  // Logged out states
  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  // Active view switcher
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setActiveTab={setActiveTab} 
            setSelectPuzzleId={setSelectPuzzleId} 
          />
        );
      case 'play':
        return (
          <PlayAI 
            setActiveTab={setActiveTab} 
            user={user} 
          />
        );
      case 'analysis':
        return <Analysis />;
      case 'puzzles':
        return (
          <Puzzles 
            activePuzzleId={selectPuzzleId} 
            setSelectPuzzleId={setSelectPuzzleId} 
          />
        );
      case 'openings':
        return <Openings />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <MainLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={user} 
      onLogout={handleLogout}
    >
      {renderActivePage()}
    </MainLayout>
  );
}

import React from 'react';
import { useGameStore } from './stores';
import { GameLayout } from './components/Game/GameLayout';
import { Lobby } from './components/Lobby/Lobby';
import { GameInterface } from './components/Game/GameInterface';

function App() {
  const { currentPhase, gameState } = useGameStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPhase === 'LOBBY' ? (
        <Lobby />
      ) : gameState ? (
        <GameLayout>
          <GameInterface />
        </GameLayout>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
            <p className="text-gray-600">Initializing game...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
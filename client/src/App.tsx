// 移除未使用的导入
import { useEffect } from 'react';
import { useGameStore } from './stores';
import { GameLayout, GameInterface } from './components/Game';
import { Lobby } from './components/Lobby/Lobby';

function App() {
  const { currentPhase, gameState } = useGameStore();

  // Initialize theme from localStorage (default to dark)
  useEffect(() => {
    const saved = localStorage.getItem('manila-theme');
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen">
      {currentPhase === 'LOBBY' ? (
        <Lobby />
      ) : gameState ? (
        <GameLayout>
          <GameInterface />
        </GameLayout>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center animate-pulse">
            <h1 className="text-2xl font-bold t-text mb-4 font-display">Manila</h1>
            <p className="t-text-2">正在初始化游戏...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
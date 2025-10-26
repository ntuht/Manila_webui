import React from 'react';

interface GameLayoutProps {
  children: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Manila</h1>
            </div>
            <div className="flex items-center space-x-4">
              <GameControls />
              <SettingsButton />
            </div>
          </div>
        </div>
      </header>
      
      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

const GameControls: React.FC = () => {
  const { pauseGame, resumeGame, isLoading } = useGameStore();
  
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={isLoading ? resumeGame : pauseGame}
      >
        {isLoading ? '恢复' : '暂停'}
      </Button>
    </div>
  );
};

const SettingsButton: React.FC = () => {
  return (
    <Button
      variant="ghost"
      size="sm"
    >
      设置
    </Button>
  );
};

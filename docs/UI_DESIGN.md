# UI/UX 设计文档

## 设计原则

### 1. 用户体验优先
- 直观的游戏界面
- 清晰的信息层次
- 流畅的交互体验
- 响应式设计

### 2. 游戏性导向
- 突出游戏核心机制
- 减少认知负担
- 提供即时反馈
- 支持策略思考

### 3. 可访问性
- 支持键盘导航
- 屏幕阅读器友好
- 高对比度支持
- 多语言支持

## 设计系统

### 颜色系统

```css
/* 主色调 */
:root {
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-900: #1e3a8a;

  /* 游戏主题色 */
  --game-ocean: #0ea5e9;      /* 海洋蓝 */
  --game-ship: #f59e0b;       /* 船只黄 */
  --game-cargo: #10b981;     /* 货物绿 */
  --game-gold: #fbbf24;      /* 金币黄 */
  
  /* 货物颜色 */
  --cargo-jade: #059669;     /* 翡翠绿 */
  --cargo-silk: #2563eb;     /* 丝绸蓝 */
  --cargo-ginseng: #eab308;  /* 人参黄 */
  --cargo-nutmeg: #374151;   /* 肉豆蔻黑 */
  
  /* 状态颜色 */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### 字体系统

```css
/* 字体族 */
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Poppins', sans-serif;
}

/* 字体大小 */
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### 间距系统

```css
/* 间距变量 */
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

## 组件设计

### 1. 基础组件

#### Button 组件

```typescript
// components/Shared/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner className="mr-2" />}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
```

#### Card 组件

```typescript
// components/Shared/Card.tsx
interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  hover = false
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
```

### 2. 游戏专用组件

#### 游戏棋盘

```typescript
// components/Board/GameBoard.tsx
export const GameBoard: React.FC = () => {
  const { gameState } = useGameStore();
  
  return (
    <div className="game-board bg-gradient-to-b from-blue-100 to-blue-200 p-6 rounded-xl">
      {/* 船只轨道 */}
      <div className="ship-tracks space-y-4 mb-6">
        {gameState.ships.map(ship => (
          <ShipTrack key={ship.id} ship={ship} />
        ))}
      </div>
      
      {/* 投资区域 */}
      <div className="investment-area grid grid-cols-2 gap-4">
        <InvestmentSection type="crew" />
        <InvestmentSection type="office" />
        <InvestmentSection type="shipyard" />
        <InvestmentSection type="pirate" />
        <InvestmentSection type="navigator" />
        <InvestmentSection type="insurance" />
      </div>
    </div>
  );
};
```

#### 船只轨道

```typescript
// components/Board/ShipTrack.tsx
interface ShipTrackProps {
  ship: ShipState;
}

export const ShipTrack: React.FC<ShipTrackProps> = ({ ship }) => {
  const positions = Array.from({ length: 14 }, (_, i) => i);
  
  return (
    <div className="ship-track bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{ship.cargoType}</h4>
        <span className="text-sm text-gray-600">位置: {ship.position}</span>
      </div>
      
      <div className="relative">
        {/* 轨道 */}
        <div className="flex justify-between items-center">
          {positions.map(pos => (
            <div
              key={pos}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                pos === ship.position
                  ? 'bg-yellow-400 border-yellow-600 text-yellow-900'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}
            >
              {pos}
            </div>
          ))}
        </div>
        
        {/* 船员信息 */}
        {ship.crew.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ship.crew.map((member, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {member.playerName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

#### 玩家面板

```typescript
// components/Player/PlayerPanel.tsx
interface PlayerPanelProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  isActive: boolean;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentPlayer,
  isActive
}) => {
  return (
    <Card
      className={`${isCurrentPlayer ? 'ring-2 ring-blue-500' : ''} ${!isActive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{player.name}</h3>
        {isCurrentPlayer && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
            当前玩家
          </span>
        )}
      </div>
      
      {/* 现金 */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">现金</span>
          <span className="font-semibold text-lg text-green-600">
            {player.cash}
          </span>
        </div>
      </div>
      
      {/* 股票 */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">股票</h4>
        <div className="space-y-1">
          {player.stocks.map((stock, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{stock.cargoType}</span>
              <span className="font-medium">{stock.quantity}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 投资 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">投资</h4>
        <div className="flex flex-wrap gap-1">
          {player.investments.map((investment, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
            >
              {investment.type}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};
```

## 布局设计

### 1. 主布局

```typescript
// layouts/GameLayout.tsx
export const GameLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
```

### 2. 游戏界面布局

```typescript
// components/Game/GameInterface.tsx
export const GameInterface: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 左侧：玩家信息 */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <PlayerList />
          <StockPrices />
        </div>
      </div>
      
      {/* 中间：游戏棋盘 */}
      <div className="lg:col-span-2">
        <GameBoard />
      </div>
      
      {/* 右侧：游戏信息 */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <GameStatus />
          <ActionPanel />
          <GameLog />
        </div>
      </div>
    </div>
  );
};
```

## 交互设计

### 1. 动画效果

```typescript
// utils/animations.ts
export const animations = {
  // 船只移动
  shipMove: {
    initial: { x: 0, opacity: 1 },
    animate: { x: 100, opacity: 0.8 },
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  
  // 骰子投掷
  diceRoll: {
    initial: { rotate: 0 },
    animate: { rotate: 360 },
    transition: { duration: 1, ease: "easeOut" }
  },
  
  // 卡片翻转
  cardFlip: {
    initial: { rotateY: 0 },
    animate: { rotateY: 180 },
    transition: { duration: 0.3 }
  }
};
```

### 2. 拖拽交互

```typescript
// components/Investment/DraggableSlot.tsx
export const DraggableSlot: React.FC<SlotProps> = ({ slot, onDrop }) => {
  const { isDragging, drag } = useDrag({
    type: 'investment',
    item: { slot },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  return (
    <div
      ref={drag}
      className={`slot ${isDragging ? 'opacity-50' : ''}`}
    >
      <SlotContent slot={slot} />
    </div>
  );
};
```

### 3. 响应式设计

```css
/* 移动端适配 */
@media (max-width: 768px) {
  .game-board {
    padding: 1rem;
  }
  
  .ship-track {
    flex-direction: column;
  }
  
  .player-panel {
    margin-bottom: 1rem;
  }
}

/* 平板适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .game-interface {
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

## 主题系统

### 1. 明暗主题

```typescript
// hooks/useTheme.ts
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return { theme, toggleTheme };
};
```

### 2. 主题配置

```typescript
// themes/index.ts
export const themes = {
  light: {
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1f2937'
    }
  },
  dark: {
    colors: {
      primary: '#60a5fa',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb'
    }
  }
};
```

## 可访问性

### 1. 键盘导航

```typescript
// hooks/useKeyboardNavigation.ts
export const useKeyboardNavigation = () => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Tab':
        // 处理 Tab 导航
        break;
      case 'Enter':
        // 处理确认操作
        break;
      case 'Escape':
        // 处理取消操作
        break;
    }
  }, []);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
```

### 2. 屏幕阅读器支持

```typescript
// components/AccessibleButton.tsx
export const AccessibleButton: React.FC<ButtonProps> = ({
  children,
  ariaLabel,
  ariaDescribedBy,
  ...props
}) => {
  return (
    <button
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {children}
    </button>
  );
};
```

## 性能优化

### 1. 虚拟化长列表

```typescript
// components/VirtualizedList.tsx
export const VirtualizedList: React.FC<ListProps> = ({ items, renderItem }) => {
  const [visibleItems, setVisibleItems] = useState([]);
  
  // 虚拟化逻辑
  return (
    <div className="virtual-list">
      {visibleItems.map(renderItem)}
    </div>
  );
};
```

### 2. 图片懒加载

```typescript
// components/LazyImage.tsx
export const LazyImage: React.FC<ImageProps> = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
  return (
    <div ref={ref}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          {...props}
        />
      )}
    </div>
  );
};
```

---

*最后更新: 2025-10-26*

# Manila 联赛系统完整指南 (v1.5.0)

## 目录
1. [概述](#概述)
2. [快速开始](#快速开始)
3. [v1.5.0 新特性](#v150-新特性)
4. [架构设计](#架构设计)
5. [策略系统](#策略系统)
6. [配置选项](#配置选项)
7. [统计分析](#统计分析)
8. [可视化](#可视化)
9. [故障排除](#故障排除)
10. [最佳实践](#最佳实践)
11. [API参考](#api参考)

## 概述

Manila联赛系统是一个AI vs AI竞赛框架，支持：
- 多策略对战
- 循环赛和淘汰赛模式
- Elo评分系统
- HTML可视化报告
- 实时监控
- **v1.5.0: 完整游戏引擎集成**
- **v1.5.0: Web监控基础设施**

## 快速开始

### 最简单的联赛
```bash
manila_demo --league --strategies greedy,risk_aware,hybrid
```

### 完整配置的联赛
```bash
manila_demo \
  --league \
  --strategies greedy,risk_aware,hybrid,aggressive \
  --players 4 \
  --rounds 20 \
  --rounds-per-match 3 \
  --league-mode round-robin \
  --monitor \
  --viz-html league_results.html \
  --color always
```

## v1.5.0 新特性

### 完整游戏引擎集成

v1.5.0将真实游戏引擎集成到联赛系统，包含：

1. **完整游戏流程**
   - Auction phase (竞拍阶段)
   - Initial placement (货物布置)
   - Sailing phases (航海阶段)
   - Settlement (结算阶段)

2. **领航员机制**
   - Small Navigator (小领航员)
   - Big Navigator (大领航员)
   - 船只位置调整
   - Docking状态管理

3. **海盗系统**
   - Pirate Captain和Pirate Crew
   - R2阶段登船
   - R3阶段劫船
   - 收益计算

4. **投资系统**
   - Crew槽位
   - Captain槽位
   - Office槽位
   - Insurance槽位
   - Navigator槽位

5. **准确结算**
   - 完整的settle_round逻辑
   - 股票分红
   - 价格调整
   - 最终得分计算

### Web监控基础设施

v1.5.0添加了简化的Web监控功能：

1. **数据收集**
   - 实时比赛进度
   - 统计信息更新
   - 历史记录存储

2. **接口设计**
   - `WebMonitorSimple`类
   - `update_match_progress()`方法
   - `update_standings()`方法

3. **未来扩展**
   - v1.6.0将实现完整HTTP服务器
   - v1.6.0将添加实时Web界面
   - v1.6.0将支持SSE推送

## 架构设计

### 核心组件

#### StrategyRegistry (策略注册表)
- 单例模式
- 管理所有可用策略的工厂函数
- 支持动态策略创建

#### League (联赛管理器)
- 管理参赛策略
- 执行比赛
- 收集结果

#### MatchExecutor (比赛执行器)
- 状态隔离
- 超时控制
- 错误处理

#### LeagueStats (统计计算器)
- Elo评分
- 胜率计算
- 对战矩阵
- 置信区间

#### LeagueOutput (结果输出)
- CSV格式
- JSON格式
- 文本报告

### 数据流

```
CLI参数 → League配置 → 策略注册 → 比赛执行 → 统计计算 → 结果输出
```

## 策略系统

### 策略组件

每个策略包含7个决策组件：
1. **BidPolicy**: 竞拍决策
2. **StockPurchasePolicy**: 股票购买
3. **PlacementPolicy**: 货物布置
4. **InitialPlacementPolicy**: 初始布置
5. **InvestmentPolicy**: 投资决策
6. **NavigatorPolicy**: 领航员决策
7. **PirateHarborPolicy**: 海盗到港决策

### 内置策略详解

#### greedy
- **哲学**: 短期利益最大化
- **特点**: 简单快速
- **适用**: 基准测试

#### risk_aware
- **哲学**: 风险调整收益
- **特点**: 使用AuctionEstimator评估
- **适用**: 平衡型玩家

#### hybrid
- **哲学**: 混合多种策略
- **特点**: 适应性强
- **适用**: 不确定环境

#### aggressive
- **哲学**: 高风险高回报
- **特点**: 激进投资
- **适用**: 追求最高分

#### conservative
- **哲学**: 低风险稳健
- **特点**: 保守投资
- **适用**: 避免失败

#### balanced
- **哲学**: 中等风险中等回报
- **特点**: 平衡投资
- **适用**: 通用场景

### 自定义策略

要添加新策略，在`register_default_strategies()`中注册：

```cpp
registry.register_strategy("my_strategy", [](const std::string& name, bool enable_search) {
    auto policies = std::make_unique<strategy::Policies>();
    policies->bid = strategy::make_my_bid();
    policies->stock = strategy::make_my_stock();
    // ... 其他组件
    return policies;
});
```

## 配置选项

### 联赛模式

**round-robin (循环赛)**
- 每个策略与其他所有策略对战
- 比赛数 = n * (n-1) / 2
- 适用：全面评估

**tournament (淘汰赛)**
- 单败淘汰
- 比赛数 = n - 1
- 适用：快速决出胜者

### 关键参数

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| num_games | int | 1-1000 | 总场次 |
| num_players | int | 2-6 | 每场玩家数 |
| rounds_per_match | int | 1-10 | 每场回合数 |
| timeout_seconds | double | 1-300 | 超时限制 |
| seed | uint | 0-∞ | 随机种子 |

## 统计分析

### Elo评分系统

初始评分: 1500
K因子: 32

公式:
```
E_A = 1 / (1 + 10^((R_B - R_A) / 400))
R'_A = R_A + K * (S_A - E_A)
```

### 统计指标

- **胜率**: wins / (wins + losses)
- **平均分**: sum(scores) / games
- **标准差**: std_dev(scores)
- **置信区间**: 95% Wilson score interval

## 可视化

### HTML报告内容

1. **摘要**: 总场次、成功率、执行时间
2. **策略排名**: 按Elo评分排序
3. **统计表格**: 胜率、平均分、标准差
4. **对战矩阵**: 各策略间的对战记录

### 自定义报告

修改`LeagueVisualizerSimple::generate_html_report()`以添加：
- 图表（使用Chart.js）
- 详细比赛记录
- 策略分析

## 故障排除

### 常见问题

#### 问题1: "Not enough strategies"
**原因**: 策略数量少于玩家数
**解决**: 确保 strategies数量 ≥ players数量

#### 问题2: "Total Matches: 0"
**原因**: 配置参数导致没有生成比赛
**解决**: 检查num_games、num_players配置

#### 问题3: 编译错误 "make_ev_invest not found"
**原因**: 使用了不存在的策略工厂函数
**解决**: 使用`make_default_invest()`替代

#### 问题4: 策略未注册
**原因**: 忘记调用`register_default_strategies()`
**解决**: 在main()中添加初始化调用

### 调试技巧

1. **启用详细日志**:
```bash
manila_demo --league --log-verbosity verbose
```

2. **减少比赛数量**:
```bash
manila_demo --league --rounds 1
```

3. **检查策略列表**:
修改代码添加打印语句查看注册的策略

## 最佳实践

### 性能优化

1. **使用多线程**: 未来版本将支持
2. **减少日志输出**: 使用`--log-verbosity quiet`
3. **合理设置超时**: 避免过长的等待

### 策略测试

1. **先测试单场**: 确保策略正常工作
2. **逐步增加场次**: 从小规模开始
3. **使用固定种子**: 便于复现结果

### 结果分析

1. **查看Elo趋势**: 多轮测试观察稳定性
2. **分析对战矩阵**: 找出策略间的克制关系
3. **比较不同配置**: 测试策略在不同参数下的表现

## API参考

### StrategyRegistry

```cpp
class StrategyRegistry {
public:
    static StrategyRegistry& instance();
    void register_strategy(const std::string& name, StrategyFactory factory);
    std::unique_ptr<strategy::Policies> create_strategy(const std::string& name, bool enable_search);
    bool is_strategy_available(const std::string& name);
};
```

### League

```cpp
class League {
public:
    void add_strategy(const std::string& name, const std::string& type, bool search);
    void set_config(const LeagueConfig& config);
    LeagueResults run_league(const LeagueConfig& config);
    std::vector<std::string> get_registered_strategies() const;
};
```

### LeagueConfig

```cpp
struct LeagueConfig {
    int num_games;              // 总场次
    int num_players;            // 每场玩家数
    int rounds_per_match;       // 每场回合数
    std::string mode;           // "round-robin" 或 "tournament"
    bool enable_search;         // 启用搜索
    std::string output_format;  // "json", "csv", "text"
    std::string output_file;    // 输出文件路径
    double timeout_seconds;     // 超时限制
    unsigned seed;              // 随机种子
};
```

### LeagueResults

```cpp
struct LeagueResults {
    std::vector<MatchResult> matches;
    std::map<std::string, StrategyStats> strategy_stats;
    std::map<std::string, std::map<std::string, int>> head_to_head_matrix;
    int successful_matches;
    int failed_matches;
};
```

## 附录

### 参考资料

- [Elo Rating System](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Wilson Score Interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval)
- Manila游戏规则

### 更新历史

- v1.4.1: 联赛系统修复和6种策略
- v1.4.0: 用户体验增强
- v1.3.0: AI vs AI联赛系统初版

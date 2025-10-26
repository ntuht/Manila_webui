# Manila 联赛系统 API 参考

## 目录
1. [核心类](#核心类)
2. [数据结构](#数据结构)
3. [策略系统](#策略系统)
4. [监控和可视化](#监控和可视化)
5. [工具类](#工具类)
6. [错误处理](#错误处理)

## 核心类

### League

联赛管理器，负责执行AI vs AI比赛。

```cpp
class League {
public:
    // 构造函数
    League();
    
    // 添加策略
    void add_strategy(const std::string& name, const std::string& type, bool search);
    
    // 设置配置
    void set_config(const LeagueConfig& config);
    
    // 运行联赛
    LeagueResults run_league(const LeagueConfig& config);
    
    // 获取已注册策略
    std::vector<std::string> get_registered_strategies() const;
    
    // 获取策略数量
    size_t get_strategy_count() const;
    
    // 清空策略
    void clear_strategies();
};
```

### StrategyRegistry

策略注册表，单例模式管理所有可用策略。

```cpp
class StrategyRegistry {
public:
    // 获取单例实例
    static StrategyRegistry& instance();
    
    // 注册策略工厂
    void register_strategy(const std::string& name, StrategyFactory factory);
    
    // 创建策略实例
    std::unique_ptr<strategy::Policies> create_strategy(const std::string& name, bool enable_search);
    
    // 检查策略是否可用
    bool is_strategy_available(const std::string& name) const;
    
    // 获取所有可用策略名称
    std::vector<std::string> get_available_strategies() const;
    
    // 清空注册表
    void clear();
};
```

### MatchExecutor

比赛执行器，负责执行单场比赛。

```cpp
class MatchExecutor {
public:
    // 构造函数
    MatchExecutor();
    
    // 执行比赛
    MatchResult execute_match(const std::vector<std::string>& strategy_names,
                             const std::map<std::string, std::unique_ptr<strategy::Policies>>& strategies,
                             const LeagueConfig& config);
    
    // 执行游戏回合
    bool execute_game_round(GameState& state, 
                           const std::vector<std::string>& strategy_names,
                           const std::map<std::string, std::unique_ptr<strategy::Policies>>& strategies);
    
    // 设置超时
    void set_timeout(double seconds);
    
    // 获取执行时间
    double get_execution_time() const;
};
```

## 数据结构

### LeagueConfig

联赛配置结构。

```cpp
struct LeagueConfig {
    int num_games{10};                    // 总场次
    int num_players{3};                  // 每场玩家数
    int rounds_per_match{3};             // 每场回合数
    std::string mode{"round-robin"};     // "round-robin" 或 "tournament"
    bool enable_search{false};           // 启用搜索
    bool enable_metrics{true};            // 启用指标
    std::string output_format{"json"};   // "json", "csv", "text"
    std::string output_file{""};         // 输出文件路径
    double timeout_seconds{30.0};        // 每场比赛超时
    unsigned seed{5489u};                // 随机种子
    bool verify_consistency{true};       // 验证一致性
    bool profile_performance{false};     // 性能分析
};
```

### LeagueResults

联赛结果容器。

```cpp
struct LeagueResults {
    std::vector<MatchResult> matches;                                    // 比赛结果列表
    std::map<std::string, StrategyStats> strategy_stats;                // 策略统计
    std::map<std::string, std::map<std::string, int>> head_to_head_matrix; // 对战矩阵
    double total_execution_time{0.0};                                    // 总执行时间
    int total_search_nodes{0};                                           // 总搜索节点数
    int successful_matches{0};                                           // 成功比赛数
    int failed_matches{0};                                              // 失败比赛数
    std::string league_name;                                            // 联赛名称
    std::chrono::system_clock::time_point start_time;                   // 开始时间
    std::chrono::system_clock::time_point end_time;                     // 结束时间
};
```

### MatchResult

单场比赛结果。

```cpp
struct MatchResult {
    int match_id{0};                                    // 比赛ID
    std::vector<int> player_scores;                     // 玩家分数
    std::vector<std::string> player_strategies;         // 玩家策略
    std::string winner_strategy;                         // 获胜策略
    int rounds_played{0};                               // 已玩回合数
    double execution_time_ms{0.0};                      // 执行时间(毫秒)
    int search_nodes{0};                                // 搜索节点数
    std::string error_message;                          // 错误信息
    bool success{true};                                 // 是否成功
};
```

### StrategyStats

策略统计信息。

```cpp
struct StrategyStats {
    std::string strategy_name;                          // 策略名称
    int wins{0};                                        // 胜利次数
    int losses{0};                                      // 失败次数
    int draws{0};                                       // 平局次数
    double win_rate{0.0};                               // 胜率
    double avg_score{0.0};                              // 平均分数
    double score_std{0.0};                              // 分数标准差
    double elo_rating{1500.0};                          // Elo评分
    double confidence_interval{0.0};                    // 置信区间
    std::map<std::string, int> head_to_head;            // 对战记录
};
```

## 策略系统

### 策略工厂函数

```cpp
using StrategyFactory = std::function<std::unique_ptr<strategy::Policies>(const std::string&, bool)>;
```

### 策略注册

```cpp
// 注册默认策略
void register_default_strategies();

// 注册自定义策略
registry.register_strategy("my_strategy", [](const std::string& name, bool enable_search) {
    auto policies = std::make_unique<strategy::Policies>();
    policies->bid = strategy::make_my_bid();
    policies->stock = strategy::make_my_stock();
    policies->placement = strategy::make_my_placement();
    policies->initial_placement = strategy::make_my_initial_placement();
    policies->invest = strategy::make_my_invest();
    policies->navigator = strategy::make_my_navigator();
    policies->pirate_harbor = enable_search ? 
        strategy::make_search_pirate_harbor(search::SearchConfig{}) : 
        strategy::make_my_pirate_harbor();
    return policies;
});
```

### 内置策略

- **greedy**: 默认贪婪策略
- **risk_aware**: 风险感知策略
- **hybrid**: 混合策略
- **aggressive**: 激进策略
- **conservative**: 保守策略
- **balanced**: 平衡策略

## 监控和可视化

### LeagueMonitorSimple

简化的联赛监控器。

```cpp
class LeagueMonitorSimple {
public:
    // 构造函数
    LeagueMonitorSimple();
    
    // 开始监控
    void start_monitoring(const LeagueConfig& config, int total_matches);
    
    // 更新进度
    void update_progress(int matches_completed, const std::string& current_match = "");
    
    // 停止监控
    void stop_monitoring();
    
    // 检查是否正在监控
    bool is_monitoring() const;
    
    // 设置静默模式
    void set_quiet_mode(bool quiet);
    
    // 设置详细模式
    void set_verbose_mode(bool verbose);
};
```

### LeagueVisualizerSimple

简化的联赛可视化器。

```cpp
class LeagueVisualizerSimple {
public:
    // 构造函数
    LeagueVisualizerSimple();
    
    // 生成HTML报告
    std::string generate_html_report(const LeagueResults& results, const LeagueConfig& config);
    
    // 生成JSON数据
    std::string generate_json_data(const LeagueResults& results);
    
    // 保存HTML报告到文件
    bool save_html_report(const LeagueResults& results, const LeagueConfig& config, const std::string& filename);
    
    // 保存JSON数据到文件
    bool save_json_data(const LeagueResults& results, const std::string& filename);
};
```

### ConsoleUtilsSimple

简化的控制台工具。

```cpp
class ConsoleUtilsSimple {
public:
    // 检查是否支持颜色
    static bool supports_color();
    
    // 为文本添加颜色
    static std::string colorize(const std::string& text, const std::string& color);
    
    // 打印彩色文本
    static void print_colored(const std::string& text, const std::string& color);
    
    // 格式化持续时间
    static std::string format_duration(double seconds);
};
```

## 工具类

### 统计计算

```cpp
class LeagueStats {
public:
    // 计算Elo评分
    static double calculate_elo_rating(double current_rating, double opponent_rating, bool won);
    
    // 计算胜率
    static double calculate_win_rate(int wins, int total_games);
    
    // 计算置信区间
    static double calculate_confidence_interval(int wins, int total_games, double confidence = 0.95);
    
    // 计算标准差
    static double calculate_standard_deviation(const std::vector<double>& scores);
};
```

### 结果输出

```cpp
class LeagueOutput {
public:
    // 输出CSV格式
    static std::string to_csv(const LeagueResults& results);
    
    // 输出JSON格式
    static std::string to_json(const LeagueResults& results);
    
    // 输出文本格式
    static std::string to_text(const LeagueResults& results);
    
    // 保存到文件
    static bool save_to_file(const std::string& content, const std::string& filename);
};
```

## 错误处理

### 异常类型

```cpp
class LeagueException : public std::exception {
public:
    LeagueException(const std::string& message);
    const char* what() const noexcept override;
};

class StrategyException : public LeagueException {
public:
    StrategyException(const std::string& message);
};

class ConfigException : public LeagueException {
public:
    ConfigException(const std::string& message);
};
```

### 错误代码

```cpp
enum class LeagueErrorCode {
    SUCCESS = 0,
    INVALID_CONFIG = 1,
    STRATEGY_NOT_FOUND = 2,
    INSUFFICIENT_STRATEGIES = 3,
    EXECUTION_TIMEOUT = 4,
    INVALID_MATCH_RESULT = 5,
    FILE_IO_ERROR = 6
};
```

### 错误处理示例

```cpp
try {
    League league;
    league.add_strategy("greedy", "greedy", false);
    league.add_strategy("risk_aware", "risk_aware", false);
    
    LeagueConfig config;
    config.num_games = 10;
    config.num_players = 3;
    
    auto results = league.run_league(config);
    
    if (results.failed_matches > 0) {
        std::cerr << "Warning: " << results.failed_matches << " matches failed" << std::endl;
    }
    
} catch (const StrategyException& e) {
    std::cerr << "Strategy error: " << e.what() << std::endl;
} catch (const ConfigException& e) {
    std::cerr << "Config error: " << e.what() << std::endl;
} catch (const LeagueException& e) {
    std::cerr << "League error: " << e.what() << std::endl;
}
```

## 使用示例

### 基本联赛

```cpp
#include "manila/league.hpp"

int main() {
    // 注册默认策略
    league::register_default_strategies();
    
    // 创建联赛
    league::League league;
    league.add_strategy("greedy", "greedy", false);
    league.add_strategy("risk_aware", "risk_aware", false);
    league.add_strategy("hybrid", "hybrid", false);
    
    // 配置联赛
    league::LeagueConfig config;
    config.num_games = 10;
    config.num_players = 3;
    config.rounds_per_match = 3;
    config.mode = "round-robin";
    
    // 运行联赛
    auto results = league.run_league(config);
    
    // 输出结果
    std::cout << "Successful matches: " << results.successful_matches << std::endl;
    std::cout << "Failed matches: " << results.failed_matches << std::endl;
    
    return 0;
}
```

### 带监控的联赛

```cpp
#include "manila/league.hpp"
#include "manila/league_monitor_simple.hpp"

int main() {
    league::register_default_strategies();
    
    league::League league;
    league.add_strategy("greedy", "greedy", false);
    league.add_strategy("risk_aware", "risk_aware", false);
    
    league::LeagueConfig config;
    config.num_games = 20;
    config.num_players = 3;
    
    // 创建监控器
    league::LeagueMonitorSimple monitor;
    monitor.set_verbose_mode(true);
    
    // 开始监控
    monitor.start_monitoring(config, config.num_games);
    
    // 运行联赛
    auto results = league.run_league(config);
    
    // 停止监控
    monitor.stop_monitoring();
    
    return 0;
}
```

### 生成HTML报告

```cpp
#include "manila/league.hpp"
#include "manila/league_visualizer_simple.hpp"

int main() {
    league::register_default_strategies();
    
    league::League league;
    league.add_strategy("greedy", "greedy", false);
    league.add_strategy("risk_aware", "risk_aware", false);
    
    league::LeagueConfig config;
    config.num_games = 15;
    config.num_players = 3;
    
    auto results = league.run_league(config);
    
    // 生成HTML报告
    league::LeagueVisualizerSimple visualizer;
    std::string html = visualizer.generate_html_report(results, config);
    
    // 保存到文件
    visualizer.save_html_report(results, config, "league_results.html");
    
    return 0;
}
```

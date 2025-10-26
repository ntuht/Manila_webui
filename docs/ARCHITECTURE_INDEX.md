> 语言规范：本文件主要面向人类阅读，采用简体中文撰写。

# Manila 项目架构索引

> **目标**：任何新人 10 分钟能定位"这个功能在哪个文件、暴露了哪些接口、被谁调用、有哪些日志/CLI/JSON 侧输出"

---

## 一、模块 ↔ 文件对照表

| 模块 | 头文件 | 源文件 | 备注 |
|---|---|---|---|
| **Core Engine** | include/manila/state.hpp | src/state.cpp | 游戏状态、回合管理 |
| **Core Engine** | include/manila/types.hpp | - | 基础类型定义 |
| **Core Engine** | include/manila/rules.hpp | src/rules.cpp | 游戏规则常量 |
| **Core Engine** | include/manila/config.hpp | - | 配置结构定义 |
| **Auction** | include/manila/auction.hpp | src/auction.cpp | 拍卖流程控制 |
| **Auction** | include/manila/auction_estimator.hpp | src/auction_estimator.cpp | 估价分解/出价上限 |
| **Auction** | include/manila/auction_audit_layer.hpp | src/auction_audit_layer.cpp | 拍卖审计层 |
| **Placement** | include/manila/placement_policy.hpp | src/placement_policy.cpp | 5/3/1 启发式 |
| **Strategy** | include/manila/strategy.hpp | src/strategy.cpp | 策略接口与实现 |
| **Strategy** | include/manila/strategy_ev.hpp | src/strategy_ev.cpp | EV 策略实现 |
| **Strategy** | include/manila/ai_strategy.hpp | src/ai_strategy.cpp | AI 策略集合 |
| **Investment** | include/manila/invest.hpp | src/invest.cpp | 投资阶段管理 |
| **Investment** | include/manila/investment_evaluator.hpp | src/investment_evaluator.cpp | 投资评估器 |
| **Investment** | include/manila/investment_decision.hpp | src/investment_decision.cpp | 投资决策 |
| **Finance** | include/manila/finance.hpp | src/finance.cpp | 抵押/保险/结算 |
| **Sailing** | include/manila/sailing.hpp | src/sailing.cpp | 航行阶段管理 |
| **Settlement** | include/manila/settle.hpp | src/settle.cpp | 结算阶段 |
| **Search** | include/manila/search.hpp | src/search.cpp | 搜索框架 |
| **Probability** | include/manila/probability.hpp | src/probability.cpp | 概率计算 |
| **Logging** | include/manila/logging.hpp | src/logging.cpp | 日志系统 |
| **Audit** | include/manila/audit_json.hpp | src/audit_json.cpp | JSON 审计 |
| **JSON IO** | include/manila/json_io.hpp | src/json_io.cpp | JSON 读写 |
| **Replay** | include/manila/replay_engine.hpp | src/replay_engine.cpp | 回放系统 |
| **Config** | include/manila/config_loader.hpp | src/config_loader.cpp | 配置加载 |
| **Encoding** | include/manila/encode.hpp | src/encode.cpp | 编码工具 |
| **League** | include/manila/league.hpp | src/league.cpp | 联赛系统 |
| **Myopic** | include/manila/myopic_engine.hpp | src/myopic_engine.cpp | 短视引擎 |
| **Main** | - | src/main.cpp | 主程序入口 |
| **Main** | - | src/main_v5.cpp | V5 版本主程序 |

---

## 二、模块详解

### Core Engine
- **职责**：游戏状态管理、回合调度、阶段管理、apply/undo 操作
- **上游**：Main、Strategy、Auction
- **下游**：所有业务模块
- **配置**：`GameConfig`；CLI：`--players`, `--rounds`, `--seed`, `--help`, `--hidden`, `--until-end`
- **JSON**：`game_state.*`, `round_log.*`
- **测试**：`test_main.cpp`, `test_integration.cpp`

### Auction
- **职责**：拍卖流程控制、估价分解、出价上限计算、竞标策略
- **上游**：Strategy（Greedy/RiskAware）
- **下游**：Finance（软上限）、Audit（日志/JSON 输出）
- **配置**：`AuctionConfig{alpha, delta_plus, soft_cap_ratio, ...}`；CLI：`--hm-choose`, `--harbor-search`, `--harbor-eval`
- **JSON**：`decision.auction.{ev_stock,ev_place,ev_first,...}`
- **测试**：`test_auction_estimator_basics.cpp`, `test_auction_soft_cap.cpp`

### Placement
- **职责**：货物选择、初始位置分配（5/3/1 启发式）
- **上游**：Auction（HM 确定后）
- **下游**：Sailing（初始位置）
- **配置**：`PlacementPolicy`；CLI：`--placement-policy`, `--show-cargo-choices`
- **JSON**：`cargo_selection.*`, `initial_position.*`
- **测试**：`test_hm_placement_pro.cpp`, `test_choose_cargo_*.cpp`

### Strategy
- **职责**：AI 策略实现、决策接口、策略选择
- **上游**：Main（策略配置）
- **下游**：Auction、Investment、Sailing
- **配置**：`StrategyConfig`；CLI：`--invest`, `--strategy`, `--navigator`
- **JSON**：`strategy.*`
- **测试**：`test_strategy_hooks.cpp`, `test_ev_greedy.cpp`

### Investment
- **职责**：投资阶段管理、投资评估、资源分配
- **上游**：Strategy
- **下游**：Finance、Settlement
- **配置**：`InvestmentConfig`；CLI：`--invest`
- **JSON**：`investment.*`
- **测试**：`test_invest.cpp`, `test_investment_*.cpp`

### Finance
- **职责**：抵押/保险/结算顺序、现金管理
- **上游**：Auction、Investment
- **下游**：Settlement
- **配置**：`FinanceConfig`；CLI：`--finance`
- **JSON**：`finance.*`
- **测试**：`test_finance.cpp`

### Logging
- **职责**：日志系统、输出控制、格式化
- **上游**：所有模块
- **下游**：Console、File
- **配置**：`LogVerbosity`；CLI：`--log-verbosity`, `--verbose-bid`, `--debug`, `--log-ascii`, `--log`
- **JSON**：日志输出控制
- **测试**：`test_logging_v1_3.cpp`

### Audit
- **职责**：JSON 审计、结构化输出
- **上游**：所有业务模块
- **下游**：JSON 文件
- **配置**：`JsonAuditor`；CLI：`--audit`, `--audit-file`, `--verify`
- **JSON**：完整的审计输出
- **测试**：`test_audit_*.cpp`

### Search
- **职责**：搜索框架，动作生成，状态评估
- **上游**：Strategy
- **下游**：所有业务模块
- **配置**：`SearchConfig`；CLI：`--search-depth`, `--search-branch`, `--search-max-nodes`, `--search-weight-share`, `--search-weight-cash`, `--search-insurance-penalty`, `--print-legal-moves`
- **JSON**：`search.*`
- **测试**：`test_search_*.cpp`

### Replay & Config
- **职责**：回放系统，配置加载
- **上游**：Main
- **下游**：所有业务模块
- **配置**：`ReplayConfig`, `JsonConfig`；CLI：`--replay`, `--replay-mode`, `--config`, `--profile`, `--profile-detail`
- **JSON**：回放脚本，配置参数
- **测试**：`test_replay_*.cpp`, `test_config_*.cpp`

---

## 三、逐文件摘要

### src/main.cpp
- **功能**：主程序入口，CLI 解析，游戏循环控制
- **主要类型/函数**：
  - `struct Cli { ... }` - CLI 参数结构
  - `void parse_cli(int argc, char* argv[], Cli& cli)` - 参数解析
  - `int main(int argc, char* argv[])` - 主函数
- **算法要点**：
  - 命令行参数解析与验证
  - 游戏循环：`auction -> placement -> investment -> sailing -> settlement`
  - 日志输出控制与顺序管理
- **依赖**：所有业务模块头文件
- **日志/JSON**：`[Main]` 标签；控制整体输出格式
- **不变量/边界**：
  - CLI 参数验证；游戏状态一致性检查
  - 输出顺序固定：Round -> Auction -> Placement -> Investment -> Sailing -> Settlement

### src/state.cpp
- **功能**：游戏状态管理，回合调度，状态转换
- **主要类型/函数**：
  - `struct GameState { ... }` - 游戏状态
  - `struct PlayerState { ... }` - 玩家状态
  - `void apply_move(GameState&, const Move&)` - 应用动作
  - `void undo_move(GameState&, const Move&)` - 撤销动作
- **算法要点**：
  - 状态快照与恢复
  - 回合阶段管理（Auction -> Investment -> Sailing -> Settlement）
  - 状态一致性验证
- **依赖**：`types.hpp`, `rules.hpp`, `config.hpp`
- **日志/JSON**：状态变更日志；`game_state.*`
- **不变量/边界**：
  - 状态转换原子性；undo 操作可逆性
  - 玩家数量、回合数、阶段顺序验证

### src/auction_estimator.cpp
- **功能**：拍卖估价分项与合成，出价上限计算
- **主要类型/函数**：
  - `class AuctionEstimator { evaluate(...), score_combo(...), get_optimal_cargo_combo(...) }`
  - `struct AuctionConfig { alpha, delta_plus, soft_cap_ratio, ... }`
- **算法要点**：
  - 基线概率表 + delta_plus/minus；soft_cap & cash_buffer 裁剪
  - `score_combo`：使用 HM 胜者持仓、EV_place_holdings、PrefBoost、MissTopPenalty
  - 单个货物评分排序 → 选择前3个 → 按5/3/1分配位置
- **依赖**：`finance.hpp`, `rules.hpp`, `placement_policy.hpp`
- **日志/JSON**：`[AuctionEstimator]` 标签；`decision.auction.*`
- **不变量/边界**：
  - 不越权修改状态；score_combo 纯函数
  - 赢家 PID 的持仓必须参与评分（见 v1.2 修复）

### src/auction.cpp
- **功能**：拍卖流程控制，竞标管理
- **主要类型/函数**：
  - `void run(GameState&, RoundLog&, const PolicySet&)` - 拍卖主流程
  - `int decide_opening_bid(...)` - 起拍价决策
- **算法要点**：
  - 竞标循环：起拍 → 加价 → 软上限检查 → 最终中标
  - 立即扣款机制；现金不足时抵押处理
- **依赖**：`auction_estimator.hpp`, `finance.hpp`, `strategy.hpp`
- **日志/JSON**：`[Auction]` 标签；`auction.*`
- **不变量/边界**：
  - 竞标顺序固定；现金扣款原子性
  - 软上限触发条件；抵押机制

### src/placement_policy.cpp
- **功能**：货物选择策略，初始位置分配
- **主要类型/函数**：
  - `class PlacementPolicy { choose_cargos(...), initial_tracks(...) }`
  - `class PlacementPolicyPro : PlacementPolicy` - 优化策略
- **算法要点**：
  - 基于 HM 持仓的货物评分排序
  - 5/3/1 位置分配启发式
- **依赖**：`auction_estimator.hpp`, `rules.hpp`
- **日志/JSON**：`[PlacementPolicy]` 标签；`placement.*`
- **不变量/边界**：
  - 货物组合唯一性；位置分配合理性
  - HM 持仓权重正确应用

### src/strategy.cpp
- **功能**：策略接口实现，决策调度
- **主要类型/函数**：
  - `void apply_initial_placement(...)` - 初始布置
  - `std::array<CargoType, 3> choose_cargo_explicit(...)` - 显式货物选择（返回最优三货物组合）
- **算法要点**：
  - 策略选择与执行
  - 货物选择与位置分配的协调
- **依赖**：`placement_policy.hpp`, `auction_estimator.hpp`
- **日志/JSON**：`[Strategy]` 标签；`strategy.*`
- **不变量/边界**：
  - 策略执行顺序；决策一致性

### src/investment_evaluator.cpp
- **功能**：投资评估，EV 计算，资源分配
- **主要类型/函数**：
  - `class InvestmentEvaluator { evaluate(...), generate_available_actions(...) }`
- **算法要点**：
  - 投资选项 EV 计算
  - 资源独占性检查（Insurance、Office、Crew Seat）
  - 在线决策：逐人评估 → 立即占用资源
- **依赖**：`probability.hpp`, `finance.hpp`, `rules.hpp`
- **日志/JSON**：`[InvestmentEvaluator]` 标签；`investment.*`
- **不变量/边界**：
  - 资源独占性；EV 计算准确性
  - 在线决策顺序；资源占用原子性

### src/finance.cpp
- **功能**：现金管理，抵押/保险/结算
- **主要类型/函数**：
  - `int max_payable_with_mortgage(...)` - 最大可支付金额
  - `void ensure_funds(...)` - 资金确保
  - `void mortgage_one(...)` - 抵押一张股票
  - `void redeem_all(...)` - 赎回所有抵押
- **算法要点**：
  - 抵押优先级：低价值股票优先
  - 保险赔付计算：6/14/29 阶梯
  - 现金流管理
- **依赖**：`rules.hpp`, `state.hpp`
- **日志/JSON**：`[Finance]` 标签；`finance.*`
- **不变量/边界**：
  - 现金非负性；抵押可逆性
  - 保险赔付准确性

### src/sailing.cpp
- **功能**：航行阶段管理，骰子投掷，船位更新
- **主要类型/函数**：
  - `void run_sailing_phase(...)` - 航行阶段执行
  - `void roll_dice(...)` - 骰子投掷
- **算法要点**：
  - 3次骰子投掷，船位推进
  - 到港判定（位置 >= 13）
  - 海盗劫持判定（位置 = 13）
- **依赖**：`probability.hpp`, `rules.hpp`
- **日志/JSON**：`[Sailing]` 标签；`sailing.*`
- **不变量/边界**：
  - 骰子结果有效性；船位推进正确性
  - 到港/海盗判定准确性

### src/settle.cpp
- **功能**：结算阶段，收益分配，价格更新
- **主要类型/函数**：
  - `void settle_round(...)` - 回合结算
  - `void calculate_rewards(...)` - 收益计算
- **算法要点**：
  - 船员收益分配（按座位数平分）
  - 办公室收益计算
  - 股票价格更新
- **依赖**：`rules.hpp`, `finance.hpp`
- **日志/JSON**：`[Settlement]` 标签；`settlement.*`
- **不变量/边界**：
  - 收益计算准确性；价格更新合理性
  - 现金/股票余额一致性

### src/search.cpp
- **功能**：搜索框架，动作生成，状态评估
- **主要类型/函数**：
  - `enum class MoveKind` - 动作类型
  - `struct Move { ... }` - 动作结构
  - `double expectimax(...)` - 期望最大化搜索
- **算法要点**：
  - 动作空间生成
  - 期望值计算
  - 搜索剪枝
- **依赖**：`state.hpp`, `probability.hpp`
- **日志/JSON**：`[Search]` 标签；`search.*`
- **不变量/边界**：
  - 动作有效性；搜索完整性
  - 期望值计算准确性

### src/probability.cpp
- **功能**：概率计算，骰子分布，到港概率
- **主要类型/函数**：
  - `double get_base_port_probability(int start_position)` - 基础到港概率
  - `double calculate_exact_position_13_probability(int p, int r)` - 精确位置13概率
- **算法要点**：
  - 预计算概率表（1d6, 2d6, 3d6）
  - 到港概率计算
  - 海盗劫持概率计算
- **依赖**：`rules.hpp`
- **日志/JSON**：概率计算中间结果
- **不变量/边界**：
  - 概率值范围 [0,1]；概率表完整性
  - 计算精度要求

### src/logging.cpp
- **功能**：日志系统，输出控制，格式化
- **主要类型/函数**：
  - `enum class LogVerbosity { Quiet, Normal, Verbose }`
  - `class Logger { print_round(...), should_show_normal(...) }`
- **算法要点**：
  - 日志级别控制
  - 输出格式统一
  - 调试信息过滤
- **依赖**：`state.hpp`, `rules.hpp`
- **日志/JSON**：控制所有模块的日志输出
- **不变量/边界**：
  - 输出格式一致性；日志级别正确性
  - 调试信息不泄漏

### src/audit_json.cpp
- **功能**：JSON 审计，结构化输出
- **主要类型/函数**：
  - `class JsonAuditor { audit_round(...), audit_cargo_selection(...) }`
- **算法要点**：
  - 结构化数据收集
  - JSON 格式输出
  - 审计完整性
- **依赖**：`nlohmann/json.hpp`
- **日志/JSON**：完整的 JSON 审计输出
- **不变量/边界**：
  - JSON 格式有效性；数据完整性
  - 审计覆盖全面性

### src/json_io.cpp
- **功能**：JSON 读写，配置加载，回放支持
- **主要类型/函数**：
  - `bool load_json_config(const std::string&, Config&)` - 配置加载
  - `bool save_json_audit(const AuditData&, const std::string&)` - 审计保存
- **算法要点**：
  - JSON 解析与验证
  - 配置参数映射
  - 错误处理
- **依赖**：`nlohmann/json.hpp`
- **日志/JSON**：JSON 操作日志
- **不变量/边界**：
  - JSON 格式正确性；配置参数有效性
  - 错误恢复机制

### src/replay_engine.cpp
- **功能**：回放系统，状态重建，验证
- **主要类型/函数**：
  - `class ReplayEngine { execute_replay(...), verify_state(...) }`
- **算法要点**：
  - 回放脚本解析
  - 状态重建
  - 一致性验证
- **依赖**：`json_io.hpp`, `state.hpp`
- **日志/JSON**：回放执行日志
- **不变量/边界**：
  - 回放准确性；状态一致性
  - 验证完整性

### src/config_loader.cpp
- **功能**：配置加载，参数映射
- **主要类型/函数**：
  - `bool load_config_from_json(...)` - JSON 配置加载
- **算法要点**：
  - 配置参数解析
  - 默认值处理
  - 参数验证
- **依赖**：`json_io.hpp`
- **日志/JSON**：配置加载日志
- **不变量/边界**：
  - 配置参数有效性；默认值合理性
  - 参数映射正确性

### src/league.cpp
- **功能**：AI vs AI 联赛系统，策略对战，统计分析
- **主要类型/函数**：
  - `class League { run_round_robin(...), run_tournament(...), get_results(...) }`
  - `class StrategyRegistry { register_strategy(...), create_strategy(...) }`
  - `class MatchExecutor { execute_match(...), create_initial_state(...) }`
  - `class LeagueStats { calculate_basic_stats(...), calculate_elo_ratings(...) }`
  - `class LeagueOutput { export_csv(...), export_json(...), export_text(...) }`
- **算法要点**：
  - 策略注册与工厂模式
  - 比赛执行与状态隔离
  - Elo评分系统与统计分析
  - 多格式结果输出
- **依赖**：`strategy.hpp`, `state.hpp`, `audit_json.hpp`
- **日志/JSON**：`[League]` 标签；`league_results.*`, `match_results.*`
- **不变量/边界**：
  - 策略状态隔离；比赛执行一致性
  - 统计计算准确性；输出格式正确性

---

## 四、调用链（精选）

### 主要游戏流程
- `main` → `run_round` → `auction::run` → `AuctionEstimator::evaluate` → `score_combo` → `PlacementPolicyPro::choose_cargos`
- `run_round` → `strategy::apply_initial_placement` → `choose_cargo_explicit` → `get_optimal_cargo_combo`
- `run_round` → `investment_phase(n)` → `InvestmentEvaluator::evaluate` → `generate_available_actions`
- `run_round` → `sailing::run_sailing_phase` → `roll_dice` → `update_ship_positions`
- `run_round` → `settle::settle_round` → `calculate_rewards` → `update_share_prices`

### 日志与审计
- `main` → `Logger::print_round` → `format_*` 函数 → 控制台输出
- `main` → `JsonAuditor::audit_round` → `json_io::save_json_audit` → JSON 文件

### 配置与回放
- `main` → `config_loader::load_config_from_json` → `json_io::load_json_config`
- `main` → `replay_engine::execute_replay` → `apply_move` → 状态重建

### 联赛系统
- `main` → `league::League::run_league` → `run_round_robin` → `execute_match` → `MatchExecutor::execute_match`
- `League::execute_match` → `StrategyRegistry::create_strategy` → `strategy::Policies` 创建
- `MatchExecutor::execute_match` → `create_initial_state` → `execute_game_round` → 游戏执行
- `League::calculate_statistics` → `LeagueStats::calculate_*` → 统计分析
- `League::export_results` → `LeagueOutput::export_*` → 结果输出

---

## 五、维护约定

### 新增文件/函数
1. **新增 .cpp 文件时**：
   - 在"模块 ↔ 文件对照表"中添加对应行
   - 在"逐文件摘要"中添加详细卡片
   - 更新相关模块的"模块详解"

2. **新增公开函数时**：
   - 在对应文件的"主要类型/函数"部分添加
   - 更新"调用链"（如涉及关键路径）

3. **新增 CLI 参数时**：
   - 在相关模块的"配置"部分添加
   - 在 `src/main.cpp` 的摘要中更新

4. **新增 JSON 字段时**：
   - 在相关模块的"JSON"部分添加
   - 更新 `JSON_SCHEMA.md`

### CI 检查
- 脚本：`scripts/check_docs_index.py`
- 检查内容：
  - 新增 .cpp 文件是否在索引中
  - 新增公开函数是否在摘要中
  - CLI 参数是否在配置部分
- 失配处理：PR 标红，提示补齐

### 更新频率
- **每次 PR**：检查符号清单漂移
- **每次发布**：全面更新架构索引
- **重大重构**：重新生成完整文档

---

*最后更新：2024-12-19*
*维护者：AI Agent*

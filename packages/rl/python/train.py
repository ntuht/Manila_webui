"""
Manila PPO 训练器 v3 — Historical Self-Play + PBRS

关键特性:
  1. 按玩家分离轨迹: 只训练 P0, P1/P2 为对手
  2. 渐进式 HSP: 初期 90% EV 对手, 逐步过渡到 80% 历史模型池
  3. PBRS 密集奖励: r_shaped = r + γ·Φ(s') - Φ(s)
  4. 对手模型池: 每 5K 局保存当前模型, 采样历史对手

用法:
    python train.py --total-games 200000 --num-envs 4 --device cuda
"""

import argparse
import time
import os
import random
from pathlib import Path
from collections import deque

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.tensorboard import SummaryWriter

from network import ManilaPPONet
from env_client import ManilaEnvClient


def parse_args():
    parser = argparse.ArgumentParser(description="Manila PPO Trainer v2")

    # 环境
    parser.add_argument("--num-envs", type=int, default=4,
                        help="并行环境数量")
    parser.add_argument("--player-count", type=int, default=3,
                        help="玩家数量 (3-5)")

    # 训练
    parser.add_argument("--total-games", type=int, default=500000,
                        help="总训练游戏局数")
    parser.add_argument("--games-per-batch", type=int, default=100,
                        help="每批完整游戏数 (替代固定 step 数)")
    parser.add_argument("--minibatch-size", type=int, default=256,
                        help="SGD minibatch 大小")
    parser.add_argument("--update-epochs", type=int, default=4,
                        help="每批数据的迭代次数")

    # PPO 超参
    parser.add_argument("--lr", type=float, default=1e-4,
                        help="学习率")
    parser.add_argument("--gamma", type=float, default=0.98,
                        help="折扣因子")
    parser.add_argument("--gae-lambda", type=float, default=0.95,
                        help="GAE lambda")
    parser.add_argument("--clip-coef", type=float, default=0.2,
                        help="PPO clip 系数")
    parser.add_argument("--ent-coef", type=float, default=0.05,
                        help="初始熵系数 (衰减到 0.01)")
    parser.add_argument("--vf-coef", type=float, default=0.5,
                        help="价值函数损失系数")
    parser.add_argument("--max-grad-norm", type=float, default=0.5,
                        help="梯度裁剪阈值")

    # 网络
    parser.add_argument("--hidden-dim", type=int, default=512,
                        help="隐藏层维度")

    # 系统
    parser.add_argument("--device", type=str, default="auto",
                        help="训练设备 (auto/cpu/cuda)")
    parser.add_argument("--seed", type=int, default=42,
                        help="随机种子")
    parser.add_argument("--save-interval", type=int, default=100,
                        help="每 N 批保存一次模型")
    parser.add_argument("--log-interval", type=int, default=5,
                        help="每 N 批打印一次日志")

    # HSP
    parser.add_argument("--pool-save-interval", type=int, default=5000,
                        help="每 N 局保存模型到对手池")

    # Resume
    parser.add_argument("--resume", type=str, default="",
                        help="从 checkpoint (.pt) 恢复训练")

    return parser.parse_args()


# ==================== 对手模型池 ====================

class OpponentPool:
    """历史对手模型池 — 存储训练过程中的模型快照用于 HSP"""

    def __init__(self, pool_dir: str, obs_dim: int, action_dim: int,
                 hidden_dim: int, device: torch.device):
        self.pool_dir = Path(pool_dir)
        self.pool_dir.mkdir(parents=True, exist_ok=True)
        self.obs_dim = obs_dim
        self.action_dim = action_dim
        self.hidden_dim = hidden_dim
        self.device = device

    def save(self, model: ManilaPPONet, step: int):
        """保存当前模型快照到池"""
        path = self.pool_dir / f"opponent_{step:06d}.pt"
        torch.save(model.state_dict(), str(path))

    def sample(self) -> ManilaPPONet:
        """采样一个历史对手: 50% 最新 + 50% 均匀随机"""
        files = sorted(self.pool_dir.glob("opponent_*.pt"))
        if not files:
            raise RuntimeError("Opponent pool is empty")
        if random.random() < 0.5 and len(files) > 1:
            chosen = random.choice(files)  # 均匀随机
        else:
            chosen = files[-1]  # 最新
        opponent = ManilaPPONet(self.obs_dim, self.action_dim, self.hidden_dim)
        opponent.load_state_dict(torch.load(str(chosen), map_location=self.device, weights_only=True))
        opponent.to(self.device)
        opponent.eval()
        return opponent

    @property
    def size(self) -> int:
        return len(list(self.pool_dir.glob("opponent_*.pt")))


# ==================== 轨迹数据结构 ====================

class Transition:
    """单步转移"""
    __slots__ = ['obs', 'mask', 'action', 'log_prob', 'value', 'reward', 'done', 'potential']

    def __init__(self, obs, mask, action, log_prob, value, reward=0.0, done=False, potential=0.0):
        self.obs = obs
        self.mask = mask
        self.action = action
        self.log_prob = log_prob
        self.value = value
        self.reward = reward
        self.done = done
        self.potential = potential


class PlayerTrajectory:
    """单个玩家在一局游戏中的轨迹"""

    def __init__(self, player_id: str):
        self.player_id = player_id
        self.steps: list[Transition] = []

    def add(self, t: Transition):
        self.steps.append(t)

    def assign_terminal_reward(self, reward: float):
        """将终端奖励赋给最后一步"""
        if self.steps:
            self.steps[-1].reward = reward
            self.steps[-1].done = True


def compute_gae_for_trajectory(
    trajectory: PlayerTrajectory,
    gamma: float,
    gae_lambda: float,
    shaping_weight: float = 1.0,
) -> tuple[np.ndarray, np.ndarray]:
    """为单个玩家的轨迹计算 GAE 优势和回报 (含 PBRS 密集奖励)

    shaping_weight: PBRS 退火系数 (1.0=完全依赖, 0.0=纯终端奖励)
    """
    n = len(trajectory.steps)
    if n == 0:
        return np.array([]), np.array([])

    rewards = np.array([t.reward for t in trajectory.steps], dtype=np.float32)
    values = np.array([t.value for t in trajectory.steps], dtype=np.float32)
    dones = np.array([t.done for t in trajectory.steps], dtype=np.float32)
    potentials = np.array([t.potential for t in trajectory.steps], dtype=np.float32)

    # PBRS: r_shaped[t] = r[t] + γ·Φ(s_{t+1}) - Φ(s_t)
    # 坑 #3: 终端时 Φ(s_{terminal}) = 0, 由 bridge-server 保证
    for t in range(n):
        phi_current = potentials[t]
        if t == n - 1:
            phi_next = 0.0  # 终端: Φ(s_terminal) = 0
        else:
            phi_next = potentials[t + 1]
        rewards[t] += shaping_weight * (gamma * phi_next - phi_current)

    advantages = np.zeros(n, dtype=np.float32)
    last_gae = 0

    for t in reversed(range(n)):
        if t == n - 1:
            next_value = 0.0  # 最后一步之后游戏结束, V(terminal)=0
        else:
            next_value = values[t + 1]

        # 如果当前步标记为 done, 下一步的价值不参与
        next_nonterminal = 1.0 - dones[t]
        delta = rewards[t] + gamma * next_value * next_nonterminal - values[t]
        last_gae = delta + gamma * gae_lambda * next_nonterminal * last_gae
        advantages[t] = last_gae

    returns = advantages + values
    return advantages, returns


# ==================== 数据采集 ====================

def collect_complete_games(
    envs: list[ManilaEnvClient],
    model: ManilaPPONet,
    num_games: int,
    device: torch.device,
    base_seed: int,
    opponent_model: ManilaPPONet | None = None,
    opponent_mode: str = 'ev',
) -> tuple[list[PlayerTrajectory], dict]:
    """
    收集指定数量的完整游戏, 只返回 P0 的轨迹用于训练

    模式:
      opponent_mode='ev': P1/P2 由 bridge-server 的内置 EV 策略执行, Python 只收 P0 决策
      opponent_mode='neural': P1/P2 由 opponent_model 在 Python 端执行
    """
    all_trajectories: list[PlayerTrajectory] = []
    games_completed = 0
    p0_rewards = []
    total_steps = 0

    # 每个环境的状态
    env_games: list[dict] = []
    for i, env in enumerate(envs):
        obs, mask, pid, phi = env.reset(
            seed=base_seed + i * 7919,
            opponent_mode=opponent_mode,
        )
        env_games.append({
            "obs": obs, "mask": mask, "pid": pid, "phi": phi,
            "done": False,
            "p0_traj": PlayerTrajectory("p0"),
            "seed_offset": i,
        })

    while games_completed < num_games:
        for i, env in enumerate(envs):
            eg = env_games[i]
            if eg["done"]:
                # 开始新游戏
                eg["seed_offset"] += len(envs)
                seed = base_seed + eg["seed_offset"] * 7919
                obs, mask, pid, phi = env.reset(
                    seed=seed,
                    opponent_mode=opponent_mode,
                )
                eg.update({
                    "obs": obs, "mask": mask, "pid": pid, "phi": phi,
                    "done": False,
                    "p0_traj": PlayerTrajectory("p0"),
                })

            pid = eg["pid"]
            obs_t = torch.tensor(eg["obs"], dtype=torch.float32, device=device).unsqueeze(0)
            mask_t = torch.tensor(eg["mask"], dtype=torch.float32, device=device).unsqueeze(0)

            if pid == "p0":
                # P0: 当前模型选动作 + 记录轨迹
                with torch.no_grad():
                    action, log_prob, _, value = model.get_action_and_value(obs_t, mask_t)
                action_id = action.item()

                transition = Transition(
                    obs=eg["obs"].copy(),
                    mask=eg["mask"].astype(np.float32).copy(),
                    action=action_id,
                    log_prob=log_prob.item(),
                    value=value.item(),
                    potential=eg["phi"],
                )
                eg["p0_traj"].add(transition)
                total_steps += 1
            else:
                # P1/P2: 对手模型选动作, 不记录
                # (opponent_mode='ev' 时, bridge 已自动处理, 不会到这里)
                if opponent_model is not None:
                    with torch.no_grad():
                        action, _, _, _ = opponent_model.get_action_and_value(obs_t, mask_t)
                    action_id = action.item()
                else:
                    # 无对手模型 — 随机选合法动作 (fallback)
                    legal = np.where(eg["mask"] == 1)[0]
                    action_id = int(np.random.choice(legal))

            # 执行动作
            next_obs, next_mask, next_pid, done, rewards, next_phi = env.step(action_id)

            if done and rewards:
                # 游戏结束 — 只保存 P0 轨迹
                p0_reward = rewards.get("p0", 0.0)
                p0_traj = eg["p0_traj"]
                if len(p0_traj.steps) > 0:
                    p0_traj.assign_terminal_reward(p0_reward)
                    all_trajectories.append(p0_traj)

                games_completed += 1
                p0_rewards.append(p0_reward)
                eg["done"] = True
            else:
                eg["obs"] = next_obs
                eg["mask"] = next_mask
                eg["pid"] = next_pid
                eg["phi"] = next_phi

    stats = {
        "games_completed": games_completed,
        "mean_reward": np.mean(p0_rewards) if p0_rewards else 0.0,
        "total_steps": total_steps,
        "num_trajectories": len(all_trajectories),
    }
    return all_trajectories, stats


# ==================== PPO 更新 ====================

def ppo_update(
    model: ManilaPPONet,
    optimizer: optim.Optimizer,
    trajectories: list[PlayerTrajectory],
    args,
    device: torch.device,
    shaping_weight: float = 1.0,
) -> dict:
    """PPO 更新 — 使用按玩家分离的轨迹"""

    # 1. 对每条轨迹计算 GAE, 然后拼接
    all_obs = []
    all_masks = []
    all_actions = []
    all_log_probs = []
    all_advantages = []
    all_returns = []

    for traj in trajectories:
        if len(traj.steps) == 0:
            continue

        advantages, returns = compute_gae_for_trajectory(
            traj, args.gamma, args.gae_lambda, shaping_weight=shaping_weight
        )

        for step in traj.steps:
            all_obs.append(step.obs)
            all_masks.append(step.mask)
            all_actions.append(step.action)
            all_log_probs.append(step.log_prob)

        all_advantages.append(advantages)
        all_returns.append(returns)

    if not all_obs:
        return {"loss": 0, "pg_loss": 0, "vf_loss": 0, "entropy": 0}

    # 2. 转为 tensor
    n = len(all_obs)
    obs = torch.tensor(np.array(all_obs), device=device)
    masks = torch.tensor(np.array(all_masks), device=device)
    actions = torch.tensor(np.array(all_actions), dtype=torch.long, device=device)
    old_log_probs = torch.tensor(np.array(all_log_probs), device=device)
    advantages = torch.tensor(np.concatenate(all_advantages), device=device)
    returns = torch.tensor(np.concatenate(all_returns), device=device)

    # 3. 归一化优势
    advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

    # 4. 多轮 minibatch SGD
    total_loss = 0
    total_pg_loss = 0
    total_vf_loss = 0
    total_entropy = 0
    num_updates = 0

    indices = np.arange(n)

    for epoch in range(args.update_epochs):
        np.random.shuffle(indices)

        for start in range(0, n, args.minibatch_size):
            end = min(start + args.minibatch_size, n)
            mb_idx = indices[start:end]

            mb_obs = obs[mb_idx]
            mb_masks = masks[mb_idx]
            mb_actions = actions[mb_idx]
            mb_old_log_probs = old_log_probs[mb_idx]
            mb_advantages = advantages[mb_idx]
            mb_returns = returns[mb_idx]

            _, new_log_prob, entropy, new_value = model.get_action_and_value(
                mb_obs, mb_masks, mb_actions
            )

            # PPO Clip Loss
            ratio = torch.exp(new_log_prob - mb_old_log_probs)
            pg_loss1 = -mb_advantages * ratio
            pg_loss2 = -mb_advantages * torch.clamp(
                ratio, 1 - args.clip_coef, 1 + args.clip_coef
            )
            pg_loss = torch.max(pg_loss1, pg_loss2).mean()

            # Value Loss
            vf_loss = 0.5 * ((new_value - mb_returns) ** 2).mean()

            # Entropy Loss
            entropy_loss = entropy.mean()

            # Total Loss
            loss = pg_loss + args.vf_coef * vf_loss - args.ent_coef * entropy_loss

            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), args.max_grad_norm)
            optimizer.step()

            total_loss += loss.item()
            total_pg_loss += pg_loss.item()
            total_vf_loss += vf_loss.item()
            total_entropy += entropy_loss.item()
            num_updates += 1

    return {
        "loss": total_loss / max(num_updates, 1),
        "pg_loss": total_pg_loss / max(num_updates, 1),
        "vf_loss": total_vf_loss / max(num_updates, 1),
        "entropy": total_entropy / max(num_updates, 1),
    }


# ==================== 主训练循环 ====================

def main():
    args = parse_args()

    # 设备
    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)
    print(f"Device: {device}")

    # 随机种子
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    # 输出目录
    run_dir = Path("runs") / f"ppo_v2_{time.strftime('%Y%m%d_%H%M%S')}"
    run_dir.mkdir(parents=True, exist_ok=True)
    models_dir = run_dir / "models"
    models_dir.mkdir(exist_ok=True)

    # TensorBoard
    writer = SummaryWriter(str(run_dir))

    # 环境
    print(f"Starting {args.num_envs} environments (player_count={args.player_count})...")
    envs = []
    for i in range(args.num_envs):
        env = ManilaEnvClient(player_count=args.player_count)
        envs.append(env)
    print(f"  obs_dim={envs[0].obs_dim}, action_dim={envs[0].action_dim}")

    obs_dim = envs[0].obs_dim
    action_dim = envs[0].action_dim

    # 网络
    model = ManilaPPONet(obs_dim, action_dim, args.hidden_dim).to(device)
    optimizer = optim.Adam(model.parameters(), lr=args.lr, eps=1e-5)
    print(f"  Parameters: {model.count_parameters():,}")

    # 对手模型池
    pool_dir = run_dir / "opponent_pool"
    # Resume: 从旧训练目录复制对手池
    if args.resume:
        old_run_dir = Path(args.resume).parent.parent  # models/xxx.pt → run_dir
        old_pool_dir = old_run_dir / "opponent_pool"
        if old_pool_dir.exists() and any(old_pool_dir.iterdir()):
            import shutil
            if pool_dir.exists():
                shutil.rmtree(pool_dir)
            shutil.copytree(str(old_pool_dir), str(pool_dir))
            print(f"  ✅ Copied opponent pool from {old_pool_dir} ({len(list(pool_dir.glob('*.pt')))} models)")

    pool = OpponentPool(
        pool_dir=str(pool_dir),
        obs_dim=obs_dim, action_dim=action_dim,
        hidden_dim=args.hidden_dim, device=device,
    )
    if pool.size == 0:
        pool.save(model, 0)  # 种子: 初始随机模型
    print(f"  Opponent pool initialized at {pool_dir} (size={pool.size})")

    # 训练循环
    total_games = 0
    total_steps = 0
    iteration = 0
    reward_history = deque(maxlen=100)
    best_mean_reward = -float("inf")

    # Resume: 从 checkpoint 恢复完整训练状态
    if args.resume:
        ckpt = torch.load(args.resume, map_location=device, weights_only=False)
        model.load_state_dict(ckpt["model_state_dict"])
        optimizer.load_state_dict(ckpt["optimizer_state_dict"])
        total_games = ckpt.get("total_games", 0)
        total_steps = ckpt.get("total_steps", 0)
        # iteration 从 total_games 估算, 避免覆盖已有 checkpoint
        iteration = total_games // args.games_per_batch
        # 计算当前 progress 以显示正确的 ent_coef
        progress = min(1.0, total_games / args.total_games)
        ent_now = max(0.01, args.ent_coef - (args.ent_coef - 0.01) * progress)
        print(f"  ✅ Resumed from {args.resume}")
        print(f"     total_games={total_games}, total_steps={total_steps}")
        print(f"     progress={progress:.1%}, ent_coef={ent_now:.4f}")
        print(f"     Optimizer state restored (Adam momentum preserved)")

    print(f"\nTraining for {args.total_games} games (HSP + PBRS)...")
    print(f"  games_per_batch={args.games_per_batch}, minibatch={args.minibatch_size}")
    print(f"  lr={args.lr}, gamma={args.gamma}, ent_coef={args.ent_coef}")
    print(f"  Schedule: EV 90%→20%, Pool 10%→80%")
    print()

    try:
        while total_games < args.total_games:
            iteration += 1
            t0 = time.time()

            # 渐进式对手选择: ev_prob 从 0.9 线性降到 0.2
            progress = min(1.0, total_games / args.total_games)
            ev_prob = max(0.2, 0.9 - 0.7 * progress)

            # 熵衰减: 0.05 → 0.01
            ent_coef = max(0.01, args.ent_coef - (args.ent_coef - 0.01) * progress)
            args_copy = argparse.Namespace(**vars(args))
            args_copy.ent_coef = ent_coef

            # PBRS: 保持常数 1.0 (评分 bug 已修复, 不需要退火)
            shaping_weight = 1.0

            if random.random() < ev_prob or pool.size <= 1:
                opponent_mode = "ev"
                opponent_model = None
            else:
                opponent_mode = "neural"
                opponent_model = pool.sample()

            # 1. 收集完整游戏 (只收 P0 轨迹)
            model.eval()
            trajectories, collect_stats = collect_complete_games(
                envs, model, args.games_per_batch, device,
                base_seed=args.seed + total_games * 100,
                opponent_model=opponent_model,
                opponent_mode=opponent_mode,
            )

            total_games += collect_stats["games_completed"]
            total_steps += collect_stats["total_steps"]
            reward_history.append(collect_stats["mean_reward"])

            # 保存模型到对手池
            if total_games % args.pool_save_interval < args.games_per_batch:
                pool.save(model, total_games)

            # 2. PPO 更新
            model.train()
            update_stats = ppo_update(model, optimizer, trajectories, args_copy, device, shaping_weight=shaping_weight)

            # 3. 日志
            elapsed = time.time() - t0
            mean_reward_100 = np.mean(list(reward_history)) if reward_history else 0

            # TensorBoard
            writer.add_scalar("train/mean_reward", collect_stats["mean_reward"], total_games)
            writer.add_scalar("train/mean_reward_100", mean_reward_100, total_games)
            writer.add_scalar("train/loss", update_stats["loss"], total_games)
            writer.add_scalar("train/pg_loss", update_stats["pg_loss"], total_games)
            writer.add_scalar("train/vf_loss", update_stats["vf_loss"], total_games)
            writer.add_scalar("train/entropy", update_stats["entropy"], total_games)
            writer.add_scalar("train/ent_coef", ent_coef, total_games)
            writer.add_scalar("train/ev_prob", ev_prob, total_games)
            writer.add_scalar("train/pool_size", pool.size, total_games)
            writer.add_scalar("train/shaping_weight", shaping_weight, total_games)
            writer.add_scalar("train/steps_per_game",
                             collect_stats["total_steps"] / max(collect_stats["games_completed"], 1),
                             total_games)
            writer.add_scalar("train/games_per_sec",
                             collect_stats["games_completed"] / max(elapsed, 0.001),
                             total_games)

            if iteration % args.log_interval == 0:
                mode_tag = "EV" if opponent_mode == "ev" else f"Pool({pool.size})"
                print(
                    f"[{total_games:>6d}/{args.total_games}] "
                    f"reward={collect_stats['mean_reward']:+.3f} "
                    f"avg100={mean_reward_100:+.3f} "
                    f"loss={update_stats['loss']:.4f} "
                    f"ent={update_stats['entropy']:.3f} "
                    f"trajs={collect_stats['num_trajectories']} "
                    f"steps={collect_stats['total_steps']} "
                    f"sw={shaping_weight:.2f} "
                    f"{mode_tag} {elapsed:.1f}s"
                )

            # 4. 保存模型
            if iteration % args.save_interval == 0 or total_games >= args.total_games:
                ckpt_path = models_dir / f"model_{total_games:06d}.pt"
                torch.save({
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "total_games": total_games,
                    "total_steps": total_steps,
                    "args": vars(args),
                }, str(ckpt_path))
                print(f"  → Saved {ckpt_path}")

                # 保存最佳模型
                if mean_reward_100 > best_mean_reward:
                    best_mean_reward = mean_reward_100
                    best_path = models_dir / "best.pt"
                    torch.save(model.state_dict(), str(best_path))
                    print(f"  → New best model (reward={mean_reward_100:.3f})")

    except KeyboardInterrupt:
        print("\nTraining interrupted by user")

    finally:
        # 导出最终 ONNX 模型
        final_onnx = models_dir / "manila_brain.onnx"
        model.eval()
        model.cpu()
        model.export_onnx(str(final_onnx))
        print(f"\nFinal ONNX model: {final_onnx}")
        print(f"  Size: {final_onnx.stat().st_size / 1024:.1f} KB")

        # 关闭环境
        for env in envs:
            env.close()

        writer.close()
        print(f"\nDone! Total games: {total_games}, total steps: {total_steps}")
        print(f"Logs: {run_dir}")


if __name__ == "__main__":
    main()

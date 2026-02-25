"""
模型验证：ONNX 模型 vs 随机策略 对战测试

用法:
    python validate.py --model manila_brain.onnx --games 500
"""

import argparse
import time
import numpy as np
import onnxruntime as ort

from env_client import ManilaEnvClient


def validate(model_path: str, games: int = 500, player_count: int = 3):
    """
    运行 ONNX 模型作为 p0 对抗随机策略 (p1, p2, ...),
    统计胜率和平均排名
    """
    print(f"Loading ONNX model: {model_path}")
    session = ort.InferenceSession(model_path)
    print(f"  Input: {[inp.name for inp in session.get_inputs()]}")
    print(f"  Output: {[out.name for out in session.get_outputs()]}")

    print(f"\nRunning {games} games ({player_count}P)...")
    print(f"  p0 = ONNX model, p1+ = random (within bridge)\n")

    wins = 0
    total_rank = 0
    total_reward = 0
    game_lengths = []

    t0 = time.time()

    with ManilaEnvClient(player_count=player_count) as env:
        for game in range(games):
            obs, mask, pid = env.reset(seed=game * 7919)
            done = False
            steps = 0

            while not done:
                # ONNX 模型只控制自己的回合
                # 但桥接服务器把所有玩家的决策点都发给 Python
                # 对于非 p0 玩家，使用随机策略
                if pid == "p0":
                    # 使用 ONNX 模型
                    obs_input = obs.reshape(1, -1).astype(np.float32)
                    mask_input = mask.reshape(1, -1).astype(np.float32)
                    logits, _ = session.run(None, {
                        "obs": obs_input,
                        "action_mask": mask_input,
                    })
                    # 贪心选择 (验证时不加随机性)
                    action = int(np.argmax(logits[0]))
                else:
                    # 随机策略: 从合法动作中均匀随机
                    legal = np.where(mask == 1)[0]
                    action = int(np.random.choice(legal))

                obs, mask, pid, done, rewards = env.step(action)
                steps += 1

            game_lengths.append(steps)

            if rewards:
                p0_reward = rewards.get("p0", 0.0)
                total_reward += p0_reward
                if p0_reward > 0:
                    wins += 1
                # 根据奖励推算排名 (reward = 1 - 2*(rank-1)/(n-1))
                # rank = (1 - reward) * (n-1) / 2 + 1
                n = player_count
                rank = (1 - p0_reward) * (n - 1) / 2 + 1
                total_rank += rank

            if (game + 1) % 50 == 0:
                elapsed = time.time() - t0
                print(
                    f"  [{game+1}/{games}] "
                    f"win_rate={wins/(game+1)*100:.1f}% "
                    f"avg_rank={total_rank/(game+1):.2f} "
                    f"avg_reward={total_reward/(game+1):+.3f} "
                    f"{elapsed:.1f}s"
                )

    elapsed = time.time() - t0
    win_rate = wins / games * 100
    avg_rank = total_rank / games
    avg_reward = total_reward / games
    avg_length = np.mean(game_lengths)

    print(f"\n{'='*50}")
    print(f"Results ({games} games, {player_count}P):")
    print(f"  Win rate:     {win_rate:.1f}%")
    print(f"  Avg rank:     {avg_rank:.2f}")
    print(f"  Avg reward:   {avg_reward:+.3f}")
    print(f"  Avg game len: {avg_length:.1f} steps")
    print(f"  Total time:   {elapsed:.1f}s ({games/elapsed:.1f} games/s)")
    print(f"{'='*50}")

    # 与随机基线比较
    random_win_rate = 100 / player_count
    print(f"\n  Random baseline: {random_win_rate:.1f}%")
    if win_rate > random_win_rate * 1.2:
        print(f"  ✓ Model is significantly better than random!")
    elif win_rate > random_win_rate:
        print(f"  ~ Model is slightly better than random")
    else:
        print(f"  ✗ Model is not better than random yet")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True,
                        help="ONNX 模型路径")
    parser.add_argument("--games", type=int, default=500,
                        help="对战局数")
    parser.add_argument("--player-count", type=int, default=3)
    args = parser.parse_args()

    validate(args.model, args.games, args.player_count)

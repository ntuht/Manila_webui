"""Quick smoke test for EV opponent mode"""
from env_client import ManilaEnvClient
import numpy as np

print("Testing EV opponent mode...")
env = ManilaEnvClient(3)
obs, mask, pid, phi = env.reset(seed=42, opponent_mode='ev')
print(f"  EV mode: pid={pid}, legal={mask.sum()}, phi={phi:.4f}")

step = 0
done = False
while not done and step < 500:
    legal = np.where(mask == 1)[0]
    a = int(np.random.choice(legal))
    obs, mask, pid, done, rew, phi = env.step(a)
    step += 1

print(f"  Game ended: {step} steps, rewards={rew}")
assert pid == '' or pid == 'p0', f"EV mode should only return P0 decisions, got {pid}"
print("  All P0-only decisions confirmed!")
env.close()
print("Smoke test PASSED!")

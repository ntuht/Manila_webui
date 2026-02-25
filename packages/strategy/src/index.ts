export type { Strategy } from './strategy.js';
export { randomStrategy } from './strategies/random.js';
export { greedyStrategy } from './strategies/greedy.js';
export { expectedValueStrategy } from './strategies/ev.js';
export { adversarialStrategy } from './strategies/adversarial.js';
export { createTunedStrategy, DEFAULT_WEIGHTS, WEIGHT_KEYS, type StrategyWeights } from './strategies/tuned.js';
export { simulate, type SimulationConfig, type SimulationResult, type StrategyStats } from './simulator.js';
export { train, type TrainingConfig, type TrainingResult } from './trainer.js';
export {
    calcInvestmentImpact, calcNavigatorMoveImpact, type ImpactVector,
    arrivalProbability, estimateRollsRemaining, probExactlyK, probAtLeastK,
} from './impact.js';

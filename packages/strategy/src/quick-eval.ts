import { simulate } from './simulator.js';
import { createTunedStrategy } from './strategies/tuned.js';
import { expectedValueStrategy } from './strategies/ev.js';
import * as fs from 'fs';

const weights = JSON.parse(fs.readFileSync('trained_weights.json', 'utf-8'));
const s = createTunedStrategy(weights, 'trained');

console.log('Running 500 games: trained vs 2×EV...');
const r = simulate({
    games: 500, rounds: 20, playerCount: 3,
    strategies: [s, expectedValueStrategy, expectedValueStrategy],
    baseSeed: 77777,
});

for (const stat of r.strategyStats) {
    console.log(`${stat.name}: winRate=${(stat.winRate * 100).toFixed(1)}% avgScore=${stat.avgScore.toFixed(1)} (${stat.minScore}-${stat.maxScore})`);
}
console.log(`Completed: ${r.completedGames}/${r.totalGames}, Failed: ${r.failedGames}, Duration: ${r.duration}ms`);

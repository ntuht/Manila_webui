import { createGame, applyAction, getValidActions, isGameOver, createSeededRNG } from '@manila/engine';
import { createTunedStrategy, DEFAULT_WEIGHTS } from './strategies/tuned.js';
import { expectedValueStrategy } from './strategies/ev.js';

// DEFAULT_WEIGHTS has bidAggression = 1.0 → should compete with EV's 14
const trained = createTunedStrategy(DEFAULT_WEIGHTS, 'trained');
const strategies = [trained, expectedValueStrategy, expectedValueStrategy];
const rng = createSeededRNG(42);
let s = createGame({ playerCount: 3, rounds: 20, playerNames: ['trained', 'ev', 'ev'] }, rng);

let step = 0;
while (!isGameOver(s) && step < 200) {
    const p = s.pendingAction;
    if (!p) break;
    const va = getValidActions(s);
    if (va.length === 0) break;

    const playerIndex = parseInt(p.playerId.slice(1));
    const strategy = strategies[playerIndex];

    try {
        let a = strategy.chooseAction(s, va);
        if (a.type === 'BID' && a.data.amount === undefined) {
            a = { ...a, data: { ...a.data, amount: a.data.minBid ?? 1 } };
        }
        // Only log bids and stock purchases
        if (['BID', 'PASS_AUCTION', 'BUY_STOCK', 'SKIP_BUY_STOCK', 'PLACE_SHIPS'].includes(a.type)) {
            const name = playerIndex === 0 ? 'trained' : `ev${playerIndex}`;
            console.log(`[${step}] ${name} R${s.round} ${a.type} data=${JSON.stringify(a.data)}`);
        }
        s = applyAction(s, a, rng);
        step++;
    } catch (e: any) {
        console.log(`CRASH at step ${step}: ${p.playerId} phase=${s.phase} type=${va[0].type}`);
        console.log(`  ERROR: ${e.message}`);
        break;
    }
}

// Final scores
console.log('\n=== FINAL ===');
for (const p of s.players) {
    const stockValue = p.stocks.reduce((sum: number, stock: any) => {
        return sum + stock.quantity * s.stockPrices[stock.cargo as keyof typeof s.stockPrices];
    }, 0);
    console.log(`${p.id} cash=${p.cash} stockValue=${stockValue} total=${p.cash + stockValue}`);
}

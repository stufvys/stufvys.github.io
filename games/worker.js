const GRID = new Uint8Array(100);
const FOUND_BUF = new Uint8Array(100);

self.onmessage = function(e) {
    const { bombCount, minMatches, targetCoord, batchSize } = e.data;
    
    let tx = -1, ty = -1;
    if (targetCoord && targetCoord.includes(',')) {
        const parts = targetCoord.split(',');
        tx = parseInt(parts[0]) | 0;
        ty = parseInt(parts[1]) | 0;
    }

    // Your specific pRNG constants
    const multiplier = 2862933555777941757n;
    const increment = 3037000493n;
    const mask = 0xFFFFFFFFFFFFFFFFn;
    const divisor = 9007199254740992; // 2^53

    // Infinite loop processing - only stops when terminated
    while (true) {
        for (let b = 0; b < batchSize; b = (b + 1) | 0) {
            GRID.fill(0);
            
            // Generate a fresh random starting seed for EVERY board
            const currentSeedNum = Math.floor(Math.random() * 1e15);
            let state = BigInt(currentSeedNum);
            
            let bombsPlaced = 0;
            while (bombsPlaced < bombCount) {
                state = (state * multiplier + increment) & mask;
                const x = ((Number(state >> 11n) / divisor) * 10) | 0;
                
                state = (state * multiplier + increment) & mask;
                const y = ((Number(state >> 11n) / divisor) * 10) | 0;
                
                const idx = (y * 10 + x) | 0;
                if (GRID[idx] === 0) {
                    GRID[idx] = 1;
                    bombsPlaced = (bombsPlaced + 1) | 0;
                }
            }

            let foundCount = 0;
            let targetMet = (tx === -1);
            for (let i = 0; i < 100; i = (i + 1) | 0) {
                if (GRID[i]) continue;
                const x = i % 10 | 0;
                const y = (i / 10) | 0;
                let n = 0;
                if (x > 0) { n += GRID[i-1]; if (y > 0) n += GRID[i-11]; if (y < 9) n += GRID[i+9]; }
                if (x < 9) { n += GRID[i+1]; if (y > 0) n += GRID[i-9]; if (y < 9) n += GRID[i+11]; }
                if (y > 0) n += GRID[i-10]; if (y < 9) n += GRID[i+10];

                if (n === 8) {
                    FOUND_BUF[foundCount++] = i;
                    if (x === tx && y === ty) targetMet = true;
                }
            }

            if (foundCount >= minMatches && targetMet) {
                self.postMessage({ 
                    type: 'found',
                    seed: currentSeedNum.toString(), 
                    coords: Array.from(FOUND_BUF.slice(0, foundCount)).map(i => `${i%10},${(i/10)|0}`)
                });
            }
        }
        
        // Report stats after every batch
        self.postMessage({ type: 'stat', count: batchSize });
    }
};

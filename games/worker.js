const GRID = new Uint8Array(100);
const FOUND_BUF = new Uint8Array(100);

self.onmessage = function(e) {
    const { startSeed, step, bombCount, minMatches, targetCoord, isRandom, batchSize } = e.data;
    
    let tx = -1, ty = -1;
    if (targetCoord && targetCoord.includes(',')) {
        const parts = targetCoord.split(',');
        tx = parseInt(parts[0]) | 0;
        ty = parseInt(parts[1]) | 0;
    }

    let current = BigInt(startSeed);
    const stepBI = BigInt(step);
    
    // PCG/LCG Constants for 64-bit math
    const multiplier = 6364136223846793005n;
    const increment = 1442695040888963407n;
    const divisor = 18446744073709551616n; // 2^64

    for (let b = 0; b < batchSize; b = (b + 1) | 0) {
        GRID.fill(0);
        
        let s = isRandom ? BigInt((Math.random() * 1e18) | 0) : current;
        let bombsPlaced = 0;

        // BOMB PLACEMENT
        while (bombsPlaced < bombCount) {
            // Generate X
            s = (s * multiplier + increment) & 0xFFFFFFFFFFFFFFFFn;
            const x = Number((s * 10n) / divisor) | 0;
            
            // Generate Y
            s = (s * multiplier + increment) & 0xFFFFFFFFFFFFFFFFn;
            const y = Number((s * 10n) / divisor) | 0;
            
            const idx = (y * 10 + x) | 0;
            if (GRID[idx] === 0) {
                GRID[idx] = 1;
                bombsPlaced = (bombsPlaced + 1) | 0;
            }
        }

        // NEIGHBOR SCAN
        let foundCount = 0;
        let targetMet = (tx === -1);

        for (let i = 0; i < 100; i = (i + 1) | 0) {
            if (GRID[i]) continue;
            
            const x = i % 10 | 0;
            const y = (i / 10) | 0;
            let n = 0;

            // Manual check is faster than nested loops for 10x10
            if (x > 0) {
                n += GRID[i - 1];
                if (y > 0) n += GRID[i - 11];
                if (y < 9) n += GRID[i + 9];
            }
            if (x < 9) {
                n += GRID[i + 1];
                if (y > 0) n += GRID[i - 9];
                if (y < 9) n += GRID[i + 11];
            }
            if (y > 0) n += GRID[i - 10];
            if (y < 9) n += GRID[i + 10];

            if (n === 8) {
                FOUND_BUF[foundCount++] = i;
                if (x === tx && y === ty) targetMet = true;
            }
        }

        if (foundCount >= minMatches && targetMet) {
            const coords = [];
            for(let j = 0; j < foundCount; j++) {
                coords.push((FOUND_BUF[j] % 10) + "," + ((FOUND_BUF[j] / 10) | 0));
            }
            self.postMessage({ 
                type: 'found',
                seed: current.toString(), 
                coords: coords 
            });
        }
        current += stepBI;
    }

    self.postMessage({
        type: 'stat',
        count: batchSize,
        nextSeed: current.toString(),
        nextMsg: { startSeed: current.toString(), step, bombCount, minMatches, targetCoord, isRandom, batchSize }
    });
};

// Pre-allocate memory outside the loop to prevent Garbage Collection lag
const GRID = new Uint8Array(100);
const FOUND_BUF = new Uint8Array(100); 

self.onmessage = function(e) {
    const { startSeed, step, bombCount, minMatches, targetCoord, isRandom, batchSize } = e.data;
    
    // Parse targetCoord once
    let tx = -1, ty = -1;
    if (targetCoord && targetCoord.includes(',')) {
        const parts = targetCoord.split(',');
        tx = parseInt(parts[0]) | 0;
        ty = parseInt(parts[1]) | 0;
    }

    let current = BigInt(startSeed);
    const multiplier = 6364136223846793005n;
    const increment = 1442695040888963407n;

    for (let b = 0; b < batchSize; b = (b + 1) | 0) {
        // Fast clear
        GRID.fill(0);
        
        let seedToUse = isRandom ? 
            BigInt((Math.random() * 1e15) | 0) : 
            current;
            
        let s = seedToUse; 
        let bombsPlaced = 0;

        // BOMB PLACEMENT
        while (bombsPlaced < bombCount) {
            // X
            s = (s * multiplier + increment) & 0xFFFFFFFFFFFFFFFFn;
            const x = Number((Number(s >> 11n) / 9007199254740992) * 10) | 0;
            // Y
            s = (s * multiplier + increment) & 0xFFFFFFFFFFFFFFFFn;
            const y = Number((Number(s >> 11n) / 9007199254740992) * 10) | 0;
            
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
            let neighbors = 0;

            // Tight neighbor check
            if (x > 0) {
                neighbors += GRID[i - 1] + (y > 0 ? GRID[i - 11] : 0) + (y < 9 ? GRID[i + 9] : 0);
            }
            if (x < 9) {
                neighbors += GRID[i + 1] + (y > 0 ? GRID[i - 9] : 0) + (y < 9 ? GRID[i + 11] : 0);
            }
            neighbors += (y > 0 ? GRID[i - 10] : 0) + (y < 9 ? GRID[i + 10] : 0);

            if (neighbors === 8) {
                FOUND_BUF[foundCount++] = i;
                if (x === tx && y === ty) targetMet = true;
            }
        }

        // Only do expensive string/array work if we actually found a winner
        if (foundCount >= minMatches && targetMet) {
            const coords = [];
            for(let j = 0; j < foundCount; j++) {
                coords.push((FOUND_BUF[j] % 10) + "," + ((FOUND_BUF[j] / 10) | 0));
            }
            self.postMessage({ 
                type: 'found',
                seed: seedToUse.toString(), 
                coords: coords 
            });
        }
        current += step;
    }

    self.postMessage({
        type: 'stat',
        count: batchSize,
        nextSeed: current.toString(),
        nextMsg: { startSeed: current, step, bombCount, minMatches, targetCoord, isRandom, batchSize }
    });
};

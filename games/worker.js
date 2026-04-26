// Pre-allocate buffers to prevent Garbage Collection pauses
const GRID = new Uint8Array(100);
const FOUND_BUF = new Uint8Array(100);

self.onmessage = function(e) {
    const { startSeed, step, bombCount, minMatches, targetCoord, isRandom, batchSize } = e.data;
    
    // Parse target coordinate once
    let tx = -1, ty = -1;
    if (targetCoord && targetCoord.includes(',')) {
        const parts = targetCoord.split(',');
        tx = parseInt(parts[0]) | 0;
        ty = parseInt(parts[1]) | 0;
    }

    let currentSeedValue = Number(startSeed); 
    const stepNum = Number(step);

    // LCG Constants from your snippet
    const multiplier = 2862933555777941757n;
    const increment = 3037000493n;
    const mask = 0xFFFFFFFFFFFFFFFFn;
    const divisor = 9007199254740992; // 2^53

    for (let b = 0; b < batchSize; b = (b + 1) | 0) {
        GRID.fill(0);
        
        // Use provided seed or generate random 15-digit
        let seedToUse = isRandom ? (Math.random() * 1e15) : currentSeedValue;
        let state = BigInt(Math.floor(seedToUse));
        
        let bombsPlaced = 0;

        // BOMB PLACEMENT LOOP
        while (bombsPlaced < bombCount) {
            // Generate X
            state = (state * multiplier + increment) & mask;
            const x = ((Number(state >> 11n) / divisor) * 10) | 0;
            
            // Generate Y
            state = (state * multiplier + increment) & mask;
            const y = ((Number(state >> 11n) / divisor) * 10) | 0;
            
            const idx = (y * 10 + x) | 0;
            if (GRID[idx] === 0) {
                GRID[idx] = 1;
                bombsPlaced = (bombsPlaced + 1) | 0;
            }
        }

        // NEIGHBOR SCAN (Optimized manual check)
        let foundCount = 0;
        let targetMet = (tx === -1);

        for (let i = 0; i < 100; i = (i + 1) | 0) {
            if (GRID[i]) continue;
            
            const x = i % 10 | 0;
            const y = (i / 10) | 0;
            let n = 0;

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

        // Output Result
        if (foundCount >= minMatches && targetMet) {
            const coords = [];
            for(let j = 0; j < foundCount; j = (j + 1) | 0) {
                coords.push((FOUND_BUF[j] % 10) + "," + ((FOUND_BUF[j] / 10) | 0));
            }
            self.postMessage({ 
                type: 'found',
                seed: seedToUse.toString(), 
                coords: coords 
            });
        }
        currentSeedValue += stepNum;
    }

    // Update stats
    self.postMessage({
        type: 'stat',
        count: batchSize,
        nextSeed: currentSeedValue.toString()
    });
};

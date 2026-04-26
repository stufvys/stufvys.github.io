// Pre-allocate everything to avoid Garbage Collection during the loop
const GRID = new Int32Array(100); 
const COUNTS = new Int32Array(100);
const FOUND_BUF = new Int32Array(100);

self.onmessage = function(e) {
    const { startSeed, step, bombCount, minMatches, targetCoord, isRandom, batchSize } = e.data;
    
    let tx = -1, ty = -1;
    if (targetCoord && targetCoord.includes(',')) {
        const parts = targetCoord.split(',');
        tx = parseInt(parts[0]) | 0;
        ty = parseInt(parts[1]) | 0;
    }

    // Convert startSeed to a Number. 15 digits fits in a JS double safely.
    let current = Number(startSeed);
    const stepNum = Number(step);

    for (let b = 0; b < batchSize; b = (b + 1) | 0) {
        GRID.fill(0);
        COUNTS.fill(0);
        
        let s = isRandom ? (Math.random() * 1e15) | 0 : current;
        let bombsPlaced = 0;

        // BOMB PLACEMENT + NEIGHBOR TRACKING
        while (bombsPlaced < bombCount) {
            // High-speed LCG math using standard Numbers
            s = (s * 16807) % 2147483647;
            const x = ((s / 2147483647) * 10) | 0;
            
            s = (s * 16807) % 2147483647;
            const y = ((s / 2147483647) * 10) | 0;
            
            const idx = (y * 10 + x) | 0;
            if (GRID[idx] === 0) {
                GRID[idx] = 1;
                bombsPlaced = (bombsPlaced + 1) | 0;

                // Update neighbor counts immediately for every bomb placed
                const xStart = x > 0 ? x - 1 : 0;
                const xEnd = x < 9 ? x + 1 : 9;
                const yStart = y > 0 ? y - 1 : 0;
                const yEnd = y < 9 ? y + 1 : 9;

                for (let ny = yStart; ny <= yEnd; ny = (ny + 1) | 0) {
                    for (let nx = xStart; nx <= xEnd; nx = (nx + 1) | 0) {
                        const nIdx = (ny * 10 + nx) | 0;
                        COUNTS[nIdx] = (COUNTS[nIdx] + 1) | 0;
                    }
                }
            }
        }

        // FIND GOD TILES (Value will be 8 and GRID[i] will be 0)
        let foundCount = 0;
        let targetMet = (tx === -1);

        for (let i = 0; i < 100; i = (i + 1) | 0) {
            if (GRID[i] === 0 && COUNTS[i] === 8) {
                FOUND_BUF[foundCount++] = i;
                if ((i % 10 | 0) === tx && ((i / 10) | 0) === ty) targetMet = true;
            }
        }

        if (foundCount >= minMatches && targetMet) {
            const coords = [];
            for(let j = 0; j < foundCount; j++) {
                coords.push((FOUND_BUF[j] % 10) + "," + ((FOUND_BUF[j] / 10) | 0));
            }
            self.postMessage({ 
                type: 'found',
                seed: s.toString(), 
                coords: coords 
            });
        }
        current += stepNum;
    }

    self.postMessage({
        type: 'stat',
        count: batchSize,
        nextSeed: current.toString(),
        nextMsg: { startSeed: current, step, bombCount, minMatches, targetCoord, isRandom, batchSize }
    });
};

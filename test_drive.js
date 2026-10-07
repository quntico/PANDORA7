const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sourceRoot = 'H:\\Mi unidad\\M1 - LICITACION ACTIVA';

async function measureFirstLevel() {
    try {
        console.log(`Checking root access on ${sourceRoot}...`);
        const t0 = Date.now();
        const items = await withTimeout(fs.readdir(sourceRoot), 5000);
        const tf = Date.now() - t0;
        console.log(`ROOT_ACCESS_MS = ${tf}`);
        console.log(`FIRST_LEVEL_ITEMS = ${items.length}`);

        // Measure first item stat
        if (items.length > 0) {
            const t1 = Date.now();
            await withTimeout(fs.stat(path.join(sourceRoot, items[0])), 2000);
            console.log(`FIRST_LEVEL_TIME_MS (single stat) = ${Date.now() - t1}`);
        }
    } catch (err) {
        console.error('Error on root access:', err.message);
    }
}

measureFirstLevel();

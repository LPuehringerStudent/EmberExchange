const puppeteer = require('puppeteer-core');

const SESSION_ID = process.argv[2];
const PLAYER_ID = process.argv[3];
const USERNAME = process.argv[4] || 'test';

if (!SESSION_ID || !PLAYER_ID) {
    console.error('Usage: node scripts/repro-blackjack-prod.js <sessionId> <playerId> [username]');
    process.exit(1);
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    const logs = [];
    page.on('console', (msg) => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
    });
    page.on('pageerror', (err) => logs.push(`[PAGEERROR] ${err.message}`));

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    await page.evaluate((sid, pid, username) => {
        const user = { playerId: pid, username, coins: 10000, sparks: 0, isAdmin: false };
        localStorage.setItem('ember_session_id', sid);
        localStorage.setItem('ember_remember_me', 'true');
        localStorage.setItem('ember_user', JSON.stringify(user));
    }, SESSION_ID, parseInt(PLAYER_ID, 10), USERNAME);

    await page.goto('http://localhost:3000/games/blackjack/lobby', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const createBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.trim().includes('Create Room')) || null;
    });
    if (!createBtn || !(await createBtn.asElement())) {
        console.error('Create Room button not found');
        logs.forEach(l => console.log(l));
        await page.screenshot({ path: '/tmp/repro-prod-lobby.png' });
        await browser.close();
        process.exit(1);
    }
    await createBtn.click();
    await new Promise(r => setTimeout(r, 500));

    const confirmBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.trim() === 'Create') || null;
    });
    if (!confirmBtn || !(await confirmBtn.asElement())) {
        console.error('Confirm Create button not found');
        logs.forEach(l => console.log(l));
        await page.screenshot({ path: '/tmp/repro-prod-modal.png' });
        await browser.close();
        process.exit(1);
    }
    await confirmBtn.click();

    await page.waitForFunction(() => location.pathname.startsWith('/game-room/'), { timeout: 10000 });
    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
        const badge = document.querySelector('span.capitalize');
        const players = document.querySelectorAll('.player-card');
        return {
            url: location.pathname,
            badge: badge ? badge.textContent : null,
            playerCount: players.length,
            html: document.body.innerHTML.substring(0, 500)
        };
    });
    console.log('[RESULT]', JSON.stringify(result));
    logs.forEach(l => { if (l.includes('WebSocket') || l.includes('error') || l.includes('ERROR') || l.includes('Failed')) console.log(l); });

    await page.screenshot({ path: '/tmp/repro-prod-room.png', fullPage: true });
    console.log('[SCREENSHOT]', '/tmp/repro-prod-room.png');

    await browser.close();
})();

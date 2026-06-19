const { firefox } = require('playwright');

const SESSION_ID = process.argv[2];
const PLAYER_ID = process.argv[3];
const USERNAME = process.argv[4] || 'test';

if (!SESSION_ID || !PLAYER_ID) {
    console.error('Usage: node scripts/repro-blackjack-prod-firefox.js <sessionId> <playerId> [username]');
    process.exit(1);
}

(async () => {
    const browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();

    const logs = [];
    page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => logs.push(`[PAGEERROR] ${err.message}`));

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    await page.evaluate(({ sid, pid, username }) => {
        const user = { playerId: pid, username, coins: 10000, sparks: 0, isAdmin: false };
        localStorage.setItem('ember_session_id', sid);
        localStorage.setItem('ember_remember_me', 'true');
        localStorage.setItem('ember_user', JSON.stringify(user));
    }, { sid: SESSION_ID, pid: parseInt(PLAYER_ID, 10), username: USERNAME });

    await page.goto('http://localhost:3000/games/blackjack/lobby', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const createBtn = await page.locator('button:has-text("Create Room")').first();
    await createBtn.click();
    await page.waitForTimeout(500);

    const confirmBtn = await page.locator('.bg-surface button:has-text("Create")').first();
    await confirmBtn.click({ force: true });

    await page.waitForURL(/\/game-room\//, { timeout: 10000 });
    await page.waitForTimeout(4000);

    const result = await page.evaluate(() => {
        const badge = document.querySelector('span.capitalize');
        const players = document.querySelectorAll('.player-card');
        return { url: location.pathname, badge: badge ? badge.textContent : null, playerCount: players.length };
    });
    console.log('[RESULT]', JSON.stringify(result));
    logs.forEach(l => { if (l.includes('WebSocket') || l.includes('error') || l.includes('ERROR') || l.includes('Failed')) console.log(l); });

    await page.screenshot({ path: '/tmp/repro-prod-firefox-room.png', fullPage: true });
    console.log('[SCREENSHOT]', '/tmp/repro-prod-firefox-room.png');

    await browser.close();
})();

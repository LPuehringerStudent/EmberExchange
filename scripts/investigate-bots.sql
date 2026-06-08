-- Run these queries against your production database (Render Dashboard → PostgreSQL → SQL)

-- 1. How many total tester accounts?
SELECT COUNT(*) FROM Player WHERE username LIKE 'tester_%';

-- 2. What email domains do they use?
SELECT 
    SPLIT_PART(email, '@', 2) as domain,
    COUNT(*) as count
FROM Player
WHERE username LIKE 'tester_%'
GROUP BY domain
ORDER BY count DESC;

-- 3. When were they created? (hour-by-hour)
SELECT 
    DATE_TRUNC('hour', joinedAt::timestamp) as hour,
    COUNT(*) as accounts_created
FROM Player
WHERE username LIKE 'tester_%'
GROUP BY hour
ORDER BY hour DESC;

-- 4. Do they have active sessions? (means they logged in successfully)
SELECT COUNT(DISTINCT s.playerId) as tester_accounts_with_sessions
FROM Session s
JOIN Player p ON s.playerId = p.playerId
WHERE p.username LIKE 'tester_%' AND s.isActive = 1;

-- 5. What IPs created these sessions? (check LoginHistory)
SELECT DISTINCT lh.ipAddress, COUNT(*) as logins
FROM LoginHistory lh
JOIN Player p ON lh.playerId = p.playerId
WHERE p.username LIKE 'tester_%'
GROUP BY lh.ipAddress
ORDER BY logins DESC
LIMIT 20;

-- 6. Did they open lootboxes? (shows they used the account)
SELECT COUNT(*) as tester_opened_lootboxes
FROM Lootbox lb
JOIN Player p ON lb.playerId = p.playerId
WHERE p.username LIKE 'tester_%' AND lb.openedAt IS NOT NULL;

-- 7. Did they create marketplace listings?
SELECT COUNT(*) as tester_listings
FROM Listing l
JOIN Player p ON l.sellerId = p.playerId
WHERE p.username LIKE 'tester_%';

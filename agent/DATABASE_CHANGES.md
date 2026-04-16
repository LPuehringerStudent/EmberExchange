# Database Change Guide for EmberExchange

> **Target audience:** AI agents and developers modifying the SQLite database layer.

## 1. Architecture Overview

- **Engine:** SQLite (`better-sqlite3`)
- **Location:** `src/backend/db/EmberExchange.db`
- **Test DB:** `src/backend/db/EmberExchange-test.db` (set via `TEST_DB_PATH`)
- **No ORM / No migration framework** — schema is managed manually in TypeScript.
- **Transaction wrapper:** `Unit` class (`src/backend/utils/unit.ts`) wraps connections and auto-begins transactions for write operations.

### Important Behavior
**The database is fully reset (dropped and recreated) on every server start** in `src/backend/app.ts` via `initDb()`. This means:
- Local dev data is ephemeral unless you disable `resetDatabase()`.
- Production behavior must be changed before any real deployment.

---

## 2. Files You MUST Touch for Any DB Change

| # | File | Why |
|---|------|-----|
| 1 | `src/backend/utils/unit.ts` | Contains `DB.ensureTablesCreated()` (schema DDL) and `resetDatabase()` (drop order). |
| 2 | `src/shared/model.ts` | TypeScript interfaces for DB rows (e.g., `PlayerRow`). |
| 3 | `src/backend/db/db-diagram.plantuml` | Visual schema documentation. |
| 4 | Relevant service(s) in `src/backend/services/` | SQL queries must match new schema. |
| 5 | `src/backend/utils/unit.ts` (sample data section) | `ensureSampleDataInserted()` may need updated inserts. |
| 6 | Tests in `src/test/routerTests/` | Any hard-coded schema or assertions may break. |
| 7 | `src/backend/__mocks__/unit.ts` | Mock `MockUnit` / `MockStatement` if statement shapes change. |

---

## 3. Step-by-Step Checklist

### 3.1 Schema Change (add / alter / drop table or column)

1. **Update `DB.ensureTablesCreated()`** in `src/backend/utils/unit.ts`.
   - Add / modify the `CREATE TABLE IF NOT EXISTS …` statement.
   - Add / update `CHECK` constraints, `DEFAULT` values, `REFERENCES` foreign keys.
   - Add / update indexes in the index block at the bottom of `ensureTablesCreated()`.

2. **Update `resetDatabase()`** in the same file.
   - If you added a new table, add `DROP TABLE IF EXISTS <TableName>` in the correct dependency order (child tables before parents).
   - After dropping, `DB.ensureTablesCreated(connection)` is called automatically.

3. **Update `src/shared/model.ts`**.
   - Add / modify the base interface (e.g., `Player`) and the `*Row` interface (e.g., `PlayerRow`) that extends it with the primary key.
   - Match TypeScript types to SQLite storage:
     - `INTEGER` → `number`
     - `TEXT` → `string`
     - `REAL` → `number`
     - `BOOLEAN` (stored as 0/1 in SQLite) → `boolean` in TS, but inserted as `0`/`1`
     - Nullable columns → `type | null`

4. **Update services** in `src/backend/services/`.
   - Any `INSERT`, `UPDATE`, `SELECT`, or `DELETE` that touches the changed table/column must be updated.
   - Services extend `ServiceBase` and use `this.unit.prepare<T>(sql, params)`.

5. **Update sample data** in `ensureSampleDataInserted()` (`src/backend/utils/unit.ts`).
   - If you added a required column with no default, every `INSERT` in the sample-data helpers must include it.
   - If you added a new table, write an `insertXxx()` helper and call it inside `ensureSampleDataInserted()`.

6. **Update `db-diagram.plantuml`**.
   - Keep the PlantUML diagram in sync with the new schema.

7. **Run tests** (`npm test` or `npx jest`).
   - Fix any broken tests. Pay attention to tests that create tables manually (e.g., `playerDBTests.ts`).

---

### 3.2 Adding a New Table

Follow the exact pattern used by existing tables in `ensureTablesCreated()`:

```typescript
connection.exec(`
    CREATE TABLE IF NOT EXISTS MyTable (
        myTableId INTEGER PRIMARY KEY AUTOINCREMENT,
        someRefId INTEGER NOT NULL REFERENCES OtherTable(id),
        name TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        createdAt TEXT NOT NULL
    ) STRICT
`);
```

Then add an index if queried by foreign key or frequently filtered columns:

```typescript
connection.exec(`CREATE INDEX IF NOT EXISTS idx_mytable_ref ON MyTable(someRefId)`);
```

Update `resetDatabase()` drop list:

```typescript
connection.exec("DROP TABLE IF EXISTS MyTable");
```

Place it **after** any tables that reference it and **before** any tables it references (though SQLite `DROP TABLE` with `foreign_keys = ON` can be finicky—dropping children first is safest).

---

### 3.3 Altering an Existing Table

SQLite has limited `ALTER TABLE` support. For simple changes, use `ALTER TABLE` inside `ensureTablesCreated()`:

```typescript
connection.exec(`ALTER TABLE Player ADD COLUMN bio TEXT`);
```

**Caveats:**
- You **cannot** drop a column with SQLite `ALTER TABLE` (as of older versions). You must:
  1. Create a new table with the desired schema.
  2. Copy data over.
  3. Drop the old table.
  4. Rename the new table.
- Because the app currently **resets the DB on startup**, the easiest path for dev is to just edit the `CREATE TABLE` statement directly. Existing data will be lost on restart, which is acceptable in the current dev mode.

---

### 3.4 Changing CHECK Constraints or Enums

Enums are implemented via `CHECK` constraints on `TEXT` columns (e.g., `CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited'))`).

When you change a CHECK constraint:
1. Update the DDL in `ensureTablesCreated()`.
2. Update the corresponding TypeScript union type in `src/shared/model.ts`.
3. Search the codebase for hard-coded string literals of the old values and update them.
4. Update sample data and tests.

---

### 3.5 Updating the PlantUML Diagram

Open `src/backend/db/db-diagram.plantuml`.

- Table blocks use `table(TableName) { … }`.
- Primary keys: `primary_key(columnName)`.
- Foreign keys: `foreign_key(columnName)`.
- Relationships at the bottom use PlantUML syntax:
  ```plantuml
  Parent "1" -- "0..*" Child : relationLabel
  ```

Keep the diagram visually consistent with the DDL.

---

## 4. Code Patterns to Follow

### 4.1 Querying inside a Service

```typescript
const stmt = this.unit.prepare<PlayerRow>(
    `SELECT * FROM Player WHERE playerId = @id`,
    { id }
);
return stmt.get() ?? null;
```

### 4.2 Inserting and Returning Success + ID

```typescript
const stmt = this.unit.prepare<PlayerRow>(
    `INSERT INTO Player (username, email) VALUES (@username, @email)`,
    { username, email }
);
return this.executeStmt(stmt); // [boolean, number]
```

### 4.3 Boolean Handling

SQLite stores booleans as `INTEGER` (`0` or `1`).
- In DDL: `isAdmin INTEGER NOT NULL DEFAULT 0`
- In TypeScript interface: `isAdmin: boolean`
- In sample data / params: pass `1` or `0` (or a ternary `isAdmin ? 1 : 0` if converting from a boolean input).

---

## 5. Testing Considerations

### 5.1 Test Database Isolation

- `jest.config.js` sets `maxWorkers: 1` to avoid SQLite locking.
- Some tests (like `playerDBTests.ts`) set `process.env.TEST_DB_PATH` to a dedicated file and create their own schema manually.
- If you change the `Player` table schema, any test that hard-codes a `CREATE TABLE Player` statement will break until updated.

### 5.2 Mock Unit

`src/backend/__mocks__/unit.ts` provides `MockUnit` and `MockStatement`. If you add new service methods with unusual statement shapes, you can usually still mock them with the generic `createMockUnit()` helper.

### 5.3 Running Tests After Changes

```bash
npm test
# or
npx jest --testPathPattern=playerDBTests
```

---

## 6. Common Pitfalls

| Pitfall | How to Avoid |
|---------|--------------|
| **Foreign key violation on drop** | In `resetDatabase()`, drop child tables before parent tables. |
| **Missing default for new NOT NULL column** | Either provide a `DEFAULT` in DDL or update every `INSERT`. |
| **Stale shared model** | Always mirror DDL changes in `src/shared/model.ts`. |
| **PlantUML out of sync** | Update the diagram whenever tables or relationships change. |
| **Test schema drift** | Search `src/test/` for hard-coded `CREATE TABLE` strings and update them. |
| **Forgot index** | If you add a foreign key or frequently filtered column, add a `CREATE INDEX IF NOT EXISTS`. |
| **Production data loss** | Remember: `resetDatabase()` is called on every startup in `app.ts`. Do **not** deploy this as-is. |

---

## 7. Quick Reference: Table Dependency Order (Drop Order)

Use this order in `resetDatabase()` when adding new tables:

```text
1.  PlayerStatistics
2.  DailyStatistics
3.  StoveTypeStatistics
4.  ChatMessage
5.  Ownership
6.  PriceHistory
7.  MiniGameSession
8.  Trade
9.  Listing
10. LootboxDrop
11. Lootbox
12. LootboxType
13. Session
14. Stove
15. StoveType
16. Player
```

New tables should be inserted in the appropriate position based on their foreign-key relationships (children before parents).

---

## 8. Example: Adding a `bio` Column to `Player`

1. **DDL** (`src/backend/utils/unit.ts`):
   ```sql
   ALTER TABLE Player ADD COLUMN bio TEXT DEFAULT '';
   ```
   *(Or edit the `CREATE TABLE` directly if you accept data loss on restart.)*

2. **Shared model** (`src/shared/model.ts`):
   ```typescript
   export interface Player {
       // ... existing fields
       bio: string;
   }
   ```

3. **Service** (`src/backend/services/player-service.ts`):
   Add an `updatePlayerBio(id, bio)` method.

4. **Sample data** (`ensureSampleDataInserted`):
   Add `bio: ''` (or a real bio) to each player object.

5. **Diagram** (`db-diagram.plantuml`):
   Add `bio: TEXT` inside the `table(Player)` block.

6. **Tests:**
   Update any test that manually creates the `Player` table.

---

*End of guide. When in doubt, mirror the existing table patterns exactly.*

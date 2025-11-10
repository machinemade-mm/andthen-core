/**
 * Database connection - SQLite
 * Single-file database, no server needed!
 */

import Database from 'better-sqlite3';
import { DATABASE_URL } from '../env';
import { resolve } from 'path';

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection
 */
export function getDb(): Database.Database {
	if (!db) {
		// Extract file path from DATABASE_URL (format: sqlite:./andthen.db)
		const dbPath = DATABASE_URL.replace(/^sqlite:/, '');

		// Resolve relative to project root
		const resolvedPath = resolve(process.cwd(), dbPath);

		db = new Database(resolvedPath, {
			verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
		});

		// Enable foreign keys
		db.pragma('foreign_keys = ON');

		// WAL mode for better concurrency
		db.pragma('journal_mode = WAL');

		console.log(`SQLite database connected: ${resolvedPath}`);
	}

	return db;
}

/**
 * Execute a query with parameters
 * Returns rows array like pg
 */
export function query<T = any>(
	text: string,
	params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
	return new Promise((resolve, reject) => {
		try {
			const db = getDb();

			// Convert PostgreSQL-style $1, $2 to SQLite-style ?
			const sqliteQuery = text.replace(/\$(\d+)/g, '?');

			// Check if it's a SELECT query
			if (sqliteQuery.trim().toUpperCase().startsWith('SELECT') ||
			    sqliteQuery.trim().toUpperCase().startsWith('RETURNING')) {
				const stmt = db.prepare(sqliteQuery);
				const rows = params ? stmt.all(...params) : stmt.all();
				resolve({ rows: rows as T[], rowCount: rows.length });
			} else {
				// INSERT, UPDATE, DELETE with RETURNING clause
				if (sqliteQuery.includes('RETURNING')) {
					// SQLite doesn't support RETURNING with stmt.run()
					// We need to split the query: remove RETURNING, execute, then SELECT
					const queryWithoutReturning = sqliteQuery.replace(/\s+RETURNING\s+\*/gi, '');
					const stmt = db.prepare(queryWithoutReturning);
					const result = params ? stmt.run(...params) : stmt.run();

					// Get the table name and fetch the inserted/updated row
					const tableName = extractTableName(sqliteQuery);
					if (result.lastInsertRowid) {
						// For auto-increment IDs, use lastInsertRowid
						const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
						const rows = selectStmt.all(result.lastInsertRowid);
						resolve({ rows: rows as T[], rowCount: rows.length });
					} else {
						// For TEXT primary keys (UUIDs), we can't use lastInsertRowid
						// Return empty and let the caller handle it
						resolve({ rows: [] as T[], rowCount: result.changes });
					}
				} else {
					// Regular INSERT/UPDATE/DELETE without RETURNING
					const stmt = db.prepare(sqliteQuery);
					const result = params ? stmt.run(...params) : stmt.run();
					resolve({ rows: [] as T[], rowCount: result.changes });
				}
			}
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Extract table name from INSERT/UPDATE query (helper)
 */
function extractTableName(query: string): string {
	const match = query.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i);
	return match ? match[1] : '';
}

/**
 * Get a "client" (for transaction compatibility with pg)
 */
export async function getClient() {
	const db = getDb();

	return {
		query: async <T = any>(text: string, params?: any[]) => {
			return query<T>(text, params);
		},
		release: () => {
			// SQLite doesn't have connection pools, so this is a no-op
		}
	};
}

/**
 * Close the database connection
 */
export async function closePool(): Promise<void> {
	if (db) {
		db.close();
		db = null;
	}
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
	process.on('SIGTERM', closePool);
	process.on('SIGINT', closePool);
}

#!/usr/bin/env node
/**
 * Database migration script for SQLite
 * Run with: npm run db:migrate
 * No .env file required - uses sensible defaults!
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
	// Use default DATABASE_URL if not provided
	const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./andthen.db';
	const dbPath = DATABASE_URL.replace(/^sqlite:/, '');
	const resolvedPath = resolve(process.cwd(), dbPath);

	console.log('🔄 Connecting to SQLite database...');
	console.log(`📁 Database file: ${resolvedPath}`);

	const db = new Database(resolvedPath);

	try {
		// Enable foreign keys
		db.pragma('foreign_keys = ON');

		console.log('✅ Connected to database');

		// Run all migrations in order
		const migrations = [
			'001_initial_schema.sql'
		];

		for (const migrationFile of migrations) {
			console.log(`\n🔄 Running migration: ${migrationFile}`);
			try {
				const migrationSQL = readFileSync(
					join(__dirname, 'migrations', migrationFile),
					'utf-8'
				);

				// Execute the entire migration SQL at once
				// SQLite can handle multiple statements with exec()
				db.exec(migrationSQL);

				console.log(`✅ ${migrationFile} completed successfully`);
			} catch (error) {
				// If migration fails, it might be because it's already applied
				if (error.message.includes('already exists') || error.message.includes('duplicate')) {
					console.log(`ℹ️  ${migrationFile} already applied, skipping`);
				} else {
					throw error;
				}
			}
		}

		// Verify tables were created
		console.log('\n🔄 Verifying tables...');
		const tables = db.prepare(`
			SELECT name FROM sqlite_master
			WHERE type='table'
			AND name NOT LIKE 'sqlite_%'
			ORDER BY name
		`).all();

		console.log('✅ Tables created:');
		tables.forEach(row => {
			console.log(`  - ${row.name}`);
		});

		console.log('\n✨ Database setup complete!');
		console.log(`\n💡 Your data is stored in: ${resolvedPath}`);
		console.log(`💡 To start the app: npm run dev`);
	} catch (error) {
		console.error('\n❌ Migration failed:', error.message);
		process.exit(1);
	} finally {
		db.close();
	}
}

runMigrations();

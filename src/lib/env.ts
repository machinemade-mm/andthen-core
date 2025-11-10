/**
 * Environment variable configuration for And Then? Core
 * Provides sensible defaults - no .env file required!
 */

function getEnv(key: string, defaultValue: string): string {
	return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
	const value = process.env[key];
	if (!value) return defaultValue;
	const num = parseInt(value, 10);
	if (isNaN(num)) {
		console.warn(`Environment variable ${key} must be a number, using default: ${defaultValue}`);
		return defaultValue;
	}
	return num;
}

// Application
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = getEnvNumber('PORT', 5173);
export const PUBLIC_APP_URL = getEnv('PUBLIC_APP_URL', 'http://localhost:5173');

// Database - SQLite by default (single file, no server needed!)
export const DATABASE_URL = getEnv('DATABASE_URL', 'sqlite:./andthen.db');

// JWT - Default secret for development (users should change in production)
export const JWT_SECRET = getEnv('JWT_SECRET', 'andthen-core-default-secret-change-in-production');
export const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN', '7d');

// Security
export const BCRYPT_ROUNDS = getEnvNumber('BCRYPT_ROUNDS', 12);

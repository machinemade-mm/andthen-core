/**
 * Password hashing utilities
 * Uses bcrypt for secure password hashing
 */

import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../env';

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
	password: string,
	hash: string
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Returns error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
	if (password.length < 8) {
		return 'Password must be at least 8 characters long';
	}

	if (password.length > 128) {
		return 'Password must be less than 128 characters';
	}

	// Require at least one letter and one number
	if (!/[a-zA-Z]/.test(password)) {
		return 'Password must contain at least one letter';
	}

	if (!/[0-9]/.test(password)) {
		return 'Password must contain at least one number';
	}

	return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(email)) {
		return 'Invalid email format';
	}

	if (email.length > 255) {
		return 'Email must be less than 255 characters';
	}

	return null;
}

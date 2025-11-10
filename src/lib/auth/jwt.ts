/**
 * JWT token utilities
 * Handles creation and verification of JWT tokens
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../env';

export interface JWTPayload {
	userId: string;
	email: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: JWT_EXPIRES_IN
	} as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * Returns null if invalid or expired
 */
export function verifyToken(token: string): JWTPayload | null {
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
		return decoded;
	} catch (error) {
		// Token is invalid or expired
		return null;
	}
}

/**
 * Decode a JWT token without verifying (useful for debugging)
 * Returns null if malformed
 */
export function decodeToken(token: string): JWTPayload | null {
	try {
		return jwt.decode(token) as JWTPayload;
	} catch (error) {
		return null;
	}
}

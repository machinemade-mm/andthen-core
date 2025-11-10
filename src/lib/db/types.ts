/**
 * Database type definitions
 */

export type UserTier = 'free' | 'standard' | 'ultimate';
export type ProjectType = 'project' | 'goal';

export interface User {
	id: string;
	email: string;
	password_hash: string;
	tier: UserTier;
	created_at: Date;
	updated_at: Date;
}

export interface Project {
	id: string;
	user_id: string;
	name: string;
	type: ProjectType;
	position: number;
	goal_description: string | null;
	goal_step_count: number;
	created_at: Date;
	updated_at: Date;
}

export interface Task {
	id: string;
	project_id: string;
	content: string;
	is_completed: boolean;
	position: number;
	how_explanation: string | null;
	created_at: Date;
	updated_at: Date;
}

export interface UsageTracking {
	id: string;
	user_id: string;
	ai_calls_today: number;
	last_ai_call_date: Date;
	goals_count: number;
	created_at: Date;
	updated_at: Date;
}

// DTOs (Data Transfer Objects) - without sensitive fields
export interface UserDTO {
	id: string;
	email: string;
	tier: UserTier;
	created_at: Date;
	updated_at: Date;
}

export interface ProjectDTO {
	id: string;
	name: string;
	type: ProjectType;
	position: number;
	goal_description: string | null;
	goal_step_count: number;
	created_at: Date;
	updated_at: Date;
}

export interface TaskDTO {
	id: string;
	project_id: string;
	content: string;
	is_completed: boolean;
	position: number;
	how_explanation: string | null;
	created_at: Date;
	updated_at: Date;
}

// Helper to convert User to UserDTO (remove password_hash)
export function userToDTO(user: User): UserDTO {
	const { password_hash, ...userDTO } = user;
	return userDTO;
}

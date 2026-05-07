import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt.
 * @param password - The plain-text password to hash.
 * @returns The bcrypt hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a hashed password.
 * @param password - The plain-text password from user input.
 * @param hash - The hashed password from the database.
 * @returns True if the password matches the hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Checks whether a password string appears to be a bcrypt hash.
 * Used for backward compatibility with legacy plain-text passwords.
 * @param password - The stored password from the database.
 * @returns True if the password is already bcrypt hashed.
 */
export function isHashed(password: string | null | undefined): boolean {
    return typeof password === "string" && password.startsWith("$2");
}

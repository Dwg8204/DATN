// Spaces and non-ASCII letters do not count as the required special character.
export const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^\p{L}\p{N}\s])[\s\S]{8,128}$/u;
export const PASSWORD_REQUIREMENTS = 'Password must contain at least 8 characters, an uppercase letter (A-Z), a lowercase letter (a-z), a number and a special character.';

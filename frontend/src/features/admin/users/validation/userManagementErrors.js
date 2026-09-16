/** Only locally generated business errors may expose their message to the UI. */
export class UserManagementError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserManagementError';
  }
}

export function getUserManagementErrorMessage(error) {
  if (error instanceof UserManagementError) return error.message;
  return 'Unable to save the account on this browser. Check that browser storage is available and try again.';
}

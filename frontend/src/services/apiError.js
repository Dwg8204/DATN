const messagesByCode = {
  INVALID_CREDENTIALS: 'Incorrect email or password. Please try again.',
  EMAIL_ALREADY_EXISTS: 'This email is already registered. Sign in or use a different email.',
  ACCOUNT_BANNED: 'Your account is locked. Please contact support.',
  ACCOUNT_INACTIVE: 'Your account is not active. Please contact support.',
  ACCOUNT_UNAVAILABLE: 'Your account is unavailable. Please sign in again or contact support.',
  PASSWORD_MISMATCH: 'Passwords do not match. Please check the confirmation.',
  CURRENT_PASSWORD_INCORRECT: 'Your current password is incorrect. Please try again.',
  PASSWORD_UNCHANGED: 'Choose a new password different from your current password.',
  OTP_INVALID_OR_EXPIRED: 'The verification code is incorrect or has expired. Try again or request a new code.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many incorrect codes. Please request a new verification code.',
  RESET_TOKEN_REQUIRED: 'Please verify your email code before resetting your password.',
  RESET_TOKEN_INVALID_OR_EXPIRED: 'Your password reset session has expired. Please request a new verification code.',
  EMAIL_SERVICE_DISABLED: 'Email delivery is currently unavailable. Please try again later.',
  EMAIL_DELIVERY_FAILED: 'We could not send the email. Please try again later.',
  INVALID_TOKEN: 'Your session has expired. Please sign in again.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please sign in again.',
  REFRESH_TOKEN_REQUIRED: 'Please sign in to continue.',
  REFRESH_TOKEN_REUSED: 'Your session has ended. Please sign in again.',
};

const messagesByStatus = {
  400: 'Please check the information you entered and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested service or item could not be found. Please refresh the page and try again.',
  405: 'This action is currently unavailable. Please refresh the page and try again.',
  408: 'The request took too long. Please try again.',
  409: 'This information already exists or has changed. Please check it and try again.',
  413: 'The file or content is too large. Please reduce its size and try again.',
  415: 'This file format is not supported. Please choose another file.',
  422: 'Some information is invalid. Please check your entries.',
  429: 'Too many attempts. Please wait a few minutes before trying again.',
  500: 'Something went wrong on our side. Please try again later.',
  502: 'The service is temporarily unavailable. Please try again later.',
  503: 'The service is temporarily unavailable. Please try again later.',
  504: 'The service took too long to respond. Please try again later.',
};

const isTechnicalMessage = value => /Cannot\s+(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|<[^>]+>|(?:Axios|Type|Syntax|QueryFailed)Error|\b(?:SQLSTATE|ECONNREFUSED|ENOTFOUND|ERR_|stack trace|constraint|relation .* does not exist)\b|\bat .+\(.*:\d+/i.test(value);

function safeMessage(value) {
  if (typeof value !== 'string') return undefined;
  const message = value.trim();
  return message && message.length <= 300 && !isTechnicalMessage(message) ? message : undefined;
}

/** Support our API contract, older Nest responses, and network/proxy failures. */
export function normalizeApiError(error, fallback = 'Unable to complete the request. Please try again.') {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const detail = body && typeof body === 'object' ? body.error : undefined;
  const code = (detail && typeof detail === 'object' && detail.code) || error?.code || 'REQUEST_FAILED';
  const base = { status, code, requestId: body?.requestId, fieldErrors: Array.isArray(detail?.fieldErrors) ? detail.fieldErrors : [] };
  if (code === 'ERR_CANCELED') return { ...base, message: '', canceled: true };
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return { ...base, message: 'The request took too long. Please check your connection and try again.' };
  }
  if (!status && (error?.request || code === 'ERR_NETWORK')) {
    return { ...base, message: 'Unable to connect to the server. Please check your connection and try again.' };
  }
  if (messagesByCode[code]) return { ...base, message: messagesByCode[code] };
  // Infrastructure failures may include SQL, HTML, SMTP details or stack traces.
  if (status >= 500) return { ...base, message: messagesByStatus[status] || messagesByStatus[500] };
  if (status === 429) return { ...base, message: messagesByStatus[429] };
  const message = detail?.message ?? body?.message;
  const candidate = Array.isArray(message) ? message[0] : message;
  return { ...base, message: safeMessage(candidate) || messagesByStatus[status] || safeMessage(fallback) || 'Unable to complete the request. Please try again.' };
}

export const getApiError = (error, fallback) => normalizeApiError(error, fallback).message;

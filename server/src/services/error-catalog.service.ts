/**
 * Error Catalog Service
 * Maps error codes to user-friendly messages with resolution steps.
 * Requirement 28.5: WHEN errors occur, THE System SHALL provide helpful error messages
 *                   with resolution steps.
 */

// ─── Error Categories ─────────────────────────────────────────────────────────

export type ErrorCategory =
  | 'AUTH'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'PERMISSION'
  | 'RATE_LIMIT'
  | 'DATABASE'
  | 'NETWORK'
  | 'FILE_UPLOAD'
  | 'SERVER'
  | 'BUSINESS';

// ─── Error Catalog Entry ──────────────────────────────────────────────────────

export interface ErrorCatalogEntry {
  code: string;
  category: ErrorCategory;
  httpStatus: number;
  /** Short technical error string (for logs / API field "error") */
  technicalMessage: string;
  /** Plain-language message shown to end-users */
  userMessage: string;
  /** Ordered list of actionable steps to resolve the error */
  resolutionSteps: string[];
}

// ─── Error Catalog ────────────────────────────────────────────────────────────

export const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {

  // ── Authentication ──────────────────────────────────────────────────────────

  AUTH_NO_TOKEN: {
    code: 'AUTH_NO_TOKEN',
    category: 'AUTH',
    httpStatus: 401,
    technicalMessage: 'No authentication token provided',
    userMessage: 'You need to be logged in to access this page.',
    resolutionSteps: [
      'Click the "Sign In" button to log in with your credentials.',
      'If you were previously logged in, your session may have expired — please sign in again.',
    ],
  },

  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_TOKEN_EXPIRED',
    category: 'AUTH',
    httpStatus: 401,
    technicalMessage: 'JWT token has expired',
    userMessage: 'Your session has expired for security reasons.',
    resolutionSteps: [
      'Sign in again to continue where you left off.',
      'To stay logged in longer, check the "Remember me" option at login.',
    ],
  },

  AUTH_TOKEN_INVALID: {
    code: 'AUTH_TOKEN_INVALID',
    category: 'AUTH',
    httpStatus: 401,
    technicalMessage: 'JWT token is invalid or malformed',
    userMessage: 'Your login session is no longer valid.',
    resolutionSteps: [
      'Sign out and sign back in to get a new session.',
      'If this keeps happening, clear your browser cookies and try again.',
    ],
  },

  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    category: 'AUTH',
    httpStatus: 401,
    technicalMessage: 'Invalid email or password',
    userMessage: 'The email or password you entered is incorrect.',
    resolutionSteps: [
      'Double-check that Caps Lock is not on.',
      'Use the "Forgot Password" link to reset your password.',
      'Make sure you are using the email address you registered with.',
    ],
  },

  AUTH_ACCOUNT_LOCKED: {
    code: 'AUTH_ACCOUNT_LOCKED',
    category: 'AUTH',
    httpStatus: 401,
    technicalMessage: 'Account locked due to repeated failed login attempts',
    userMessage: 'Your account has been temporarily locked after too many failed login attempts.',
    resolutionSteps: [
      'Wait 15 minutes, then try again.',
      'Use the "Forgot Password" link to reset your password and unlock your account.',
      'Contact your system administrator if you need immediate access.',
    ],
  },

  AUTH_MFA_REQUIRED: {
    code: 'AUTH_MFA_REQUIRED',
    category: 'AUTH',
    httpStatus: 401,
    technicalMessage: 'Multi-factor authentication is required',
    userMessage: 'This account requires two-factor authentication.',
    resolutionSteps: [
      'Open your authenticator app and enter the 6-digit code.',
      'If you lost access to your authenticator, contact your administrator for recovery.',
    ],
  },

  // ── Validation ──────────────────────────────────────────────────────────────

  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Request validation failed',
    userMessage: 'Some of the information you entered is not valid.',
    resolutionSteps: [
      'Review the highlighted fields and correct the errors.',
      'Make sure all required fields are filled in.',
      'Check that values are in the correct format (e.g., email addresses, phone numbers, dates).',
    ],
  },

  VALIDATION_REQUIRED_FIELD: {
    code: 'VALIDATION_REQUIRED_FIELD',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Required field is missing',
    userMessage: 'One or more required fields are empty.',
    resolutionSteps: [
      'Fill in all fields marked with an asterisk (*).',
      'Make sure you haven\'t accidentally cleared a field.',
    ],
  },

  VALIDATION_INVALID_EMAIL: {
    code: 'VALIDATION_INVALID_EMAIL',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Invalid email address format',
    userMessage: 'The email address you entered doesn\'t look right.',
    resolutionSteps: [
      'Check for typos — a valid email looks like: name@example.com',
      'Make sure you haven\'t included spaces in the email address.',
    ],
  },

  VALIDATION_INVALID_PHONE: {
    code: 'VALIDATION_INVALID_PHONE',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Invalid phone number format',
    userMessage: 'The phone number you entered is not in a recognised format.',
    resolutionSteps: [
      'Enter a 10-digit mobile number (e.g., 9876543210).',
      'You can also include a country code (e.g., +91 9876543210).',
      'Remove any spaces, dashes, or brackets.',
    ],
  },

  VALIDATION_INVALID_DATE: {
    code: 'VALIDATION_INVALID_DATE',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Invalid date format or value',
    userMessage: 'The date you entered is not valid.',
    resolutionSteps: [
      'Use the date picker to select a date instead of typing it manually.',
      'Ensure the date is in DD/MM/YYYY format if entering manually.',
      'Check that the date actually exists (e.g., not 31st February).',
    ],
  },

  VALIDATION_DUPLICATE: {
    code: 'VALIDATION_DUPLICATE',
    category: 'VALIDATION',
    httpStatus: 409,
    technicalMessage: 'Duplicate value — record already exists',
    userMessage: 'A record with this information already exists.',
    resolutionSteps: [
      'Search for the existing record and update it instead of creating a new one.',
      'Use a different value (e.g., a different email address or SKU code).',
    ],
  },

  VALIDATION_INVALID_AMOUNT: {
    code: 'VALIDATION_INVALID_AMOUNT',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Invalid monetary amount',
    userMessage: 'The amount you entered is not valid.',
    resolutionSteps: [
      'Enter a positive number (e.g., 1500 or 1500.50).',
      'Do not include currency symbols or commas.',
      'The minimum amount must be greater than zero.',
    ],
  },

  VALIDATION_OUT_OF_RANGE: {
    code: 'VALIDATION_OUT_OF_RANGE',
    category: 'VALIDATION',
    httpStatus: 400,
    technicalMessage: 'Value is outside the allowed range',
    userMessage: 'The value you entered is outside the allowed range.',
    resolutionSteps: [
      'Check the minimum and maximum values allowed for this field.',
      'Adjust your input to fall within the specified range.',
    ],
  },

  // ── Not Found ───────────────────────────────────────────────────────────────

  NOT_FOUND_GENERIC: {
    code: 'NOT_FOUND_GENERIC',
    category: 'NOT_FOUND',
    httpStatus: 404,
    technicalMessage: 'Requested resource not found',
    userMessage: 'We couldn\'t find what you were looking for.',
    resolutionSteps: [
      'Check that the link or ID you used is correct.',
      'The item may have been deleted — check the recycle bin or audit log.',
      'Use the search feature to find the item.',
      'Go back to the previous page and try again.',
    ],
  },

  NOT_FOUND_ROUTE: {
    code: 'NOT_FOUND_ROUTE',
    category: 'NOT_FOUND',
    httpStatus: 404,
    technicalMessage: 'API route not found',
    userMessage: 'The page or feature you are trying to reach does not exist.',
    resolutionSteps: [
      'Check the URL for any typos.',
      'Navigate back to the dashboard and try again.',
      'If you followed a link, it may be outdated — contact support.',
    ],
  },

  NOT_FOUND_USER: {
    code: 'NOT_FOUND_USER',
    category: 'NOT_FOUND',
    httpStatus: 404,
    technicalMessage: 'User record not found',
    userMessage: 'This user account could not be found.',
    resolutionSteps: [
      'Confirm the user email address or ID is correct.',
      'The user account may have been deactivated — check with your administrator.',
    ],
  },

  NOT_FOUND_PRODUCT: {
    code: 'NOT_FOUND_PRODUCT',
    category: 'NOT_FOUND',
    httpStatus: 404,
    technicalMessage: 'Product record not found',
    userMessage: 'This product could not be found in the inventory.',
    resolutionSteps: [
      'Verify the product SKU or barcode is correct.',
      'The product may have been archived — search in archived items.',
      'Add the product to inventory if it is a new item.',
    ],
  },

  // ── Permission ──────────────────────────────────────────────────────────────

  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    category: 'PERMISSION',
    httpStatus: 403,
    technicalMessage: 'Access denied — insufficient permissions',
    userMessage: 'You don\'t have permission to perform this action.',
    resolutionSteps: [
      'Contact your administrator to request the necessary access.',
      'Check that you are logged in with the correct account.',
      'If you recently changed roles, sign out and sign back in to refresh your permissions.',
    ],
  },

  PERMISSION_ROLE_REQUIRED: {
    code: 'PERMISSION_ROLE_REQUIRED',
    category: 'PERMISSION',
    httpStatus: 403,
    technicalMessage: 'Insufficient role for this operation',
    userMessage: 'This action requires a higher access level than your current role.',
    resolutionSteps: [
      'Ask your manager or administrator to grant you the required role.',
      'Alternatively, ask someone with the correct role to perform this action on your behalf.',
    ],
  },

  PERMISSION_TENANT_MISMATCH: {
    code: 'PERMISSION_TENANT_MISMATCH',
    category: 'PERMISSION',
    httpStatus: 403,
    technicalMessage: 'Resource belongs to a different tenant',
    userMessage: 'You can only access resources within your own organisation.',
    resolutionSteps: [
      'Make sure you are logged into the correct organisation account.',
      'Contact support if you believe you should have cross-organisation access.',
    ],
  },

  // ── Rate Limiting ───────────────────────────────────────────────────────────

  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    category: 'RATE_LIMIT',
    httpStatus: 429,
    technicalMessage: 'Too many requests — rate limit exceeded',
    userMessage: 'You\'re doing that too quickly. Please slow down.',
    resolutionSteps: [
      'Wait a moment and try again.',
      'If you\'re importing data, try processing smaller batches.',
      'Contact support if you regularly hit this limit — we can increase your quota.',
    ],
  },

  RATE_LIMIT_LOGIN: {
    code: 'RATE_LIMIT_LOGIN',
    category: 'RATE_LIMIT',
    httpStatus: 429,
    technicalMessage: 'Too many login attempts',
    userMessage: 'Too many login attempts from your device. Please try again in a few minutes.',
    resolutionSteps: [
      'Wait 5 minutes before trying again.',
      'Use the "Forgot Password" link if you cannot remember your password.',
      'Contact your IT administrator if you are locked out.',
    ],
  },

  // ── Database ────────────────────────────────────────────────────────────────

  DB_CONNECTION_ERROR: {
    code: 'DB_CONNECTION_ERROR',
    category: 'DATABASE',
    httpStatus: 503,
    technicalMessage: 'Database connection failed',
    userMessage: 'We\'re having trouble connecting to our database right now.',
    resolutionSteps: [
      'Wait a moment and try again — this is usually temporary.',
      'If the problem persists for more than a few minutes, contact your system administrator.',
    ],
  },

  DB_QUERY_ERROR: {
    code: 'DB_QUERY_ERROR',
    category: 'DATABASE',
    httpStatus: 500,
    technicalMessage: 'Database query failed',
    userMessage: 'Something went wrong while retrieving your data.',
    resolutionSteps: [
      'Refresh the page and try again.',
      'If you were saving data, check whether it was saved by navigating to the record.',
      'Contact support with the time and action you were performing if it keeps failing.',
    ],
  },

  DB_CONSTRAINT_VIOLATION: {
    code: 'DB_CONSTRAINT_VIOLATION',
    category: 'DATABASE',
    httpStatus: 409,
    technicalMessage: 'Database constraint violation',
    userMessage: 'This action conflicts with existing data.',
    resolutionSteps: [
      'Check for duplicate entries and remove or update them.',
      'Ensure all related records exist before creating this one.',
      'Review the error details and adjust your input accordingly.',
    ],
  },

  // ── Network ─────────────────────────────────────────────────────────────────

  NETWORK_TIMEOUT: {
    code: 'NETWORK_TIMEOUT',
    category: 'NETWORK',
    httpStatus: 504,
    technicalMessage: 'Request timed out',
    userMessage: 'The request took too long to complete.',
    resolutionSteps: [
      'Check your internet connection and try again.',
      'If you\'re processing a large amount of data, try breaking it into smaller batches.',
      'Contact support if this keeps happening.',
    ],
  },

  NETWORK_SERVICE_UNAVAILABLE: {
    code: 'NETWORK_SERVICE_UNAVAILABLE',
    category: 'NETWORK',
    httpStatus: 503,
    technicalMessage: 'Service temporarily unavailable',
    userMessage: 'This feature is temporarily unavailable. We\'re working on it.',
    resolutionSteps: [
      'Wait a few minutes and try again.',
      'Check the system status page for any ongoing maintenance.',
      'Contact support if the problem continues.',
    ],
  },

  // ── File Upload ─────────────────────────────────────────────────────────────

  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    category: 'FILE_UPLOAD',
    httpStatus: 413,
    technicalMessage: 'Uploaded file exceeds maximum allowed size',
    userMessage: 'The file you\'re trying to upload is too large.',
    resolutionSteps: [
      'Maximum file size is 10 MB. Reduce the file size and try again.',
      'For images, use an image compression tool to reduce the file size.',
      'For documents, try saving as a compressed format (e.g., PDF instead of DOCX).',
    ],
  },

  FILE_INVALID_TYPE: {
    code: 'FILE_INVALID_TYPE',
    category: 'FILE_UPLOAD',
    httpStatus: 415,
    technicalMessage: 'File type not allowed',
    userMessage: 'This file type is not supported.',
    resolutionSteps: [
      'Allowed file types are: JPG, PNG, PDF, XLSX, CSV, DOCX.',
      'Convert your file to a supported format and try again.',
      'Contact support if you need to upload a different file type.',
    ],
  },

  FILE_UPLOAD_FAILED: {
    code: 'FILE_UPLOAD_FAILED',
    category: 'FILE_UPLOAD',
    httpStatus: 500,
    technicalMessage: 'File upload failed',
    userMessage: 'We couldn\'t upload your file. Something went wrong.',
    resolutionSteps: [
      'Check your internet connection and try uploading again.',
      'Make sure the file is not open in another application.',
      'Try refreshing the page and uploading again.',
      'If the problem persists, contact support with the file name and size.',
    ],
  },

  // ── Server / Generic ─────────────────────────────────────────────────────────

  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    category: 'SERVER',
    httpStatus: 500,
    technicalMessage: 'Internal server error',
    userMessage: 'Something unexpected went wrong on our end.',
    resolutionSteps: [
      'Refresh the page and try again.',
      'If you were filling out a form, take note of your data before refreshing.',
      'Contact support if the problem keeps happening, and include the time it occurred.',
    ],
  },

  // ── Business Rules ────────────────────────────────────────────────────────────

  BUSINESS_INSUFFICIENT_STOCK: {
    code: 'BUSINESS_INSUFFICIENT_STOCK',
    category: 'BUSINESS',
    httpStatus: 422,
    technicalMessage: 'Insufficient stock to fulfil order',
    userMessage: 'There isn\'t enough stock available to complete this order.',
    resolutionSteps: [
      'Reduce the quantity to match the available stock.',
      'Create a purchase order to restock the item first.',
      'Check if there is stock available in another warehouse.',
    ],
  },

  BUSINESS_INVOICE_ALREADY_PAID: {
    code: 'BUSINESS_INVOICE_ALREADY_PAID',
    category: 'BUSINESS',
    httpStatus: 409,
    technicalMessage: 'Invoice has already been paid',
    userMessage: 'This invoice has already been marked as paid.',
    resolutionSteps: [
      'Check the payment history to confirm the payment.',
      'If you believe this is an error, contact your accounts team.',
    ],
  },

  BUSINESS_APPROVAL_REQUIRED: {
    code: 'BUSINESS_APPROVAL_REQUIRED',
    category: 'BUSINESS',
    httpStatus: 403,
    technicalMessage: 'Approval workflow required before proceeding',
    userMessage: 'This action requires approval before it can proceed.',
    resolutionSteps: [
      'Submit the record for approval using the "Request Approval" button.',
      'Contact your manager or approver to review the request.',
      'You will be notified once it has been approved.',
    ],
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Look up an error catalog entry by code.
 * Falls back to SERVER_ERROR if the code is unknown.
 */
export function getErrorEntry(code: string): ErrorCatalogEntry {
  return ERROR_CATALOG[code] ?? ERROR_CATALOG['SERVER_ERROR'];
}

/**
 * Build the standard API error response payload.
 */
export function buildErrorResponse(
  code: string,
  overrides?: {
    error?: string;
    userMessage?: string;
    resolutionSteps?: string[];
    fieldErrors?: Array<{ field: string; message: string; expected?: string }>;
  },
): {
  success: false;
  error: string;
  code: string;
  userMessage: string;
  resolutionSteps: string[];
  fieldErrors?: Array<{ field: string; message: string; expected?: string }>;
} {
  const entry = getErrorEntry(code);

  return {
    success: false,
    error: overrides?.error ?? entry.technicalMessage,
    code: entry.code,
    userMessage: overrides?.userMessage ?? entry.userMessage,
    resolutionSteps: overrides?.resolutionSteps ?? entry.resolutionSteps,
    ...(overrides?.fieldErrors ? { fieldErrors: overrides.fieldErrors } : {}),
  };
}

/**
 * Map an HTTP status code to a sensible default error catalog entry.
 */
export function getEntryForHttpStatus(status: number): ErrorCatalogEntry {
  const statusMap: Record<number, string> = {
    400: 'VALIDATION_FAILED',
    401: 'AUTH_TOKEN_INVALID',
    403: 'PERMISSION_DENIED',
    404: 'NOT_FOUND_GENERIC',
    409: 'VALIDATION_DUPLICATE',
    413: 'FILE_TOO_LARGE',
    415: 'FILE_INVALID_TYPE',
    422: 'VALIDATION_FAILED',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'SERVER_ERROR',
    503: 'NETWORK_SERVICE_UNAVAILABLE',
    504: 'NETWORK_TIMEOUT',
  };

  const code = statusMap[status] ?? 'SERVER_ERROR';
  return getErrorEntry(code);
}

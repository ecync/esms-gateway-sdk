/**
 * Error code tables straight from the eSMS API v3.0 document.
 *
 * The document is explicit that the POST-API codes (section 3.1.5) and the
 * GET-API codes (section 3.2.3) are separate tables that do not overlap in
 * meaning, so they are kept as two separate maps rather than merged into
 * one. Looking a code up in the wrong table would give a misleading
 * description.
 */

/** Error codes returned by the POST/JSON endpoints (login, send SMS, check transaction). */
export const POST_ERROR_CODES: Record<string, string> = {
  "100": "Invalid token (token expired)",
  "101": "Invalid request parameters",
  "102": "User account not found or not a valid account",
  "103": "Unable to find a campaign for the specified transaction ID",
  "104": "Transaction ID has already been used",
  "105": "Invalid token signature",
  "106": "Token not found in the header (or not attached as a bearer token)",
  "107": "One or more mandatory parameters in the request are missing or invalid",
  "108": "The account does not have an active mask eligible to send messages",
  "109": "No valid mobile number remained after removing invalid, duplicate, and mask-blocked numbers",
  "110": "Not eligible to consume packaging",
  "111": "Package payments can only be used for campaigns scheduled for this month",
  "112": "The number of messages left in the package is less than the campaign requires",
  "113": "Package maintenance downtime",
  "114": "Not enough wallet balance to run the campaign",
  "115": "Username or password invalid",
  "116": "Account locked",
  "117": "Too many requests",
  "118": "Campaigns cannot be created during the system blackout period (generally 08:00 PM to 08:00 AM, subject to change)",
  "999": "Internal server error"
};

/**
 * Error codes returned by the GET/query-string endpoints (send SMS via
 * URL, check balance).
 */
export const GET_ERROR_CODES: Record<string, string> = {
  "1": "Success",
  "2001": "Error occurred during campaign creation",
  "2002": "Bad request",
  "2003": "Empty number list",
  "2004": "Empty message body",
  "2005": "Invalid number list format",
  "2006": "Not eligible to send messages via GET requests (access not enabled by the admin)",
  "2007": "Invalid key (the esmsqk parameter is invalid)",
  "2008": "Not enough wallet balance, or not enough messages left in the package",
  "2009": "No valid numbers remained after removing mask-blocked numbers",
  "2010": "Not eligible to consume packaging",
  "2011": "Transactional error",
  "2012": "No access to the requested mask",
  "2013": "Campaigns cannot be created during the system blackout period (generally 08:00 PM to 08:00 AM, subject to change)",
  "2020": "Too many requests"
};

/**
 * Looks up a human description for an error code, falling back to a
 * generic message for codes the document does not define (future API
 * additions, for example).
 */
export function describeErrorCode(table: Record<string, string>, code: string): string {
  return table[code] ?? `Unrecognized error code: ${code}`;
}

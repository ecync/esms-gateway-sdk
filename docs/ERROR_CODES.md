# Error codes

Both tables below come straight from the eSMS API v3.0 document. They are two separate tables: a
code from one table has no relationship to the same numeric code in the other, so always check
`error.source` on a caught `EsmsApiError` (it will be `"post"` or `"get"`) before reading the code.

## POST API error codes

Returned by the login endpoint, `sendSms`, and `checkTransactionStatus`.

| Code | Meaning |
|---|---|
| 100 | Invalid token (token expired) |
| 101 | Invalid request parameters |
| 102 | User account not found or not a valid account |
| 103 | Unable to find a campaign for the specified transaction ID |
| 104 | Transaction ID has already been used |
| 105 | Invalid token signature |
| 106 | Token not found in the header (or not attached as a bearer token) |
| 107 | One or more mandatory parameters are missing or invalid |
| 108 | The account does not have an active mask eligible to send messages |
| 109 | No valid mobile number remained after removing invalid, duplicate, and mask-blocked numbers |
| 110 | Not eligible to consume packaging |
| 111 | Package payments can only be used for campaigns scheduled for this month |
| 112 | The number of messages left in the package is less than the campaign requires |
| 113 | Package maintenance downtime |
| 114 | Not enough wallet balance to run the campaign |
| 115 | Username or password invalid |
| 116 | Account locked |
| 117 | Too many requests |
| 118 | Campaigns cannot be created during the system blackout period |
| 999 | Internal server error |

Code 100 is handled specially by `EsmsClient`: it triggers one automatic token refresh and retry
before it would ever reach your code as a thrown error. See the README's token expiry section.

Code 104 is worth calling out separately, since it surprises people on retry logic: it does not mean
your message failed, it means the transaction id was already registered (successful or not).
Retrying a failed send should use a new transaction id, not the same one.

## GET API error codes

Returned by `EsmsUrlClient.sendSms` and `EsmsUrlClient.checkBalance`.

| Code | Meaning |
|---|---|
| 1 | Success |
| 2001 | Error occurred during campaign creation |
| 2002 | Bad request |
| 2003 | Empty number list |
| 2004 | Empty message body |
| 2005 | Invalid number list format |
| 2006 | Not eligible to send messages via GET requests (access not enabled by the admin) |
| 2007 | Invalid key (the `esmsqk` parameter is invalid) |
| 2008 | Not enough wallet balance, or not enough messages left in the package |
| 2009 | No valid numbers remained after removing mask-blocked numbers |
| 2010 | Not eligible to consume packaging |
| 2011 | Transactional error |
| 2012 | No access to the requested mask |
| 2013 | Campaigns cannot be created during the system blackout period |
| 2020 | Too many requests |

`checkBalance` uses the same table for its failure codes, returned as `<code>|0` in the raw
response.

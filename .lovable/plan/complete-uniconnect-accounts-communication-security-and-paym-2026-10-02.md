# Complete UniConnect accounts, communication, security, and payments

## What will be built

1. **Registration roles and profiles**
   - Add Student, Faculty, and Vendor as registration choices.
   - Store the chosen role securely during signup and display it consistently in the account and profile menu.
   - Keep Administrator assignment unavailable during public registration.

2. **Inbox and notifications**
   - Add private conversations and messages between signed-in users.
   - Add a notifications feed with real unread counts.
   - Replace the placeholder header counts and “coming soon” action with working pages and read states.

3. **Real two-factor sign-in**
   - Replace the saved-only switch with authenticator-app enrollment, QR setup, verification, challenge during sign-in, and removal.
   - Keep recovery password flow separate from two-factor verification.

4. **PayFast checkout**
   - Change new orders to pending before payment.
   - Add secure server-side PayFast payment creation and a verified public payment notification endpoint.
   - Add return/cancel pages and update orders only after a verified payment notification.
   - Keep R110 delivery, free pickup, UNI50, and CAMPUS100 for now.

5. **Validation and security**
   - Apply least-privilege access rules for every new table and server operation.
   - Test registration role selection, message unread counts, two-factor enrollment/challenge, and checkout behavior on the running app.
   - Run database and package security checks.

## Required input

Real PayFast charges require a Merchant ID, Merchant Key, passphrase, and sandbox/live choice. The checkout will remain safely disabled or in sandbox until those credentials are supplied through secure project secrets.

## Technical details

- Extend the role enum additively with `faculty`; update the signup trigger to accept only student/faculty/vendor metadata.
- Add conversation, participant, message, and notification tables with row-level access policies and grants.
- Use the authentication provider’s TOTP enrollment and challenge APIs for two-factor authentication.
- Generate and validate PayFast signatures only on the server; never expose merchant secrets in the browser.

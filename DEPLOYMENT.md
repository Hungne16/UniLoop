# UniLoop: Firebase + Vercel

## Current integration

The app uses Firebase Authentication, Firestore snapshots, and Storage uploads.
Login is no longer simulated. Admin requires an admin=true custom claim, not an email check.
Public listing grids start empty when Firestore contains no listings; they never silently fall back to demo data.
Profiles, favorites, listings, offer creation and admin hiding listings use Firestore.

Still pending: transaction acceptance/completion, verified student workflow, report/review persistence, enforceable five-listing quota and orphan-upload cleanup.
The earlier mock profile/admin components remain in source as design references, but are not used for signed-in production data.

## Firebase console setup

Project: uniloop-a2a9b

1. Authentication: Get started, enable Email/Password and Google.
2. Authentication settings: add localhost and the exact production Vercel domain to Authorized domains.
3. Firestore: create a Standard database in production mode. Choose a region appropriate for Vietnam, such as Singapore if offered. Region selection is a persistent infrastructure decision.
4. Storage: create the default bucket. Review any billing upgrade requested by Firebase before proceeding.
5. Authenticate the CLI with your own Google account:

    npx firebase-tools login
    npx firebase-tools deploy --only firestore:rules,storage --project uniloop-a2a9b

Rules intentionally deny unimplemented collections. Do not change them to public read/write.

## Admin account

Create admin123@edu.vn through Authentication > Users with your chosen password.
The old requested demo password is not embedded in the application anymore.
To grant privileges using a trusted machine:

    npm install --no-save firebase-admin

Configure Google Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS outside the repository, then:

    node scripts/grant-admin.mjs admin123@edu.vn

Do not share service-account JSON in chat or put it in frontend environment variables.
Sign out and sign in to refresh claims.

## Vercel

Import this directory as a Vite project, or run:

    npx vercel login
    npx vercel

Build command: npm run build. Output directory: dist.
After preview verification:

    npx vercel --prod

Firebase browser configuration is included in src/firebase.ts; it is not a server credential.
Access control depends on deployed rules and authenticated claims.

## Verification before production

- Register a test user, sign out, log back in, and verify the profile survives refresh.
- Upload one listing with an image; verify it appears on another browser.
- Save a favorite and reload.
- Sign in as a second member and submit an offer; check the owner's profile.
- Ensure a non-admin cannot change listing status or assign admin privileges.
- Verify a wrong password fails and a signed-out browser cannot access private profiles.
- Check the Storage bucket rules and Firestore rules in Firebase console after deployment.

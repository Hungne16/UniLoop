# UniLoop: Firebase + Vercel

## Production status

- Firebase project: `uniloop-a2a9b`
- Vercel domain: `https://uniloop-one.vercel.app`
- Firestore security rules: deployed and covered by emulator tests
- Authentication: Email/Password and Google wired to the real Firebase project
- Admin: `admin123@edu.vn` has a trusted custom claim and an `admins/{uid}` record
- Authorized domains include `uniloop-one.vercel.app`
- Firestore starts empty by design; the UI never inserts fake marketplace statistics

The application implements listings and drafts, favorites, search and filters, offers with a 24-hour expiry, counter-offers, atomic reservation, two-party completion, reviews, reports, student verification requests, moderation, and the five-open-listing quota.

## Image storage

The marketplace works without a paid Storage bucket. Product photos are resized and compressed to WebP in the browser, capped to a safe Firestore document size, and stored with the listing. HTTPS image URLs remain available as an alternative.

Firebase Storage can still be enabled later for full-resolution originals. The current Google account can deploy rules but cannot create the project's default bucket. An owner/billing-enabled account can create it in Firebase Console and then run:

    npx firebase-tools deploy --only storage --project uniloop-a2a9b

Moving existing embedded images to Storage would require a deliberate migration; it is not required for the current release.

## Local verification

    npm install
    npm run build
    npm run test:rules
    npm run dev

The rules tests cover private verification records, transactional five-slot quota, forged admin access, atomic offer acceptance, outsider denial, and review eligibility.

## Trusted production setup

The setup utility uses the already authenticated Firebase CLI session. It does not contain an access token or password:

    $env:UNILOOP_ADMIN_EMAIL='admin123@edu.vn'
    $env:UNILOOP_ADMIN_PASSWORD='<password>'
    node scripts/configure-production.mjs

Do not commit service-account JSON or place admin credentials in frontend environment variables.

## Release order

Push a tested commit to GitHub first. Vercel is connected to the repository and deploys `main`. Verify the live deployment only after the GitHub commit is visible.

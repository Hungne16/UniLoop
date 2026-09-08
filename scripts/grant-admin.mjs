// Run with trusted local Google credentials; never put Admin SDK credentials in Vite.
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
initializeApp({ credential: applicationDefault(), projectId: 'uniloop-a2a9b' })
const email = process.argv[2]
if (!email) throw new Error('Usage: node scripts/grant-admin.mjs admin123@edu.vn')
const user = await getAuth().getUserByEmail(email)
await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, admin: true })
console.log('Admin role assigned. Sign out and sign in again.')

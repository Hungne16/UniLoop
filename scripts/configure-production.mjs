import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getAccessToken } from 'firebase-tools/lib/auth.js'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const projectId='uniloop-a2a9b'
const email=process.env.UNILOOP_ADMIN_EMAIL
const password=process.env.UNILOOP_ADMIN_PASSWORD
if(!email||!password)throw new Error('Thiếu UNILOOP_ADMIN_EMAIL hoặc UNILOOP_ADMIN_PASSWORD.')
const config=JSON.parse(await readFile(join(homedir(),'.config','configstore','firebase-tools.json'),'utf8'))
const refreshed=await getAccessToken(config.tokens.refresh_token,config.tokens.scopes||[])
const accessToken=typeof refreshed==='string'?refreshed:refreshed.access_token
const credential={getAccessToken:async()=>({access_token:accessToken,expires_in:3600})}
initializeApp({credential,projectId})

const firebaseAuth=getAuth()
let user
try{user=await firebaseAuth.getUserByEmail(email)}
catch(e){if(e.code!=='auth/user-not-found')throw e;user=await firebaseAuth.createUser({email,password,emailVerified:true,displayName:'UniLoop Admin'})}
await firebaseAuth.setCustomUserClaims(user.uid,{admin:true})

const headers={authorization:'Bearer '+accessToken,'content-type':'application/json'}
const adminDocument='https://firestore.googleapis.com/v1/projects/'+projectId+'/databases/(default)/documents/admins/'+user.uid
const adminWrite=await fetch(adminDocument,{method:'PATCH',headers,body:JSON.stringify({fields:{email:{stringValue:email},createdAt:{integerValue:String(Date.now())}}})})
if(!adminWrite.ok)throw new Error('Không tạo được vai trò admin: '+adminWrite.status+' '+await adminWrite.text())
const configURL='https://identitytoolkit.googleapis.com/admin/v2/projects/'+projectId+'/config'
const response=await fetch(configURL,{headers})
if(!response.ok)throw new Error('Không đọc được cấu hình Authentication: '+response.status)
const authConfig=await response.json()
const domains=[...new Set([...(authConfig.authorizedDomains||[]),'uniloop-one.vercel.app'])]
const update=await fetch(configURL+'?updateMask=authorizedDomains',{method:'PATCH',headers,body:JSON.stringify({authorizedDomains:domains})})
if(!update.ok)throw new Error('Không cập nhật được authorized domain: '+update.status+' '+await update.text())
const bucketURL='https://firebasestorage.googleapis.com/v1alpha/projects/'+projectId+'/defaultBucket'
const currentBucket=await fetch(bucketURL,{headers})
let storageReady=currentBucket.ok
if(currentBucket.status===404){
 const createBucket=await fetch(bucketURL,{method:'POST',headers,body:JSON.stringify({location:'ASIA-SOUTHEAST1',storageClass:'STANDARD'})})
 storageReady=createBucket.ok
 if(!storageReady)console.warn('Storage chưa thể khởi tạo: '+createBucket.status+' '+await createBucket.text())
}
console.log('Đã cấu hình admin '+email+', authorized domain; Storage: '+(storageReady?'sẵn sàng':'chưa sẵn sàng')+'.')

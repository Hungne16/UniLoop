import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

let env
const now=()=>Date.now()
const member={name:'Sinh viên',university:'VNU',major:'CNTT',cohort:'K68',bio:'',photoURL:'',socialURL:'',updatedAt:now()}
const listing=(ownerId,slot='0',extra={})=>({ownerId,title:'Giáo trình sạch',price:100000,type:'sale',description:'Mô tả thật',condition:'Tốt',category:'Sách & giáo trình',school:'VNU',area:'Cầu Giấy',images:['https://example.com/a.webp'],imagePaths:['listings/'+ownerId+'/a'],status:'active',slot,exchangeTarget:'',defects:'',negotiable:true,createdAt:now(),updatedAt:now(),expiresAt:now()+86400000,chosenOfferId:'',...extra})
const offer=(extra={})=>({buyerId:'buyer',sellerId:'seller',listingId:'l1',title:'Giáo trình sạch',exchangeListingId:'',price:90000,counterPrice:0,message:'Mình muốn mua',status:'pending',buyerConfirmed:false,sellerConfirmed:false,meetingPlace:'',meetingTime:'',createdAt:now(),updatedAt:now(),expiresAt:now()+3600000,...extra})
const db=(uid,claims={})=>env.authenticatedContext(uid,claims).firestore()

before(async()=>{env=await initializeTestEnvironment({projectId:'uniloop-rules-test',firestore:{host:'127.0.0.1',port:8088,rules:readFileSync('firestore.rules','utf8')}})})
beforeEach(async()=>env.clearFirestore())
after(async()=>env.cleanup())

async function seed(){
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'members/seller'),member)
  await setDoc(doc(c.firestore(),'members/buyer'),{...member,name:'Người mua'})
  await setDoc(doc(c.firestore(),'listings/l1'),listing('seller'))
  await setDoc(doc(c.firestore(),'members/seller/slots/0'),{listingId:'l1'})
 })
}
test('public data is readable but verification stays private',async()=>{
 await seed()
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'verifications/seller'),{schoolEmail:'private@vnu.edu.vn',university:'VNU',note:'',status:'pending',response:'',updatedAt:now()}))
 await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'listings/l1')))
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'verifications/seller')))
})
test('listing creation requires the matching quota slot and sixth slot is rejected',async()=>{
 const seller=db('seller')
 const batch=writeBatch(seller),fresh=listing('seller')
 batch.set(doc(seller,'listings/new'),fresh);batch.set(doc(seller,'members/seller/slots/0'),{listingId:'new'})
 await assertSucceeds(batch.commit())
 const bad=writeBatch(seller);bad.set(doc(seller,'listings/six'),listing('seller','5'));bad.set(doc(seller,'members/seller/slots/5'),{listingId:'six'})
 await assertFails(bad.commit())
})
test('outsider cannot forge admin or mutate another listing',async()=>{
 await seed()
 await assertFails(updateDoc(doc(db('outsider'),'listings/l1'),{status:'blocked',updatedAt:now()}))
 await assertFails(setDoc(doc(db('outsider'),'admins/outsider'),{}))
})
test('owner can edit a valid listing with an embedded WebP image',async()=>{
 await seed()
 const owner=db('seller')
 const current=listing('seller','0',{images:['data:image/webp;base64,UklGRg=='],imagePaths:[''],updatedAt:now()})
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'listings/l1'),current))
 await assertSucceeds(updateDoc(doc(owner,'listings/l1'),{title:'Giáo trình đã cập nhật',updatedAt:now()}))
})
test('seller can atomically accept, outsider cannot confirm',async()=>{
 await seed()
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'offers/o1'),offer()))
 const seller=db('seller'),batch=writeBatch(seller)
 batch.update(doc(seller,'offers/o1'),{status:'accepted',price:90000,updatedAt:now()})
 batch.update(doc(seller,'listings/l1'),{status:'reserved',chosenOfferId:'o1'})
 await assertSucceeds(batch.commit())
 await assertFails(updateDoc(doc(db('outsider'),'offers/o1'),{buyerConfirmed:true,status:'accepted',updatedAt:now()}))
})
test('review is allowed only after a completed transaction and only once per party',async()=>{
 await seed()
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'offers/o1'),offer()))
 const review={offerId:'o1',reviewerId:'buyer',revieweeId:'seller',rating:5,text:'Giao dịch tốt',reply:'',createdAt:now(),updatedAt:now()}
 await assertFails(setDoc(doc(db('buyer'),'reviews/o1_buyer'),review))
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'offers/o1'),{status:'completed'}))
 await assertSucceeds(setDoc(doc(db('buyer'),'reviews/o1_buyer'),review))
 await assertFails(setDoc(doc(db('buyer'),'reviews/another-id'),review))
})
test('admin document grants moderation but remains unwritable by client',async()=>{
 await seed()
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'admins/admin'),{email:'admin123@edu.vn'}))
 await assertSucceeds(updateDoc(doc(db('admin'),'listings/l1'),{status:'blocked',updatedAt:now()}))
 await assertFails(setDoc(doc(db('admin'),'admins/other'),{}))
})

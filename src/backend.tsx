import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onIdTokenChanged, type User } from 'firebase/auth'
import { collection, doc, onSnapshot, query, where, setDoc, deleteDoc, getDoc, limit } from 'firebase/firestore'
import { auth, db, errorMessage } from './firebase'
import type { Listing, Member, Notification, Offer, Report, Review, Verification } from './domain'

type Backend = {
 user:User|null;admin:boolean;ready:boolean;restricted:boolean;products:Listing[];ownListings:Listing[];members:Member[];
 saved:string[];offers:Offer[];reviews:Review[];reports:Report[];verification:Verification|null;badges:string[];notifications:Notification[];
 loading:boolean;error:string;toggleSaved:(id:string)=>Promise<void>;reload:()=>void;feedLimit:number;loadMore:()=>void
}
const Context=createContext<Backend>(null!)
export const useBackend=()=>useContext(Context)
export function BackendProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[admin,setAdmin]=useState(false),[ready,setReady]=useState(false),[restricted,setRestricted]=useState(false)
 const [products,setProducts]=useState<Listing[]>([]),[ownListings,setOwnListings]=useState<Listing[]>([]),[members,setMembers]=useState<Member[]>([])
 const [saved,setSaved]=useState<string[]>([]),[offers,setOffers]=useState<Offer[]>([]),[reviews,setReviews]=useState<Review[]>([]),[reports,setReports]=useState<Report[]>([]),[badges,setBadges]=useState<string[]>([]),[notifications,setNotifications]=useState<Notification[]>([])
 const [verification,setVerification]=useState<Verification|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[feedLimit,setFeedLimit]=useState(100)
 useEffect(()=>{
  let generation=0
  const stop=onIdTokenChanged(auth,async u=>{
   const version=++generation
   setUser(u);setAdmin(false);setReady(false)
   try{
    if(u){
     const [token,role]=await Promise.all([u.getIdTokenResult(),getDoc(doc(db,'admins',u.uid))])
     if(version===generation)setAdmin(token.claims.admin===true||role.exists())
    }
   }catch(e){if(version===generation)setError(errorMessage(e))}
   finally{if(version===generation)setReady(true)}
  })
  return ()=>{generation++;stop()}
 },[retry])
 useEffect(()=>{
  setError('');setLoading(true)
  const fail=(e:unknown)=>{setError(errorMessage(e));setLoading(false)}
  const stops=[
   onSnapshot(query(collection(db,'listings'),where('status','in',['active','reserved']),limit(feedLimit)),s=>{setProducts(s.docs.map(d=>({...d.data(),id:d.id}) as Listing).sort((a,b)=>b.createdAt-a.createdAt));setLoading(false)},fail),
   onSnapshot(query(collection(db,'members'),limit(1000)),s=>setMembers(s.docs.map(d=>({...d.data(),id:d.id}) as Member)),fail),
   onSnapshot(query(collection(db,'reviews'),limit(1000)),s=>setReviews(s.docs.map(d=>({...d.data(),id:d.id}) as Review)),fail),
   onSnapshot(collection(db,'studentBadges'),s=>setBadges(s.docs.filter(d=>d.data().verified===true).map(d=>d.id)),fail)
  ]
  return ()=>stops.forEach(stop=>stop())
 },[retry,feedLimit])
 useEffect(()=>{
  setSaved([]);setOffers([]);setOwnListings([]);setReports([]);setVerification(null);setRestricted(false);setNotifications([])
  if(!user)return
  const fail=(e:unknown)=>setError(errorMessage(e))
  let incoming:Offer[]=[],outgoing:Offer[]=[]
  const merge=()=>setOffers([...new Map([...incoming,...outgoing].map(o=>[o.id,o])).values()].sort((a,b)=>b.updatedAt-a.updatedAt))
  let globalNotices:Notification[]=[],personalNotices:Notification[]=[]
  const mergeNotices=()=>setNotifications([...new Map([...globalNotices,...personalNotices].map(n=>[n.id,n])).values()].sort((a,b)=>b.createdAt-a.createdAt))
  const stops=[
   onSnapshot(collection(db,'members',user.uid,'favorites'),s=>setSaved(s.docs.map(d=>d.id)),fail),
   onSnapshot(query(collection(db,'listings'),where('ownerId','==',user.uid)),s=>setOwnListings(s.docs.map(d=>({...d.data(),id:d.id}) as Listing)),fail),
   onSnapshot(query(collection(db,'offers'),where('sellerId','==',user.uid)),s=>{incoming=s.docs.map(d=>({...d.data(),id:d.id}) as Offer);merge()},fail),
   onSnapshot(query(collection(db,'offers'),where('buyerId','==',user.uid)),s=>{outgoing=s.docs.map(d=>({...d.data(),id:d.id}) as Offer);merge()},fail),
   onSnapshot(query(collection(db,'reports'),where('reporterId','==',user.uid)),s=>setReports(s.docs.map(d=>({...d.data(),id:d.id}) as Report)),fail),
   onSnapshot(doc(db,'verifications',user.uid),s=>setVerification(s.exists()?{...s.data(),id:s.id} as Verification:null),fail),
   onSnapshot(doc(db,'moderation',user.uid),s=>setRestricted(s.exists()&&s.data()?.status!=='active'),fail)
   ,onSnapshot(query(collection(db,'notifications'),where('targetType','==','all')),s=>{globalNotices=s.docs.map(d=>({...d.data(),id:d.id}) as Notification);mergeNotices()},fail)
   ,onSnapshot(query(collection(db,'notifications'),where('targetId','==',user.uid)),s=>{personalNotices=s.docs.map(d=>({...d.data(),id:d.id}) as Notification);mergeNotices()},fail)
  ]
  return ()=>stops.forEach(stop=>stop())
 },[user,retry])
 async function toggleSaved(id:string){
  if(!user)throw new Error('Vui lòng đăng nhập để lưu sản phẩm.')
  const target=doc(db,'members',user.uid,'favorites',id)
  if(saved.includes(id))await deleteDoc(target);else await setDoc(target,{createdAt:Date.now()})
 }
 return <Context.Provider value={{user,admin,ready,restricted,products,ownListings,members,saved,offers,reviews,reports,verification,badges,notifications,loading,error,toggleSaved,reload:()=>setRetry(v=>v+1),feedLimit,loadMore:()=>setFeedLimit(v=>v+100)}}>{children}</Context.Provider>
}

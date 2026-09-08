import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onIdTokenChanged, type User } from 'firebase/auth'
import { collection, doc, onSnapshot, query, where, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, errorMessage } from './firebase'
import type { Product } from './data'

type Backend = { user:User|null; admin:boolean; ready:boolean; products:Product[]; saved:number[]; loading:boolean; error:string; toggleSaved:(id:number)=>Promise<void> }
const Context=createContext<Backend>(null!)
export const useBackend=()=>useContext(Context)
export function BackendProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[admin,setAdmin]=useState(false),[ready,setReady]=useState(false)
  const [products,setProducts]=useState<Product[]>([]),[saved,setSaved]=useState<number[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{
    let generation=0
    const stop=onIdTokenChanged(auth,async u=>{
      const version=++generation
      setUser(u);setAdmin(false);setReady(false)
      try {const token=await u?.getIdTokenResult();if(version===generation)setAdmin(token?.claims.admin===true)}
      catch(e){if(version===generation)setError(errorMessage(e))}
      finally{if(version===generation)setReady(true)}
    })
    return ()=>{generation++;stop()}
  },[])
  useEffect(()=>onSnapshot(query(collection(db,'listings'),where('status','==','active')),snapshot=>{
    setProducts(snapshot.docs.map(d=>({...d.data(),documentId:d.id}) as Product));setLoading(false);setError('')
  },e=>{setError(errorMessage(e));setLoading(false)}),[])
  useEffect(()=>{
    setSaved([])
    if(!user)return
    return onSnapshot(collection(db,'members',user.uid,'favorites'),s=>setSaved(s.docs.map(d=>Number(d.id))),e=>setError(errorMessage(e)))
  },[user])
  async function toggleSaved(id:number){
    if(!user)throw new Error('Vui lòng đăng nhập để lưu sản phẩm.')
    const ref=doc(db,'members',user.uid,'favorites',String(id))
    if(saved.includes(id))await deleteDoc(ref)
    else await setDoc(ref,{listingId:id,createdAt:serverTimestamp()})
  }
  return <Context.Provider value={{user,admin,ready,products,saved,loading,error,toggleSaved}}>{children}</Context.Provider>
}

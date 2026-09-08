import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage, errorMessage } from './firebase'
import { useBackend } from './backend'
import { formatPrice, type Product } from './data'

export function LiveCreate({onDone}:{onDone:()=>void}){
  const {user}=useBackend()
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(!user||busy)return
    const form=new FormData(e.currentTarget),files=form.getAll('images') as File[]
    if(!files.length||files.length>5||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>=5*1024*1024)){
      setError('Chọn từ 1 đến 5 ảnh JPG, PNG hoặc WebP, mỗi ảnh dưới 5 MB.');return
    }
    setBusy(true);setError('')
    try{
      const images=await Promise.all(files.map(async file=>{
        const target=ref(storage,'listings/'+user.uid+'/'+crypto.randomUUID())
        await uploadBytes(target,file)
        return getDownloadURL(target)
      }))
      const type=String(form.get('type'))
      await addDoc(collection(db,'listings'),{
        id:Date.now(),ownerId:user.uid,title:String(form.get('title')).trim(),
        price:type==='free'?0:Number(form.get('price')),type,images,image:images[0],
        description:String(form.get('description')),condition:String(form.get('condition')),
        school:String(form.get('school')),area:String(form.get('area')),
        distance:'Chưa xác định',color:'#e6e8dd',status:'active',createdAt:serverTimestamp()
      })
      onDone()
    }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }
  return <main className="container create-page"><form className="wizard" onSubmit={submit}><span className="section-kicker">ĐĂNG TIN</span><h1>Món đồ của bạn</h1>
    <div className="form-grid">
      <label className="full">Tiêu đề<input name="title" required maxLength={150}/></label>
      <label>Hình thức<select name="type"><option value="sale">Bán</option><option value="exchange">Đổi</option><option value="free">Cho miễn phí</option></select></label>
      <label>Giá (đ)<input name="price" type="number" min="0" required defaultValue="0"/></label>
      <label>Tình trạng<select name="condition">{['Mới','Như mới','Tốt','Đã qua sử dụng','Cần sửa chữa'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Trường<input name="school" required defaultValue="VNU"/></label>
      <label className="full">Khu vực công khai (không nhập địa chỉ nhà)<input name="area" required/></label>
      <label className="full">Mô tả và lỗi cần lưu ý<textarea name="description" required maxLength={5000}/></label>
      <label className="full">Ảnh sản phẩm (1–5 ảnh, dưới 5 MB/ảnh)<input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple required/></label>
    </div>{error&&<p role="alert" className="auth-error">{error}</p>}
    <div className="wizard-actions"><button type="submit" disabled={busy}>{busy?'Đang tải ảnh và đăng tin…':'Đăng tin'}</button></div>
  </form></main>
}

export function LiveProfile({onLogout}:{onLogout:()=>void}){
  const {user,products}=useBackend()
  const [profile,setProfile]=useState({name:'',university:'',major:'',cohort:'',bio:''})
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
  const [offers,setOffers]=useState<{id:string;price:number;status:string;message:string}[]>([])
  useEffect(()=>{
    if(!user)return
    const stop=onSnapshot(doc(db,'members',user.uid),s=>{setProfile({name:user.displayName??'',university:'',major:'',cohort:'',bio:'',...s.data()});setLoading(false)},e=>{setError(errorMessage(e));setLoading(false)})
    const stopOffers=onSnapshot(query(collection(db,'offers'),where('sellerId','==',user.uid)),s=>setOffers(s.docs.map(d=>({id:d.id,...d.data()}) as typeof offers[number])),e=>setError(errorMessage(e)))
    return ()=>{stop();stopOffers()}
  },[user])
  async function save(e:React.FormEvent){e.preventDefault();if(!user)return;setBusy(true);setNotice('');try{await setDoc(doc(db,'members',user.uid),{...profile,updatedAt:serverTimestamp()});setNotice('Đã lưu hồ sơ.')}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
  if(loading)return <main className="container saved-page" role="status">Đang tải hồ sơ…</main>
  return <main className="container saved-page"><div className="section-heading"><div><span className="section-kicker">HỒ SƠ THÀNH VIÊN</span><h1>{profile.name||'Thành viên mới'}</h1></div><button onClick={onLogout}>Đăng xuất</button></div>
    <p>Chưa đủ dữ liệu để tính điểm uy tín · {user?.emailVerified?'Email tài khoản đã xác minh':'Email tài khoản chưa xác minh'}</p>
    <form className="wizard" onSubmit={save}><div className="form-grid">{Object.entries({name:'Họ tên',university:'Trường',major:'Ngành',cohort:'Khóa',bio:'Giới thiệu'}).map(([key,label])=><label key={key}>{label}<input required={key==='name'} maxLength={key==='name'?100:500} value={profile[key as keyof typeof profile]} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}/></label>)}</div><div className="wizard-actions"><button disabled={busy}>{busy?'Đang lưu…':'Lưu hồ sơ'}</button></div></form>
    {error&&<p role="alert" className="auth-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <h2>Tin đang đăng của bạn</h2>{products.filter(p=>p.ownerId===user?.uid).map(p=><p key={p.documentId}>{p.title} · {formatPrice(p.price)}</p>)}
    <h2>Đề nghị đã nhận</h2>{offers.length?offers.map(o=><p key={o.id}>{formatPrice(o.price)} · {o.status} · {o.message}</p>):<p>Chưa có đề nghị nào.</p>}
  </main>
}

export function LiveAdmin({onLogout}:{onLogout:()=>void}){
  const {admin}=useBackend()
  const [list,setList]=useState<Product[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('')
  useEffect(()=>{
    if(!admin)return
    return onSnapshot(collection(db,'listings'),s=>setList(s.docs.map(d=>({...d.data(),documentId:d.id}) as Product)),e=>setError(errorMessage(e)))
  },[admin])
  async function hide(id:string){setBusy(id);try{await updateDoc(doc(db,'listings',id),{status:'hidden'})}catch(e){setError(errorMessage(e))}finally{setBusy('')}}
  if(!admin)return <p role="alert">Bạn không có quyền quản trị.</p>
  return <main className="container saved-page"><div className="section-heading"><h1>Quản trị UniLoop</h1><button onClick={onLogout}>Đăng xuất</button></div><p>{list.length} tin đăng trong Firestore</p>{error&&<p role="alert">{error}</p>}<section className="admin-table"><table><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Thao tác</th></tr></thead><tbody>{list.map(p=><tr key={p.documentId}><td>{p.title}</td><td>{formatPrice(p.price)}</td><td><button disabled={busy===p.documentId} onClick={()=>hide(p.documentId!)}>Ẩn tin</button></td></tr>)}</tbody></table>{!list.length&&<p>Chưa có tin đăng.</p>}</section></main>
}

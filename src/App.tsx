import { useEffect, useMemo, useState, useRef } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleUserRound, Clock3, Eye, EyeOff, Filter, GraduationCap, Heart, Home,
  LockKeyhole, Mail, MapPin, Menu, MessageCircle, MoreHorizontal,
  Pencil, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star,
  Tag, UserRound, X, Zap, BookOpen, Laptop, Shirt, Armchair, PenTool, Trophy, ArrowUpRight, Recycle
} from 'lucide-react'
import { categories, formatPrice, products, type Product } from './data'

import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useBackend } from './backend'
import { auth, db, errorMessage } from './firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { LiveCreate, LiveProfile, LiveAdmin } from './LivePages'
gsap.registerPlugin(useGSAP)

type Page = 'home' | 'explore' | 'detail' | 'create' | 'saved' | 'login' | 'register' | 'profile' | 'admin'

const Logo = () => (
  <button className="logo" aria-label="UniLoop - Trang chủ">
    <span className="brand-crop"><img src="/uniloop-brand.png" alt="UniLoop"/></span>
  </button>
)

function Header({ page, navigate, search, setSearch }: {
  page: Page; navigate: (page: Page) => void; search: string; setSearch: (value: string) => void
}) {
  const [menu, setMenu] = useState(false)
  return <header className="app-header">
    <div className="header-inner">
      <div onClick={() => navigate('home')}><Logo /></div>
      <nav className="desktop-nav">
        <button className={page === 'explore' ? 'active' : ''} onClick={() => navigate('explore')}>Khám phá</button>
        <button onClick={()=>navigate('login')}>Đăng nhập</button><button onClick={()=>navigate('register')}>Đăng ký</button>
      </nav>
      <div className="header-search">
        <Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && navigate('explore')} placeholder="Tìm món đồ bạn cần..." />
      </div>
      <button className="school-pill"><MapPin size={15} /> VNU <ChevronDown size={14} /></button>
      <div className="header-actions">
        <button className="icon-btn" onClick={() => navigate('saved')}><Heart size={20}/></button>
        <button className="icon-btn notification"><Bell size={20}/><i /></button>
        <button className="avatar-btn" onClick={() => navigate('profile')}>MN</button>
        <button className="post-btn" onClick={() => navigate('create')}><Plus size={18}/> Đăng tin</button>
      </div>
      <button className="mobile-menu" onClick={() => setMenu(!menu)}><Menu /></button>
    </div>
    {menu && <div className="mobile-menu-panel"><button onClick={() => navigate('explore')}>Khám phá</button><button onClick={()=>navigate('login')}>Đăng nhập</button><button onClick={()=>navigate('register')}>Đăng ký</button></div>}
  </header>
}

function ProductCard({ product, saved, toggleSaved, open }: { product: Product; saved: boolean; toggleSaved: (id: number) => void; open: (p: Product) => void }) {
  return <article className="product-card" onClick={() => open(product)}>
    <div className="product-image" style={{backgroundColor: product.color}}>
      <img src={product.image} alt={product.title} />
      <button className={`heart-btn ${saved ? 'saved' : ''}`} onClick={e => {e.stopPropagation(); toggleSaved(product.id)}} aria-label="Lưu sản phẩm"><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      {product.tag && <span className={`image-tag ${product.type}`}>{product.tag}</span>}
    </div>
    <div className="product-body">
      <div className="product-title">{product.title}</div>
      <div className={`product-price ${product.price === 0 ? 'free' : ''}`}>{formatPrice(product.price)}</div>
      <div className="product-meta"><span>{product.condition}</span><i /><span>{product.school}</span></div>
      <div className="product-location"><MapPin size={14}/>{product.distance} · {product.area}{product.verified && <ShieldCheck size={15} className="verified"/>}</div>
    </div>
  </article>
}

function Hero({ navigate, search, setSearch }: {navigate: (p: Page) => void; search: string; setSearch: (s:string)=>void}) {
  return <section className="hero container">
    <div className="hero-copy">
      <div className="eyebrow"><Sparkles size={16}/> Marketplace dành cho cộng đồng đại học</div>
      <h1>Đồ cũ.<br/><em>Chuyện mới.</em></h1>
      <p>Mua, bán, đổi và cho đồ với những người quanh campus. Giá rõ ràng, người thật, giao dịch gần.</p>
      <div className="hero-search"><Search size={22}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&navigate('explore')} placeholder="Bạn đang tìm gì quanh VNU?"/><button onClick={()=>navigate('explore')}>Tìm kiếm</button></div>
      <div className="quick-search"><span>Đang được tìm:</span>{['Giáo trình','MacBook','Đèn bàn'].map(term=><button key={term} onClick={()=>{setSearch(term);navigate('explore')}}>{term} <ArrowUpRight size={12}/></button>)}</div>
    </div>
    <div className="hero-visual" aria-label="Cộng đồng sinh viên trao đổi đồ">
      <div className="board-caption"><span>THE CAMPUS EDIT</span><span>VNU / 01</span></div>
      <button className="editorial-item item-large" onClick={()=>navigate('explore')}><img src={products[0].image} alt="Laptop dành cho học kỳ mới"/><span><small>CHO HỌC KỲ MỚI</small><b>Công nghệ vừa túi tiền <ArrowUpRight/></b></span></button>
      <button className="editorial-item item-small" onClick={()=>{setSearch('Giáo trình');navigate('explore')}}><img src={products[1].image} alt="Sách được trao lại"/><span><small>ĐỌC TIẾP, DÙNG TIẾP</small><b>Tủ sách khóa trước <ArrowUpRight/></b></span></button>
      <div className="loop-stamp"><Recycle size={30}/><span>ĐỒ CŨ · GIÁ TRỊ MỚI</span></div>
    </div>
  </section>
}

function HomePage({ navigate, saved, toggleSaved, open, search, setSearch }: any) {
  const {products}=useBackend()
  return <>
    <Hero navigate={navigate} search={search} setSearch={setSearch}/>
    <main className="container home-content">
      <section className="category-section">
        <div className="section-heading"><div><span className="section-kicker">DANH MỤC</span><h2>Bạn đang cần gì?</h2></div><button onClick={()=>navigate('explore')}>Xem tất cả <ArrowRight size={17}/></button></div>
        <div className="category-grid">{categories.map((c,index)=>{const Icon=[BookOpen,Laptop,Shirt,Armchair,PenTool,Trophy][index];return <button key={c.name} className="category-card" onClick={()=>navigate('explore')}><span className="category-icon"><Icon size={24}/></span><span><b>{c.short}</b><small>{c.count} tin đăng</small></span><ChevronRight size={17}/></button>})}</div>
      </section>
      <ProductSection title="Mới đăng gần bạn" kicker="QUANH CAMPUS" icon={<Zap size={17}/>} products={products.slice(0,4)} {...{saved,toggleSaved,open,navigate}} />
      <section className="campus-banner">
        <div><span className="banner-label"><GraduationCap size={17}/> VNU MARKETPLACE</span><h2>Cùng trường, gần hơn,<br/>an tâm hơn.</h2><p>Khám phá 342 món đồ đang được đăng bởi cộng đồng VNU.</p><button onClick={()=>navigate('explore')}>Khám phá VNU <ArrowRight size={18}/></button></div>
        <div className="campus-stats"><div><b>1.2k</b><span>thành viên</span></div><div><b>342</b><span>tin đang mở</span></div><div><b>96%</b><span>hoàn tất</span></div></div>
      </section>
      <ProductSection title="Hợp túi tiền sinh viên" kicker="DƯỚI 500K" products={products.filter(p=>p.price<=500000).slice(0,4)} {...{saved,toggleSaved,open,navigate}} />
    </main>
  </>
}

function ProductSection({title,kicker,icon,products: list,saved,toggleSaved,open,navigate}: any) {
  return <section className="product-section"><div className="section-heading"><div><span className="section-kicker">{icon}{kicker}</span><h2>{title}</h2></div><button onClick={()=>navigate('explore')}>Xem tất cả <ArrowRight size={17}/></button></div><div className="product-grid">{!list.length&&<EmptyState title="Chưa có sản phẩm" text="Hãy là người đăng món đồ đầu tiên."/>}{list.map((p:Product)=><ProductCard key={p.id} product={p} saved={saved.includes(p.id)} toggleSaved={toggleSaved} open={open}/>)}</div></section>
}

function ExplorePage({ search, setSearch, saved, toggleSaved, open }: any) {
  const {products}=useBackend()
  const [type, setType] = useState('all')
  const [verified, setVerified] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(false)
  const filtered = useMemo(()=>products.filter(p=>(type==='all'||p.type===type)&&(!verified||p.verified)&&(p.title.toLowerCase().includes(search.toLowerCase())||!search)),[type,verified,search])
  const filters = <div className="filters"><div className="filter-head"><h3>Bộ lọc</h3><button onClick={()=>{setType('all');setVerified(false);setSearch('')}}>Đặt lại</button></div><div className="filter-group"><label>Hình thức</label>{[['all','Tất cả'],['sale','Đang bán'],['exchange','Có thể đổi'],['free','Miễn phí']].map(([v,l])=><button key={v} className={type===v?'selected':''} onClick={()=>setType(v)}><span className="radio"/>{l}</button>)}</div><div className="filter-group"><label>Khoảng giá</label><div className="price-inputs"><input placeholder="Từ"/><span>—</span><input placeholder="Đến"/></div></div><div className="filter-group"><label>Tình trạng</label>{['Mới','Như mới','Tốt','Đã qua sử dụng'].map(x=><button key={x}><span className="check"/>{x}</button>)}</div><div className="filter-group"><label>Khoảng cách</label><select><option>Dưới 5 km</option><option>Dưới 1 km</option><option>Dưới 10 km</option></select></div><label className="toggle-row">Chỉ sinh viên xác minh<input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/><span className="toggle"/></label></div>
  return <main className="explore-page container"><div className="explore-top"><div><span className="section-kicker">VNU MARKETPLACE</span><h1>Khám phá quanh bạn</h1><p>Tìm thấy những món đồ phù hợp, ngay trong cộng đồng của mình.</p></div><div className="explore-search"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm kiếm sản phẩm..."/></div></div><div className="mobile-filter-row"><button onClick={()=>setMobileFilters(true)}><Filter size={17}/> Bộ lọc</button><button><SlidersHorizontal size={17}/> Mới nhất</button></div><div className="explore-layout"><aside>{filters}</aside><section className="results"><div className="results-bar"><div><b>{filtered.length} sản phẩm</b><span> quanh VNU</span></div><select><option>Mới nhất</option><option>Giá thấp → cao</option><option>Gần nhất</option><option>Phổ biến</option></select></div>{filtered.length?<div className="product-grid explore-grid">{filtered.map(p=><ProductCard key={p.id} product={p} saved={saved.includes(p.id)} toggleSaved={toggleSaved} open={open}/>)}</div>:<EmptyState title="Không tìm thấy sản phẩm" text="Thử thay đổi từ khóa hoặc đặt lại bộ lọc."/>}</section></div>{mobileFilters&&<div className="modal-backdrop"><div className="filter-modal"><button className="close" onClick={()=>setMobileFilters(false)}><X/></button>{filters}<button className="apply" onClick={()=>setMobileFilters(false)}>Xem {filtered.length} sản phẩm</button></div></div>}</main>
}

function DetailPage({ product, saved, toggleSaved, navigate }: {product:Product;saved:boolean;toggleSaved:(id:number)=>void;navigate:(p:Page)=>void}) {
  const [offerError,setOfferError]=useState(''),[sending,setSending]=useState(false)
  const [message,setMessage]=useState('')
  async function sendOffer(){
    if(!auth.currentUser){navigate('login');return}
    if(!product.documentId||!product.ownerId){setOfferError('Sản phẩm chưa có dữ liệu giao dịch.');return}
    setSending(true)
    try{await addDoc(collection(db,'offers'),{listingId:product.documentId,buyerId:auth.currentUser.uid,sellerId:product.ownerId,price:Number(amount),message,status:'pending',createdAt:serverTimestamp()});setSuccess(true)}catch(e){setOfferError(errorMessage(e))}finally{setSending(false)}
  }
  const [offer, setOffer] = useState(false); const [success,setSuccess]=useState(false); const [amount,setAmount]=useState(Math.round(product.price*.9).toString())
  return <main className="detail-page container"><button className="back-link" onClick={()=>navigate('explore')}><ArrowLeft size={17}/> Quay lại khám phá</button><div className="breadcrumbs">Khám phá <ChevronRight size={13}/> Điện tử <ChevronRight size={13}/> {product.title}</div><div className="detail-grid"><div className="gallery"><div className="main-image"><img src={product.image} alt={product.title}/>{product.tag&&<span className={`image-tag ${product.type}`}>{product.tag}</span>}</div><div className="thumbs">{[1,2,3].map((x)=><button key={x} className={x===1?'active':''}><img src={product.image} alt=""/></button>)}<button className="more">+2</button></div></div><div className="detail-info"><div className="detail-labels"><span>{product.condition}</span>{product.negotiable&&<span><Tag size={13}/> Có thương lượng</span>}</div><h1>{product.title}</h1><div className={`detail-price ${product.price===0?'free':''}`}>{formatPrice(product.price)}</div>{product.oldPrice&&<div className="old-price">Giá mua mới: <s>{formatPrice(product.oldPrice)}</s></div>}<div className="location-box"><MapPin size={20}/><div><b>{product.school} · {product.area}</b><span>Cách bạn khoảng {product.distance} · Vị trí ước lượng</span></div></div><div className="detail-actions"><button className="save-large" onClick={()=>toggleSaved(product.id)}><Heart size={20} fill={saved?'currentColor':'none'}/>{saved?'Đã lưu':'Lưu'}</button><button className="offer-large" onClick={()=>setOffer(true)}>{product.type==='free'?'Xin nhận':product.type==='exchange'?'Đề nghị đổi':'Gửi offer'}<ArrowRight size={19}/></button></div><div className="safe-note"><ShieldCheck size={20}/><div><b>Giao dịch an toàn</b><span>Kiểm tra sản phẩm và người nhận trước khi thanh toán.</span></div></div></div></div><div className="detail-lower"><section><span className="section-kicker">CHI TIẾT SẢN PHẨM</span><h2>Mô tả</h2><p>{product.description}</p><div className="notice"><span>!</span><div><b>Tình trạng cần lưu ý</b><p>Sản phẩm đã qua sử dụng. Hãy kiểm tra trực tiếp trước khi giao dịch.</p></div></div><div className="specs"><div><span>Tình trạng</span><b>{product.condition}</b></div><div><span>Đăng lúc</span><b>2 ngày trước</b></div><div><span>Lượt quan tâm</span><b>18 người</b></div></div></section><aside className="seller-card"><div className="seller-top"><div className="seller-avatar">NA</div><div><h3>Nguyễn Văn An <ShieldCheck size={16}/></h3><span>VNU · K68 · CNTT</span></div></div><div className="trust-score"><div><small>UY TÍN</small><b>93<span>/100</span></b></div><div className="trust-bars"><i/><i/><i/><i/><i/></div></div><div className="seller-metrics"><span><b><Star size={15} fill="currentColor"/>4.9</b>Đánh giá</span><span><b>12</b>Giao dịch</span><span><b>96%</b>Hoàn tất</span></div><button>Xem hồ sơ thành viên <ArrowRight size={16}/></button></aside></div>{offer&&<div className="modal-backdrop"><div className="offer-modal"><button className="close" onClick={()=>setOffer(false)}><X/></button>{success?<div className="offer-success"><CheckCircle2 size={54}/><h2>Đã gửi đề nghị!</h2><p>An sẽ có 24 giờ để phản hồi offer của bạn.</p><button onClick={()=>{setOffer(false);setSuccess(false)}}>Xong</button></div>:<><span className="section-kicker">GIAO DỊCH AN TOÀN</span><h2>{product.type==='free'?'Gửi lời nhắn':'Gửi đề nghị'}</h2><div className="offer-product"><img src={product.image}/><div><b>{product.title}</b><span>{formatPrice(product.price)}</span></div></div>{product.price>0&&<label>Giá bạn đề nghị<div className="amount-input"><input value={Number(amount).toLocaleString('vi-VN')} onChange={e=>setAmount(e.target.value.replace(/\D/g,''))}/><span>đ</span></div><small>Giá hiện tại: {formatPrice(product.price)}</small></label>}<label>Lời nhắn<textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Chào bạn, mình quan tâm tới món đồ này..."/></label><div className="expiry"><Clock3 size={16}/> Đề nghị tự hết hạn sau 24 giờ</div>{offerError&&<p role="alert">{offerError}</p>}<button disabled={sending} className="submit-offer" onClick={sendOffer}>Gửi đề nghị <ArrowRight size={18}/></button></>}</div></div>}</main>
}

function CreatePage({ navigate }: {navigate:(p:Page)=>void}) {
  const [step,setStep]=useState(1); const [type,setType]=useState('sale'); const [done,setDone]=useState(false)
  if(done) return <main className="create-page container"><div className="publish-success"><div className="success-ring"><Check size={38}/></div><span className="section-kicker">ĐÃ XUẤT BẢN</span><h1>Tin của bạn đã lên sóng!</h1><p>Cộng đồng VNU đã có thể nhìn thấy món đồ này.</p><div><button className="secondary" onClick={()=>navigate('home')}>Về trang chủ</button><button onClick={()=>navigate('explore')}>Xem bài đăng <ArrowRight size={18}/></button></div></div></main>
  return <main className="create-page container"><div className="create-header"><button onClick={()=>navigate('home')}><X/></button><div><span>ĐĂNG SẢN PHẨM</span><b>Bước {step} / 4</b></div><button className="save-draft">Lưu nháp</button></div><div className="progress"><i style={{width:`${step*25}%`}}/></div><div className="wizard">{step===1&&<><span className="section-kicker">BƯỚC 01</span><h1>Bạn muốn làm gì?</h1><p>Chọn hình thức phù hợp nhất với món đồ của bạn.</p><div className="type-options">{[{id:'sale',icon:'💰',name:'Bán đồ',desc:'Đặt giá và nhận đề nghị'},{id:'exchange',icon:'🔄',name:'Đổi đồ',desc:'Đổi lấy một món đồ khác'},{id:'free',icon:'♻️',name:'Cho miễn phí',desc:'Trao lại cho người cần'}].map(x=><button key={x.id} className={type===x.id?'selected':''} onClick={()=>setType(x.id)}><span>{x.icon}</span><div><b>{x.name}</b><small>{x.desc}</small></div><i>{type===x.id&&<Check size={16}/>}</i></button>)}</div></>}{step===2&&<><span className="section-kicker">BƯỚC 02</span><h1>Món đồ của bạn</h1><p>Thông tin rõ ràng giúp giao dịch nhanh hơn.</p><div className="form-grid"><label className="full">Tên sản phẩm<input placeholder="Ví dụ: MacBook Air M1 2020"/></label><label>Danh mục<select><option>Chọn danh mục</option><option>Điện tử</option><option>Sách & giáo trình</option></select></label><label>Tình trạng<select><option>Chọn tình trạng</option><option>Như mới</option><option>Tốt</option></select></label><label className="full">Ảnh sản phẩm<div className="upload-row"><button><Plus/><span>Thêm ảnh</span></button>{[1,2,3,4].map(x=><i key={x}/>)}</div><small>Tối đa 5 ảnh · Ảnh đầu tiên là ảnh bìa</small></label><label className="full">Mô tả<textarea placeholder="Mô tả tình trạng, thời gian sử dụng và các điểm cần lưu ý..."/></label></div></>}{step===3&&<><span className="section-kicker">BƯỚC 03</span><h1>{type==='free'?'Xác nhận cho miễn phí':'Giá và thương lượng'}</h1><p>Giá rõ ràng giúp mọi người tiết kiệm thời gian.</p><div className="form-grid">{type!=='free'&&<><label className="full">Giá bán<div className="money-input"><input placeholder="0"/><span>đ</span></div></label><label className="full check-label"><input type="checkbox"/> Cho phép thương lượng</label></>}<label className="full">Trường<select><option>VNU — Đại học Quốc gia Hà Nội</option></select></label><label className="full">Khu vực<input placeholder="Ví dụ: Cầu Giấy, KTX Mễ Trì..."/></label></div></>}{step===4&&<><span className="section-kicker">BƯỚC 04</span><h1>Kiểm tra trước khi đăng</h1><p>Bạn vẫn có thể chỉnh sửa sau khi xuất bản.</p><div className="preview-card"><div className="preview-image"><Plus/></div><div><span className="preview-badge">{type==='free'?'MIỄN PHÍ':type==='exchange'?'TRAO ĐỔI':'ĐANG BÁN'}</span><h2>Tên sản phẩm của bạn</h2><b>{type==='free'?'Miễn phí':'0đ'}</b><span><MapPin size={15}/> VNU · Khu vực của bạn</span></div></div></>}<div className="wizard-actions"><button className="secondary" disabled={step===1} onClick={()=>setStep(step-1)}><ArrowLeft size={18}/> Quay lại</button><button onClick={()=>step<4?setStep(step+1):setDone(true)}>{step===4?'Đăng tin':'Tiếp tục'} <ArrowRight size={18}/></button></div></div></main>
}

function EmptyState({title,text}:{title:string;text:string}) {return <div className="empty-state"><div><Search/></div><h2>{title}</h2><p>{text}</p></div>}

function AuthPage({ mode, navigate }: {mode:'login'|'register';navigate:(p:Page)=>void}) {
  const isLogin=mode==='login'; const [showPassword,setShowPassword]=useState(false); const [submitted,setSubmitted]=useState(false); const [student,setStudent]=useState(true)
  const authRoot=useRef<HTMLElement>(null)
  const [error,setError]=useState('')
  useGSAP(()=>{
    const mm=gsap.matchMedia()
    mm.add({desktop:'(min-width: 901px)',reduce:'(prefers-reduced-motion: reduce)'},ctx=>{
      const desktop=ctx.conditions?.desktop
      gsap.timeline({defaults:{duration:ctx.conditions?.reduce?0:0.8,ease:'power3.inOut'}})
        .fromTo('.auth-brand-panel',{xPercent:desktop&&isLogin?100:0},{xPercent:desktop&&!isLogin?100:0},0)
        .fromTo('.auth-form-panel',{xPercent:desktop&&isLogin?-100:0},{xPercent:desktop&&!isLogin?-100:0},0)
    })
    return ()=>mm.revert()
  },{scope:authRoot,dependencies:[isLogin],revertOnUpdate:true})
  const complete=async()=>{const token=await auth.currentUser?.getIdTokenResult(true);navigate(token?.claims.admin===true?'admin':'profile')}
  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(submitted)return
    const data=new FormData(e.currentTarget)
    setError('');setSubmitted(true)
    try{
      const email=String(data.get('email')).trim(),password=String(data.get('password'))
      if(isLogin)await signInWithEmailAndPassword(auth,email,password)
      else {
        const result=await createUserWithEmailAndPassword(auth,email,password)
        const name=String(data.get('name')).trim()
        await updateProfile(result.user,{displayName:name})
        await setDoc(doc(db,'members',result.user.uid),{name,university:'',major:'',cohort:'',bio:'',updatedAt:serverTimestamp()})
      }
      await complete()
    }catch(e){setError(errorMessage(e))}finally{setSubmitted(false)}
  }
  const googleLogin=async()=>{setSubmitted(true);setError('');try{await signInWithPopup(auth,new GoogleAuthProvider());await complete()}catch(e){setError(errorMessage(e))}finally{setSubmitted(false)}}
  const resetPassword=async()=>{
    const email=authRoot.current?.querySelector<HTMLInputElement>('input[name="email"]')?.value
    if(!email){setError('Nhập email tài khoản trước khi đặt lại mật khẩu.');return}
    try{await sendPasswordResetEmail(auth,email);setError('Nếu tài khoản tồn tại, email đặt lại mật khẩu sẽ được gửi.')}catch(e){setError(errorMessage(e))}
  }
  return <main ref={authRoot} className="auth-page">
    <section className="auth-brand-panel">
      <div onClick={()=>navigate('home')}><Logo/></div>
      <div className="auth-message"><span className="auth-overline">CAMPUS MARKETPLACE</span><h1>{isLogin?'Chào mừng bạn quay lại vòng lặp.':'Bắt đầu một vòng đời mới cho đồ cũ.'}</h1><p>Mua, bán, đổi và cho đồ với cộng đồng sinh viên quanh bạn — minh bạch và gần gũi.</p></div>
      <div className="auth-people"><div className="avatar-stack"><span>LA</span><span>MT</span><span>HN</span><span>+1k</span></div><p><b>1.248 sinh viên</b><br/>đã tham gia cộng đồng VNU</p></div>
      <div className="auth-shape shape-one">♻</div><div className="auth-shape shape-two">↗</div>
    </section>
    <section className="auth-form-panel">
      <div className="auth-mobile-logo" onClick={()=>navigate('home')}><Logo/></div>
      <div className="auth-form-wrap">
        <span className="section-kicker">{isLogin?'RẤT VUI ĐƯỢC GẶP LẠI':'TẠO TÀI KHOẢN MIỄN PHÍ'}</span>
        <h2>{isLogin?'Đăng nhập':'Tham gia UniLoop'}</h2>
        <p>{isLogin?'Tiếp tục khám phá những món đồ quanh campus.':'Chỉ mất một phút để bắt đầu mua bán trong cộng đồng.'}</p>
        <button disabled={submitted} onClick={googleLogin} className="google-button"><span className="google-g">G</span> Tiếp tục với Google</button>
        <div className="auth-divider"><span>hoặc dùng email</span></div>
        <form onSubmit={submit}>{error&&<p role="alert" className="auth-error">{error}</p>}
          {!isLogin&&<label>Họ và tên<div className="auth-input"><UserRound/><input name="name" required placeholder="Nguyễn Minh Anh"/></div></label>}
          <label>Email<div className="auth-input"><Mail/><input name="email" autoComplete="email" required type="email" placeholder="ban@email.com"/></div></label>
          <label>Mật khẩu<div className="auth-input"><LockKeyhole/><input name="password" required minLength={6} type={showPassword?'text':'password'} placeholder={isLogin?'Nhập mật khẩu':'Tối thiểu 6 ký tự'}/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
          {!isLogin&&<label className="student-choice"><input type="checkbox" checked={student} onChange={e=>setStudent(e.target.checked)}/><span><b>Tôi là sinh viên</b><small>Bạn có thể xác minh email trường sau.</small></span></label>}
          {isLogin&&<div className="auth-options"><label><input type="checkbox"/> Ghi nhớ tôi</label><button type="button" onClick={resetPassword}>Quên mật khẩu?</button></div>}
          <button className={`auth-submit ${submitted?'loading':''}`} disabled={submitted} type="submit">{submitted?<><span className="spinner"/> Đang xử lý...</>:<>{isLogin?'Đăng nhập':'Tạo tài khoản'} <ArrowRight/></>}</button>
        </form>
        {!isLogin&&<p className="auth-terms">Bằng cách đăng ký, bạn đồng ý với <a>Điều khoản sử dụng</a> và <a>Chính sách bảo mật</a>.</p>}
        <div className="auth-switch">{isLogin?'Chưa có tài khoản?':'Đã có tài khoản?'} <button onClick={()=>navigate(isLogin?'register':'login')}>{isLogin?'Đăng ký ngay':'Đăng nhập'}</button></div>
      </div>
    </section>
  </main>
}

function ProfilePage({ saved, toggleSaved, open, navigate }: {saved:number[];toggleSaved:(id:number)=>void;open:(p:Product)=>void;navigate:(p:Page)=>void}) {
  const [tab,setTab]=useState<'listings'|'reviews'|'about'>('listings'); const [editing,setEditing]=useState(false)
  return <main className="profile-page">
    <section className="profile-cover"><div className="cover-grid"/><div className="container cover-inner"><button onClick={()=>setEditing(true)}><Pencil/> Chỉnh sửa hồ sơ</button></div></section>
    <div className="container profile-shell">
      <section className="profile-identity">
        <div className="profile-avatar">MN<span><ShieldCheck/></span></div>
        <div className="profile-name"><div><h1>Minh Nguyễn</h1><span className="verified-pill"><ShieldCheck/> Sinh viên đã xác minh</span></div><p><GraduationCap/> VNU · K68 · Công nghệ thông tin</p><p><MapPin/> Cầu Giấy, Hà Nội · Tham gia tháng 8/2026</p></div>
        <div className="profile-actions"><button className="outline"><Settings/> Cài đặt</button><button className="logout-link" onClick={()=>navigate('login')}>Đăng xuất</button><button className="dots"><MoreHorizontal/></button></div>
      </section>
      <section className="profile-dashboard">
        <div className="reputation-card"><div className="reputation-ring"><div><b>93</b><span>/100</span></div></div><div><span className="section-kicker">ĐIỂM UY TÍN</span><h3>Thành viên rất đáng tin cậy</h3><p>Hồ sơ xác minh, giao dịch tích cực và chưa có báo cáo vi phạm.</p><button>Xem cách tính điểm <ChevronRight/></button></div></div>
        <div className="profile-stat"><span><Star fill="currentColor"/></span><b>4.9</b><small>18 đánh giá</small></div>
        <div className="profile-stat"><span><CheckCircle2/></span><b>12</b><small>Giao dịch thành công</small></div>
        <div className="profile-stat"><span><Zap/></span><b>96%</b><small>Tỷ lệ hoàn tất</small></div>
      </section>
      <div className="profile-content-grid">
        <section className="profile-main">
          <div className="profile-tabs"><button className={tab==='listings'?'active':''} onClick={()=>setTab('listings')}>Tin đang đăng <span>3</span></button><button className={tab==='reviews'?'active':''} onClick={()=>setTab('reviews')}>Đánh giá <span>18</span></button><button className={tab==='about'?'active':''} onClick={()=>setTab('about')}>Giới thiệu</button></div>
          {tab==='listings'&&<div className="product-grid profile-products">{products.slice(0,3).map(p=><ProductCard key={p.id} product={p} saved={saved.includes(p.id)} toggleSaved={toggleSaved} open={open}/>)}</div>}
          {tab==='reviews'&&<div className="reviews-list">{[{name:'Lan Anh',text:'Bạn rất đúng giờ, giao tiếp dễ chịu. MacBook đúng như mô tả và còn rất mới.',item:'MacBook Air M1',score:5},{name:'Tuấn Minh',text:'Phản hồi nhanh, hẹn ở cổng trường rất tiện. Cảm ơn bạn nhiều!',item:'Giáo trình Giải tích',score:5}].map(r=><article className="review-item" key={r.name}><div className="review-avatar">{r.name.split(' ').map(x=>x[0]).join('').slice(-2)}</div><div><div className="review-head"><b>{r.name}</b><span>{'★'.repeat(r.score)}</span></div><p>{r.text}</p><small>Giao dịch: {r.item} · 2 tuần trước</small></div></article>)}</div>}
          {tab==='about'&&<div className="about-panel"><h3>Về Minh</h3><p>Sinh viên CNTT thích công nghệ và lối sống tối giản. Mình thường pass lại sách, đồ điện tử không còn dùng để các bạn khác tiếp tục sử dụng.</p><div><span>♻️</span><p><b>12 món đồ có vòng đời mới</b><small>Cảm ơn bạn đã góp phần giảm lãng phí.</small></p></div></div>}
        </section>
        <aside className="profile-aside"><div className="profile-info-card"><h3>Thông tin thành viên</h3><div><ShieldCheck/><span><b>Đã xác minh sinh viên</b><small>Email trường đã được kiểm tra</small></span></div><div><MessageCircle/><span><b>Phản hồi nhanh</b><small>Thường trả lời trong 2 giờ</small></span></div><div><CheckCircle2/><span><b>12 giao dịch hoàn tất</b><small>Không có giao dịch thất bại</small></span></div></div><div className="social-card"><h3>Kết nối</h3><button><span>f</span> Facebook <ArrowRight/></button><button><span>◎</span> Instagram <ArrowRight/></button><p>⚠️ Hãy cẩn thận khi giao dịch ngoài nền tảng.</p></div></aside>
      </div>
    </div>
    {editing&&<div className="modal-backdrop"><div className="edit-profile-modal"><button className="close" onClick={()=>setEditing(false)}><X/></button><span className="section-kicker">HỒ SƠ CỦA BẠN</span><h2>Chỉnh sửa thông tin</h2><div className="edit-avatar"><div>MN</div><button>Đổi ảnh đại diện</button></div><div className="form-grid"><label className="full">Họ và tên<input defaultValue="Minh Nguyễn"/></label><label>Trường<select><option>VNU</option></select></label><label>Khóa<input defaultValue="K68"/></label><label className="full">Ngành học<input defaultValue="Công nghệ thông tin"/></label><label className="full">Giới thiệu<textarea defaultValue="Sinh viên CNTT thích công nghệ và lối sống tối giản."/></label></div><div className="edit-actions"><button className="secondary" onClick={()=>setEditing(false)}>Hủy</button><button onClick={()=>setEditing(false)}>Lưu thay đổi</button></div></div></div>}
  </main>
}

function MobileNav({page,navigate}:{page:Page;navigate:(p:Page)=>void}) {return <nav className="mobile-bottom"><button className={page==='home'?'active':''} onClick={()=>navigate('home')}><Home/><span>Trang chủ</span></button><button className={page==='explore'?'active':''} onClick={()=>navigate('explore')}><Search/><span>Tìm kiếm</span></button><button className="add-mobile" onClick={()=>navigate('create')}><Plus/></button><button className={page==='saved'?'active':''} onClick={()=>navigate('saved')}><Heart/><span>Đã lưu</span></button><button className={page==='profile'?'active':''} onClick={()=>navigate('profile')}><CircleUserRound/><span>Cá nhân</span></button></nav>}

export default function App() {
  const {products:liveProducts,saved,toggleSaved:saveFavorite,user,admin,ready,loading,error}=useBackend()
  const products=liveProducts
  const [page,setPage]=useState<Page>('home'); const [selected,setSelected]=useState<Product|null>(null); const [search,setSearch]=useState('')
  const [actionError,setActionError]=useState('')
  const navigate=(p:Page)=>{
    setPage(['profile','create','saved','admin'].includes(p)&&!auth.currentUser?'login':p)
    window.scrollTo({top:0,behavior:'smooth'})
  }
  const open=(p:Product)=>{setSelected(p);navigate('detail')}
  const toggleSaved=(id:number)=>{if(!user){navigate('login');return}saveFavorite(id).catch(e=>setActionError(errorMessage(e)))}
  const logout=()=>{signOut(auth).then(()=>navigate('login')).catch(e=>setActionError(errorMessage(e)))}
  useEffect(()=>{document.title=`${page==='home'?'UniLoop':page==='explore'?'Khám phá':page==='detail'?selected?.title:page==='create'?'Đăng tin':page==='saved'?'Đã lưu':page==='profile'?'Minh Nguyễn':'Tài khoản'} — UniLoop`},[page,selected])
  const authPage=page==='login'||page==='register'
  const motionRoot=useRef<HTMLDivElement>(null)
  useGSAP(()=>{
    if(authPage)return
    const mm=gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)',()=>{
      const targets=motionRoot.current?.querySelectorAll('.hero-copy > *, .editorial-item, .product-card, .profile-dashboard > *, .explore-top, .wizard, .detail-info')
      if(targets?.length)gsap.from(targets,{y:22,autoAlpha:0,duration:.65,stagger:.045,ease:'power2.out',clearProps:'all'})
    })
    return ()=>mm.revert()
  },{scope:motionRoot,dependencies:[page],revertOnUpdate:true})
  if(!ready)return <main className="container saved-page" role="status">Đang kết nối tài khoản…</main>
  if(page==='admin')return admin?<LiveAdmin onLogout={logout}/>:<main className="container saved-page">Bạn không có quyền quản trị.<button onClick={()=>navigate('home')}>Về trang chủ</button></main>

  return <div className="app" ref={motionRoot}>{(error||actionError)&&<p role="alert" className="auth-error">{error||actionError}</p>}{loading&&<p role="status">Đang tải sản phẩm…</p>}{!authPage&&<Header {...{page,navigate,search,setSearch}}/>}{page==='home'&&<HomePage {...{navigate,saved,toggleSaved,open,search,setSearch}}/>}{page==='explore'&&<ExplorePage {...{search,setSearch,saved,toggleSaved,open}}/>}{page==='detail'&&selected&&<DetailPage product={selected} saved={saved.includes(selected.id)} {...{toggleSaved,navigate}}/>}{page==='create'&&<LiveCreate onDone={()=>navigate('explore')}/>} {page==='saved'&&<main className="saved-page container"><span className="section-kicker">BỘ SƯU TẬP CỦA BẠN</span><h1>Sản phẩm đã lưu</h1><p>Những món đồ bạn muốn quay lại xem sau.</p>{saved.length?<div className="product-grid">{products.filter(p=>saved.includes(p.id)).map(p=><ProductCard key={p.id} product={p} saved toggleSaved={toggleSaved} open={open}/>)}</div>:<EmptyState title="Bạn chưa lưu sản phẩm nào" text="Khám phá marketplace và bấm trái tim để lưu lại."/>}</main>}{authPage&&<AuthPage mode={page==='login'?'login':'register'} navigate={navigate}/>} {page==='profile'&&<LiveProfile onLogout={logout}/>}{!authPage&&<MobileNav {...{page,navigate}}/>}{!authPage&&page!=='create'&&<footer><div className="container footer-inner"><Logo/><p>Mua, bán, đổi và cho đồ trong cộng đồng đại học.</p><span>© 2026 UniLoop · VNU Pilot</span></div></footer>}</div>
}

import { useRef, useState } from 'react'
import { LayoutDashboard, Users, Package, Flag, GraduationCap, LogOut, Search, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { products, formatPrice } from './data'

const sections = ['Tổng quan', 'Thành viên', 'Tin đăng', 'Báo cáo', 'Trường đại học']
const icons = [LayoutDashboard, Users, Package, Flag, GraduationCap]
export default function Admin({onLogout}:{onLogout:()=>void}) {
  const [tab,setTab]=useState('Tổng quan')
  const [search,setSearch]=useState('')
  const [hidden,setHidden]=useState<number[]>([])
  const [restricted,setRestricted]=useState<string[]>([])
  const [resolved,setResolved]=useState(false)
  const root=useRef<HTMLDivElement>(null)
  useGSAP(()=>{
    const mm=gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)',()=>{gsap.from('.admin-content > *',{y:18,autoAlpha:0,stagger:.07,duration:.45,clearProps:'all'})})
    return ()=>mm.revert()
  },{scope:root,dependencies:[tab],revertOnUpdate:true})
  return <div className="admin-shell" ref={root}>
    <aside className="admin-sidebar">
      <span className="brand-crop"><img src="/uniloop-brand.png" alt="UniLoop"/></span>
      <span className="admin-caption">CAMPUS CONTROL CENTER</span>
      <nav>{sections.map((name,i)=>{const Icon=icons[i];return <button key={name} className={tab===name?'selected':''} onClick={()=>{setTab(name);setSearch('')}}><Icon size={19}/>{name}{name==='Báo cáo'&&!resolved&&<b>1</b>}</button>})}</nav>
      <div className="admin-account"><span>AD</span><div><b>Quản trị viên</b><small>admin123@edu.vn</small></div></div>
      <button className="admin-logout" onClick={onLogout}><LogOut size={17}/>Đăng xuất</button>
    </aside>
    <main className="admin-content">
      <header><div><span className="section-kicker">UNILOOP / QUẢN TRỊ</span><h1>{tab}</h1><p>Một campus kết nối. Một cộng đồng đáng tin.</p></div><span className="admin-live"><i/> VNU Pilot</span></header>
      {tab==='Tổng quan'&&<>
        <div className="admin-metrics">{[['Thành viên','1.248','+12,8%'],['Tin đang mở',String(products.length-hidden.length),'+8 hôm nay'],['Giao dịch hoàn tất','216','+18,2%'],['Báo cáo chờ xử lý',resolved?'0':'1','Cần xem xét']].map(([label,value,trend])=><article key={label}><span>{label}</span><b>{value}</b><small><ArrowUpRight size={14}/>{trend}</small></article>)}</div>
        <section className="admin-chart"><div><h2>Nhịp sống marketplace</h2><span>Tin đăng · 7 ngày gần nhất</span></div><div className="chart-bars">{[32,47,38,65,53,74,88].map((n,i)=><div key={i}><b>{n}</b><i style={{height:n*2}}/><span>T{i+2}</span></div>)}</div></section>
        <section className="admin-callout"><CheckCircle2/><div><h2>Cộng đồng đang phát triển</h2><p>Ưu tiên xem xét báo cáo và kiểm tra các tin đăng mới.</p></div><button onClick={()=>setTab('Báo cáo')}>Xem báo cáo →</button></section>
      </>}
      {tab!=='Tổng quan'&&<div className="admin-search"><Search size={18}/><input aria-label="Tìm kiếm trong bảng" placeholder="Tìm kiếm..." value={search} onChange={e=>setSearch(e.target.value)}/></div>}
      {tab==='Tin đăng'&&<section className="admin-table"><table><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Trường</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{products.filter(p=>p.title.toLowerCase().includes(search.toLowerCase())).map(p=><tr key={p.id}><td>{p.title}</td><td>{formatPrice(p.price)}</td><td>{p.school}</td><td><span className="status-pill">{hidden.includes(p.id)?'Đã ẩn':'Đang hiển thị'}</span></td><td><button onClick={()=>setHidden(v=>v.includes(p.id)?v.filter(id=>id!==p.id):[...v,p.id])}>{hidden.includes(p.id)?'Hiện lại':'Ẩn tin'}</button></td></tr>)}</tbody></table></section>}
      {tab==='Thành viên'&&<section className="admin-table"><table><thead><tr><th>Thành viên</th><th>Trường</th><th>Uy tín</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{['Minh Nguyễn','Lan Anh','Tuấn Minh'].filter(n=>n.toLowerCase().includes(search.toLowerCase())).map(n=><tr key={n}><td>{n}</td><td>VNU</td><td>93 / 100</td><td>{restricted.includes(n)?'Bị hạn chế':'Hoạt động'}</td><td><button onClick={()=>setRestricted(v=>v.includes(n)?v.filter(x=>x!==n):[...v,n])}>{restricted.includes(n)?'Khôi phục':'Hạn chế'}</button></td></tr>)}</tbody></table></section>}
      {tab==='Báo cáo'&&<section className="admin-table"><h2>Báo cáo #UL-024</h2><p>Listing: MacBook Air M1 · Lý do: thông tin tình trạng chưa rõ.</p><p>Trạng thái: <b>{resolved?'Đã xử lý':'Đang chờ xem xét'}</b></p><button disabled={resolved} onClick={()=>setResolved(true)}>{resolved?'Đã xử lý':'Đánh dấu đã xử lý'}</button></section>}
      {tab==='Trường đại học'&&<section className="admin-table"><table><thead><tr><th>Trường</th><th>Khu vực</th><th>Trạng thái</th></tr></thead><tbody>{['VNU','NEU','HUCE','FTU'].filter(n=>n.toLowerCase().includes(search.toLowerCase())).map(n=><tr key={n}><td>{n}</td><td>Hà Nội</td><td>{n==='VNU'?'Pilot đang mở':'Dự kiến mở rộng'}</td></tr>)}</tbody></table></section>}
      <p className="admin-demo">Dữ liệu minh họa · Thao tác quản trị hiện được lưu trong phiên xem này.</p>
    </main>
  </div>
}

export const CONDITIONS = ['Mới', 'Như mới', 'Tốt', 'Đã qua sử dụng', 'Cần sửa chữa'] as const
export const CATEGORIES = ['Sách & giáo trình','Điện tử','Thời trang','Phòng trọ','Dụng cụ học tập','Thể thao','Giải trí','Khác']
export const UNIVERSITIES = ['VNU','UET','ULIS','HUCE','HNUE','NEU','FTU','HUST','PTIT','TMU']
export type ListingType = 'sale' | 'free' | 'exchange' | 'sale_or_exchange'
export type ListingStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'hidden' | 'blocked'
export interface Listing {
  id: string; ownerId: string; title: string; price: number; type: ListingType
  description: string; condition: string; category: string; school: string; area: string
  images: string[]; imagePaths: string[]; status: ListingStatus; slot: string
  exchangeTarget: string; defects: string; negotiable: boolean; seniorPass: boolean; targetCohorts: string
  createdAt: number; expiresAt: number; updatedAt: number; chosenOfferId: string
}
export interface Member {
  id: string; name: string; university: string; major: string; cohort: string; bio: string
  photoURL: string; facebookURL: string; instagramURL: string; xURL: string; phone: string; updatedAt: number
}
export interface Wish {
  id:string; ownerId:string; query:string; school:string; maxPrice:number; createdAt:number; updatedAt:number
}
export interface Offer {
  id: string; buyerId: string; sellerId: string; listingId: string; title: string
  exchangeListingId: string; price: number; counterPrice: number; message: string
  status: 'pending'|'countered'|'accepted'|'completed'|'cancelled'|'rejected'
  buyerConfirmed: boolean; sellerConfirmed: boolean
  meetingPlace: string; meetingTime: string; createdAt: number; expiresAt: number; updatedAt: number
}
export interface Review {
  id:string; offerId:string; reviewerId:string; revieweeId:string; rating:number; text:string
  reply:string; createdAt:number; updatedAt:number
}
export interface ChatMessage {
  id:string; senderId:string; text:string; createdAt:number
}
export interface Notification {
  id:string; targetType:'all'|'user'; targetId:string; title:string; message:string
  createdBy:string; createdAt:number
}
export interface Report {
  id:string; reporterId:string; targetType:'listing'|'member'|'review'|'transaction'
  targetId:string; reason:string; description:string; status:'new'|'under_review'|'resolved'|'rejected'
  createdAt:number; response:string
}
export interface Verification {
  id:string; university:string; schoolEmail:string; note:string; status:'pending'|'verified'|'rejected'; response:string; updatedAt:number
}
export const money=(price:number)=>price===0?'Miễn phí':Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'đ'
export const date=(time:number)=>new Date(time).toLocaleDateString('vi-VN')
export const statusLabel:Record<string,string>={draft:'Bản nháp',active:'Đang bán',reserved:'Đang giữ',sold:'Đã giao dịch',hidden:'Đã ẩn',blocked:'Bị khóa',pending:'Chờ phản hồi',countered:'Có giá đề xuất lại',accepted:'Đã thống nhất',completed:'Hoàn tất',cancelled:'Đã hủy',rejected:'Đã từ chối',new:'Mới',under_review:'Đang xem xét',resolved:'Đã xử lý',verified:'Đã xác minh'}
export function available(listing:Listing){return listing.status==='active'&&listing.expiresAt>Date.now()}
export function normalize(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().trim()}
export function matches(text:string,term:string){
  const haystack=normalize(text),needle=normalize(term)
  return !needle||needle.split(/\s+/).every(word=>haystack.includes(word))
}
export function initials(name:string){return name.trim().split(/\s+/).slice(-2).map(n=>n[0]).join('').toUpperCase()||'U'}
export function safeURL(value:string){try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return ''}}
export function canAccept(offer:Offer,uid:string,now=Date.now()){
  return offer.expiresAt>now&&((offer.status==='pending'&&offer.sellerId===uid)||(offer.status==='countered'&&offer.buyerId===uid))
}

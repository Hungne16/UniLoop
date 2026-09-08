export type ListingType = 'sale' | 'free' | 'exchange'

export type Product = {
  documentId?: string
  ownerId?: string
  id: number
  title: string
  price: number
  oldPrice?: number
  image: string
  condition: string
  school: string
  distance: string
  area: string
  type: ListingType
  negotiable?: boolean
  verified?: boolean
  tag?: string
  color: string
  description: string
}

export const categories = [
  { icon: '📚', name: 'Sách & giáo trình', short: 'Sách', count: 128, color: '#ffdf9e' },
  { icon: '💻', name: 'Điện tử', short: 'Công nghệ', count: 96, color: '#c8e4ff' },
  { icon: '👕', name: 'Thời trang', short: 'Thời trang', count: 74, color: '#ffd1d9' },
  { icon: '🪑', name: 'Phòng trọ', short: 'Phòng trọ', count: 63, color: '#d9d2ff' },
  { icon: '✏️', name: 'Dụng cụ học tập', short: 'Học tập', count: 52, color: '#c9f0db' },
  { icon: '⚽', name: 'Thể thao', short: 'Thể thao', count: 31, color: '#ffe0c3' },
]

export const products: Product[] = [
  {
    id: 1, title: 'MacBook Air M1 2020', price: 10500000, oldPrice: 18000000,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85',
    condition: 'Như mới', school: 'VNU', distance: '1,2 km', area: 'Cầu Giấy', type: 'sale',
    negotiable: true, verified: true, tag: 'Cùng trường', color: '#d9e4ec',
    description: 'Máy dùng học tập nhẹ nhàng, pin 89%, ngoại hình đẹp. Có một vết xước nhỏ ở cạnh trái, đầy đủ sạc zin.'
  },
  {
    id: 2, title: 'Giáo trình Giải tích 1', price: 55000,
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85',
    condition: 'Tốt', school: 'VNU', distance: '400 m', area: 'KTX Mễ Trì', type: 'sale',
    verified: true, tag: 'Gần bạn', color: '#e6d7bd',
    description: 'Sách sạch, có ghi chú bằng bút chì vài trang. Phù hợp sinh viên năm nhất.'
  },
  {
    id: 3, title: 'Quạt cây Panasonic', price: 0,
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=85',
    condition: 'Đã qua sử dụng', school: 'VNU', distance: '2,1 km', area: 'Mỹ Đình', type: 'free',
    verified: true, tag: 'Miễn phí', color: '#dbe7de',
    description: 'Quạt vẫn chạy tốt, hơi cũ nhưng sạch. Ưu tiên bạn nào ở gần và có thể tự qua lấy.'
  },
  {
    id: 4, title: 'Bàn phím cơ Akko 3087', price: 780000,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85',
    condition: 'Tốt', school: 'UET', distance: '850 m', area: 'Xuân Thủy', type: 'exchange',
    negotiable: true, verified: true, tag: 'Có thể đổi', color: '#dddbeb',
    description: 'Blue switch, led trắng, đủ keycap. Muốn đổi chuột gaming hoặc tai nghe.'
  },
  {
    id: 5, title: 'Đèn bàn học chống cận', price: 120000,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85',
    condition: 'Tốt', school: 'VNU', distance: '1,6 km', area: 'Dịch Vọng', type: 'sale',
    negotiable: true, verified: false, color: '#e8d7c2',
    description: 'Ba chế độ sáng, chân đế chắc chắn, dùng khoảng một năm.'
  },
  {
    id: 6, title: 'Ghế xoay học bài', price: 280000,
    image: 'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=900&q=85',
    condition: 'Đã qua sử dụng', school: 'NEU', distance: '4,8 km', area: 'Hai Bà Trưng', type: 'sale',
    negotiable: true, verified: true, color: '#dbd2c7',
    description: 'Ghế ngồi êm, nâng hạ bình thường. Bán do chuyển phòng.'
  },
  {
    id: 7, title: 'Áo hoodie VNU', price: 150000,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85',
    condition: 'Như mới', school: 'VNU', distance: '700 m', area: 'Làng sinh viên', type: 'sale',
    verified: true, tag: 'Cùng trường', color: '#ddd6cf',
    description: 'Size L, mặc hai lần, không lỗi. Form rộng unisex.'
  },
  {
    id: 8, title: 'Bộ màu poster Pentel', price: 90000,
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=85',
    condition: 'Tốt', school: 'HUCE', distance: '5,2 km', area: 'Giải Phóng', type: 'sale',
    negotiable: false, verified: true, color: '#ead8bd',
    description: 'Còn hơn 80%, đủ 12 màu, phù hợp làm bài kiến trúc và mỹ thuật.'
  },
]

export const formatPrice = (price: number) => price === 0 ? 'Miễn phí' : `${price.toLocaleString('vi-VN')}đ`

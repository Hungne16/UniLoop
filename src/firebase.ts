import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const app = initializeApp({
  apiKey: 'AIzaSyDyRHfcmTuLW3s41NiFFTiQ0psUsTp2B1A',
  authDomain: 'uniloop-a2a9b.firebaseapp.com',
  projectId: 'uniloop-a2a9b',
  storageBucket: 'uniloop-a2a9b.firebasestorage.app',
  messagingSenderId: '443024791196',
  appId: '1:443024791196:web:0f3391e9423a418cc0bf59',
})
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export function errorMessage(error: unknown) {
  const code = (error as {code?:string})?.code ?? ''
  const messages: Record<string,string> = {
    'auth/invalid-credential':'Email hoặc mật khẩu không đúng.',
    'auth/email-already-in-use':'Email này đã được đăng ký.',
    'auth/weak-password':'Mật khẩu chưa đủ mạnh.',
    'auth/operation-not-allowed':'Phương thức đăng nhập chưa được bật trên Firebase.',
    'auth/configuration-not-found':'Firebase Authentication chưa được cấu hình.',
    'auth/unauthorized-domain':'Tên miền này chưa được cho phép đăng nhập.',
    'auth/popup-closed-by-user':'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/too-many-requests':'Có quá nhiều yêu cầu. Hãy thử lại sau.',
    'permission-denied':'Bạn chưa có quyền truy cập dữ liệu. Kiểm tra đăng nhập và cấu hình Firestore.',
    'unavailable':'Không thể kết nối dữ liệu. Vui lòng thử lại.',
    'storage/unauthorized':'Bạn chưa có quyền tải ảnh lên.',
  }
  return messages[code] ?? (error instanceof Error ? error.message : 'Không thể thực hiện thao tác.')
}

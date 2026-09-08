import {
  collection,
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "./firebase";
import {
  available,
  canAccept,
  type Listing,
  type Member,
  type Offer,
  type Report,
  type Review,
} from "./domain";

const requireUser = () => {
  if (!auth.currentUser) throw new Error("Vui lòng đăng nhập.");
  return auth.currentUser.uid;
};
const listingRef = (id: string) => doc(db, "listings", id);
const DAY = 86400000;
export type ListingInput = Pick<
  Listing,
  | "title"
  | "price"
  | "type"
  | "description"
  | "condition"
  | "category"
  | "school"
  | "area"
  | "exchangeTarget"
  | "defects"
  | "negotiable"
>;
export async function uploadImages(files: File[], folder = "listings") {
  const uid = requireUser(),
    paths: string[] = [],
    urls: string[] = [];
  if (
    files.length > 5 ||
    files.some(
      (f) =>
        !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
        f.size > 5 * 1024 * 1024,
    )
  )
    throw new Error("Tối đa 5 ảnh JPG, PNG hoặc WebP, mỗi ảnh dưới 5 MB.");
  try {
    for (const file of files) {
      const path = folder + "/" + uid + "/" + crypto.randomUUID(),
        target = ref(storage, path);
      await uploadBytes(target, file);
      paths.push(path);
      urls.push(await getDownloadURL(target));
    }
    return { paths, urls };
  } catch (e) {
    await cleanupImages(paths);
    throw e;
  }
}
export async function cleanupImages(paths: string[]) {
  await Promise.allSettled(
    paths.filter(Boolean).map((p) => deleteObject(ref(storage, p))),
  );
}
export async function saveListing(
  input: ListingInput,
  files: File[],
  status: "active" | "draft",
  existing?: Listing,
  externalImages: string[] = [],
) {
  const uid = requireUser();
  if (
    !input.title.trim() ||
    input.title.length > 150 ||
    !Number.isFinite(input.price) ||
    input.price < 0
  )
    throw new Error("Kiểm tra tiêu đề và giá sản phẩm.");
  if (input.type === "sale" && input.price <= 0)
    throw new Error(
      "Tin bán cần giá lớn hơn 0; chọn Cho miễn phí nếu tặng đồ.",
    );
  const links = externalImages
    .map((x) => x.trim())
    .filter((x) => {
      try {
        return new URL(x).protocol === "https:";
      } catch {
        return false;
      }
    })
    .slice(0, 5);
  if (files.length === 0 && !links.length && !existing?.images.length)
    throw new Error("Thêm ít nhất một ảnh hoặc URL ảnh HTTPS.");
  if (input.condition === "Cần sửa chữa" && !input.defects.trim())
    throw new Error("Vui lòng mô tả lỗi sản phẩm.");
  const uploaded = await uploadImages(files),
    target = existing
      ? listingRef(existing.id)
      : doc(collection(db, "listings"));
  try {
    await runTransaction(db, async (tx) => {
      const slots = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          tx.get(doc(db, "members", uid, "slots", String(i))),
        ),
      );
      const snapshot = existing ? await tx.get(target) : null;
      if (
        existing &&
        (!snapshot?.exists() ||
          snapshot.data().ownerId !== uid ||
          !["active", "draft", "hidden"].includes(snapshot.data().status))
      )
        throw new Error("Tin này không thể chỉnh sửa.");
      const slot =
        existing?.slot ?? String(slots.findIndex((s) => !s.exists()));
      if (slot === "-1")
        throw new Error(
          "Bạn đã có 5 tin chưa hoàn tất. Hãy lưu trữ hoặc xóa một tin trước.",
        );
      const nextImages = files.length
        ? uploaded.urls
        : links.length
          ? links
          : existing!.images;
      const nextPaths = files.length
        ? uploaded.paths
        : links.length
          ? links.map(() => "")
          : existing!.imagePaths;
      const now = Date.now(),
        data = {
          ...input,
          title: input.title.trim(),
          price: input.type === "free" ? 0 : input.price,
          ownerId: uid,
          images: nextImages,
          imagePaths: nextPaths,
          slot,
          status,
          chosenOfferId: "",
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          expiresAt: now + 30 * DAY,
        };
      tx.set(target, data);
      tx.set(doc(db, "members", uid, "slots", slot), { listingId: target.id });
    });
    if (existing && files.length) await cleanupImages(existing.imagePaths);
    return target.id;
  } catch (e) {
    await cleanupImages(uploaded.paths);
    throw e;
  }
}
export async function changeListing(
  listing: Listing,
  status: "active" | "hidden",
) {
  requireUser();
  await updateDoc(listingRef(listing.id), {
    status,
    updatedAt: Date.now(),
    ...(status === "active" ? { expiresAt: Date.now() + 30 * DAY } : {}),
  });
}
export async function removeListing(listing: Listing) {
  const uid = requireUser();
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(listingRef(listing.id)),
      data = snapshot.data();
    if (
      !data ||
      data.ownerId !== uid ||
      data.status === "reserved" ||
      data.status === "sold"
    )
      throw new Error("Không thể xóa tin đang giao dịch hoặc đã hoàn tất.");
    tx.delete(listingRef(listing.id));
    tx.delete(doc(db, "members", uid, "slots", data.slot));
  });
  await cleanupImages(listing.imagePaths);
}
export async function sendOffer(
  listing: Listing,
  price: number,
  message: string,
  exchangeListingId = "",
) {
  const uid = requireUser();
  if (uid === listing.ownerId)
    throw new Error("Bạn không thể gửi đề nghị cho chính mình.");
  if (!available(listing)) throw new Error("Tin không còn nhận đề nghị.");
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Giá đề nghị không hợp lệ.");
  if (listing.type === "exchange" && !exchangeListingId)
    throw new Error("Chọn món đồ của bạn để trao đổi.");
  const now = Date.now();
  const result = await addDoc(collection(db, "offers"), {
    buyerId: uid,
    sellerId: listing.ownerId,
    listingId: listing.id,
    title: listing.title,
    price: listing.type === "free" ? 0 : price,
    counterPrice: 0,
    message: message.slice(0, 2000),
    exchangeListingId,
    status: "pending",
    buyerConfirmed: false,
    sellerConfirmed: false,
    meetingPlace: "",
    meetingTime: "",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + DAY,
  });
  return result.id;
}
export async function acceptOffer(offerId: string) {
  const uid = requireUser();
  await runTransaction(db, async (tx) => {
    const target = doc(db, "offers", offerId),
      snapshot = await tx.get(target);
    const offer = { ...snapshot.data(), id: offerId } as Offer;
    if (!snapshot.exists() || !canAccept(offer, uid))
      throw new Error("Đề nghị không còn khả dụng hoặc đã hết hạn.");
    const listing = await tx.get(listingRef(offer.listingId)),
      swap = offer.exchangeListingId
        ? await tx.get(listingRef(offer.exchangeListingId))
        : null;
    if (
      !listing.exists() ||
      !available(listing.data() as Listing) ||
      (swap && (!swap.exists() || !available(swap.data() as Listing)))
    )
      throw new Error("Một món đồ đã được giữ hoặc không còn bán.");
    tx.update(target, {
      status: "accepted",
      price: offer.status === "countered" ? offer.counterPrice : offer.price,
      updatedAt: Date.now(),
    });
    tx.update(listing.ref, { status: "reserved", chosenOfferId: offerId });
    if (swap)
      tx.update(swap.ref, { status: "reserved", chosenOfferId: offerId });
  });
}
export async function counterOffer(offer: Offer, price: number) {
  requireUser();
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Nhập giá hợp lệ.");
  await updateDoc(doc(db, "offers", offer.id), {
    status: "countered",
    counterPrice: price,
    updatedAt: Date.now(),
  });
}
export async function rejectOffer(offer: Offer) {
  requireUser();
  await updateDoc(doc(db, "offers", offer.id), {
    status: "rejected",
    updatedAt: Date.now(),
  });
}
export async function cancelOffer(offerId: string) {
  requireUser();
  await runTransaction(db, async (tx) => {
    const target = doc(db, "offers", offerId),
      snapshot = await tx.get(target),
      offer = snapshot.data() as Offer;
    if (
      !snapshot.exists() ||
      !["pending", "countered", "accepted"].includes(offer.status) ||
      offer.buyerConfirmed ||
      offer.sellerConfirmed
    )
      throw new Error(
        "Không thể hủy sau khi có xác nhận; hãy gửi báo cáo nếu cần hỗ trợ.",
      );
    const listing = await tx.get(listingRef(offer.listingId)),
      swap = offer.exchangeListingId
        ? await tx.get(listingRef(offer.exchangeListingId))
        : null;
    tx.update(target, { status: "cancelled", updatedAt: Date.now() });
    if (offer.status === "accepted") {
      tx.update(listing.ref, { status: "active", chosenOfferId: "" });
      if (swap) tx.update(swap.ref, { status: "active", chosenOfferId: "" });
    }
  });
}
export async function scheduleMeeting(
  offer: Offer,
  place: string,
  time: string,
) {
  requireUser();
  if (!place.trim() || !time || new Date(time).getTime() < Date.now())
    throw new Error("Chọn địa điểm và thời gian trong tương lai.");
  await updateDoc(doc(db, "offers", offer.id), {
    meetingPlace: place.trim(),
    meetingTime: time,
    updatedAt: Date.now(),
  });
}
export async function confirmOffer(offerId: string) {
  const uid = requireUser();
  await runTransaction(db, async (tx) => {
    const target = doc(db, "offers", offerId),
      snapshot = await tx.get(target),
      offer = snapshot.data() as Offer;
    if (!snapshot.exists() || offer.status !== "accepted")
      throw new Error("Giao dịch không ở trạng thái xác nhận.");
    const listing = await tx.get(listingRef(offer.listingId)),
      swap = offer.exchangeListingId
        ? await tx.get(listingRef(offer.exchangeListingId))
        : null;
    const buyerConfirmed = offer.buyerConfirmed || uid === offer.buyerId,
      sellerConfirmed = offer.sellerConfirmed || uid === offer.sellerId;
    const complete = buyerConfirmed && sellerConfirmed;
    tx.update(target, {
      buyerConfirmed,
      sellerConfirmed,
      status: complete ? "completed" : "accepted",
      updatedAt: Date.now(),
    });
    if (complete) {
      for (const item of [listing, swap]) {
        if (!item) continue;
        const data = item.data()!;
        tx.update(item.ref, { status: "sold" });
        tx.delete(doc(db, "members", data.ownerId, "slots", data.slot));
      }
    }
  });
}
export async function saveReview(
  offer: Offer,
  rating: number,
  text: string,
  existing?: Review,
) {
  const uid = requireUser(),
    revieweeId = uid === offer.buyerId ? offer.sellerId : offer.buyerId;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text.trim())
    throw new Error("Chọn số sao và viết nhận xét.");
  await setDoc(doc(db, "reviews", offer.id + "_" + uid), {
    offerId: offer.id,
    reviewerId: uid,
    revieweeId,
    rating,
    text: text.trim().slice(0, 2000),
    reply: existing?.reply ?? "",
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}
export async function reportTarget(
  targetType: Report["targetType"],
  targetId: string,
  reason: string,
  description: string,
) {
  const uid = requireUser();
  await addDoc(collection(db, "reports"), {
    reporterId: uid,
    targetType,
    targetId,
    reason,
    description: description.slice(0, 3000),
    status: "new",
    response: "",
    createdAt: Date.now(),
  });
}
export async function saveMember(input: Omit<Member, "id" | "updatedAt">) {
  const uid = requireUser();
  await setDoc(doc(db, "members", uid), {
    ...input,
    name: input.name.trim(),
    updatedAt: Date.now(),
  });
}

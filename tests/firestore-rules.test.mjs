import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { readFileSync } from "node:fs";

let env;
const now = () => Date.now();
const member = {
  name: "Sinh viên",
  university: "VNU",
  major: "CNTT",
  cohort: "K68",
  bio: "",
  photoURL: "",
  facebookURL: "",
  instagramURL: "",
  xURL: "",
  phone: "",
  updatedAt: now(),
};
const listing = (ownerId, slot = "0", extra = {}) => ({
  ownerId,
  title: "Giáo trình sạch",
  price: 100000,
  type: "sale",
  description: "Mô tả thật",
  condition: "Tốt",
  category: "Sách & giáo trình",
  school: "VNU",
  area: "Cầu Giấy",
  images: ["https://example.com/a.webp"],
  imagePaths: ["listings/" + ownerId + "/a"],
  status: "active",
  slot,
  exchangeTarget: "",
  defects: "",
  negotiable: true,
  seniorPass: false,
  targetCohorts: "",
  createdAt: now(),
  updatedAt: now(),
  expiresAt: now() + 86400000,
  chosenOfferId: "",
  ...extra,
});
const offer = (extra = {}) => ({
  buyerId: "buyer",
  sellerId: "seller",
  listingId: "l1",
  title: "Giáo trình sạch",
  exchangeListingId: "",
  price: 90000,
  counterPrice: 0,
  message: "Mình muốn mua",
  status: "pending",
  buyerConfirmed: false,
  sellerConfirmed: false,
  meetingPlace: "",
  meetingTime: "",
  createdAt: now(),
  updatedAt: now(),
  expiresAt: now() + 3600000,
  ...extra,
});
const db = (uid, claims = {}) =>
  env.authenticatedContext(uid, claims).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "uniloop-rules-test",
    firestore: {
      host: "127.0.0.1",
      port: 8088,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => env.clearFirestore());
after(async () => env.cleanup());

async function seed() {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "members/seller"), member);
    await setDoc(doc(c.firestore(), "members/buyer"), {
      ...member,
      name: "Người mua",
    });
    await setDoc(doc(c.firestore(), "listings/l1"), listing("seller"));
    await setDoc(doc(c.firestore(), "members/seller/slots/0"), {
      listingId: "l1",
    });
  });
}
test("public data is readable but verification stays private", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "verifications/seller"), {
      schoolEmail: "private@vnu.edu.vn",
      university: "VNU",
      note: "",
      status: "pending",
      response: "",
      updatedAt: now(),
    }),
  );
  await assertSucceeds(
    getDoc(doc(env.unauthenticatedContext().firestore(), "listings/l1")),
  );
  await assertFails(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), "verifications/seller"),
    ),
  );
});
test("listing creation requires the matching quota slot and sixth slot is rejected", async () => {
  const seller = db("seller");
  const batch = writeBatch(seller),
    fresh = listing("seller");
  batch.set(doc(seller, "listings/new"), fresh);
  batch.set(doc(seller, "members/seller/slots/0"), { listingId: "new" });
  await assertSucceeds(batch.commit());
  const bad = writeBatch(seller);
  bad.set(doc(seller, "listings/six"), listing("seller", "5"));
  bad.set(doc(seller, "members/seller/slots/5"), { listingId: "six" });
  await assertFails(bad.commit());
});
test("outsider cannot forge admin or mutate another listing", async () => {
  await seed();
  await assertFails(
    updateDoc(doc(db("outsider"), "listings/l1"), {
      status: "blocked",
      updatedAt: now(),
    }),
  );
  await assertFails(setDoc(doc(db("outsider"), "admins/outsider"), {}));
});
test("owner can edit a valid listing with an embedded WebP image", async () => {
  await seed();
  const owner = db("seller");
  const current = listing("seller", "0", {
    images: ["data:image/webp;base64,UklGRg=="],
    imagePaths: [""],
    updatedAt: now(),
  });
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "listings/l1"), current),
  );
  await assertSucceeds(
    updateDoc(doc(owner, "listings/l1"), {
      title: "Giáo trình đã cập nhật",
      updatedAt: now(),
    }),
  );
});
test("buyer and seller can query their offers but an outsider cannot", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "offers/o1"), offer()),
  );
  await assertSucceeds(
    getDocs(
      query(collection(db("buyer"), "offers"), where("buyerId", "==", "buyer")),
    ),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(db("seller"), "offers"),
        where("sellerId", "==", "seller"),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(db("outsider"), "offers"),
        where("buyerId", "==", "buyer"),
      ),
    ),
  );
});
test("seller can atomically accept, outsider cannot confirm", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "offers/o1"), offer()),
  );
  const seller = db("seller"),
    batch = writeBatch(seller);
  const qr = "data:image/webp;base64,UklGRg==";
  await setDoc(doc(seller, "paymentProfiles/seller"), {
    qr,
    updatedAt: now(),
  });
  batch.update(doc(seller, "offers/o1"), {
    status: "accepted",
    price: 90000,
    updatedAt: now(),
  });
  batch.update(doc(seller, "listings/l1"), {
    status: "reserved",
    chosenOfferId: "o1",
  });
  batch.set(doc(seller, "offers/o1/payment/details"), {
    qr,
    updatedAt: now(),
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(
    updateDoc(doc(db("buyer"), "offers/o1"), {
      meetingPlace: "Sảnh thư viện",
      meetingTime: new Date(Date.now() + 3600000).toISOString(),
      updatedAt: now(),
    }),
  );
  await assertFails(
    updateDoc(doc(db("outsider"), "offers/o1"), {
      buyerConfirmed: true,
      status: "accepted",
      updatedAt: now(),
    }),
  );
});
test("either transaction party can cancel an accepted deal before confirmation", async () => {
  await seed();
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "offers/o1"), offer({ status: "accepted" }));
    await updateDoc(doc(c.firestore(), "listings/l1"), {
      status: "reserved",
      chosenOfferId: "o1",
    });
  });
  const buyer = db("buyer"), batch = writeBatch(buyer);
  batch.update(doc(buyer, "offers/o1"), {
    status: "cancelled",
    updatedAt: now(),
  });
  batch.update(doc(buyer, "listings/l1"), {
    status: "active",
    chosenOfferId: "",
  });
  await assertSucceeds(batch.commit());
});
test("review is allowed after completion and preserves immutable fields when edited", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "offers/o1"), offer()),
  );
  const review = {
    offerId: "o1",
    reviewerId: "buyer",
    revieweeId: "seller",
    rating: 5,
    text: "Giao dịch tốt",
    reply: "",
    createdAt: now(),
    updatedAt: now(),
  };
  await assertFails(setDoc(doc(db("buyer"), "reviews/o1_buyer"), review));
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "offers/o1"), { status: "completed" }),
  );
  await assertSucceeds(setDoc(doc(db("buyer"), "reviews/o1_buyer"), review));
  await assertSucceeds(
    updateDoc(doc(db("buyer"), "reviews/o1_buyer"), {
      rating: 4,
      text: "Giao dịch ổn",
      updatedAt: now(),
    }),
  );
  await assertFails(
    updateDoc(doc(db("buyer"), "reviews/o1_buyer"), {
      createdAt: review.createdAt + 1,
      rating: 3,
      text: "Không được đổi ngày tạo",
      updatedAt: now(),
    }),
  );
  await assertFails(setDoc(doc(db("buyer"), "reviews/another-id"), review));
});
test("only offer participants can read and send chat messages", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "offers/o1"), offer()),
  );
  const message = {
    senderId: "buyer",
    text: "Mình gặp ở thư viện nhé?",
    createdAt: now(),
  };
  await assertSucceeds(
    setDoc(doc(db("buyer"), "offers/o1/messages/m1"), message),
  );
  await assertSucceeds(
    getDocs(collection(db("seller"), "offers/o1/messages")),
  );
  await assertFails(
    getDocs(collection(db("outsider"), "offers/o1/messages")),
  );
  await assertFails(
    setDoc(doc(db("seller"), "offers/o1/messages/m2"), message),
  );
});
test("member can update avatar and seller can privately share payment QR", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "offers/o1"), offer()),
  );
  const qr = "data:image/webp;base64,UklGRg==";
  await assertSucceeds(
    updateDoc(doc(db("seller"), "members/seller"), {
      photoURL: qr,
      updatedAt: now(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db("seller"), "paymentProfiles/seller"), {
      qr,
      updatedAt: now(),
    }),
  );
  await assertFails(getDoc(doc(db("outsider"), "paymentProfiles/seller")));
  await assertSucceeds(
    setDoc(doc(db("seller"), "offers/o1/payment/details"), {
      qr,
      updatedAt: now(),
    }),
  );
  await assertSucceeds(
    getDoc(doc(db("buyer"), "offers/o1/payment/details")),
  );
  await assertFails(
    getDoc(doc(db("outsider"), "offers/o1/payment/details")),
  );
});
test("admin document grants moderation but remains unwritable by client", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "admins/admin"), { email: "admin123@edu.vn" }),
  );
  await assertSucceeds(
    updateDoc(doc(db("admin"), "listings/l1"), {
      status: "blocked",
      updatedAt: now(),
    }),
  );
  await assertFails(setDoc(doc(db("admin"), "admins/other"), {}));
});
test("admin can reset marketplace data while allowing the account to start fresh", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "admins/admin"), { email: "admin123@edu.vn" }),
  );
  const admin = db("admin"),
    batch = writeBatch(admin);
  batch.set(doc(admin, "moderation/seller"), {
    status: "active",
    reason: "Hồ sơ đã được đặt lại",
    updatedAt: now(),
  });
  batch.delete(doc(admin, "members/seller"));
  batch.delete(doc(admin, "members/seller/slots/0"));
  batch.delete(doc(admin, "listings/l1"));
  batch.delete(doc(admin, "offers/o1"));
  await assertSucceeds(batch.commit());
  await assertSucceeds(
    setDoc(doc(db("seller"), "members/seller"), {
      ...member,
      name: "Thành viên mới",
      updatedAt: now(),
    }),
  );
});
test("accounts deleted by the legacy flow regain normal access", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "moderation/seller"), {
      status: "deleted",
      reason: "Legacy deletion marker",
      updatedAt: now(),
    }),
  );
  await assertSucceeds(getDocs(query(collection(db("seller"), "offers"), where("sellerId", "==", "seller"))));
  await assertSucceeds(
    setDoc(doc(db("seller"), "members/seller"), {
      ...member,
      name: "Thành viên mới",
      updatedAt: now(),
    }),
  );
});
test("only admin can send global or private notifications", async () => {
  await seed();
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "admins/admin"), { email: "admin123@edu.vn" }),
  );
  const admin = db("admin"),
    base = {
      title: "Cập nhật UniLoop",
      message: "Vui lòng kiểm tra giao dịch của bạn.",
      createdBy: "admin",
      createdAt: now(),
    };
  await assertSucceeds(
    setDoc(doc(admin, "notifications/global"), {
      ...base,
      targetType: "all",
      targetId: "",
    }),
  );
  await assertSucceeds(
    setDoc(doc(admin, "notifications/private"), {
      ...base,
      targetType: "user",
      targetId: "buyer",
    }),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(db("seller"), "notifications"),
        where("targetType", "==", "all"),
      ),
    ),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(db("buyer"), "notifications"),
        where("targetId", "==", "buyer"),
      ),
    ),
  );
  await assertFails(getDoc(doc(db("seller"), "notifications/private")));
  await assertFails(
    setDoc(doc(db("buyer"), "notifications/forged"), {
      ...base,
      createdBy: "buyer",
      targetType: "all",
      targetId: "",
    }),
  );
});
test("a member can privately create and remove Wish Match needs", async () => {
  const buyer = db("buyer"),
    wish = {
      ownerId: "buyer",
      query: "quạt",
      school: "VNU",
      maxPrice: 200000,
      createdAt: now(),
      updatedAt: now(),
    };
  await assertSucceeds(setDoc(doc(buyer, "wishes/w1"), wish));
  await assertSucceeds(
    getDocs(
      query(collection(buyer, "wishes"), where("ownerId", "==", "buyer")),
    ),
  );
  await assertFails(getDoc(doc(db("outsider"), "wishes/w1")));
  await assertFails(deleteDoc(doc(db("outsider"), "wishes/w1")));
  await assertSucceeds(deleteDoc(doc(buyer, "wishes/w1")));
});

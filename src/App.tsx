import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Heart,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  Recycle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, errorMessage } from "./firebase";
import { useBackend } from "./backend";
import {
  acceptOffer,
  cancelOffer,
  changeListing,
  confirmOffer,
  counterOffer,
  removeListing,
  reportTarget,
  saveListing,
  saveMember,
  saveReview,
  scheduleMeeting,
  sendOffer,
  type ListingInput,
} from "./services";
import {
  CATEGORIES,
  CONDITIONS,
  UNIVERSITIES,
  available,
  date,
  initials,
  matches,
  money,
  safeURL,
  statusLabel,
  type Listing,
  type Member,
  type Offer,
  type Report,
  type Verification,
} from "./domain";
import "./app.css";

gsap.registerPlugin(useGSAP);
type Page =
  | "home"
  | "explore"
  | "detail"
  | "create"
  | "saved"
  | "auth"
  | "profile"
  | "offers"
  | "admin";
const blank: ListingInput = {
  title: "",
  price: 0,
  type: "sale",
  description: "",
  condition: "Tốt",
  category: CATEGORIES[0],
  school: "VNU",
  area: "",
  exchangeTarget: "",
  defects: "",
  negotiable: true,
};

function Logo({ go }: { go?: () => void }) {
  return (
    <button className="logo" onClick={go} aria-label="UniLoop - Trang chủ">
      <span className="brand-crop">
        <img src="/uniloop-brand.png" alt="UniLoop" />
      </span>
    </button>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Package />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Avatar({ member, userName }: { member?: Member; userName?: string }) {
  return member?.photoURL ? (
    <img className="member-avatar" src={member.photoURL} alt="" />
  ) : (
    <span className="member-avatar fallback">
      {initials(member?.name || userName || "U")}
    </span>
  );
}

function Header({
  page,
  go,
  term,
  setTerm,
}: {
  page: Page;
  go: (p: Page) => void;
  term: string;
  setTerm: (s: string) => void;
}) {
  const { user, admin, offers } = useBackend(),
    [open, setOpen] = useState(false);
  const alert = offers.some((o) =>
    ["pending", "countered", "accepted"].includes(o.status),
  );
  return (
    <header className="app-header">
      <div className="header-inner">
        <Logo go={() => go("home")} />
        <nav className="desktop-nav">
          <button
            className={page === "explore" ? "active" : ""}
            onClick={() => go("explore")}
          >
            Khám phá
          </button>
          <button
            className={page === "offers" ? "active" : ""}
            onClick={() => go("offers")}
          >
            Giao dịch
          </button>
        </nav>
        <label className="header-search">
          <Search size={17} />
          <input
            aria-label="Tìm sản phẩm"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go("explore")}
            placeholder="Tìm quanh campus..."
          />
        </label>
        <div className="header-actions">
          <button
            className="icon-btn notification"
            aria-label="Giao dịch"
            onClick={() => go("offers")}
          >
            <Bell />
            {alert && <i />}
          </button>
          <button
            className="icon-btn"
            aria-label="Đã lưu"
            onClick={() => go("saved")}
          >
            <Heart />
          </button>
          {user ? (
            <>
              <button
                className="avatar-btn"
                onClick={() => go(admin ? "admin" : "profile")}
              >
                {initials(user.displayName || user.email || "U")}
              </button>
              <button className="post-btn" onClick={() => go("create")}>
                <Plus /> Đăng tin
              </button>
            </>
          ) : (
            <button className="post-btn" onClick={() => go("auth")}>
              Đăng nhập
            </button>
          )}
          <button
            className="mobile-menu"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu />
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-menu-panel">
          <button onClick={() => go("explore")}>Khám phá</button>
          <button onClick={() => go("offers")}>Giao dịch</button>
          <button onClick={() => go(user ? "profile" : "auth")}>
            {user ? "Hồ sơ" : "Đăng nhập"}
          </button>
        </nav>
      )}
    </header>
  );
}

function Card({ item, open }: { item: Listing; open: (x: Listing) => void }) {
  const { saved, toggleSaved, user } = useBackend(),
    isSaved = saved.includes(item.id);
  return (
    <article className="product-card" onClick={() => open(item)}>
      <div className="product-image">
        <img src={item.images[0]} alt={item.title} />
        <button
          className={"heart-btn " + (isSaved ? "saved" : "")}
          onClick={(e) => {
            e.stopPropagation();
            toggleSaved(item.id).catch(() => {});
          }}
          aria-label={isSaved ? "Bỏ lưu" : "Lưu"}
        >
          <Heart fill={isSaved ? "currentColor" : "none"} />
        </button>
        <span className={"image-tag " + item.type}>
          {item.type === "free"
            ? "MIỄN PHÍ"
            : item.type.includes("exchange")
              ? "CÓ THỂ ĐỔI"
              : "ĐANG BÁN"}
        </span>
      </div>
      <div className="product-body">
        <h3 className="product-title">{item.title}</h3>
        <strong className={"product-price " + (item.price === 0 ? "free" : "")}>
          {money(item.price)}
        </strong>
        <div className="product-meta">
          <span>{item.condition}</span>
          <i />
          <span>{item.school}</span>
        </div>
        <div className="product-location">
          <MapPin />
          {item.area}
          {item.status === "reserved" && <b> · Đang giữ</b>}
        </div>
        {user?.uid === item.ownerId && <small>Tin của bạn</small>}
      </div>
    </article>
  );
}
function Grid({
  items,
  open,
}: {
  items: Listing[];
  open: (x: Listing) => void;
}) {
  return items.length ? (
    <div className="product-grid">
      {items.map((x) => (
        <Card key={x.id} item={x} open={open} />
      ))}
    </div>
  ) : (
    <Empty
      title="Chưa có sản phẩm"
      text="Hãy là người đầu tiên đăng món đồ trong cộng đồng."
    />
  );
}

function HomePage({
  go,
  open,
  term,
  setTerm,
}: {
  go: (p: Page) => void;
  open: (x: Listing) => void;
  term: string;
  setTerm: (s: string) => void;
}) {
  const { products, members } = useBackend(),
    live = products.filter(available),
    schools = new Set(products.map((x) => x.school)).size;
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">MARKETPLACE DÀNH CHO SINH VIÊN</span>
          <h1>
            Đồ cũ.
            <br />
            <em>Chuyện mới.</em>
          </h1>
          <p>
            Mua, bán, đổi và trao lại đồ dùng với những người quanh campus. Gặp
            trực tiếp, kiểm tra kỹ, thanh toán bên ngoài UniLoop.
          </p>
          <label className="hero-search">
            <Search />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go("explore")}
              placeholder="Bạn đang tìm gì?"
            />
            <button onClick={() => go("explore")}>Tìm kiếm</button>
          </label>
          <div className="quick-search">
            <span>Tìm nhanh:</span>
            {["Giáo trình", "Laptop", "Miễn phí"].map((x) => (
              <button
                key={x}
                onClick={() => {
                  setTerm(x === "Miễn phí" ? "" : x);
                  go("explore");
                }}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <div className="board-caption">
            <span>UNILOOP / CAMPUS CIRCULAR</span>
            <span>01 — 26</span>
          </div>
          <div className="hero-poster">
            <span className="poster-orbit orbit-one" />
            <span className="poster-orbit orbit-two" />
            <Recycle className="poster-loop" aria-hidden="true" />
            <div className="poster-copy">
              <small>ĐỪNG VỨT ĐI</small>
              <strong>
                PASS
                <br />
                LẠI.
              </strong>
              <p>
                Một món đồ cũ.
                <br />
                Một vòng đời mới.
              </p>
            </div>
            <div className="poster-note">
              <Sparkles />
              <span>
                Gần campus
                <br />
                <b>Gặp nhau dễ hơn</b>
              </span>
            </div>
            <div className="poster-community">
              <Users />
              <span>
                <b>{members.length || "Mới"}</b> thành viên
              </span>
            </div>
          </div>
        </div>
      </section>
      <main className="container home-content">
        <section className="category-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">DANH MỤC</span>
              <h2>Bạn đang cần gì?</h2>
            </div>
            <button onClick={() => go("explore")}>
              Xem tất cả <ArrowRight />
            </button>
          </div>
          <div className="category-grid">
            {CATEGORIES.slice(0, 6).map((c) => (
              <button
                className="category-card"
                key={c}
                onClick={() => {
                  setTerm(c);
                  go("explore");
                }}
              >
                <span className="category-icon">{c[0]}</span>
                <span>
                  <b>{c}</b>
                  <small>
                    {
                      products.filter((x) => x.category === c && available(x))
                        .length
                    }{" "}
                    tin đang mở
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="product-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">MỚI QUANH CAMPUS</span>
              <h2>Vừa được đăng</h2>
            </div>
            <button onClick={() => go("explore")}>
              Khám phá <ArrowRight />
            </button>
          </div>
          <Grid items={live.slice(0, 8)} open={open} />
        </section>
        <section className="campus-banner">
          <div>
            <span className="banner-label">CỘNG ĐỒNG THẬT · DỮ LIỆU THẬT</span>
            <h2>
              Cùng trường, gần hơn,
              <br />
              tiện gặp hơn.
            </h2>
            <p>
              Hiện có {live.length} tin đang mở từ {members.length} thành viên
              tại {schools} campus.
            </p>
            <button onClick={() => go("create")}>
              Đăng món đầu tiên <ArrowRight />
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function Explore({
  open,
  term,
  setTerm,
}: {
  open: (x: Listing) => void;
  term: string;
  setTerm: (s: string) => void;
}) {
  const { products, badges } = useBackend(),
    [type, setType] = useState("all"),
    [category, setCategory] = useState("all"),
    [verified, setVerified] = useState(false),
    [sort, setSort] = useState("new");
  const filtered = useMemo(
    () =>
      products
        .filter(
          (x) =>
            (type === "all" || x.type === type) &&
            (category === "all" || x.category === category) &&
            (!verified || badges.includes(x.ownerId)) &&
            matches(
              [x.title, x.description, x.category, x.school, x.area].join(" "),
              term,
            ),
        )
        .sort((a, b) =>
          sort === "low" ? a.price - b.price : b.createdAt - a.createdAt,
        ),
    [products, type, category, verified, sort, term, badges],
  );
  return (
    <main className="explore-page container">
      <div className="explore-top">
        <div>
          <span className="section-kicker">KHÁM PHÁ</span>
          <h1>Đồ dùng quanh bạn</h1>
          <p>Chỉ hiển thị khu vực ước lượng. Đừng công khai địa chỉ nhà.</p>
        </div>
        <label className="explore-search">
          <Search />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tìm sản phẩm, trường, khu vực..."
          />
        </label>
      </div>
      <div className="explore-layout">
        <aside className="filters">
          <div className="filter-head">
            <h3>Bộ lọc</h3>
            <button
              onClick={() => {
                setType("all");
                setCategory("all");
                setVerified(false);
                setTerm("");
              }}
            >
              Đặt lại
            </button>
          </div>
          <label>
            Hình thức
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="sale">Bán</option>
              <option value="free">Miễn phí</option>
              <option value="exchange">Đổi đồ</option>
              <option value="sale_or_exchange">Bán hoặc đổi</option>
            </select>
          </label>
          <label>
            Danh mục
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Tất cả</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="toggle-row">
            Chỉ người đã xác minh
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            <span className="toggle" />
          </label>
        </aside>
        <section className="results">
          <div className="results-bar">
            <b>{filtered.length} sản phẩm</b>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">Mới nhất</option>
              <option value="low">Giá thấp trước</option>
            </select>
          </div>
          <Grid items={filtered} open={open} />
        </section>
      </div>
    </main>
  );
}

function Detail({ item, go }: { item: Listing; go: (p: Page) => void }) {
  const { members, badges, user, saved, toggleSaved } = useBackend(),
    seller = members.find((x) => x.id === item.ownerId),
    [modal, setModal] = useState(false),
    [price, setPrice] = useState(item.price),
    [message, setMessage] = useState(""),
    [swap, setSwap] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const submit = async () => {
    if (!user) {
      go("auth");
      return;
    }
    setBusy(true);
    try {
      await sendOffer(item, price, message, swap);
      setNotice("Đã gửi đề nghị. Người đăng có 24 giờ để phản hồi.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="detail-page container">
      <button className="back-link" onClick={() => go("explore")}>
        <ArrowLeft /> Quay lại
      </button>
      <div className="detail-grid">
        <div className="gallery">
          <div className="main-image">
            <img src={item.images[0]} alt={item.title} />
          </div>
          <div className="thumbs">
            {item.images.map((src, i) => (
              <button className={i === 0 ? "active" : ""} key={src}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="detail-labels">
            <span>{item.condition}</span>
            {item.negotiable && <span>Có thương lượng</span>}
          </div>
          <h1>{item.title}</h1>
          <div className={"detail-price " + (item.price === 0 ? "free" : "")}>
            {money(item.price)}
          </div>
          <div className="location-box">
            <MapPin />
            <div>
              <b>
                {item.school} · {item.area}
              </b>
              <span>Vị trí công khai chỉ là khu vực ước lượng</span>
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="save-large"
              onClick={() =>
                toggleSaved(item.id).catch((e) => setError(errorMessage(e)))
              }
            >
              <Heart fill={saved.includes(item.id) ? "currentColor" : "none"} />{" "}
              {saved.includes(item.id) ? "Đã lưu" : "Lưu"}
            </button>
            {user?.uid !== item.ownerId && (
              <button
                disabled={!available(item)}
                className="offer-large"
                onClick={() => (user ? setModal(true) : go("auth"))}
              >
                {item.status === "reserved" ? "Đang được giữ" : "Gửi đề nghị"}{" "}
                <ArrowRight />
              </button>
            )}
          </div>
          <div className="safe-note">
            <ShieldCheck />
            <div>
              <b>UniLoop không giữ tiền</b>
              <span>Kiểm tra món đồ trực tiếp trước khi thanh toán.</span>
            </div>
          </div>
          <button
            className="link-button"
            onClick={async () => {
              if (!user) return go("auth");
              const reason = prompt("Lý do báo cáo tin này:");
              if (!reason) return;
              const description =
                prompt("Mô tả thêm để quản trị viên kiểm tra:") || "";
              try {
                await reportTarget("listing", item.id, reason, description);
                setNotice("Đã gửi báo cáo tới quản trị viên.");
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Báo cáo tin đăng
          </button>
        </div>
      </div>
      <div className="detail-lower">
        <section>
          <span className="section-kicker">CHI TIẾT</span>
          <h2>Mô tả</h2>
          <p>{item.description}</p>
          {item.defects && (
            <div className="notice">
              <b>Điểm cần lưu ý</b>
              <p>{item.defects}</p>
            </div>
          )}
          <div className="specs">
            <div>
              <span>Đăng ngày</span>
              <b>{date(item.createdAt)}</b>
            </div>
            <div>
              <span>Danh mục</span>
              <b>{item.category}</b>
            </div>
            <div>
              <span>Hết hạn</span>
              <b>{date(item.expiresAt)}</b>
            </div>
          </div>
        </section>
        <aside className="seller-card">
          <div className="seller-top">
            <Avatar member={seller} />
            <div>
              <h3>
                {seller?.name || "Thành viên UniLoop"}{" "}
                {badges.includes(item.ownerId) && <ShieldCheck />}
              </h3>
              <span>
                {seller?.university || item.school}{" "}
                {seller?.cohort && "· " + seller.cohort}
              </span>
            </div>
          </div>
          <p>{seller?.bio || "Thành viên chưa viết giới thiệu."}</p>
          <button onClick={() => go("profile")}>
            Xem hồ sơ <ArrowRight />
          </button>
        </aside>
      </div>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {modal && (
        <div className="modal-backdrop">
          <div className="offer-modal">
            <button className="close" onClick={() => setModal(false)}>
              <X />
            </button>
            {notice ? (
              <div className="offer-success">
                <CheckCircle2 />
                <h2>Đã gửi đề nghị</h2>
                <p>{notice}</p>
                <button
                  onClick={() => {
                    setModal(false);
                    go("offers");
                  }}
                >
                  Theo dõi giao dịch
                </button>
              </div>
            ) : (
              <>
                <span className="section-kicker">HIỆU LỰC 24 GIỜ</span>
                <h2>Gửi đề nghị</h2>
                {item.price > 0 && (
                  <label>
                    Giá đề nghị
                    <input
                      type="number"
                      min="0"
                      max="1000000000"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                    />
                  </label>
                )}
                {item.type.includes("exchange") && (
                  <label>
                    ID tin của bạn để đổi
                    <input
                      value={swap}
                      onChange={(e) => setSwap(e.target.value.trim())}
                    />
                  </label>
                )}
                <label>
                  Lời nhắn
                  <textarea
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Chào bạn, mình muốn trao đổi..."
                  />
                </label>
                {error && <p className="auth-error">{error}</p>}
                <button
                  className="submit-offer"
                  disabled={busy}
                  onClick={submit}
                >
                  {busy ? "Đang gửi…" : "Gửi đề nghị"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ListingEditor({
  editing,
  onDone,
}: {
  editing: Listing | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<ListingInput>(
      editing
        ? {
            title: editing.title,
            price: editing.price,
            type: editing.type,
            description: editing.description,
            condition: editing.condition,
            category: editing.category,
            school: editing.school,
            area: editing.area,
            exchangeTarget: editing.exchangeTarget,
            defects: editing.defects,
            negotiable: editing.negotiable,
          }
        : blank,
    ),
    [files, setFiles] = useState<File[]>([]),
    [imageLinks, setImageLinks] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function submit(
    e: FormEvent<HTMLFormElement>,
    status: "active" | "draft",
  ) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveListing(
        form,
        files,
        status,
        editing || undefined,
        imageLinks.split(/\r?\n/),
      );
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="create-page container">
      <form className="wizard" onSubmit={(e) => submit(e, "active")}>
        <span className="section-kicker">
          {editing ? "CHỈNH SỬA TIN" : "ĐĂNG TIN MỚI"}
        </span>
        <h1>Món đồ của bạn</h1>
        <p>
          Tin rõ ràng, ảnh thật và khai báo lỗi đầy đủ giúp đôi bên dễ giao
          dịch.
        </p>
        <div className="form-grid">
          <label className="full">
            Tiêu đề
            <input
              required
              maxLength={150}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <label>
            Hình thức
            <select
              value={form.type}
              onChange={(e) =>
                set("type", e.target.value as ListingInput["type"])
              }
            >
              <option value="sale">Bán</option>
              <option value="free">Cho miễn phí</option>
              <option value="exchange">Đổi đồ</option>
              <option value="sale_or_exchange">Bán hoặc đổi</option>
            </select>
          </label>
          <label>
            Giá (đ)
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              disabled={form.type === "free"}
              value={form.type === "free" ? 0 : form.price}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </label>
          <label>
            Danh mục
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Tình trạng
            <select
              value={form.condition}
              onChange={(e) => set("condition", e.target.value)}
            >
              {CONDITIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Trường
            <select
              value={form.school}
              onChange={(e) => set("school", e.target.value)}
            >
              {UNIVERSITIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Khu vực ước lượng
            <input
              required
              maxLength={100}
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="Ví dụ: Cầu Giấy"
            />
          </label>
          <label className="full">
            Mô tả
            <textarea
              required
              maxLength={5000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label className="full">
            Lỗi hoặc điểm cần lưu ý
            <textarea
              required={form.condition === "Cần sửa chữa"}
              maxLength={1000}
              value={form.defects}
              onChange={(e) => set("defects", e.target.value)}
            />
          </label>
          <label className="full">
            Ảnh sản phẩm (1–5 ảnh, mỗi ảnh dưới 5MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <small>
              {editing
                ? "Để trống nếu muốn giữ ảnh hiện tại."
                : "Ảnh được tự động nén WebP trước khi lưu. Ảnh đầu tiên là ảnh bìa."}
            </small>
          </label>
          <label className="full">
            Hoặc URL ảnh HTTPS, mỗi dòng một ảnh
            <textarea
              value={imageLinks}
              onChange={(e) => setImageLinks(e.target.value)}
              placeholder="https://example.com/anh-san-pham.webp"
            />
          </label>
          <label className="toggle-row">
            Cho phép thương lượng
            <input
              type="checkbox"
              checked={form.negotiable}
              onChange={(e) => set("negotiable", e.target.checked)}
            />
            <span className="toggle" />
          </label>
        </div>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={(e) =>
              submit(e as unknown as FormEvent<HTMLFormElement>, "draft")
            }
          >
            Lưu nháp
          </button>
          <button disabled={busy}>{busy ? "Đang lưu…" : "Xuất bản"}</button>
        </div>
      </form>
    </main>
  );
}

function AuthPage({
  initial,
  done,
}: {
  initial: "login" | "register";
  done: (isAdmin: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    [mode, setMode] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          fullMotion: "(prefers-reduced-motion: no-preference)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const duration = context.conditions?.reduceMotion ? 0 : 0.72;
          gsap.to(".auth-overlay", {
            xPercent: mode === "register" ? 100 : 0,
            duration,
            ease: "power3.inOut",
          });
          gsap.fromTo(
            ".auth-form.active",
            { autoAlpha: 0, y: context.conditions?.reduceMotion ? 0 : 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: context.conditions?.reduceMotion ? 0 : 0.45,
              delay: context.conditions?.reduceMotion ? 0 : 0.16,
            },
          );
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [mode], revertOnUpdate: true },
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      email = String(f.get("email")),
      password = String(f.get("password")),
      remember = f.get("remember") === "on";
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );
      let isAdmin = false;
      if (mode === "login") {
        const result = await signInWithEmailAndPassword(auth, email, password);
        isAdmin = (await result.user.getIdTokenResult()).claims.admin === true;
      } else {
        const name = String(f.get("name")).trim(),
          r = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(r.user, { displayName: name });
        await saveMember({
          name,
          university: String(f.get("school")),
          major: "",
          cohort: "",
          bio: "",
          photoURL: "",
          socialURL: "",
        });
      }
      done(isAdmin);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const reset = async () => {
    const email = (
      root.current?.querySelector(
        ".auth-form.active input[name=email]",
      ) as HTMLInputElement
    )?.value;
    if (!email) {
      setError("Nhập email trước khi đặt lại mật khẩu.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice("Đã gửi email đặt lại mật khẩu.");
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const google = async () => {
    setBusy(true);
    try {
      const r = await signInWithPopup(auth, new GoogleAuthProvider());
      await setDoc(
        doc(db, "members", r.user.uid),
        {
          name: r.user.displayName || "Thành viên",
          university: "",
          major: "",
          cohort: "",
          bio: "",
          photoURL: r.user.photoURL || "",
          socialURL: "",
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      done((await r.user.getIdTokenResult()).claims.admin === true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const form = (kind: "login" | "register") => (
    <form
      className={"auth-form " + (mode === kind ? "active" : "")}
      onSubmit={submit}
      aria-hidden={mode !== kind}
    >
      <span className="section-kicker">
        {kind === "login" ? "CHÀO MỪNG TRỞ LẠI" : "GIA NHẬP VÒNG LẶP"}
      </span>
      <h1>{kind === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h1>
      {kind === "register" && (
        <>
          <label>
            Họ và tên
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Trường
            <select name="school">
              {UNIVERSITIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Mật khẩu
        <input
          name="password"
          type="password"
          minLength={6}
          autoComplete={kind === "login" ? "current-password" : "new-password"}
          required
        />
      </label>
      <label className="remember">
        <input name="remember" type="checkbox" defaultChecked /> Ghi nhớ đăng
        nhập
      </label>
      {error && mode === kind && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <button className="auth-submit" disabled={busy}>
        {busy ? "Đang xử lý…" : kind === "login" ? "Đăng nhập" : "Đăng ký"}
      </button>
      <button type="button" className="google-btn" onClick={google}>
        Tiếp tục với Google
      </button>
      {kind === "login" && (
        <button type="button" className="link-button" onClick={reset}>
          Quên mật khẩu?
        </button>
      )}
      <button
        type="button"
        className="auth-switch-mobile"
        onClick={() => setMode(kind === "login" ? "register" : "login")}
      >
        {kind === "login"
          ? "Chưa có tài khoản? Đăng ký"
          : "Đã có tài khoản? Đăng nhập"}
      </button>
    </form>
  );
  return (
    <main className="auth-page" ref={root}>
      <Logo go={() => location.reload()} />
      <div className="auth-shell">
        <div className="auth-forms">
          {form("login")}
          {form("register")}
        </div>
        <aside className="auth-overlay">
          <span>UNILOOP CAMPUS</span>
          <h2>
            {mode === "login" ? "Chưa có tài khoản?" : "Đã là thành viên?"}
          </h2>
          <p>
            {mode === "login"
              ? "Tham gia để đăng tin, lưu món đồ và trao đổi an toàn trong cộng đồng."
              : "Quay lại những món đồ và cuộc trò chuyện đang chờ bạn."}
          </p>
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"} <ArrowRight />
          </button>
        </aside>
      </div>
    </main>
  );
}

function OffersPage() {
  const { offers, user } = useBackend(),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [review, setReview] = useState<
      Record<string, { rating: number; text: string }>
    >({});
  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  if (!user)
    return (
      <Empty title="Cần đăng nhập" text="Đăng nhập để theo dõi giao dịch." />
    );
  return (
    <main className="container saved-page">
      <span className="section-kicker">TRUNG TÂM GIAO DỊCH</span>
      <h1>Đề nghị của bạn</h1>
      <p>
        UniLoop không xử lý thanh toán. Chỉ xác nhận sau khi đã gặp và kiểm tra
        món đồ.
      </p>
      {error && <p className="auth-error">{error}</p>}
      <div className="offer-list">
        {offers.length ? (
          offers.map((o) => {
            const incoming = o.sellerId === user.uid,
              canConfirm =
                o.status === "accepted" &&
                !(incoming ? o.sellerConfirmed : o.buyerConfirmed);
            return (
              <article className="offer-row" key={o.id}>
                <div>
                  <span className="status-pill">
                    {statusLabel[o.status] || o.status}
                  </span>
                  <h3>{o.title}</h3>
                  <p>
                    {incoming ? "Đề nghị bạn nhận được" : "Đề nghị bạn đã gửi"}{" "}
                    · {money(o.counterPrice || o.price)}
                  </p>
                  <small>
                    {o.expiresAt < Date.now() &&
                    !["completed", "cancelled", "rejected"].includes(o.status)
                      ? "Đã hết hạn"
                      : "Cập nhật " + date(o.updatedAt)}
                  </small>
                </div>
                <div className="offer-actions">
                  {incoming && o.status === "pending" && (
                    <>
                      <button
                        onClick={() => act(o.id, () => acceptOffer(o.id))}
                      >
                        Chấp nhận
                      </button>
                      <button
                        onClick={() => {
                          const p = Number(prompt("Giá đề xuất lại (đ):"));
                          if (p) act(o.id, () => counterOffer(o, p));
                        }}
                      >
                        Đề xuất giá
                      </button>
                      <button
                        className="danger"
                        onClick={() => act(o.id, () => cancelOffer(o.id))}
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {!incoming && o.status === "countered" && (
                    <button onClick={() => act(o.id, () => acceptOffer(o.id))}>
                      Chấp nhận giá mới
                    </button>
                  )}
                  {["pending", "countered"].includes(o.status) && (
                    <button
                      className="secondary"
                      onClick={() => act(o.id, () => cancelOffer(o.id))}
                    >
                      Hủy
                    </button>
                  )}
                  {o.status === "accepted" && (
                    <>
                      <button
                        onClick={() => {
                          const place = prompt("Địa điểm gặp:") || "";
                          const time =
                            prompt("Thời gian (ví dụ 18:00 10/09):") || "";
                          if (place && time)
                            act(o.id, () => scheduleMeeting(o, place, time));
                        }}
                      >
                        Hẹn gặp
                      </button>
                      {canConfirm && (
                        <button
                          onClick={() => act(o.id, () => confirmOffer(o.id))}
                        >
                          Đã trao nhận
                        </button>
                      )}
                    </>
                  )}
                  {o.meetingPlace && (
                    <small>
                      {o.meetingPlace} · {o.meetingTime}
                    </small>
                  )}
                  {o.status === "completed" && (
                    <div className="inline-review">
                      <select
                        value={review[o.id]?.rating || 5}
                        onChange={(e) =>
                          setReview((v) => ({
                            ...v,
                            [o.id]: {
                              rating: Number(e.target.value),
                              text: v[o.id]?.text || "",
                            },
                          }))
                        }
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} sao
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Nhận xét giao dịch"
                        value={review[o.id]?.text || ""}
                        onChange={(e) =>
                          setReview((v) => ({
                            ...v,
                            [o.id]: {
                              rating: v[o.id]?.rating || 5,
                              text: e.target.value,
                            },
                          }))
                        }
                      />
                      <button
                        onClick={() =>
                          act(o.id, () =>
                            saveReview(
                              o,
                              review[o.id]?.rating || 5,
                              review[o.id]?.text || "",
                            ),
                          )
                        }
                      >
                        Gửi đánh giá
                      </button>
                    </div>
                  )}
                </div>
                {busy === o.id && <span>Đang xử lý…</span>}
              </article>
            );
          })
        ) : (
          <Empty
            title="Chưa có đề nghị"
            text="Các offer gửi đi và nhận được sẽ xuất hiện ở đây."
          />
        )}
      </div>
    </main>
  );
}

function ProfilePage({ editListing }: { editListing: (x: Listing) => void }) {
  const { user, members, ownListings, reviews, verification, badges } =
      useBackend(),
    me = members.find((x) => x.id === user?.uid),
    [form, setForm] = useState({
      name: me?.name || user?.displayName || "",
      university: me?.university || "",
      major: me?.major || "",
      cohort: me?.cohort || "",
      bio: me?.bio || "",
      photoURL: me?.photoURL || "",
      socialURL: me?.socialURL || "",
    }),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (me)
      setForm({
        name: me.name,
        university: me.university,
        major: me.major,
        cohort: me.cohort,
        bio: me.bio,
        photoURL: me.photoURL,
        socialURL: me.socialURL,
      });
  }, [me]);
  if (!user) return null;
  const avg = reviews.filter((r) => r.revieweeId === user.uid),
    score = avg.length
      ? (avg.reduce((s, r) => s + r.rating, 0) / avg.length).toFixed(1)
      : "—";
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await saveMember(form);
      setNotice("Đã lưu hồ sơ.");
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const verify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await setDoc(doc(db, "verifications", user.uid), {
        university: String(f.get("university")),
        schoolEmail: String(f.get("schoolEmail")),
        note: String(f.get("note")),
        status: "pending",
        response: "",
        updatedAt: Date.now(),
      });
      setNotice(
        "Đã gửi yêu cầu. Quản trị viên sẽ kiểm tra bằng chứng sở hữu email trường.",
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <main className="profile-page container">
      <section className="profile-hero">
        <Avatar member={me} userName={user.displayName || ""} />
        <div>
          <span className="section-kicker">HỒ SƠ THÀNH VIÊN</span>
          <h1>
            {me?.name || user.displayName || "Thành viên mới"}{" "}
            {badges.includes(user.uid) && <ShieldCheck />}
          </h1>
          <p>
            {me?.university || "Chưa cập nhật trường"}{" "}
            {me?.major && "· " + me.major}
          </p>
        </div>
        <div className="profile-metrics">
          <span>
            <b>{score}</b>Đánh giá
          </span>
          <span>
            <b>{avg.length}</b>Nhận xét
          </span>
          <span>
            <b>{ownListings.length}</b>Tin của bạn
          </span>
        </div>
      </section>
      {error && <p className="auth-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="profile-layout">
        <section>
          <form className="wizard" onSubmit={save}>
            <h2>Thông tin cá nhân</h2>
            <div className="form-grid">
              <label>
                Họ tên
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Trường
                <select
                  value={form.university}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, university: e.target.value }))
                  }
                >
                  <option value="">Chọn trường</option>
                  {UNIVERSITIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Ngành
                <input
                  maxLength={100}
                  value={form.major}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, major: e.target.value }))
                  }
                />
              </label>
              <label>
                Khóa
                <input
                  maxLength={30}
                  value={form.cohort}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, cohort: e.target.value }))
                  }
                />
              </label>
              <label className="full">
                Giới thiệu
                <textarea
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, bio: e.target.value }))
                  }
                />
              </label>
              <label className="full">
                Liên kết mạng xã hội HTTPS
                <input
                  value={form.socialURL}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, socialURL: e.target.value }))
                  }
                />
              </label>
            </div>
            <button>Lưu hồ sơ</button>
            {safeURL(form.socialURL) && (
              <a
                href={safeURL(form.socialURL)}
                target="_blank"
                rel="noreferrer"
              >
                Mở liên kết công khai
              </a>
            )}
          </form>
          <h2>Tin của bạn</h2>
          <div className="manage-list">
            {ownListings.map((x) => (
              <article key={x.id}>
                <img src={x.images[0]} alt="" />
                <div>
                  <b>{x.title}</b>
                  <span>
                    {money(x.price)} · {statusLabel[x.status]}
                  </span>
                </div>
                <button onClick={() => editListing(x)}>Sửa</button>
                {x.status === "active" ? (
                  <button onClick={() => changeListing(x, "hidden")}>Ẩn</button>
                ) : (
                  x.status === "hidden" && (
                    <button onClick={() => changeListing(x, "active")}>
                      Hiện
                    </button>
                  )
                )}{" "}
                {!["reserved", "sold"].includes(x.status) && (
                  <button
                    className="danger"
                    onClick={() =>
                      confirm("Xóa vĩnh viễn tin này?") && removeListing(x)
                    }
                  >
                    Xóa
                  </button>
                )}
              </article>
            ))}
            {!ownListings.length && (
              <Empty
                title="Chưa có tin"
                text="Tin đăng và bản nháp của bạn sẽ hiện ở đây."
              />
            )}
          </div>
        </section>
        <aside>
          <form className="profile-info-card" onSubmit={verify}>
            <h3>Xác minh sinh viên</h3>
            <p>
              Trạng thái:{" "}
              <b>
                {verification ? statusLabel[verification.status] : "Chưa gửi"}
              </b>
            </p>
            <label>
              Trường
              <select name="university" defaultValue={me?.university || "VNU"}>
                {UNIVERSITIES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Email trường
              <input name="schoolEmail" type="email" required />
            </label>
            <label>
              Ghi chú
              <input name="note" maxLength={500} />
            </label>
            <button disabled={verification?.status === "pending"}>
              Gửi yêu cầu
            </button>
            {verification?.response && <p>{verification.response}</p>}
          </form>
          <button className="logout-wide" onClick={() => signOut(auth)}>
            <LogOut /> Đăng xuất
          </button>
        </aside>
      </div>
    </main>
  );
}

function AdminPage() {
  const { admin, members } = useBackend(),
    [allListings, setAllListings] = useState<Listing[]>([]),
    [reports, setReports] = useState<Report[]>([]),
    [verifications, setVerifications] = useState<Verification[]>([]),
    [tab, setTab] = useState("reports");
  useEffect(() => {
    if (!admin) return;
    const a = onSnapshot(collection(db, "reports"), (s) =>
      setReports(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Report)),
    );
    const b = onSnapshot(collection(db, "verifications"), (s) =>
      setVerifications(
        s.docs.map((d) => ({ ...d.data(), id: d.id }) as Verification),
      ),
    );
    const c = onSnapshot(collection(db, "listings"), (s) =>
      setAllListings(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Listing)),
    );
    return () => {
      a();
      b();
      c();
    };
  }, [admin]);
  if (!admin) return null;
  const report = async (
    r: Report,
    status: "under_review" | "resolved" | "rejected",
  ) =>
    updateDoc(doc(db, "reports", r.id), {
      status,
      response:
        status === "resolved" ? "Đã xử lý theo tiêu chuẩn cộng đồng." : "",
      updatedAt: Date.now(),
    });
  const verify = async (v: Verification, status: "verified" | "rejected") => {
    await updateDoc(doc(db, "verifications", v.id), {
      status,
      response:
        status === "verified"
          ? "Đã kiểm tra thông tin sinh viên."
          : "Không đủ thông tin để xác minh.",
      updatedAt: Date.now(),
    });
    await setDoc(doc(db, "studentBadges", v.id), {
      verified: status === "verified",
      updatedAt: Date.now(),
    });
  };
  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Logo />
        <span>QUẢN TRỊ</span>
        {["reports", "listings", "members", "verify"].map((x) => (
          <button
            className={tab === x ? "active" : ""}
            key={x}
            onClick={() => setTab(x)}
          >
            {x === "reports"
              ? "Báo cáo"
              : x === "listings"
                ? "Tin đăng"
                : x === "members"
                  ? "Thành viên"
                  : "Xác minh"}
          </button>
        ))}
        <button onClick={() => signOut(auth)}>
          <LogOut /> Đăng xuất
        </button>
      </aside>
      <section className="admin-main">
        <div className="admin-top">
          <div>
            <span className="section-kicker">DỮ LIỆU THỜI GIAN THỰC</span>
            <h1>Bảng điều hành</h1>
          </div>
          <div className="admin-stat">
            <b>{allListings.length}</b>
            <span>Tổng tin đăng</span>
          </div>
          <div className="admin-stat">
            <b>{members.length}</b>
            <span>Thành viên</span>
          </div>
          <div className="admin-stat">
            <b>{reports.filter((x) => x.status === "new").length}</b>
            <span>Báo cáo mới</span>
          </div>
        </div>
        {tab === "reports" && (
          <div className="admin-table">
            <h2>Hàng đợi báo cáo</h2>
            {reports.map((r) => (
              <article key={r.id}>
                <div>
                  <b>{r.reason}</b>
                  <p>{r.description}</p>
                  <small>
                    {r.targetType}: {r.targetId} ·{" "}
                    {statusLabel[r.status] || r.status}
                  </small>
                </div>
                <button onClick={() => report(r, "under_review")}>
                  Đang xem
                </button>
                <button onClick={() => report(r, "resolved")}>Đã xử lý</button>
                <button onClick={() => report(r, "rejected")}>Bác bỏ</button>
              </article>
            ))}
            {!reports.length && (
              <Empty title="Không có báo cáo" text="Hàng đợi đang trống." />
            )}
          </div>
        )}
        {tab === "listings" && (
          <div className="admin-table">
            <h2>Quản lý tin</h2>
            {allListings.map((x) => (
              <article key={x.id}>
                <img src={x.images[0]} alt="" />
                <div>
                  <b>{x.title}</b>
                  <small>
                    {x.school} · {statusLabel[x.status]}
                  </small>
                </div>
                <button
                  onClick={() =>
                    updateDoc(doc(db, "listings", x.id), {
                      status: "blocked",
                      updatedAt: Date.now(),
                    })
                  }
                >
                  Khóa tin
                </button>
              </article>
            ))}
          </div>
        )}
        {tab === "members" && (
          <div className="admin-table">
            <h2>Thành viên</h2>
            {members.map((m) => (
              <article key={m.id}>
                <Avatar member={m} />
                <div>
                  <b>{m.name}</b>
                  <small>
                    {m.university} · {m.major}
                  </small>
                </div>
                <button
                  onClick={() =>
                    setDoc(doc(db, "moderation", m.id), {
                      status: "restricted",
                      reason: "Vi phạm tiêu chuẩn cộng đồng",
                      updatedAt: Date.now(),
                    })
                  }
                >
                  Hạn chế
                </button>
                <button
                  onClick={() =>
                    setDoc(doc(db, "moderation", m.id), {
                      status: "active",
                      reason: "",
                      updatedAt: Date.now(),
                    })
                  }
                >
                  Khôi phục
                </button>
              </article>
            ))}
          </div>
        )}
        {tab === "verify" && (
          <div className="admin-table">
            <h2>Yêu cầu xác minh</h2>
            {verifications.map((v) => (
              <article key={v.id}>
                <div>
                  <b>{v.schoolEmail}</b>
                  <small>
                    {v.university} · {statusLabel[v.status]}
                  </small>
                  <p>{v.note}</p>
                </div>
                <button onClick={() => verify(v, "verified")}>Duyệt</button>
                <button onClick={() => verify(v, "rejected")}>Từ chối</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const pages: Page[] = [
  "home",
  "explore",
  "detail",
  "create",
  "saved",
  "auth",
  "profile",
  "offers",
  "admin",
];
const pageFromHash = (): Page => {
  const candidate = location.hash.slice(1) as Page;
  return pages.includes(candidate) ? candidate : "home";
};

export default function App() {
  const backend = useBackend(),
    [page, setPage] = useState<Page>(pageFromHash),
    [term, setTerm] = useState(""),
    [selected, setSelected] = useState<Listing | null>(null),
    [editing, setEditing] = useState<Listing | null>(null),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const syncHash = () => setPage(pageFromHash());
    addEventListener("hashchange", syncHash);
    return () => removeEventListener("hashchange", syncHash);
  }, []);
  const go = (p: Page) => {
    const protectedPages: Page[] = ["create", "saved", "profile", "offers"];
    if (protectedPages.includes(p) && !backend.user) p = "auth";
    if (p === "admin" && !backend.admin) p = backend.user ? "profile" : "auth";
    setPage(p);
    location.hash = p;
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const open = (x: Listing) => {
    setSelected(x);
    go("detail");
  };
  useEffect(() => {
    if (page === "auth" && backend.ready && backend.user)
      go(backend.admin ? "admin" : "home");
    if (page === "admin" && backend.ready && !backend.admin)
      go(backend.user ? "profile" : "auth");
    if (
      backend.ready &&
      !backend.user &&
      ["create", "saved", "profile", "offers"].includes(page)
    )
      go("auth");
    if (page === "detail" && !selected) go("explore");
  }, [backend.ready, backend.admin, backend.user, page, selected]);
  useEffect(() => {
    document.title =
      (selected && page === "detail"
        ? selected.title
        : "UniLoop Campus Marketplace") + " — UniLoop";
  }, [page, selected]);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () =>
        gsap.from(".page-motion > main > *, .page-motion > section > *", {
          y: 18,
          autoAlpha: 0,
          duration: 0.55,
          stagger: 0.035,
          ease: "power2.out",
          clearProps: "all",
        }),
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [page], revertOnUpdate: true },
  );
  if (!backend.ready)
    return (
      <main className="boot">
        <Logo />
        <p>Đang kết nối UniLoop…</p>
      </main>
    );
  if (page === "auth")
    return (
      <AuthPage
        initial="login"
        done={(isAdmin) => go(isAdmin ? "admin" : "home")}
      />
    );
  if (page === "admin") return <AdminPage />;
  return (
    <div ref={root} className="app page-motion">
      {backend.restricted && (
        <div className="restriction">
          Tài khoản đang bị hạn chế. Bạn chỉ có thể xem nội dung công khai.
        </div>
      )}
      {backend.error && (
        <div className="global-error" role="alert">
          {backend.error}
          <button onClick={backend.reload}>Thử lại</button>
        </div>
      )}
      <Header page={page} go={go} term={term} setTerm={setTerm} />
      {page === "home" && (
        <HomePage go={go} open={open} term={term} setTerm={setTerm} />
      )}{" "}
      {page === "explore" && (
        <Explore open={open} term={term} setTerm={setTerm} />
      )}{" "}
      {page === "detail" && selected && <Detail item={selected} go={go} />}{" "}
      {page === "create" && (
        <ListingEditor
          editing={editing}
          onDone={() => {
            setEditing(null);
            go("profile");
          }}
        />
      )}{" "}
      {page === "saved" && (
        <main className="container saved-page">
          <span className="section-kicker">ĐÃ LƯU</span>
          <h1>Món đồ bạn quan tâm</h1>
          <Grid
            items={backend.products.filter((x) => backend.saved.includes(x.id))}
            open={open}
          />
        </main>
      )}{" "}
      {page === "offers" && <OffersPage />}{" "}
      {page === "profile" && (
        <ProfilePage
          editListing={(x) => {
            setEditing(x);
            go("create");
          }}
        />
      )}
      <nav className="mobile-bottom">
        <button onClick={() => go("home")}>Trang chủ</button>
        <button onClick={() => go("explore")}>Khám phá</button>
        <button
          className="add-mobile"
          onClick={() => {
            setEditing(null);
            go("create");
          }}
        >
          <Plus />
        </button>
        <button onClick={() => go("offers")}>Giao dịch</button>
        <button onClick={() => go("profile")}>Cá nhân</button>
      </nav>
      <footer>
        <div className="container footer-inner">
          <Logo go={() => go("home")} />
          <p>Trao lại đồ dùng trong cộng đồng đại học.</p>
          <span>© 2026 UniLoop · Giao dịch trực tiếp, không ký quỹ</span>
        </div>
      </footer>
    </div>
  );
}

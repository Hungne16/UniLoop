import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Heart,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Recycle,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserRound,
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
  getDoc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
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
  rejectOffer,
  reportTarget,
  saveListing,
  saveMember,
  savePaymentQR,
  saveWish,
  removeWish,
  deleteOffer,
  saveReview,
  scheduleMeeting,
  sendChatMessage,
  sendOffer,
  prepareImage,
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
  type ChatMessage,
  type Member,
  type Offer,
  type Report,
  type Verification,
  type Wish,
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
  | "member"
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
  seniorPass: false,
  targetCohorts: "",
};

const localDateInput = (value = new Date()) => {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const meetingLabel = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
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
function SocialLinks({ member }: { member?: Member }) {
  const phone = (member?.phone || "").replace(/[^\d+]/g, ""),
    links = [
      { key: "facebook", label: "Facebook", href: safeURL(member?.facebookURL || ""), icon: "f" },
      { key: "instagram", label: "Instagram", href: safeURL(member?.instagramURL || ""), icon: "◎" },
      { key: "x", label: "X", href: safeURL(member?.xURL || ""), icon: "𝕏" },
    ].filter((item) => item.href);
  if (!links.length && !phone) return null;
  return (
    <div className="social-platform-links" aria-label="Liên hệ mạng xã hội">
      {links.map((item) => (
        <a className={item.key} key={item.key} href={item.href} target="_blank" rel="noreferrer">
          <i>{item.icon}</i><span>{item.label}</span>
        </a>
      ))}
      {phone && (
        <a className="phone" href={`tel:${phone}`}>
          <i><Phone /></i><span>{member?.phone}</span>
        </a>
      )}
    </div>
  );
}

type ToastDetail = { message: string; tone?: "success" | "error" | "info" };
const toast = (message: string, tone: ToastDetail["tone"] = "success") =>
  dispatchEvent(
    new CustomEvent<ToastDetail>("uniloop:toast", {
      detail: { message, tone },
    }),
  );
function ToastHost() {
  const [item, setItem] = useState<(ToastDetail & { id: number }) | null>(null);
  useEffect(() => {
    let timer = 0;
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      setItem({ ...detail, id: Date.now() });
      clearTimeout(timer);
      timer = window.setTimeout(() => setItem(null), 3200);
    };
    addEventListener("uniloop:toast", receive);
    return () => {
      removeEventListener("uniloop:toast", receive);
      clearTimeout(timer);
    };
  }, []);
  return item ? (
    <div className={`app-toast ${item.tone || "success"}`} role="status">
      {item.tone === "error" ? <X /> : <CheckCircle2 />}
      <span>{item.message}</span>
    </div>
  ) : null;
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
  const { user, admin, offers, members, notifications, wishes, products } = useBackend(),
    me = members.find((member) => member.id === user?.uid),
    [open, setOpen] = useState(false),
    [noticeOpen, setNoticeOpen] = useState(false),
    [dark, setDark] = useState(() => localStorage.getItem("uniloop-theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("uniloop-theme", dark ? "dark" : "light");
  }, [dark]);
  const alert = offers.some((o) =>
    ["pending", "countered", "accepted"].includes(o.status),
  ),
    wishMatches = products.filter((product) =>
      wishes.some(
        (wish) =>
          available(product) &&
          product.ownerId !== user?.uid &&
          (wish.school === "all" || product.school === wish.school) &&
          (wish.maxPrice === 0 || product.price <= wish.maxPrice) &&
          matches([product.title, product.description, product.category].join(" "), wish.query),
      ),
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
          <label className="theme-switch" aria-label={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}>
            <input className="theme-switch__checkbox" type="checkbox" checked={dark} onChange={() => setDark((value) => !value)} />
            <span className="theme-switch__container">
              <span className="theme-switch__clouds" />
              <span className="theme-switch__stars-container">✦ · ✧ · ✦</span>
              <span className="theme-switch__circle-container"><span className="theme-switch__sun-moon-container"><span className="theme-switch__moon"><i /><i /><i /></span></span></span>
            </span>
          </label>
          <button
            className="icon-btn notification"
            aria-label="Thông báo"
            aria-expanded={noticeOpen}
            onClick={() => setNoticeOpen((value) => !value)}
          >
            <Bell />
            {(alert || notifications.length > 0 || wishMatches.length > 0) && <i />}
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
                <Avatar member={me} userName={user.displayName || user.email || "U"} />
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
      {noticeOpen && (
        <aside className="notification-panel">
          <div>
            <strong>Thông báo</strong>
            <button onClick={() => setNoticeOpen(false)} aria-label="Đóng">
              <X size={17} />
            </button>
          </div>
          {alert && (
            <button
              className="transaction-alert"
              onClick={() => {
                setNoticeOpen(false);
                go("offers");
              }}
            >
              <Recycle size={18} />
              <span>
                <b>Giao dịch cần chú ý</b>
                <small>Mở để xem đề nghị hoặc lịch hẹn mới.</small>
              </span>
            </button>
          )}
          {wishMatches.length > 0 && (
            <button
              className="transaction-alert wish-alert"
              onClick={() => { setNoticeOpen(false); go("saved"); }}
            >
              <Sparkles size={18} />
              <span><b>Wish Match tìm thấy {wishMatches.length} món</b><small>Mở danh sách để xem món phù hợp nhu cầu.</small></span>
            </button>
          )}
          {notifications.slice(0, 8).map((item) => (
            <article key={item.id}>
              <Bell size={16} />
              <div>
                <b>{item.title}</b>
                <p>{item.message}</p>
                <time>{date(item.createdAt)}</time>
              </div>
            </article>
          ))}
          {!alert && !notifications.length && !wishMatches.length && (
            <p className="notification-empty">Bạn chưa có thông báo mới.</p>
          )}
        </aside>
      )}
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
            toggleSaved(item.id)
              .then(() => toast(isSaved ? "Đã bỏ khỏi danh sách lưu." : "Đã lưu sản phẩm."))
              .catch((reason) => toast(errorMessage(reason), "error"));
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
        {item.seniorPass && <span className="senior-pass-tag">SENIOR → JUNIOR</span>}
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
        <section className="senior-loop-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SENIOR → JUNIOR LOOP</span>
              <h2>Khóa trước truyền lại khóa sau</h2>
              <p>Giáo trình, đồ dùng và kinh nghiệm tiếp tục một vòng đời mới.</p>
            </div>
            <button onClick={() => go("explore")}>Xem khu Senior Loop <ArrowRight /></button>
          </div>
          <Grid items={live.filter((item) => item.seniorPass).slice(0, 4)} open={open} />
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
    [campus, setCampus] = useState("all"),
    [seniorOnly, setSeniorOnly] = useState(false),
    [verified, setVerified] = useState(false),
    [sort, setSort] = useState("new");
  const filtered = useMemo(
    () =>
      products
        .filter(
          (x) =>
            (type === "all" || x.type === type) &&
            (category === "all" || x.category === category) &&
            (campus === "all" || x.school === campus) &&
            (!seniorOnly || x.seniorPass) &&
            (!verified || badges.includes(x.ownerId)) &&
            matches(
              [x.title, x.description, x.category, x.school, x.area].join(" "),
              term,
            ),
        )
        .sort((a, b) =>
          sort === "low" ? a.price - b.price : b.createdAt - a.createdAt,
        ),
    [products, type, category, campus, seniorOnly, verified, sort, term, badges],
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
                setCampus("all");
                setSeniorOnly(false);
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
          <label>
            Khu vực campus
            <select value={campus} onChange={(e) => setCampus(e.target.value)}>
              <option value="all">Tất cả campus</option>
              {UNIVERSITIES.map((school) => <option key={school}>{school}</option>)}
            </select>
          </label>
          <label className="toggle-row">
            Senior → Junior Loop
            <input type="checkbox" checked={seniorOnly} onChange={(e) => setSeniorOnly(e.target.checked)} />
            <span className="toggle" />
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

function WishCenter({ open }: { open: (listing: Listing) => void }) {
  const { user, wishes, products } = useBackend(),
    [busy, setBusy] = useState(false);
  const matched = products.filter((product) =>
    wishes.some(
      (wish) =>
        available(product) &&
        product.ownerId !== user?.uid &&
        (wish.school === "all" || product.school === wish.school) &&
        (wish.maxPrice === 0 || product.price <= wish.maxPrice) &&
        matches([product.title, product.description, product.category].join(" "), wish.query),
    ),
  );
  if (!user) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget,
      data = new FormData(target);
    setBusy(true);
    try {
      await saveWish({
        query: String(data.get("query")),
        school: String(data.get("school")),
        maxPrice: Number(data.get("maxPrice")),
      });
      target.reset();
      toast("Đã lưu Wish Match. UniLoop sẽ đối chiếu món mới realtime.");
    } catch (reason) {
      toast(errorMessage(reason), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="wish-center">
      <div className="wish-intro">
        <span className="section-kicker">WISH MATCH</span>
        <h2>Lưu món bạn đang tìm</h2>
        <p>Ví dụ: “quạt dưới 200k quanh VNU”. Khi có món khớp, chuông thông báo sẽ sáng ngay trong ứng dụng.</p>
      </div>
      <form onSubmit={submit}>
        <label>Nhu cầu<input name="query" required maxLength={150} placeholder="Quạt, giáo trình, bàn học..." /></label>
        <label>Campus<select name="school" defaultValue="all"><option value="all">Tất cả campus</option>{UNIVERSITIES.map((school) => <option key={school}>{school}</option>)}</select></label>
        <label>Ngân sách tối đa<input name="maxPrice" type="number" min="0" max="1000000000" defaultValue="0" /><small>Để 0 nếu không giới hạn.</small></label>
        <button disabled={busy}><Sparkles size={17} />{busy ? "Đang lưu…" : "Tạo Wish Match"}</button>
      </form>
      {wishes.length > 0 && (
        <div className="wish-list">
          {wishes.map((wish: Wish) => (
            <article key={wish.id}>
              <div><strong>{wish.query}</strong><span>{wish.school === "all" ? "Mọi campus" : wish.school} · {wish.maxPrice ? `Tối đa ${money(wish.maxPrice)}` : "Không giới hạn giá"}</span></div>
              <button onClick={() => void removeWish(wish.id).then(() => toast("Đã xóa nhu cầu.")).catch((reason) => toast(errorMessage(reason), "error"))}>Xóa</button>
            </article>
          ))}
        </div>
      )}
      {matched.length > 0 && (
        <div className="wish-results">
          <div className="section-heading compact"><div><span className="section-kicker">ĐÃ KHỚP</span><h2>{matched.length} món phù hợp</h2></div></div>
          <Grid items={matched} open={open} />
        </div>
      )}
    </section>
  );
}

function Detail({
  item,
  go,
  openMember,
}: {
  item: Listing;
  go: (p: Page) => void;
  openMember: (id: string) => void;
}) {
  const { members, badges, user, saved, toggleSaved, ownListings } = useBackend(),
    seller = members.find((x) => x.id === item.ownerId),
    [activeImage, setActiveImage] = useState(0),
    [modal, setModal] = useState(false),
    [price, setPrice] = useState(item.price),
    [message, setMessage] = useState(""),
    [swap, setSwap] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  useEffect(() => setActiveImage(0), [item.id]);
  const submit = async () => {
    if (!user) {
      go("auth");
      return;
    }
    setBusy(true);
    try {
      await sendOffer(item, price, message, swap);
      setNotice("Đã gửi đề nghị. Người đăng có 24 giờ để phản hồi.");
      toast("Đã gửi đề nghị cho người bán.");
    } catch (e) {
      setError(errorMessage(e));
      toast(errorMessage(e), "error");
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
            <img
              key={item.images[activeImage]}
              src={item.images[activeImage]}
              alt={`${item.title} – ảnh ${activeImage + 1}`}
            />
            {item.images.length > 1 && (
              <span className="image-counter">
                {activeImage + 1}/{item.images.length}
              </span>
            )}
          </div>
          <div className="thumbs">
            {item.images.map((src, i) => (
              <button
                className={i === activeImage ? "active" : ""}
                key={`${src}-${i}`}
                onClick={() => setActiveImage(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-pressed={i === activeImage}
              >
                <img src={src} alt={`${item.title} – ảnh nhỏ ${i + 1}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="detail-labels">
            <span>{item.condition}</span>
            {item.negotiable && <span>Có thương lượng</span>}
            {item.seniorPass && <span>Senior → Junior · {item.targetCohorts || "Khóa dưới"}</span>}
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
                toast("Đã gửi báo cáo tới quản trị viên.");
              } catch (e) {
                setError(errorMessage(e));
                toast(errorMessage(e), "error");
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
          <div className="seller-card-reveal">
            <p>{seller?.bio || "Thành viên chưa viết giới thiệu."}</p>
            <SocialLinks member={seller} />
            <button onClick={() => openMember(item.ownerId)}>
              Xem hồ sơ <ArrowRight />
            </button>
          </div>
          <span className="seller-hover-hint">Di chuột để xem thêm</span>
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
                    <small>Hiển thị: {money(price)}</small>
                  </label>
                )}
                {item.type.includes("exchange") && (
                  <div className="swap-picker">
                    <strong>Món bạn muốn dùng để đổi</strong>
                    <p>Chọn một tin đang hoạt động của bạn.</p>
                    <div>
                      {ownListings
                        .filter(
                          (listing) =>
                            available(listing) && listing.id !== item.id,
                        )
                        .map((listing) => (
                          <button
                            type="button"
                            key={listing.id}
                            className={swap === listing.id ? "selected" : ""}
                            onClick={() => {
                              setSwap(listing.id);
                              toast(`Đã chọn ${listing.title} để trao đổi.`, "info");
                            }}
                          >
                            <img src={listing.images[0]} alt="" />
                            <span>
                              <b>{listing.title}</b>
                              <small>
                                {listing.condition} · {money(listing.price)}
                              </small>
                            </span>
                            {swap === listing.id && <CheckCircle2 />}
                          </button>
                        ))}
                    </div>
                    {!ownListings.some(
                      (listing) => available(listing) && listing.id !== item.id,
                    ) && (
                      <small>
                        Bạn chưa có tin đang hoạt động để dùng trao đổi.
                      </small>
                    )}
                  </div>
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
            seniorPass: editing.seniorPass ?? false,
            targetCohorts: editing.targetCohorts ?? "",
          }
        : blank,
    ),
    [files, setFiles] = useState<File[]>([]),
    [imageLinks, setImageLinks] = useState(""),
    [paymentQR, setPaymentQR] = useState(""),
    [qrBusy, setQrBusy] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!auth.currentUser) return;
    getDoc(doc(db, "paymentProfiles", auth.currentUser.uid))
      .then((snapshot) => setPaymentQR(snapshot.data()?.qr || ""))
      .catch(() => {});
  }, []);
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
      if (form.type.includes("sale") && paymentQR)
        await savePaymentQR(paymentQR);
      await saveListing(
        form,
        files,
        status,
        editing || undefined,
        imageLinks.split(/\r?\n/),
      );
      toast(editing ? "Đã cập nhật tin đăng." : status === "draft" ? "Đã lưu bản nháp." : "Đã xuất bản tin đăng.");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      toast(errorMessage(err), "error");
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
          <label className="full field-title">
            Tiêu đề
            <input
              required
              maxLength={150}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <label className="field-type">
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
          <label className="field-price">
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
            <small>
              Hiển thị: {money(form.type === "free" ? 0 : form.price)}
            </small>
          </label>
          {form.type.includes("sale") && (
            <label className="full payment-qr-editor field-qr">
              QR thanh toán của người bán (không hiển thị công khai)
              <div>
                {paymentQR ? (
                  <img src={paymentQR} alt="QR thanh toán đã chọn" />
                ) : (
                  <span className="qr-placeholder">QR</span>
                )}
                <span>
                  <b>{qrBusy ? "Đang tối ưu QR…" : "Tải ảnh QR lên"}</b>
                  <small>
                    QR chỉ được chia sẻ với buyer sau khi đề nghị được chấp nhận.
                  </small>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={qrBusy}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setQrBusy(true);
                    setError("");
                    try {
                      setPaymentQR(await prepareImage(file));
                      toast("Đã nhận QR thanh toán.", "info");
                    } catch (reason) {
                      setError(errorMessage(reason));
                      toast(errorMessage(reason), "error");
                    } finally {
                      setQrBusy(false);
                    }
                  }}
                />
              </div>
            </label>
          )}
          {form.type.includes("exchange") && (
            <label className="full field-exchange">
              Món bạn muốn đổi
              <input
                maxLength={500}
                value={form.exchangeTarget}
                onChange={(event) => set("exchangeTarget", event.target.value)}
                placeholder="Ví dụ: Giáo trình, tai nghe, đồ dùng phòng trọ..."
              />
              <small>Giúp người xem biết bạn đang ưu tiên đổi lấy món gì.</small>
            </label>
          )}
          <label className="field-category">
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
          <label className="field-condition">
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
          <label className="field-school">
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
          <label className="field-area">
            Khu vực ước lượng
            <input
              required
              maxLength={100}
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="Ví dụ: Cầu Giấy"
            />
          </label>
          <label className="toggle-row field-senior-pass">
            Senior → Junior Loop
            <input type="checkbox" checked={form.seniorPass} onChange={(e) => set("seniorPass", e.target.checked)} />
            <span className="toggle" />
            <small>Đánh dấu món đồ muốn truyền lại cho sinh viên khóa dưới.</small>
          </label>
          {form.seniorPass && (
            <label className="field-target-cohorts">
              Khóa muốn truyền lại
              <input required maxLength={100} value={form.targetCohorts} onChange={(e) => set("targetCohorts", e.target.value)} placeholder="Ví dụ: K69–K70" />
            </label>
          )}
          <label className="field-description">
            Mô tả
            <textarea
              required
              maxLength={5000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label className="field-defects">
            Lỗi hoặc điểm cần lưu ý
            <textarea
              required={form.condition === "Cần sửa chữa"}
              maxLength={1000}
              value={form.defects}
              onChange={(e) => set("defects", e.target.value)}
            />
          </label>
          <label className="field-images">
            Ảnh sản phẩm (1–5 ảnh, mỗi ảnh dưới 5MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                setFiles(selectedFiles);
                if (selectedFiles.length)
                  toast(`Đã nhận ${selectedFiles.length} ảnh sản phẩm.`, "info");
              }}
            />
            <small>
              {editing
                ? "Để trống nếu muốn giữ ảnh hiện tại."
                : "Ảnh được tự động nén WebP trước khi lưu. Ảnh đầu tiên là ảnh bìa."}
            </small>
            {files.length > 0 && (
              <span className="selected-file-count">
                <CheckCircle2 size={15} /> Đã chọn {files.length}/5 ảnh
              </span>
            )}
          </label>
          <label className="field-links">
            Hoặc URL ảnh HTTPS, mỗi dòng một ảnh
            <textarea
              value={imageLinks}
              onChange={(e) => setImageLinks(e.target.value)}
              placeholder="https://example.com/anh-san-pham.webp"
            />
          </label>
          <label className="toggle-row field-negotiable">
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
          facebookURL: "",
          instagramURL: "",
          xURL: "",
          phone: "",
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
          facebookURL: "",
          instagramURL: "",
          xURL: "",
          phone: "",
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

function OffersPage({
  openMember,
  openListing,
}: {
  openMember: (id: string) => void;
  openListing: (listing: Listing) => void;
}) {
  const { offers, user, reviews, members, products, ownListings } =
      useBackend(),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [openChat, setOpenChat] = useState(""),
    [meetingOffer, setMeetingOffer] = useState<Offer | null>(null),
    [review, setReview] = useState<
      Record<string, { rating: number; text: string }>
    >({});
  async function act(
    id: string,
    fn: () => Promise<unknown>,
    success?: string,
  ) {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await fn();
      if (success) {
        setNotice(success);
        toast(success);
      }
    } catch (e) {
      setError(errorMessage(e));
      toast(errorMessage(e), "error");
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
      {notice && <p role="status">{notice}</p>}
      <div className="offer-list">
        {offers.length ? (
          offers.map((o) => {
            const incoming = o.sellerId === user.uid,
              counterpartId = incoming ? o.buyerId : o.sellerId,
              counterpart = members.find((item) => item.id === counterpartId),
              exchangeListing = [...products, ...ownListings].find(
                (item) => item.id === o.exchangeListingId,
              ),
              originalListing = [...products, ...ownListings].find(
                (item) => item.id === o.listingId,
              ),
              existingReview = reviews.find(
                (item) => item.offerId === o.id && item.reviewerId === user.uid,
              ),
              reviewEditable =
                !existingReview ||
                Date.now() < existingReview.createdAt + 24 * 60 * 60 * 1000,
              canConfirm =
                o.status === "accepted" &&
                !(incoming ? o.sellerConfirmed : o.buyerConfirmed);
            return (
              <article className="offer-row" key={o.id}>
                <div className="offer-main">
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
                  <div className="counterparty-card">
                    <Avatar member={counterpart} />
                    <div>
                      <small>
                        {incoming ? "Người gửi đề nghị" : "Chủ món đồ"}
                      </small>
                      <strong>{counterpart?.name || "Thành viên UniLoop"}</strong>
                      <span>
                        {[counterpart?.university, counterpart?.major, counterpart?.cohort]
                          .filter(Boolean)
                          .join(" · ") || "Chưa cập nhật thông tin học tập"}
                      </span>
                    </div>
                    <button
                      className="profile-link"
                      onClick={() => openMember(counterpartId)}
                    >
                      <UserRound size={15} /> Hồ sơ
                    </button>
                  </div>
                  {o.message && (
                    <p className="offer-note">
                      <b>Lời nhắn:</b> {o.message}
                    </p>
                  )}
                  {o.exchangeListingId && (
                    <div className="exchange-offer-card">
                      {exchangeListing?.images[0] && (
                        <img src={exchangeListing.images[0]} alt="" />
                      )}
                      <div>
                        <small>MÓN ĐƯỢC ĐỀ XUẤT TRAO ĐỔI</small>
                        <strong>
                          {exchangeListing?.title || "Món đồ trao đổi"}
                        </strong>
                        <span>
                          {exchangeListing
                            ? `${exchangeListing.condition} · ${money(exchangeListing.price)}`
                            : "Mở tin để xem thông tin chi tiết"}
                        </span>
                      </div>
                      {exchangeListing && (
                        <button onClick={() => openListing(exchangeListing)}>
                          Xem món đồ <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="offer-actions">
                  <button
                    className="chat-toggle"
                    onClick={() =>
                      setOpenChat((current) => (current === o.id ? "" : o.id))
                    }
                  >
                    <MessageCircle size={16} />
                    {openChat === o.id ? "Đóng chat" : "Trao đổi"}
                  </button>
                  {incoming && o.status === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          act(
                            o.id,
                            () => acceptOffer(o.id),
                            o.exchangeListingId
                              ? "Đã chấp nhận trao đổi món đồ."
                              : "Đã chấp nhận đề nghị.",
                          )
                        }
                      >
                        Chấp nhận
                      </button>
                      {originalListing?.type !== "exchange" &&
                        !o.exchangeListingId && (
                        <button
                          onClick={() => {
                            const p = Number(prompt("Giá đề xuất lại (đ):"));
                            if (p)
                              act(
                                o.id,
                                () => counterOffer(o, p),
                                "Đã gửi giá đề xuất mới.",
                              );
                          }}
                        >
                          Đề xuất giá
                        </button>
                      )}
                      <button
                        className="danger"
                        onClick={() =>
                          act(
                            o.id,
                            () => rejectOffer(o),
                            "Đã từ chối đề nghị.",
                          )
                        }
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {!incoming && o.status === "countered" && (
                    <button
                      onClick={() =>
                        act(
                          o.id,
                          () => acceptOffer(o.id),
                          "Đã chấp nhận giá mới.",
                        )
                      }
                    >
                      Chấp nhận giá mới
                    </button>
                  )}
                  {(["pending", "countered"].includes(o.status) ||
                    (o.status === "accepted" && !o.buyerConfirmed && !o.sellerConfirmed)) && (
                    <button
                      className={o.status === "accepted" ? "danger" : "secondary"}
                      onClick={() =>
                        act(
                          o.id,
                          () => cancelOffer(o.id),
                          o.status === "accepted" ? "Đã hủy giao dịch và mở lại tin đăng." : "Đã hủy đề nghị.",
                        )
                      }
                    >
                      {o.status === "accepted" ? "Không giao dịch nữa" : "Hủy đề nghị"}
                    </button>
                  )}
                  {o.status === "accepted" && (
                    <>
                      <button
                        onClick={() => setMeetingOffer(o)}
                      >
                        <CalendarDays size={16} />
                        {o.meetingPlace ? "Đổi lịch hẹn" : "Hẹn gặp"}
                      </button>
                      {canConfirm && (
                        <button
                          onClick={() =>
                            act(
                              o.id,
                              () => confirmOffer(o.id),
                              "Đã ghi nhận xác nhận của bạn.",
                            )
                          }
                        >
                          Đã trao nhận
                        </button>
                      )}
                    </>
                  )}
                  {o.meetingPlace && (
                    <div className="meeting-summary">
                      <MapPin size={15} />
                      <span>
                        <b>{o.meetingPlace}</b>
                        {meetingLabel(o.meetingTime)}
                      </span>
                    </div>
                  )}
                  {["accepted", "completed"].includes(o.status) && (
                    <OfferPaymentQR offerId={o.id} seller={incoming} />
                  )}
                  {["cancelled", "rejected"].includes(o.status) && (
                    <button className="delete-transaction" disabled={busy === o.id} onClick={() => {
                      if (!confirm("Xóa giao dịch này khỏi danh sách của cả hai bên? Hành động này không thể hoàn tác.")) return;
                      act(o.id, () => deleteOffer(o.id), "Đã xóa giao dịch.");
                    }}>
                      <Trash2 size={16} /><span>{busy === o.id ? "Đang xóa…" : "Xóa giao dịch"}</span>
                    </button>
                  )}
                  {o.status === "completed" && (
                    <div className="inline-review">
                      <select
                        aria-label={`Số sao cho ${o.title}`}
                        disabled={!reviewEditable || busy === o.id}
                        value={
                          review[o.id]?.rating ?? existingReview?.rating ?? 5
                        }
                        onChange={(e) =>
                          setReview((v) => ({
                            ...v,
                            [o.id]: {
                              rating: Number(e.target.value),
                              text: v[o.id]?.text ?? existingReview?.text ?? "",
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
                        disabled={!reviewEditable || busy === o.id}
                        value={review[o.id]?.text ?? existingReview?.text ?? ""}
                        onChange={(e) =>
                          setReview((v) => ({
                            ...v,
                            [o.id]: {
                              rating:
                                v[o.id]?.rating ?? existingReview?.rating ?? 5,
                              text: e.target.value,
                            },
                          }))
                        }
                      />
                      {reviewEditable ? (
                        <button
                          disabled={busy === o.id}
                          onClick={() =>
                            act(o.id, async () => {
                              await saveReview(
                                o,
                                review[o.id]?.rating ??
                                  existingReview?.rating ??
                                  5,
                                review[o.id]?.text ??
                                  existingReview?.text ??
                                  "",
                              );
                              setNotice(
                                existingReview
                                  ? "Đã cập nhật đánh giá."
                                  : "Đã gửi đánh giá thành công.",
                              );
                              toast(
                                existingReview
                                  ? "Đã cập nhật đánh giá."
                                  : "Đã gửi đánh giá thành công.",
                              );
                            })
                          }
                        >
                          {existingReview ? "Cập nhật" : "Gửi đánh giá"}
                        </button>
                      ) : (
                        <small>Đã hết thời gian chỉnh sửa đánh giá.</small>
                      )}
                    </div>
                  )}
                </div>
                {busy === o.id && <span>Đang xử lý…</span>}
                {openChat === o.id && (
                  <OfferChat
                    offer={o}
                    userId={user.uid}
                    counterpart={counterpart}
                    onClose={() => setOpenChat("")}
                  />
                )}
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
      {meetingOffer && (
        <MeetingModal
          offer={meetingOffer}
          busy={busy === meetingOffer.id}
          onClose={() => setMeetingOffer(null)}
          onSave={(place, time) =>
            act(meetingOffer.id, async () => {
              await scheduleMeeting(meetingOffer, place, time);
              setMeetingOffer(null);
              setNotice("Đã cập nhật lịch hẹn cho hai bên.");
              toast("Đã cập nhật lịch hẹn cho hai bên.");
            })
          }
        />
      )}
    </main>
  );
}

function MeetingModal({
  offer,
  busy,
  onClose,
  onSave,
}: {
  offer: Offer;
  busy: boolean;
  onClose: () => void;
  onSave: (place: string, time: string) => Promise<void>;
}) {
  const previous = new Date(offer.meetingTime),
    validPrevious = !Number.isNaN(previous.getTime()),
    [place, setPlace] = useState(offer.meetingPlace || ""),
    [day, setDay] = useState(
      validPrevious ? localDateInput(previous) : localDateInput(),
    ),
    [time, setTime] = useState(
      validPrevious
        ? previous.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "18:00",
    );

  return (
    <div className="modal-backdrop meeting-backdrop" role="presentation">
      <form
        className="meeting-modal"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(place, new Date(`${day}T${time}`).toISOString());
        }}
      >
        <button type="button" className="close" onClick={onClose}>
          <X />
        </button>
        <span className="section-kicker">LỊCH HẸN GIAO DỊCH</span>
        <h2>Chọn thời gian gặp</h2>
        <p>Thông tin này chỉ hiển thị cho hai bên trong giao dịch.</p>
        <label>
          <MapPin size={17} /> Địa điểm
          <input
            required
            maxLength={300}
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Ví dụ: Sảnh thư viện, cổng A..."
          />
        </label>
        <div className="meeting-fields">
          <label>
            <CalendarDays size={17} /> Ngày gặp
            <input
              required
              type="date"
              min={localDateInput()}
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </label>
          <label>
            <Clock3 size={17} /> Giờ gặp
            <input
              required
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
        </div>
        <button className="meeting-submit" disabled={busy || !place.trim()}>
          {busy ? "Đang lưu…" : "Xác nhận lịch hẹn"}
        </button>
      </form>
    </div>
  );
}

function OfferPaymentQR({
  offerId,
  seller,
}: {
  offerId: string;
  seller: boolean;
}) {
  const [qr, setQR] = useState(""), [open, setOpen] = useState(false);
  useEffect(
    () =>
      onSnapshot(doc(db, "offers", offerId, "payment", "details"), (snapshot) =>
        setQR(snapshot.data()?.qr || ""),
      ),
    [offerId],
  );
  if (!qr) return seller ? null : <p className="payment-unavailable">Người bán chưa tải QR thanh toán.</p>;
  return (
    <div className={`offer-payment ${open ? "open" : ""}`}>
      <button className="payment-trigger" onClick={() => setOpen((value) => !value)}>
        <span className="payment-illustration"><span /><i /></span>
        <span><b>{seller ? "QR đã chia sẻ" : "Thanh toán"}</b><small>{seller ? "Mở để kiểm tra mã QR" : "Mở mã QR của người bán"}</small></span>
        <ArrowRight size={18} />
      </button>
      {open && <div className="offer-payment-qr"><img src={qr} alt="QR thanh toán của người bán" /><div><strong>{seller ? "QR thanh toán đã gửi" : "Quét QR để thanh toán"}</strong><span>Kiểm tra đúng người nhận và món đồ trước khi chuyển khoản.</span></div></div>}
    </div>
  );
}

function OfferChat({
  offer,
  userId,
  counterpart,
  onClose,
}: {
  offer: Offer;
  userId: string;
  counterpart?: Member;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    endRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onSnapshot(
        query(
          collection(db, "offers", offer.id, "messages"),
          orderBy("createdAt", "asc"),
          limitToLast(200),
        ),
        (snapshot) =>
          setMessages(
            snapshot.docs.map(
              (item) => ({ ...item.data(), id: item.id }) as ChatMessage,
            ),
          ),
        (reason) => setError(errorMessage(reason)),
      ),
    [offer.id],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendChatMessage(offer.id, text);
      setText("");
      toast("Tin nhắn đã được gửi.");
    } catch (reason) {
      setError(errorMessage(reason));
      toast(errorMessage(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="offer-chat" aria-label={`Trao đổi về ${offer.title}`}>
      <header>
        <Avatar member={counterpart} />
        <div>
          <strong>{counterpart?.name || "Thành viên UniLoop"}</strong>
          <span>Trao đổi riêng về {offer.title}</span>
        </div>
        <button onClick={onClose} aria-label="Đóng trò chuyện">
          <X size={18} />
        </button>
      </header>
      <div className="chat-messages" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.senderId === userId ? "mine" : "theirs"}`}
            >
              <p>{message.text}</p>
              <time>{
                new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }</time>
            </div>
          ))
        ) : (
          <div className="chat-empty">
            <MessageCircle />
            <p>Chưa có tin nhắn. Hãy bắt đầu trao đổi địa điểm và thời gian gặp.</p>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {error && <p className="chat-error">{error}</p>}
      <form className="chat-compose" onSubmit={submit}>
        <input
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
          placeholder={`Nhắn cho ${counterpart?.name || "người này"}…`}
          aria-label="Tin nhắn"
        />
        <button disabled={busy || !text.trim()} aria-label="Gửi tin nhắn">
          <Send size={17} />
          <span>{busy ? "Đang gửi" : "Gửi"}</span>
        </button>
      </form>
    </section>
  );
}

function TransactionHistory({
  offers,
  memberId,
  members,
  title = "Giao dịch đã hoàn tất",
}: {
  offers: Offer[];
  memberId: string;
  members: Member[];
  title?: string;
}) {
  const completed = offers.filter(
    (offer) =>
      offer.status === "completed" &&
      (offer.buyerId === memberId || offer.sellerId === memberId),
  );
  return (
    <section className="transaction-history">
      <div className="section-heading compact">
        <div>
          <span className="section-kicker">LỊCH SỬ MINH BẠCH</span>
          <h2>{title}</h2>
        </div>
        <span>{completed.length} giao dịch</span>
      </div>
      <div className="transaction-list">
        {completed.map((offer) => {
          const wasSeller = offer.sellerId === memberId,
            counterpartId = wasSeller ? offer.buyerId : offer.sellerId,
            counterpart = members.find((item) => item.id === counterpartId);
          return (
            <article key={offer.id}>
              <div className="transaction-icon">
                <Check size={18} />
              </div>
              <div>
                <strong>{offer.title}</strong>
                <span>
                  {wasSeller ? "Đã trao lại cho" : "Đã nhận từ"} {" "}
                  {counterpart?.name || "Thành viên UniLoop"}
                </span>
              </div>
              <div className="transaction-meta">
                <b>{money(offer.price)}</b>
                <time>{date(offer.updatedAt)}</time>
              </div>
            </article>
          );
        })}
        {!completed.length && (
          <div className="history-empty">
            <Recycle />
            <p>Chưa có giao dịch hoàn tất để hiển thị.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function PublicProfilePage({
  memberId,
  go,
  openListing,
}: {
  memberId: string;
  go: (page: Page) => void;
  openListing: (listing: Listing) => void;
}) {
  const { user, members, products, reviews, offers, badges } = useBackend(),
    member = members.find((item) => item.id === memberId),
    memberListings = products.filter((item) => item.ownerId === memberId),
    feedback = reviews.filter((item) => item.revieweeId === memberId),
    score = feedback.length
      ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1)
      : "—",
    sharedOffers = offers.filter(
      (offer) =>
        offer.status === "completed" &&
        (offer.buyerId === memberId || offer.sellerId === memberId),
    );

  if (!member)
    return (
      <main className="profile-page container">
        <button className="back-link" onClick={() => go("explore")}>
          <ArrowLeft /> Quay lại
        </button>
        <Empty
          title="Không tìm thấy hồ sơ"
          text="Thành viên này chưa cập nhật hồ sơ công khai."
        />
      </main>
    );

  return (
    <main className="profile-page public-profile container">
      <button
        className="back-link"
        onClick={() => go(user ? "offers" : "explore")}
      >
        <ArrowLeft /> Quay lại
      </button>
      <section className="profile-hero">
        <Avatar member={member} />
        <div>
          <span className="section-kicker">HỒ SƠ CÔNG KHAI</span>
          <h1>
            {member.name || "Thành viên UniLoop"} {" "}
            {badges.includes(memberId) && <ShieldCheck />}
          </h1>
          <p>
            {[member.university, member.major, member.cohort]
              .filter(Boolean)
              .join(" · ") || "Chưa cập nhật thông tin học tập"}
          </p>
        </div>
        <div className="profile-metrics">
          <span>
            <b>{score}</b>Điểm uy tín
          </span>
          <span>
            <b>{feedback.length}</b>Nhận xét
          </span>
          <span>
            <b>{memberListings.length}</b>Tin đang mở
          </span>
        </div>
      </section>
      <div className="public-profile-grid">
        <section className="public-about">
          <span className="section-kicker">GIỚI THIỆU</span>
          <h2>Thông tin thành viên</h2>
          <p>{member.bio || "Thành viên chưa viết phần giới thiệu."}</p>
          {badges.includes(memberId) && (
            <div className="verified-note">
              <ShieldCheck /> Đã được UniLoop xác minh thông tin sinh viên
            </div>
          )}
          <SocialLinks member={member} />
        </section>
        <section className="review-panel">
          <span className="section-kicker">ĐÁNH GIÁ THỰC TẾ</span>
          <h2>Người khác nói gì?</h2>
          <div className="public-reviews">
            {feedback.slice(0, 6).map((review) => {
              const author = members.find((item) => item.id === review.reviewerId);
              return (
                <article key={review.id}>
                  <div>
                    <strong>{author?.name || "Thành viên UniLoop"}</strong>
                    <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </div>
                  <p>{review.text}</p>
                </article>
              );
            })}
            {!feedback.length && <p>Chưa có đánh giá cho thành viên này.</p>}
          </div>
        </section>
      </div>
      {user && (
        <TransactionHistory
          offers={sharedOffers}
          memberId={memberId}
          members={members}
          title="Giao dịch đã hoàn tất cùng bạn"
        />
      )}
      {memberListings.length > 0 && (
        <section className="member-listings">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">ĐANG HOẠT ĐỘNG</span>
              <h2>Tin của thành viên</h2>
            </div>
          </div>
          <Grid items={memberListings} open={openListing} />
        </section>
      )}
    </main>
  );
}

function ProfilePage({ editListing }: { editListing: (x: Listing) => void }) {
  const { user, members, ownListings, reviews, verification, badges, offers } =
      useBackend(),
    me = members.find((x) => x.id === user?.uid),
    [form, setForm] = useState({
      name: me?.name || user?.displayName || "",
      university: me?.university || "",
      major: me?.major || "",
      cohort: me?.cohort || "",
      bio: me?.bio || "",
      photoURL: me?.photoURL || "",
      facebookURL: me?.facebookURL || "",
      instagramURL: me?.instagramURL || "",
      xURL: me?.xURL || "",
      phone: me?.phone || "",
    }),
    [avatarBusy, setAvatarBusy] = useState(false),
    [editorOpen, setEditorOpen] = useState(false),
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
        facebookURL: me.facebookURL || "",
        instagramURL: me.instagramURL || "",
        xURL: me.xURL || "",
        phone: me.phone || "",
      });
  }, [me]);
  if (!user) return null;
  const avg = reviews.filter((r) => r.revieweeId === user.uid),
    score = avg.length
      ? (avg.reduce((s, r) => s + r.rating, 0) / avg.length).toFixed(1)
      : "—",
    completed = offers.filter(
      (offer) =>
        offer.status === "completed" &&
        (offer.buyerId === user.uid || offer.sellerId === user.uid),
    ).length,
    verified = badges.includes(user.uid),
    completedFields = [
      form.name,
      form.university,
      form.major,
      form.cohort,
      form.bio,
      form.photoURL,
      form.facebookURL || form.instagramURL || form.xURL || form.phone,
    ].filter((value) => value.trim()).length,
    completion = Math.round((completedFields / 7) * 100);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await saveMember(form);
      await updateProfile(user, { displayName: form.name.trim() }).catch(
        () => undefined,
      );
      setNotice("Đã lưu hồ sơ.");
      toast("Đã cập nhật hồ sơ và tên hiển thị.");
      setEditorOpen(false);
    } catch (err) {
      setError(errorMessage(err));
      toast(errorMessage(err), "error");
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
      toast("Đã gửi yêu cầu xác minh sinh viên.");
    } catch (err) {
      setError(errorMessage(err));
      toast(errorMessage(err), "error");
    }
  };
  const profileAction = async (work: () => Promise<unknown>, message: string) => {
    setError("");
    try {
      await work();
      setNotice(message);
      toast(message);
    } catch (reason) {
      setError(errorMessage(reason));
      toast(errorMessage(reason), "error");
    }
  };
  return (
    <main className="profile-page member-profile-page container">
      <section className="profile-hero">
        <div className="profile-card-label">Member Profile</div>
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
          <p className="profile-bio-line">
            {me?.bio || "Thêm vài dòng giới thiệu để cộng đồng hiểu bạn hơn."}
          </p>
        </div>
        <div className="profile-metrics">
          <span>
            <b>{score}</b>Đánh giá
          </span>
          <span>
            <b>{completed}</b>Đã giao dịch
          </span>
          <span>
            <b>{completion}%</b>Hoàn thiện
          </span>
          <span className={verified ? "verified" : ""}>
            <b><ShieldCheck /></b>{verified ? "Đã xác minh" : "Chưa xác minh"}
          </span>
        </div>
        <button
          className="profile-settings-button"
          onClick={() => setEditorOpen(true)}
          aria-label="Chỉnh sửa hồ sơ"
          aria-expanded={editorOpen}
        >
          <Settings />
          <span>Chỉnh sửa</span>
        </button>
      </section>
      <section className="profile-social-strip">
        <strong>Kết nối với mình</strong>
        <SocialLinks member={me} />
        {!me?.facebookURL && !me?.instagramURL && !me?.xURL && !me?.phone && (
          <button onClick={() => setEditorOpen(true)}><Plus size={16} /> Thêm liên hệ</button>
        )}
      </section>
      {error && <p className="auth-error">{error}</p>}
      {notice && <p className="profile-feedback" role="status">{notice}</p>}
      {editorOpen && (
        <button
          className="profile-settings-scrim"
          onClick={() => setEditorOpen(false)}
          aria-label="Đóng phần chỉnh sửa"
        />
      )}
      <div className={`profile-layout ${editorOpen ? "settings-open" : ""}`}>
        <section>
          <button
            type="button"
            className="profile-settings-close"
            onClick={() => setEditorOpen(false)}
            aria-label="Đóng"
          >
            <X />
          </button>
          <form className="wizard" onSubmit={save}>
            <span className="section-kicker">CÀI ĐẶT HỒ SƠ</span>
            <h2>Chỉnh sửa thông tin</h2>
            <div className="form-grid">
              <label className="full avatar-editor">
                Ảnh đại diện
                <div>
                  <Avatar member={{ ...(me || form), photoURL: form.photoURL } as Member} userName={form.name} />
                  <span>
                    <b>{avatarBusy ? "Đang tối ưu ảnh…" : "Chọn avatar mới"}</b>
                    <small>JPG, PNG hoặc WebP dưới 5 MB</small>
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={avatarBusy}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setAvatarBusy(true);
                      setError("");
                      try {
                        const photoURL = await prepareImage(file);
                        setForm((value) => ({ ...value, photoURL }));
                        toast("Đã nhận ảnh mới. Nhấn Lưu hồ sơ để cập nhật.", "info");
                      } catch (reason) {
                        setError(errorMessage(reason));
                        toast(errorMessage(reason), "error");
                      } finally {
                        setAvatarBusy(false);
                      }
                    }}
                  />
                </div>
              </label>
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
              <label>Facebook<input type="url" placeholder="https://facebook.com/..." value={form.facebookURL} onChange={(e) => setForm((v) => ({ ...v, facebookURL: e.target.value }))} /></label>
              <label>Instagram<input type="url" placeholder="https://instagram.com/..." value={form.instagramURL} onChange={(e) => setForm((v) => ({ ...v, instagramURL: e.target.value }))} /></label>
              <label>X<input type="url" placeholder="https://x.com/..." value={form.xURL} onChange={(e) => setForm((v) => ({ ...v, xURL: e.target.value }))} /></label>
              <label>Số điện thoại<input type="tel" maxLength={20} placeholder="09..." value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} /></label>
            </div>
            <button>Lưu hồ sơ</button>
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
                  <button
                    onClick={() =>
                      void profileAction(
                        () => changeListing(x, "hidden"),
                        "Đã ẩn tin đăng.",
                      )
                    }
                  >
                    Ẩn
                  </button>
                ) : (
                  x.status === "hidden" && (
                    <button
                      onClick={() =>
                        void profileAction(
                          () => changeListing(x, "active"),
                          "Đã hiển thị lại tin đăng.",
                        )
                      }
                    >
                      Hiện
                    </button>
                  )
                )}{" "}
                {!["reserved", "sold"].includes(x.status) && (
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm("Xóa vĩnh viễn tin này?"))
                        void profileAction(
                          () => removeListing(x),
                          "Đã xóa tin đăng.",
                        );
                    }}
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
          <section className="own-review-panel">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">ĐÁNH GIÁ / UY TÍN</span>
                <h2>Người khác nói gì?</h2>
              </div>
              <span>{avg.length} nhận xét</span>
            </div>
            <div className="public-reviews">
              {avg.slice(0, 6).map((review) => {
                const author = members.find(
                  (member) => member.id === review.reviewerId,
                );
                return (
                  <article key={review.id}>
                    <Avatar member={author} userName={author?.name || "U"} />
                    <div>
                      <strong>{author?.name || "Thành viên UniLoop"}</strong>
                      <span>
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                      <p>{review.text}</p>
                    </div>
                  </article>
                );
              })}
              {!avg.length && (
                <p className="profile-review-empty">
                  Chưa có đánh giá. Hoàn tất giao dịch đầu tiên để xây dựng độ
                  uy tín.
                </p>
              )}
            </div>
            <div className="profile-highlights">
              <span><ShieldCheck /> {verified ? "Sinh viên đã xác minh" : "Hồ sơ thành viên"}</span>
              <span><Star /> {score === "—" ? "Thành viên mới" : `${score} sao`}</span>
              <span><Recycle /> {completed} giao dịch hoàn tất</span>
            </div>
          </section>
          <TransactionHistory
            offers={offers}
            memberId={user.uid}
            members={members}
          />
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
    [sentNotifications, setSentNotifications] = useState<
      Array<{ id: string; title: string; message: string; targetType: string; targetId: string; createdAt: number }>
    >([]),
    [tab, setTab] = useState("reports"),
    [verifyTab, setVerifyTab] = useState<Verification["status"]>("pending"),
    [noticeAudience, setNoticeAudience] = useState<"all" | "user">("all"),
    [adminBusy, setAdminBusy] = useState("");
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
    const d = onSnapshot(collection(db, "notifications"), (s) =>
      setSentNotifications(
        s.docs
          .map((item) => ({ ...item.data(), id: item.id }) as (typeof sentNotifications)[number])
          .sort((left, right) => right.createdAt - left.createdAt),
      ),
    );
    return () => {
      a();
      b();
      c();
      d();
    };
  }, [admin]);
  if (!admin) return null;
  const adminAction = async (
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setAdminBusy(key);
    try {
      await action();
      toast(success);
      return true;
    } catch (reason) {
      toast(errorMessage(reason), "error");
      return false;
    } finally {
      setAdminBusy("");
    }
  };
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
  const deleteListingAsAdmin = async (listing: Listing) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "listings", listing.id));
    batch.delete(doc(db, "members", listing.ownerId, "slots", listing.slot));
    await batch.commit();
  };
  const deleteMemberAsAdmin = async (member: Member) => {
    const batch = writeBatch(db),
      now = Date.now();
    batch.set(doc(db, "moderation", member.id), {
      status: "deleted",
      reason: "Tài khoản đã bị quản trị viên xóa khỏi UniLoop",
      updatedAt: now,
    });
    batch.delete(doc(db, "members", member.id));
    batch.delete(doc(db, "studentBadges", member.id));
    batch.delete(doc(db, "paymentProfiles", member.id));
    for (let index = 0; index < 5; index++)
      batch.delete(doc(db, "members", member.id, "slots", String(index)));
    allListings
      .filter(
        (listing) =>
          listing.ownerId === member.id &&
          ["active", "draft", "hidden", "blocked"].includes(listing.status),
      )
      .forEach((listing) =>
        batch.update(doc(db, "listings", listing.id), {
          status: "blocked",
          updatedAt: now,
        }),
      );
    await batch.commit();
  };
  const sendAdminNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget,
      form = new FormData(target),
      targetType = String(form.get("targetType")),
      targetId = targetType === "user" ? String(form.get("targetId")) : "";
    const sent = await adminAction(
      "notification",
      () =>
        addDoc(collection(db, "notifications"), {
          targetType,
          targetId,
          title: String(form.get("title")).trim().slice(0, 120),
          message: String(form.get("message")).trim().slice(0, 2000),
          createdBy: auth.currentUser!.uid,
          createdAt: Date.now(),
        }),
      targetType === "all"
        ? "Đã gửi thông báo tới toàn bộ người dùng."
        : "Đã gửi thông báo riêng.",
    );
    if (sent) {
      target.reset();
      setNoticeAudience("all");
    }
  };
  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Logo />
        <span>QUẢN TRỊ</span>
        {["reports", "listings", "members", "verify", "notify"].map((x) => (
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
                  : x === "verify"
                    ? "Xác minh"
                    : "Gửi thông báo"}
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
                <button
                  disabled={adminBusy === r.id}
                  onClick={() =>
                    void adminAction(
                      r.id,
                      () => report(r, "under_review"),
                      "Đã chuyển báo cáo sang trạng thái đang xem.",
                    )
                  }
                >
                  Đang xem
                </button>
                <button
                  onClick={() =>
                    void adminAction(
                      r.id,
                      () => report(r, "resolved"),
                      "Đã xử lý báo cáo.",
                    )
                  }
                >
                  Đã xử lý
                </button>
                <button
                  onClick={() =>
                    void adminAction(
                      r.id,
                      () => report(r, "rejected"),
                      "Đã bác bỏ báo cáo.",
                    )
                  }
                >
                  Bác bỏ
                </button>
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
                  disabled={adminBusy === x.id}
                  onClick={() =>
                    void adminAction(
                      x.id,
                      () =>
                        updateDoc(doc(db, "listings", x.id), {
                          status: "blocked",
                          updatedAt: Date.now(),
                        }),
                      "Đã khóa tin đăng.",
                    )
                  }
                >
                  Khóa tin
                </button>
                <button
                  className="danger"
                  disabled={adminBusy === x.id}
                  onClick={() => {
                    if (confirm(`Xóa vĩnh viễn tin “${x.title}”?`))
                      void adminAction(
                        x.id,
                        () => deleteListingAsAdmin(x),
                        "Đã xóa tin đăng.",
                      );
                  }}
                >
                  Xóa tin
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
                  disabled={adminBusy === m.id}
                  onClick={() =>
                    void adminAction(
                      m.id,
                      () =>
                        setDoc(doc(db, "moderation", m.id), {
                          status: "restricted",
                          reason: "Vi phạm tiêu chuẩn cộng đồng",
                          updatedAt: Date.now(),
                        }),
                      "Đã hạn chế thành viên.",
                    )
                  }
                >
                  Hạn chế
                </button>
                <button
                  onClick={() =>
                    void adminAction(
                      m.id,
                      () =>
                        setDoc(doc(db, "moderation", m.id), {
                          status: "active",
                          reason: "",
                          updatedAt: Date.now(),
                        }),
                      "Đã khôi phục thành viên.",
                    )
                  }
                >
                  Khôi phục
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      confirm(
                        `Xóa ${m.name} khỏi UniLoop? Tài khoản sẽ bị khóa vĩnh viễn và hồ sơ công khai bị xóa.`,
                      )
                    )
                      void adminAction(
                        m.id,
                        () => deleteMemberAsAdmin(m),
                        "Đã xóa thành viên khỏi UniLoop.",
                      );
                  }}
                >
                  Xóa USER
                </button>
              </article>
            ))}
          </div>
        )}
        {tab === "verify" && (
          <div className="admin-table">
            <h2>Yêu cầu xác minh</h2>
            <div className="admin-subtabs">
              {([
                ["pending", "Chờ xác minh"],
                ["verified", "Đã xác minh"],
                ["rejected", "Đã từ chối"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  className={verifyTab === value ? "active" : ""}
                  onClick={() => setVerifyTab(value)}
                >
                  {label}
                  <span>
                    {verifications.filter((item) => item.status === value).length}
                  </span>
                </button>
              ))}
            </div>
            {verifications
              .filter((item) => item.status === verifyTab)
              .map((v) => (
                <article key={v.id}>
                  <div>
                    <b>{v.schoolEmail}</b>
                    <small>
                      {v.university} · {statusLabel[v.status]}
                    </small>
                    <p>{v.note}</p>
                  </div>
                  {v.status === "pending" && (
                    <>
                      <button
                        disabled={adminBusy === v.id}
                        onClick={() =>
                          void adminAction(
                            v.id,
                            () => verify(v, "verified"),
                            "Đã xác minh thành viên.",
                          )
                        }
                      >
                        Duyệt
                      </button>
                      <button
                        className="danger"
                        disabled={adminBusy === v.id}
                        onClick={() =>
                          void adminAction(
                            v.id,
                            () => verify(v, "rejected"),
                            "Đã từ chối yêu cầu xác minh.",
                          )
                        }
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                </article>
              ))}
            {!verifications.some((item) => item.status === verifyTab) && (
              <Empty
                title="Không có yêu cầu"
                text="Danh sách ở trạng thái này đang trống."
              />
            )}
          </div>
        )}
        {tab === "notify" && (
          <div className="admin-notification-layout">
            <form className="admin-notification-form" onSubmit={sendAdminNotification}>
              <span className="section-kicker">TRUYỀN THÔNG NỘI BỘ</span>
              <h2>Gửi thông báo</h2>
              <label>
                Người nhận
                <select
                  name="targetType"
                  value={noticeAudience}
                  onChange={(event) =>
                    setNoticeAudience(event.target.value as "all" | "user")
                  }
                >
                  <option value="all">Toàn bộ người dùng</option>
                  <option value="user">Một người dùng cụ thể</option>
                </select>
              </label>
              <label>
                Chọn người dùng nếu gửi riêng
                <select
                  name="targetId"
                  defaultValue=""
                  required={noticeAudience === "user"}
                  disabled={noticeAudience === "all"}
                >
                  <option value="">Chọn thành viên</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.university}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tiêu đề
                <input name="title" required maxLength={120} />
              </label>
              <label>
                Nội dung
                <textarea name="message" required maxLength={2000} />
              </label>
              <button disabled={adminBusy === "notification"}>
                <Send size={17} />
                {adminBusy === "notification" ? "Đang gửi…" : "Gửi thông báo"}
              </button>
            </form>
            <section className="admin-table sent-notifications">
              <h2>Đã gửi gần đây</h2>
              {sentNotifications.slice(0, 12).map((notification) => (
                <article key={notification.id}>
                  <div>
                    <b>{notification.title}</b>
                    <p>{notification.message}</p>
                    <small>
                      {notification.targetType === "all"
                        ? "Toàn bộ người dùng"
                        : members.find((item) => item.id === notification.targetId)?.name ||
                          "Người dùng riêng"} {" "}
                      · {date(notification.createdAt)}
                    </small>
                  </div>
                </article>
              ))}
            </section>
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
  "member",
  "offers",
  "admin",
];
const pageFromHash = (): Page => {
  const hash = location.hash.slice(1),
    candidate = (hash.startsWith("member/") ? "member" : hash) as Page;
  return pages.includes(candidate) ? candidate : "home";
};
const memberFromHash = () =>
  location.hash.startsWith("#member/")
    ? decodeURIComponent(location.hash.slice("#member/".length))
    : "";

export default function App() {
  const backend = useBackend(),
    [page, setPage] = useState<Page>(pageFromHash),
    [term, setTerm] = useState(""),
    [selected, setSelected] = useState<Listing | null>(null),
    [selectedMemberId, setSelectedMemberId] = useState(memberFromHash),
    [editing, setEditing] = useState<Listing | null>(null),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const syncHash = () => {
      setPage(pageFromHash());
      setSelectedMemberId(memberFromHash());
    };
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
  const openMember = (id: string) => {
    if (backend.user?.uid === id) {
      go("profile");
      return;
    }
    setSelectedMemberId(id);
    setPage("member");
    location.hash = "member/" + encodeURIComponent(id);
    scrollTo({ top: 0, behavior: "smooth" });
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
    if (page === "member" && !selectedMemberId) go("explore");
  }, [backend.ready, backend.admin, backend.user, page, selected, selectedMemberId]);
  useEffect(() => {
    document.title =
      (selected && page === "detail"
        ? selected.title
        : page === "member"
          ? "Hồ sơ thành viên"
          : "UniLoop Campus Marketplace") + " — UniLoop";
  }, [page, selected]);
  useGSAP(
    () => {
      const targets = root.current
        ? Array.from(
            root.current.querySelectorAll(":scope > main > *, :scope > section > *"),
          )
        : [];
      if (!targets.length) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () =>
        gsap.from(targets, {
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
    { dependencies: [page], revertOnUpdate: true },
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
      <>
        <ToastHost />
        <AuthPage
          initial="login"
          done={(isAdmin) => go(isAdmin ? "admin" : "home")}
        />
      </>
    );
  if (page === "admin")
    return (
      <>
        <ToastHost />
        <AdminPage />
      </>
    );
  return (
    <div ref={root} className="app page-motion">
      <ToastHost />
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
      {page === "detail" && selected && (
        <Detail item={selected} go={go} openMember={openMember} />
      )}{" "}
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
          <WishCenter open={open} />
          <span className="section-kicker">ĐÃ LƯU</span>
          <h1>Món đồ bạn quan tâm</h1>
          <Grid
            items={backend.products.filter((x) => backend.saved.includes(x.id))}
            open={open}
          />
        </main>
      )}{" "}
      {page === "offers" && (
        <OffersPage openMember={openMember} openListing={open} />
      )}{" "}
      {page === "member" && selectedMemberId && (
        <PublicProfilePage
          memberId={selectedMemberId}
          go={go}
          openListing={open}
        />
      )}{" "}
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

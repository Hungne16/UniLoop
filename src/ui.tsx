import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Package, Phone, X } from "lucide-react";
import { initials, safeURL, type Member } from "./domain";

export function Logo({ go }: { go?: () => void }) {
  return (
    <button className="logo" onClick={go} aria-label="UniLoop - Trang chủ">
      <span className="brand-crop">
        <img src="/uniloop-brand.png" alt="UniLoop" />
      </span>
    </button>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Package aria-hidden="true" />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Avatar({
  member,
  userName,
}: {
  member?: Member;
  userName?: string;
}) {
  const name = member?.name || userName || "Thành viên UniLoop";
  return member?.photoURL ? (
    <img className="member-avatar" src={member.photoURL} alt={`Ảnh của ${name}`} />
  ) : (
    <span className="member-avatar fallback" aria-label={`Ảnh của ${name}`}>
      {initials(name)}
    </span>
  );
}

export function SocialLinks({ member }: { member?: Member }) {
  const phone = (member?.phone || "").replace(/[^\d+]/g, "");
  const links = [
    { key: "facebook", label: "Facebook", href: safeURL(member?.facebookURL || ""), icon: "f" },
    { key: "instagram", label: "Instagram", href: safeURL(member?.instagramURL || ""), icon: "◎" },
    { key: "x", label: "X", href: safeURL(member?.xURL || ""), icon: "𝕏" },
  ].filter((item) => item.href);

  if (!links.length && !phone) return null;
  return (
    <div className="social-platform-links" aria-label="Liên hệ mạng xã hội">
      {links.map((item) => (
        <a className={item.key} key={item.key} href={item.href} target="_blank" rel="noreferrer">
          <i aria-hidden="true">{item.icon}</i><span>{item.label}</span>
        </a>
      ))}
      {phone && (
        <a className="phone" href={`tel:${phone}`}>
          <i><Phone aria-hidden="true" /></i><span>{member?.phone}</span>
        </a>
      )}
    </div>
  );
}

type ToastDetail = { message: string; tone?: "success" | "error" | "info" };

export const toast = (message: string, tone: ToastDetail["tone"] = "success") =>
  dispatchEvent(new CustomEvent<ToastDetail>("uniloop:toast", { detail: { message, tone } }));

export function ToastHost() {
  const [item, setItem] = useState<ToastDetail | null>(null);

  useEffect(() => {
    let timer = 0;
    const receive = (event: Event) => {
      setItem((event as CustomEvent<ToastDetail>).detail);
      clearTimeout(timer);
      timer = window.setTimeout(() => setItem(null), 3200);
    };
    addEventListener("uniloop:toast", receive);
    return () => {
      removeEventListener("uniloop:toast", receive);
      clearTimeout(timer);
    };
  }, []);

  if (!item) return null;
  return (
    <div className={`app-toast ${item.tone || "success"}`} role="status" aria-live="polite">
      {item.tone === "error" ? <X aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{item.message}</span>
    </div>
  );
}

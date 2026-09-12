import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart } from "@/lib/store";
import { createOrder } from "@/lib/orders.functions";
import {
  getSavedCheckout,
  saveCheckoutDetails,
} from "@/lib/checkout-profile.functions";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب — GZAF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type FormState = {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
};

const emptyForm: FormState = {
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "Egypt",
};

const GUEST_KEY = "gzaf.guest_checkout";

function readGuestForm(): FormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    return { ...emptyForm, ...parsed };
  } catch {
    return null;
  }
}

function writeGuestForm(form: FormState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(form));
  } catch {
    // ignore
  }
}

function CheckoutPage() {
  const { items, subtotal, clear, hydrated } = useCart();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const submitOrder = useServerFn(createOrder);
  const loadSaved = useServerFn(getSavedCheckout);
  const persistDetails = useServerFn(saveCheckoutDetails);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (isAuthenticated) {
      loadSaved()
        .then((data) => {
          if (cancelled) return;
          setForm({ ...emptyForm, ...data });
          const saved = Boolean(data.first_name && data.line1 && data.city);
          setHasSaved(saved);
          setEditing(!saved);
        })
        .catch(() => {
          if (!cancelled) setEditing(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      const guest = readGuestForm();
      if (guest) {
        setForm(guest);
        const saved = Boolean(guest.first_name && guest.line1 && guest.city);
        setHasSaved(saved);
        setEditing(!saved);
      } else {
        setEditing(true);
      }
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, loadSaved]);

  const update = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const missing: string[] = [];
    if (!form.email.trim()) missing.push("البريد الإلكتروني");
    if (!form.first_name.trim()) missing.push("الاسم الأول");
    if (!form.last_name.trim()) missing.push("اسم العائلة");
    if (!form.phone.trim()) missing.push("رقم الهاتف");
    if (!form.line1.trim()) missing.push("العنوان");
    if (!form.city.trim()) missing.push("المدينة");

    return missing;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const missing = validate();
    if (missing.length) {
      setError(`من فضلك أكمل: ${missing.join("، ")}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const full_name = `${form.first_name} ${form.last_name}`.trim();

      // Persist for next time: server for signed-in users, localStorage for guests.
      if (isAuthenticated) {
        persistDetails({
          data: {
            phone: form.phone.trim() || undefined,
            full_name,
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: form.city.trim(),
            postal_code: "-",
            country: form.country || "Egypt",
          },
        }).catch(() => {});
      } else {
        writeGuestForm(form);
      }

      const { order_number } = await submitOrder({
        data: {
          contact_email: form.email.trim(),
          contact_phone: form.phone.trim() || undefined,
          shipping_address: {
            full_name,
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: form.city.trim(),
            postal_code: "-",
            country: form.country || "Egypt",
            phone: form.phone.trim() || undefined,
          },
          items: items.map((i) => ({
            slug: i.slug,
            name: i.name,
            image: i.image,
            price_cents: Math.round(i.price * 100),
            size: i.size,
            quantity: i.qty,
          })),
          payment_method: "cod",
        },
      });
      clear();
      if (isAuthenticated) {
        navigate({ to: "/account", search: { placed: order_number } });
      } else {
        // Remember last order for the guest so /track can prefill.
        try {
          window.localStorage.setItem(
            "gzaf.last_order",
            JSON.stringify({ order_number, phone: form.phone.trim() }),
          );
        } catch {
          // ignore
        }
        navigate({
          to: "/track",
          search: { order: order_number, phone: form.phone.trim() },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إتمام الطلب.");
      setSubmitting(false);
    }
  };


  const showSummary = hasSaved && !editing;

  return (
    <div className="min-h-screen bg-noir text-paper font-sans flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-couture-red" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
                فودافون كاش · الدفع عند الاستلام
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl italic mb-10">
              إتمام الطلب
            </h1>

            {loading ? (
              <p className="text-paper/50 text-sm">جارٍ التحميل…</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {showSummary ? (
                  <SavedCard form={form} onEdit={() => setEditing(true)} />
                ) : (
                  <>
                    <Section title="بيانات التواصل">
                      <Field
                        label="البريد الإلكتروني"
                        type="email"
                        required
                        value={form.email}
                        onChange={update("email")}
                      />
                      <Field
                        label="رقم الهاتف"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={update("phone")}
                      />
                    </Section>

                    <Section title="عنوان التوصيل">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Field
                          label="الاسم الأول"
                          required
                          value={form.first_name}
                          onChange={update("first_name")}
                        />
                        <Field
                          label="اسم العائلة"
                          required
                          value={form.last_name}
                          onChange={update("last_name")}
                        />
                      </div>
                      <Field
                        label="العنوان (الشارع، المبنى)"
                        required
                        value={form.line1}
                        onChange={update("line1")}
                      />
                      <Field
                        label="شقة، دور، علامة مميزة (اختياري)"
                        value={form.line2}
                        onChange={update("line2")}
                      />
                      <div className="grid md:grid-cols-2 gap-6">
                        <Field
                          label="المدينة / المحافظة"
                          required
                          value={form.city}
                          onChange={update("city")}
                        />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-paper/40">
                        الشحن داخل مصر فقط
                      </p>
                    </Section>

                    {hasSaved && (
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="text-[11px] uppercase tracking-[0.3em] text-paper/60 hover:text-couture-red"
                      >
                        ← إلغاء التعديل
                      </button>
                    )}
                  </>
                )}

                <div className="space-y-3">
                  <h2 className="text-[10px] uppercase tracking-[0.35em] text-paper/50">
                    طريقة الدفع
                  </h2>
                  <div className="border border-white/15 p-5">
                    <p className="font-display italic text-lg text-paper mb-1.5">
                      الدفع عند الاستلام
                    </p>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] text-couture-red">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="w-full bg-couture-red text-paper py-5 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-couture-red-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "جارٍ تأكيد الطلب…"
                    : `تأكيد الطلب · ${subtotal.toLocaleString()} EGP`}
                </button>

                {hasSaved && !editing && (
                  <p className="text-[11px] text-paper/40 text-center">
                    بياناتك محفوظة — لن تحتاج إعادة إدخالها في المرة القادمة.
                  </p>
                )}
              </form>
            )}
          </div>

          <aside className="lg:col-span-5 lg:sticky lg:top-32 self-start">
            <div className="border border-white/10 p-8 bg-black/40">
              <h3 className="font-display text-2xl italic mb-6">طلبك</h3>
              {!hydrated ? (
                <p className="text-paper/50 text-sm">جارٍ التحميل…</p>
              ) : items.length === 0 ? (
                <p className="text-paper/60 text-sm">
                  سلة المشتريات فارغة.{" "}
                  <Link
                    to="/shop"
                    className="text-couture-red border-b border-couture-red"
                  >
                    عودة للمتجر
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <div className="space-y-5 mb-6 max-h-80 overflow-y-auto pr-2">
                    {items.map((i) => (
                      <div
                        key={`${i.slug}-${i.size ?? ""}`}
                        className="flex gap-4 text-sm"
                      >
                        <div className="size-16 bg-black overflow-hidden shrink-0">
                          <img
                            src={i.image}
                            alt={i.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display italic text-base truncate">
                            {i.name}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50 mt-1">
                            {i.size ? `${i.size} · ` : ""}Qty {i.qty}
                          </p>
                        </div>
                        <p className="text-sm text-paper/80">
                          {(i.price * i.qty).toLocaleString()} EGP
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-white/10 my-4" />
                  <div className="flex justify-between text-[11px] uppercase tracking-[0.22em] py-1.5">
                    <span className="text-paper/60">Subtotal</span>
                    <span>{subtotal.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex justify-between text-[11px] uppercase tracking-[0.22em] py-1.5">
                    <span className="text-paper/60">Shipping</span>
                    <span>Complimentary</span>
                  </div>
                  <div className="h-px bg-white/10 my-4" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] uppercase tracking-[0.3em]">
                      Total
                    </span>
                    <span className="font-display text-3xl">
                      {subtotal.toLocaleString()} EGP
                    </span>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function SavedCard({
  form,
  onEdit,
}: {
  form: FormState;
  onEdit: () => void;
}) {
  return (
    <div className="border border-white/15 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red">
          بياناتك المحفوظة
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-[10px] uppercase tracking-[0.3em] text-paper/70 hover:text-couture-red border-b border-white/20 hover:border-couture-red pb-0.5"
        >
          تعديل
        </button>
      </div>
      <div className="text-sm space-y-1.5 text-paper/85">
        <p className="font-display italic text-xl text-paper">
          {form.first_name} {form.last_name}
        </p>
        <p>{form.email}</p>
        {form.phone && <p>{form.phone}</p>}
        <p className="pt-2 text-paper/70">
          {form.line1}
          {form.line2 ? `، ${form.line2}` : ""}
        </p>
        <p className="text-paper/70">
          {form.city} · {form.country}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-[10px] uppercase tracking-[0.35em] text-paper/50">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  type = "text",
  required,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2 block">
        {label}
        {required && <span className="text-couture-red ml-1">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-3 text-sm text-paper transition-colors"
      />
    </label>
  );
}

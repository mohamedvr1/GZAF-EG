# تقرير مراجعة شاملة — GZAF (وضع تحليل فقط)

تم فحص كل الأكواد والراوتس ودوال السيرفر وسياسات RLS. النتائج مرتبة حسب الخطورة، مع مراجع `ملف:سطر`. **لم يتم تعديل أي ملف.**

---

## 🔴 حرج (Critical)

**C1 — الدخول بالإيميل فقط = استيلاء كامل على أي حساب**
`src/lib/email-only-auth.functions.ts:17-77` — دالة عامة بدون auth: لو حد يعرف إيميلك، يدخل حسابك (طلباتك، عنوانك، حالة Le Cercle، معرض الـ AI). لا يوجد OTP ولا رابط تحقق. اتفقنا عليها سابقًا كتنازل عن الأمان مقابل السرعة، لكنها تبقى ثغرة استيلاء كامل يجب تسجيلها.

**C2 — sitemap.xml معطّل عمليًا لمحركات البحث**
`src/routes/sitemap[.]xml.ts:5` — `BASE_URL = ""` مع `// TODO`. كل الروابط نسبية (`/shop`) بدلًا من مطلقة، مما يخالف بروتوكول Sitemap وغالبًا يُرفض الملف بالكامل — فشل فهرسة SEO للموقع كله رغم بذل جهد في Phase 12.

---

## 🟠 عالٍ (High)

**H1 — RTL غير مفعّل عالميًا واللغة مبعثرة عبر رحلة الشراء**
`src/routes/__root.tsx:141` يستخدم `<html lang="en">` بدون `dir`. `dir="rtl"` موجود فقط في `/admin` (`_authenticated/admin/route.tsx:32,40,56`). النتيجة:
- `checkout.tsx` و`track.tsx` عربي بالكامل داخل مستند LTR — النجمة الحمراء `text-couture-red ml-1` (`checkout.tsx:495`) تظهر بالجهة الخطأ.
- `cart.tsx`, `wishlist.tsx`, `limited.tsx`, `auth.tsx`, `site-chrome.tsx` كلها إنجليزية.
- العميل يعبر: Shop (EN) → Cart (EN) → Checkout (AR) → Track (AR) بدون اتجاه ثابت.

**H2 — "فودافون كاش" مذكور في الواجهة لكنه غير مطبّق**
`checkout.tsx:230` يعرض "فودافون كاش · الدفع عند الاستلام"، لكن قسم الدفع (`313-322`) hardcoded COD فقط والاستدعاء (`190`) يبعت دائمًا `payment_method: "cod"`. الـ backend (`orders.functions.ts:74`) والحقل `payment_reference` جاهزين لكن غير متاحين من الواجهة — ميزة ميتة + تضليل للعميل.

**H3 — كل صفحات `_authenticated` (account/admin/concierge) بدون SSR ولا `head()`**
`_authenticated/route.tsx:5` (`ssr: false`) + لا توجد `head()` في أي من 13 ملف تحت `_authenticated/**`. النتيجة: شاشة فارغة أول تحميل، ولا titles/robots meta على شاشات حساسة (`/admin` مثلًا يجب `noindex`).

**H4 — وكيل إنستجرام يستخدم أسعارًا قديمة من الكتالوج الثابت**
`src/lib/instagram-agent.server.ts:53-114` (`callCreateOrder`) يحسب `unit_price_cents` من `catalog.ts` بدلًا من جدول `products` الحي. لو الأدمن غيّر السعر عبر `adminToggleProduct`، الطلبات القادمة من DM ستُنشأ بأسعار قديمة — خلل نزاهة سعرية (بينما checkout البشري صحيح: `orders.functions.ts:109-119`).

**H5 — كوبون WELCOME20 زخرفة بدون تنفيذ حقيقي**
`welcome-popup.tsx:5` كود ثابت، حماية ضعف بـ `localStorage` فقط (يُلتَف عليها بـ incognito). **الأهم:** `checkout.tsx` لا يحتوي على حقل كوبون أصلًا، فـ WELCOME20 (وكل نظام الكوبونات في `admin.functions.ts`) غير قابل للاستخدام من العميل — تضليل لوعد "خصم 20%".

**H6 — شعار 3D يستهلك بطارية/GPU على الموبايل ومعتمد على CDN خارجي**
`src/components/logo-3d.tsx`: `frameloop="always"` + `antialias: true` + `powerPreference: "high-performance"` + `<Environment preset="studio">` (HDRI) + خط `Text3D` من `https://threejs.org/examples/fonts/gentilis_bold.typeface.json` بدون fallback. لو CDN مقطوع، الشعار يختفي بصمت. على أندرويد اقتصادي = مشاكل حرارة/إطارات.

---

## 🟡 متوسط (Medium)

**M1** — `product.$slug.tsx:109`: صورة منتج بـ `alt=""` (ليست زخرفية).
**M2** — `site-chrome.tsx:93-117`: `FooterCol`/`FooterItem` معرّفة ولا تُستخدم (dead code من إعادة تصميم فوتر مُلغى).
**M3** — `public/robots.txt`: يمنع `/_authenticated/` وهو Layout prefix وليس URL حقيقي؛ الصح `/account`, `/admin`, `/concierge`. (تأكدنا: لا وجود لأي إشارات "studio" متبقية.)
**M4** — `orders.functions.ts:273-309` (`trackOrder`): endpoint عام بدون rate limiting — عرضة لهجمات brute-force على تركيبات order_number + آخر أرقام موبايل.
**M5** — `checkout.tsx:161,178`: `postal_code` مضبوط بـ `"-"` بشكل دائم رغم وجود قيمة محفوظة في `getSavedCheckout` — يُهدر كل مرة رغم وعد "بياناتك محفوظة" (`checkout.tsx:339`).
**M6** — `orders.functions.ts:39-43`: فاحص السبام بالـ AI يعتبر أي فشل = "not spam" بدون أي تنبيه للأدمن؛ لو الـ AI معطل لفترة، لا تعرف.

---

## 🟢 منخفض (Low)

**L1** — 3 مشتركين مستقلين على `supabase.auth`: `use-auth.ts:20,26` + `_authenticated/route.tsx:7` + `__root.tsx:160`. يُفضّل توحيدهم في context واحد.
**L2** — `limited.tsx:118-124`: يعرض passphrase داخل `<details>` مع نص يعترف بأن إرسال Gmail غير مفعّل حتى الآن — flow ناقص معلوم.
**L3** — `sitemap.xml` يفتقد `/privacy`, `/terms`, `/cookies`, `/track`, `/wishlist`, `/cart`, `/limited` رغم إمكانية فهرسة بعضها.
**L4** — `admin.functions.ts:30-38`: إحصائية "الإيرادات" تجمع كل الطلبات بغض النظر عن `status` (يشمل `cancelled`) — الرقم مضخّم.

---

## ✅ ما هو سليم (لا يحتاج عمل)

- كل server functions مراجَعة تستخدم `requireSupabaseAuth` + `assertAdmin` بشكل صحيح، و`supabaseAdmin` يُستورد lazy داخل الـ handler دائمًا.
- سياسات RLS على `orders`, `order_items`, `addresses`, `profiles`, `garment_generations`, `chat_threads/messages` مضبوطة على `auth.uid()` مع escalation عبر `has_role()`.
- Webhooks تليجرام وإنستجرام تتحقق من HMAC / timing-safe signature قبل المعالجة.
- `createOrder` يعيد استخراج السعر من DB (منع تلاعب العميل بالسعر).

---

## ❓ أسئلة تحتاج فحص وقت التشغيل

- هل جدول `coupons` يحتوي فعلًا على WELCOME20 مع `max_uses`؟
- هل يوجد rate-limiting على مستوى edge أمام `/track` و`emailOnlyPrepareSignIn` غير مرئي في الكود؟
- لم أشغّل `bun run build` — أي أخطاء TypeScript خارج القراءة الثابتة غير مؤكدة.

---

## ما التالي؟

هذا التقرير جاهز للمراجعة فقط. لو تحب أبدأ إصلاح، اختر:
1. **إصلاح كل الحرج + العالي فقط** (C1, C2, H1–H6) — الأولوية.
2. **إصلاح الحرج + العالي + المتوسط**.
3. **اختيار بنود محددة بالأرقام** (مثلًا: "نفّذ C2 و H2 و H5 فقط").

قلي رقم الخيار أو البنود المحددة، وأنا أنتقل لوضع البناء بخطة تنفيذ منفصلة.

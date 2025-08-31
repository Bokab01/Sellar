Pay‑as‑You‑Grow + Business Plans (end‑to‑end, mobile + backend + payments)

Build a complete monetization system from scratch that powers both a credit‑based “Pay‑as‑You‑Grow” catalog and monthly Business Plans. Implement backend, payments, mobile integration, real‑time UX, and testing.
- -
- Scope and stack
Mobile app: React Native/Expo + TypeScript
Backend: Supabase Postgres + RLS, RPCs, Edge Functions (or Node server if preferred)
Payments: Paystack (card + Ghana mobile money) with webhooks; swap provider if needed
Goal: users buy credits and spend them on features; subscribe to business plans for bundled entitlements
- Feature catalog with prices (implement exactly)
Credit packages (one‑off):
Starter: 50 credits — GHS 10 (≈ GHS 0.200/credit)
Seller: 120 credits — GHS 20 (≈ GHS 0.167/credit)
Pro: 300 credits — GHS 50 (≈ GHS 0.167/credit)
Business: 650 credits — GHS 100 (≈ GHS 0.154/credit)
Listing rule:
5 free active listings per user; each additional listing costs 10 credits
Pay‑as‑You‑Grow features (charged in credits):
Visibility: Pulse Boost (24h) 15; Mega Pulse (7d) 50; Category Spotlight (3d) 35
Management: Ad Refresh 5; Auto‑Refresh (30d) 60; Direct to WhatsApp 20
Business a‑la‑carte: Business Profile 50; Analytics Report 40; Priority Support 30
Business Plans (monthly, cash‑priced):
Starter Business — GHS 100: 20 boost credits (3‑day), up to 20 active listings, Business badge, Basic analytics
Pro Business — GHS 250: 80 boost credits (60×3‑day + 20×7‑day), unlimited listings, Business + Priority Seller badges, Auto‑boost (3 days), Advanced analytics
Premium Business — GHS 400: 150 boost credits (3/7/flexible mixes), unlimited listings, Premium branding/homepage placements, Full analytics, Priority support, extras (e.g., account manager, sponsored posts)
- Backend deliverables
Data model (Postgres):
user_credits, credit_transactions, credit_purchases, feature_purchases
subscription_plans, user_subscriptions (current, status, period), plan_entitlements (optional) or fields on plans
paystack_transactions (all payment intents), paystack_authorizations (optional), webhook_events (optional)
RPCs (server‑enforced business logic):
add_user_credits(user_id, amount, reason, ref_id?, ref_type?)
spend_user_credits(user_id, amount, reason, ref_id?, ref_type?) with atomic balance checks
complete_credit_purchase(purchase_id, payment_ref)
handle_new_listing(listing_json, user_id): free vs 10‑credit rule, returns created listing + billing info
purchase_feature(user_id, feature_key, credits, metadata) → records spend + feature activation
subscribe_to_plan(user_id, plan_id, payment_ref) → activate entitlements, period bounds
get_entitlements(user_id): normalized view of badges, analytics tier, boost credits, listing limits, extras
Payments (Edge Functions):
paystack-initialize (card) and paystack-charge (mobile money): create DB transaction, call gateway, update status, return client payloads
paystack-webhook: verify signature, idempotently mark success, route by purpose: credits purchase → add credits; plan subscribe → activate plan; direct feature purchase (if used)
Number normalization & provider detection for Ghana mobile money
Security:
RLS on all user tables; mutations only via RPC/Edge Functions (service role)
Idempotency and double‑spend guards; never trust client for credit math
- Mobile deliverables
Constants
CREDIT_PACKAGES, FEATURE_CATALOG, BUSINESS_PLANS with labels/prices/durations
Per‑credit GHS estimator using last package or default 0.167; always show credits + GHS estimate
Services
apiClient (Supabase client or REST)
paymentService (Paystack): initialize card/mobile money, handle pending, surface references
monetizationService: getBalance, getTransactions, purchaseCredits(pkgId), spendCredits(amount, reason, meta), buyFeature(key, meta)
subscriptionService: getCurrentPlan, subscribe(planId), cancel, getEntitlements()
State (Zustand)
creditsStore: balance, lifetimeEarned/Spent, transactions; actions: refresh, subscribeRealtime, purchase, spend
featureAccessStore: accessByKey, hasAccess(key), refresh, ensureAccessOrPrompt(key, onSuccess)
subscriptionStore: currentPlan, entitlements, refresh, subscribe(planId); derived: isUnlimitedListings, availableBoostTypes
Screens/components
MyAccountHub: live balance, quick links (Buy Credits, Feature Marketplace, Plans)
BuyCreditsScreen: packages, payment flow, success/pending handling
FeatureMarketplaceScreen: categories, affordability badges, listing picker, purchase flows
SubscriptionPlansScreen: compare three plans, subscribe/upgrade, reflect current plan
BusinessSetupScreen: collect business info; unlock Business Profile (50 credits) if not active
AnalyticsScreen (gated): 7‑day trends, engagement; locked state with upgrade CTA
PrioritySupportScreen (gated): WhatsApp Business deep link, SLA, CTA when locked
ListingPaymentModal: enforce “5 free then 10 credits”; pay or buy credits
UnifiedPaymentModal: mobile money/card, validation, pending UX; invoke onSuccess to refresh stores
Badges/Chips: BusinessBadge, PrioritySellerBadge, PremiumBadge, PrioritySupportChip; show on listings/profile/chat/support
App‑wide integration
Listings creation: pre‑publish check via handle_new_listing; invoke modal as needed
Listing cards/detail: show badges and boosted markers; premium theming for Premium users
Search/category lists: “Business” indicator for business sellers
Support entry: show PrioritySupportChip if active; plan upsell if not
Upsells: frequent boost buyer → recommend Pro; analytics locked → prompt; repeated help → Priority Support prompt
- UX rules
Buttons disable while loading/insufficient credits; always offer “Buy credits”
Pending MoMo: show “approve on your phone” banner; background refresh on focus
Reflect entitlements instantly post‑purchase/subscribe (refresh stores and re‑query get_entitlements)
- Telemetry (names/payloads)
credits_purchase_started/succeeded/failed {package_id, amount_ghs}
feature_purchase_* {feature_key, credits, listing_id?}
plan_subscribe_* {plan_id, price_ghs}
listing_publish_gate_shown/paid {needs_payment, credits_charged}
upsell_shown/accepted/dismissed {context, recommended_plan}
- Testing & acceptance
Credits: buy each package; balance updates in real time; transaction history recorded
Listing rule: 5 free enforced; 10‑credit payment path works; fallback to Buy Credits works
Features: each purchase works and applies immediately; locked states resolve after purchase
Plans: each plan subscribes; entitlements update (boost credits, listing limits, badges, analytics, support)
Webhooks: idempotent processing; double‑submit safe; invalid signature rejected
Offline: views cached; purchases blocked with clear messaging
Performance: no duplicate requests; memoized entitlements; virtualized long lists
- Deliverable artifacts
Schema and RPC SQL, Edge Functions code, service modules, Zustand stores
Screens/components wired into navigation with routes:
/buy-credits, /feature-marketplace, /subscription-plans, /business-setup, /analytics, /priority-support
Minimal README for env vars and flows; sandbox test script for payments
- Copy (concise, value‑forward)
“Unlock with 50 credits”, “Pay 10 credits”, “Buy credits”, “Save with a Business Plan”, “Includes 80 boost credits + unlimited listings + auto‑boost”
Build to these exact prices and features. Charge features in credits, plans in GHS. Use secure webhooks and RPCs for all credit mutations.
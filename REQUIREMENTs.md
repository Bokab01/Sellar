Project summary:
Now that there is a comprehensive design system in place, build and fully integragrate with Supabase a production-ready React Native (TypeScript) mobile marketplace app called 'Sellar' which will be launced in Ghana with five bottom tabs — Home, Inbox, Create (icon-only), Community, and More — featuring wide listing cards, integrated chat with offers-as-chat-messages, Facebook-style community, user profile & wallet/credit, location-aware header, and full dark/light theming.

Goals & constraints

Mobile-first UX, iOS + Android parity (use Expo).

TypeScript throughout. Zustand (or context) for local UI state, Supabase for auth, Realtime and storage.

Pixel-accurate, production-ready UI with smooth animations, accessible components, resilient offline behavior, and robust error handling.

Privacy & security: minimize personal data exposure, follow OWASP Mobile Top 10 basics.

Tech-stack (recommended)

Navigation: React Navigation (Bottom Tabs + nested stacks)

State: Zustand (global UI state like theme, user, location)

Media: Supabase Storage + image resizing (on upload)

Real-time: Supabase Realtime

Notifications: Expo Push Notifications

Testing: Jest + React Native Testing Library + Detox or Appium for E2E
Paystack for payments.
All screens should allow safe-area insets. BUT listing cards on Home should be full-bleed (edge-to-edge) — they must ignore container horizontal padding and span screen width minus any screen-edge margin you define in layout. (I'll give component layout rules below.)
Accessible typography (font-sizes, contrast above WCAG AA).
Responsive to screen widths; listing card height should be dynamic to image aspect-ratio.

Navigation

Bottom tabs (centered icons):

Home (stack)

Inbox (stack)

Create (FAB-like icon, modal stack)

Community (stack)

More (stack)

Each tab is a stack navigator for inner flows. The Create tab opens a full-screen modal for creating a listing (multi-step wizard).

Detailed screen specs & components
1) Home

Header (top area):

Left: Profile card (compact) that shows:

Avatar (tap opens full profile).

Greeting: Hey, <FirstName> 👋

Available credit: Credit: X.XX (link to wallet/rewards).

Small chevron to open profile.
Right: Notification icon (bell with badge) and Favourite icon (heart / saved).
Below header: Show user's current location — formatted: 📍 <City, Area> with a tap-to-change location control (open location picker).

Search & categories:
Search bar full-width (below header). Typeahead/autocomplete for listings and categories.
Category "pills" horizontally scrollable under search — tappable filter chips; support multi-select.
Listings list
Acceptance criteria for Home:
Header shows profile card, user location, and credit; search and category pills present; listing cards are visually full-bleed (not constrained by screen padding).

2) Inbox (Chat + Offers)
General:

Chat list (like WhatsApp) with contact avatar, last message preview, unread badge, time, search.
Use real-time updates (presence, typing indicators).
Conversation thread:
Messages appear in speech-bubble style (incoming left / outgoing right), with timestamps and delivered/read receipts. Show last seen / online status in thread header.
Show message grouping by date separators.
Support image messages: camera, gallery, and drag/drop for web preview. Images should show thumbnail in-thread; tap to fullscreen viewer.
Support attachments: images and listing links.
Offer system (in-chat first-class object):
Offer must be rendered as a chat message card in the thread (not a separate flow).
Offer card elements:
Item preview (small image + title + price suggestion).
Offer price proposed by sender.
Expiry (3 days).
Buttons inline: Accept, Reject, Counter.
When Counter tapped: opens a modal inline in the chat to propose a new price; that counter becomes the next offer message.
When Accept: updates chat with Offer accepted by <User> and triggers back-end state change (e.g., reserve listing, notify listing owner).
When Reject: show rejected state and allow optional rejection reason.
Each offer message must be timestamped, track statuses (pending, accepted, rejected, countered) and be part of the message history (searchable).
Offers must support edits/counters and record the offer negotiation chain inside the thread.

Calls:
Thread header includes Call icon that opens the phone dialer to the other user's phone number (use tel: link). Add safeguards: show number only if both users consented to share or after in-app handshake.

Read receipts & last seen:
Implement delivered, read and typing indicators similar to WhatsApp.
last seen shown in thread header with absolute time format (e.g., last seen 7:12 PM), updated in real-time.
Moderation:
Report conversation, block user, or export chat. Content flagged should be sent to moderation queue.
Acceptance criteria for Inbox:
Chat feels like WhatsApp: message bubbles, last seen, typing indicators, images in-thread, and fully integrated offer cards with accept/reject/counter actions handled inline.

3) Create (center icon-only)

Center tab is icon-only large FAB in the bottom nav (a circle floating style).
Tapping opens a multi-step Create Listing modal:
Photos (multi-image upload + reorder + cover pick) - use the custom image picker and maximun of 8 images. Give a hint that when tapped will open a dialog on how to take quality image to promote sales
Title & Description
Category(comprehensive hierrachy)
Pricing (Buy Now, Accept Offers toggle)
Location & Shipping options
Preview & Publish: add the ability to apply boost or plan based on the available credit or plan - see monetisation strategy
Validate fields; image compression and upload to storage; show upload progress.
After publish, show a toast (custom)

4) Community
Feed:
Infinite-scroll feed with posts (text and images ), similar feel to Facebook.
Each post: author, author rating(stars), timestamp, content, image, reactions (like/unlike), follow/unfollow, comment count, share, save, report.
Comments:
Nested replies (threaded), edit/delete own comments, report comments.
Support likes for comments.
Moderation flags and a report flow with categories.
Create post composer with text, images, link preview, tagging people and location, tagging user's active listing
Sidebar:
Slide-in or left rail (depending on device size) with:
Community options: My posts, Following, Groups, Events, Policies etc
Filters: trending, latest, local.
Groups and events optional (but include placeholders in requirements).

Engagement:

Push notifications for comments, mentions, replies, and post reactions.
Follow/unfollow users.
Moderation/Trust & Safety:
Auto-moderation hints (bad words, image scan), manual report queue, and admin roles.
Rate limits and spam detection.
Acceptance criteria for Community:
Feed with posts, likes/comments/replies, report flow, and sidebar with filters and actions.

5) More
Menu with:
Profile (view & edit)
Settings (theme, notifications, privacy, blocked users)
My account( placeholder)
Rewards / Wallet / Available credit (link to wallet)
My Listings (active, sold, drafts)
Reviews (received & made)
Payments & payouts (if enabled)
Help & Support (contact, FAQ)
Invite friends, Logout
User/business verification
Settings:
Dark/light/system theme 
Notification preferences (push, email)
Privacy controls (phone visibility for calls)
Data export & delete

UX flows (important ones)
Offer negotiation flow (in-chat)
User A sends an offer message referencing Listing X with price P1.
Offer message appears in thread with Accept / Reject / Counter buttons.
User B taps Counter → inline modal prompts for new price and optional message → sends new offer as new offer message; previous offer marked countered.
When Accept -> update offer status to accepted, create backend reservation, notify both parties, optionally direct to checkout.
All actions append system messages in-thread: e.g. You accepted offer £X.

Edge cases:
If listing is sold elsewhere, show offer expired: listing unavailable.
Offer expiry countdown if configured.
Image sending
Select multiple images -> compress/rescale on client -> upload to Storage, return URLs -> send message with image urls -> show thumbnails -> tap to view full-screen.
Provide CSS-in-JS / styleguides for full-bleed listing cards: container: { paddingHorizontal: 0 }, card: { marginHorizontal: 16, width: screenWidth-32 }.
Offline & sync behavior
Chat: keep a local cache (SQLite or AsyncStorage) so messages show when offline; queue outgoing messages and sync when online.
Listings: cache recently viewed listings.
Conflict resolution: server timestamp preferred; client assigns temporary UUID until confirmed.
Analytics, monitoring & moderation
Performance & optimization
Lazy-load heavy components.
Use progressive image loading (blur up).
Implement pagination / cursors for lists.
Batch UI updates for message streams.

Testing & QA

Unit tests for critical logic (offer state machine, auth flows).
Integration tests for API endpoints.
E2E tests for flows: create listing, send offer, accept offer, chat image send.
Manual QA checklist: full-bleed card rendering on Android/iOS notch/safe areas, dark/light theme correctness, call link, image upload, offer actions.
Accessibility
All interactive elements have accessible labels.
Sufficient contrast for text in both themes.
Support dynamic font sizes.
Deliverables & milestones (example)
Repo + starter app + CI (skeleton navigation and tabs).
Home screen: header + search + category pills + full-bleed listing cards.
Create flow + image upload.
Inbox: chat UI + image messages.
Offer system integrated in chat + backend flows.
Community feed + comments + report.
More screen + profile + settings + theme toggle.
Polish: offline sync, push notifications, analytics, Sentry.
QA & app store release build.
Acceptance criteria (short)
5 bottom tabs implemented with correct stacks and Create as modal.
Home header shows greeting, credit, and user location.
Listing cards are edge-to-edge visually (ignore screen container padding).
Chat is WhatsApp-like with images and presence and supports offer messages that can be accepted, rejected, and countered inline.
Community has feed, likes, comments, replies, and reporting.
More includes profile, settings, rewards, my listings, reviews.
Dark and Light themes implemented
Optional / future features
Auto-moderation image scanning (vision API).
Localization (i18n) and currency conversion.
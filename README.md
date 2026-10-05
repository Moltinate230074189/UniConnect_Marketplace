# Campus Connect Marketplace

Build a mobile-first, responsive full-stack campus e-commerce web application called "UniConnect" ("Buy. Sell. Connect. Together.") tailored for university students, faculty, and local vendors.

---
### 1. Visual Design & Theme System
- Primary Colors: Emerald Green (#16A34A / #15803D) for brand highlights and headers, Dark Navy Blue (#0F172A / #1E3A8A) for hero banners and primary buttons, Neutral Grays for form inputs and backgrounds.
- Layout: Mobile-first responsive layout (optimized for smartphone screens, centered card preview on desktop).
- Typography & Badges: Clean modern sans-serif, rounded corners (rounded-xl), subtle card elevation.
- Currency: South African Rand (ZAR / R).

---
### 2. Screen & Flow Architecture (Based on UI Mockups)

1. Splash Screen:
   - Centered UniConnect brand logo (two hands shaking framing a shopping bag).
   - Brand name: "UniConnect" with subtitle: "Buy. Sell. Connect. Together."
   - Link / auto-transition to Login.

2. Auth - Login Screen:
   - Logo and title "UniConnect", "Hi, Welcome! Login to continue".
   - Inputs: Email address, Password.
   - Checkbox: "Remember me" alongside "Forgot password?" link.
   - Primary button: "Log in" (Dark blue).
   - "Or with" divider with OAuth buttons: Facebook, Google, and Instagram icons.
   - Navigation link to Registration.

3. Auth - Sign Up Screen:
   - Header with logo and "Create an account!".
   - Social Sign up buttons: "Continue with facebook", "Continue with Apple", "Continue with Google".
   - Divider: "Or".
   - Form fields: Email address (validate student/university domains), Password, School/Campus dropdown selector.
   - Checkbox: "I agree to the Terms of service and Privacy policy."
   - CTA button: "Sign up".

4. Home & Marketplace Hub:
   - Top Header Bar (Emerald Green): UniConnect logo, search bar ("Search"), Inbox/Message icon with badge, Notification bell icon, and User Profile avatar.
   - Hero Banner (Navy Blue):
     - Headline: "FIND & SELL EVERYTHING ON CAMPUS"
     - Button: "Browse all products"
   - Category Grid (interactive cards with light gray background and icon badges):
     - "Books & Stationary"
     - "Electronics & Gadget"
     - "Fashion & Accessories"
     - "Sports & Fitness"
     - "Project & Lab equipment"
   - "Recently Added" Feed:
     - Product cards displaying product image, title, specs, and price in ZAR (e.g., "Scientific Calculator Casio FX 991EX - R400", "Wireless Headphones JBLWH-991EX - R500", "MI Power Bank 10 000mAh - R500").

5. Product Details Screen:
   - Header with tabs: HOME, SHOP, ABOUT, CONTACT, and Profile avatar.
   - High-res product image gallery/carousel.
   - Product title (e.g., "Beribes Bluetooth Headphones: Over-Ear Headphone with Microphone"), Price (R600.00).
   - Action buttons: "Add to cart" and "Buy now".
   - Expandable specs accordion: Material, Color picker (Black, etc.), Size tag ("one-size").
   - Customer Reviews card (Green accent container): reviewer photo/avatar, name (e.g., "Sino K. - Verified user"), and review comment ("Very good product").

6. Cart & Checkout Flow:
   - Step indicator: [✓ Cart] ─── [● Review]
   - Checkout Step 1 (Shipping Information):
     - Toggle selector: [🚚 Delivery] vs [🏬 Pickup].
     - Inputs: Full name *, Email address *, Phone number *, Country dropdown, City, State/Province, Zip code.
     - Checkbox: "I have read and agree to the terms and conditions".
   - Checkout Step 2 (Review Cart & Payment):
     - Line items list with thumbnails, product names, quantity controls (e.g., Bluetooth Headphones 1x R600, Calculator 1x R600).
     - Discount code input with "Apply" button.
     - Price breakdown: Subtotal (R600.00), Shipping (R110.00), Discount (-R50.00), Total (R660.00).
     - CTA Button: "Pay Now" (Blue).
     - Trust badge footer: "🔒 Secure Checkout - SSL Encrypted" (integrated for mock/sandbox PayFast or card payment).

7. User Profile & Settings Drawer:
   - User profile avatar, role badge ("Administrator" or "Student"), and email.
   - Navigation links with icons:
     - Account Details
     - Billing info
     - Settings
     - Password / Security (including Two-Factor Authentication toggle)
     - Sign Out

8. Community Bulletin Board:
   - A dedicated tab/section for campus announcements, lost & found items, and student notices with an "Add Announcement" dialog.

---
### 3. Backend & Supabase Architecture

1. Tables & Relationships:
   - `profiles`: id (references auth.users), full_name, email, role (student, vendor, admin), campus_name, avatar_url, created_at.
   - `categories`: id, name, slug, icon_name.
   - `products`: id, vendor_id (fk profiles), category_id (fk categories), title, description, price (numeric), condition, stock, images (text array), created_at.
   - `orders`: id, buyer_id (fk profiles), fulfillment_type ('delivery' | 'pickup'), shipping_address (jsonb), subtotal, shipping_fee, discount, total, status ('pending', 'paid', 'completed', 'cancelled'), created_at.
   - `order_items`: id, order_id (fk orders), product_id (fk products), quantity, price.
   - `reviews`: id, product_id (fk products), user_id (fk profiles), rating (1-5), comment, is_verified_purchase (boolean).
   - `bulletin_posts`: id, author_id (fk profiles), title, content, tag ('announcement', 'lost_and_found', 'service'), created_at.

2. Security & Policies (RLS):
   - Row Level Security enabled across all tables.
   - Anyone authenticated can read active products, categories, reviews, and bulletin posts.
   - Only item owner can edit/delete their listing or post.
   - Orders readable only by buyer and admin/vendor.

3. Mock Data:
   - Pre-populate database with seed data for all categories shown in the design and sample campus items with prices in ZAR (R400, R500, R600).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://uni-connect-marketplace.vercel.app/

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/360ecb85-6d13-48a1-a0b8-56c730fc47c1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

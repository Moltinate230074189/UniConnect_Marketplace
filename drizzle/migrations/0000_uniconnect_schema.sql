create type public.app_role as enum ('admin','vendor','student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, campus_name text, avatar_url text,
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, campus_name, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'campus_name', new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique, icon_name text not null
);
grant select on public.categories to authenticated, anon;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories readable" on public.categories for select using (true);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null, description text, price numeric(10,2) not null,
  condition text default 'Used - Good', stock int not null default 1,
  images text[] not null default '{}', material text, colors text[] default '{}', size text default 'one-size',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products readable" on public.products for select to authenticated using (true);
create policy "own product insert" on public.products for insert to authenticated with check (auth.uid() = vendor_id);
create policy "own product update" on public.products for update to authenticated using (auth.uid() = vendor_id);
create policy "own product delete" on public.products for delete to authenticated using (auth.uid() = vendor_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  fulfillment_type text not null check (fulfillment_type in ('delivery','pickup')),
  shipping_address jsonb not null default '{}',
  subtotal numeric(10,2) not null, shipping_fee numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0, total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid','completed','cancelled')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity int not null check (quantity > 0), price numeric(10,2) not null
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;

create policy "orders read" on public.orders for select to authenticated using (
  auth.uid() = buyer_id or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = orders.id and p.vendor_id = auth.uid()));
create policy "orders insert" on public.orders for insert to authenticated with check (auth.uid() = buyer_id);
create policy "orders update" on public.orders for update to authenticated using (auth.uid() = buyer_id or public.has_role(auth.uid(),'admin'));
create policy "items read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.has_role(auth.uid(),'admin')))
  or exists (select 1 from public.products p where p.id = product_id and p.vendor_id = auth.uid()));
create policy "items insert" on public.order_items for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reviewer_name text, rating int not null check (rating between 1 and 5),
  comment text, is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews readable" on public.reviews for select to authenticated using (true);
create policy "own review insert" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "own review update" on public.reviews for update to authenticated using (auth.uid() = user_id);
create policy "own review delete" on public.reviews for delete to authenticated using (auth.uid() = user_id);

create table public.bulletin_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade,
  author_name text, title text not null, content text not null,
  tag text not null check (tag in ('announcement','lost_and_found','service')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.bulletin_posts to authenticated;
grant all on public.bulletin_posts to service_role;
alter table public.bulletin_posts enable row level security;
create policy "posts readable" on public.bulletin_posts for select to authenticated using (true);
create policy "own post insert" on public.bulletin_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "own post update" on public.bulletin_posts for update to authenticated using (auth.uid() = author_id);
create policy "own post delete" on public.bulletin_posts for delete to authenticated using (auth.uid() = author_id);

insert into public.categories (name, slug, icon_name) values
('Books & Stationary','books','BookOpen'),
('Electronics & Gadget','electronics','Smartphone'),
('Fashion & Accessories','fashion','Shirt'),
('Sports & Fitness','sports','Dumbbell'),
('Project & Lab equipment','lab','FlaskConical');

insert into public.products (category_id, title, description, price, condition, stock, images, material, colors) values
((select id from public.categories where slug='electronics'),'Scientific Calculator Casio FX 991EX','ClassWiz, 552 functions, exam approved. Barely used.',400,'Used - Like new',3,array['https://images.unsplash.com/photo-1564939558297-fc396f18e5c7?w=800'],'Plastic',array['Black']),
((select id from public.categories where slug='electronics'),'Wireless Headphones JBL WH-991EX','Bluetooth 5.0, 30h battery, foldable.',500,'Used - Good',2,array['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800','https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800'],'Plastic & leatherette',array['Black','White']),
((select id from public.categories where slug='electronics'),'MI Power Bank 10 000mAh','Fast charging 18W, dual USB output.',500,'New',5,array['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800'],'Aluminium',array['Black','Silver']),
((select id from public.categories where slug='electronics'),'Beribes Bluetooth Headphones: Over-Ear Headphone with Microphone','Over-ear comfort, built-in mic, 65h playtime, deep bass.',600,'New',4,array['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800','https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800','https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800'],'Protein leather, ABS',array['Black','Blue','Pink']),
((select id from public.categories where slug='books'),'Engineering Mathematics (Stroud) 8th Ed','Good condition, some highlights.',400,'Used - Good',1,array['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800'],'Paper',array['Multi']),
((select id from public.categories where slug='fashion'),'Campus Hoodie (Unisex)','Warm fleece hoodie, size M.',500,'Used - Like new',1,array['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'],'Cotton fleece',array['Grey','Navy']),
((select id from public.categories where slug='sports'),'Adjustable Dumbbell Set 20kg','Perfect for res workouts.',600,'Used - Good',1,array['https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=800'],'Cast iron',array['Black']),
((select id from public.categories where slug='lab'),'Lab Coat + Safety Goggles Kit','Size L, chemistry lab compliant.',400,'Used - Good',2,array['https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800'],'Cotton',array['White']);

insert into public.reviews (product_id, reviewer_name, rating, comment, is_verified_purchase)
select id, 'Sino K.', 5, 'Very good product', true from public.products where title like 'Beribes%';
insert into public.reviews (product_id, reviewer_name, rating, comment, is_verified_purchase)
select id, 'Thabo M.', 4, 'Great sound for the price, battery lasts all week.', true from public.products where title like 'Beribes%';

insert into public.bulletin_posts (author_name, title, content, tag) values
('Student Affairs','Exam timetable released','The final exam timetable is now available on the student portal.','announcement'),
('Lerato P.','Lost: Blue water bottle','Lost near the library on Monday. Has stickers. Please DM me!','lost_and_found'),
('Kabelo T.','Maths tutoring available','Offering 1st-year calculus tutoring, R100/hour.','service');
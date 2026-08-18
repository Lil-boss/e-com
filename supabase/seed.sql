insert into public.categories(id,name_bn,name_en,slug,description,image_path,sort_order,is_active,show_on_home) values
('10000000-0000-0000-0000-000000000001','খাঁটি খাবার','Pure Foods','pure-foods','মধু, তেল, ঘি ও প্রাকৃতিক খাবার','https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg',1,true,true),
('10000000-0000-0000-0000-000000000002','মৌসুমি ফল','Seasonal Fruits','seasonal-fruits','বাগান থেকে সরাসরি মৌসুমি ফল','https://torunmart.com/wp-content/uploads/2026/06/RUIDc6187adb8f3340989ceb0d2562b70a2c-1-scaled-500x750.jpg',2,true,true),
('10000000-0000-0000-0000-000000000003','বই ও কম্বো','Books & Bundles','books','বাছাই করা বই ও সাশ্রয়ী কম্বো','https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=85',3,true,true),
('10000000-0000-0000-0000-000000000004','ফ্যাশন ও লাইফস্টাইল','Fashion & Lifestyle','fashion','নতুন ফ্যাশন ও লাইফস্টাইল কালেকশন','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85',4,true,true)
on conflict(id) do update set name_bn=excluded.name_bn,description=excluded.description,image_path=excluded.image_path;

insert into public.products(id,category_id,name_bn,name_en,slug,sku,short_description,description,status,base_price,compare_at_price,cost_price,weight_grams,is_featured,published_at) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','কালোজিরা ফুলের প্রিমিয়াম মধু','Black Seed Flower Honey','black-seed-honey-500g','TM-HNY-500','কালোজিরা ফুল থেকে সংগৃহীত প্রাকৃতিক মধু','গাঢ় রঙ, তীব্র স্বাদ ও অনন্য ঘ্রাণের ছোট ব্যাচে সংগ্রহ করা প্রাকৃতিক মধু।','published',645,745,430,500,true,now()),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','দাব্বাস খেজুর','Dabbas Dates','dabbas-dates-1kg','TM-DATE-DB-1K','সৌদি আরবের প্রিমিয়াম দাব্বাস খেজুর','নরম ও স্বাদে সমৃদ্ধ বাছাই করা খেজুর।','published',650,715,470,1000,true,now()),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','দেশি গাওয়া ঘি','Deshi Ghee','deshi-ghee-1kg','TM-GHEE-1K','শতভাগ খাঁটি দেশি গাওয়া ঘি','দুধ থেকে ঐতিহ্যবাহী প্রক্রিয়ায় তৈরি সুগন্ধি ঘি।','published',1600,1800,1260,1000,true,now()),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','সরিষার তেল — ফ্যামিলি প্যাক','Mustard Oil Family Pack','mustard-oil-5l','TM-OIL-5L','ঘানি ভাঙা সরিষার তেলের ফ্যামিলি প্যাক','ঘানি ভাঙা তীব্র ঘ্রাণের খাঁটি সরিষার তেল।','published',1300,1500,980,5000,true,now())
on conflict(id) do update set name_bn=excluded.name_bn,base_price=excluded.base_price,compare_at_price=excluded.compare_at_price;

insert into public.product_variants(id,product_id,sku,title,attributes,price,compare_at_price,weight_grams) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','TM-HNY-500','৫০০ গ্রাম','{"weight":"500g"}',645,745,500),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','TM-DATE-DB-1K','১ কেজি','{"weight":"1kg"}',650,715,1000),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','TM-GHEE-1K','১ কেজি','{"weight":"1kg"}',1600,1800,1000),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','TM-OIL-5L','৫ লিটার','{"volume":"5l"}',1300,1500,5000)
on conflict(id) do update set price=excluded.price,compare_at_price=excluded.compare_at_price;

insert into public.product_media(product_id,storage_path,alt_text,sort_order) values
('20000000-0000-0000-0000-000000000001','https://torunmart.com/wp-content/uploads/2025/09/1000131485.png','কালোজিরা ফুলের প্রিমিয়াম মধু',0),
('20000000-0000-0000-0000-000000000002','https://torunmart.com/wp-content/uploads/2026/02/1000014206-500x750.jpg','দাব্বাস খেজুর',0),
('20000000-0000-0000-0000-000000000003','https://torunmart.com/wp-content/uploads/2026/02/35017-500x750.jpg','দেশি গাওয়া ঘি',0),
('20000000-0000-0000-0000-000000000004','https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png','সরিষার তেল',0);

insert into public.inventory(variant_id,on_hand,reserved,low_stock_threshold) values
('30000000-0000-0000-0000-000000000001',80,3,10),('30000000-0000-0000-0000-000000000002',42,0,8),
('30000000-0000-0000-0000-000000000003',18,1,5),('30000000-0000-0000-0000-000000000004',25,0,6)
on conflict(variant_id) do update set on_hand=excluded.on_hand,reserved=excluded.reserved;

insert into public.homepage_sections(section_key,section_type,title,subtitle,content,is_active,sort_order) values
('hero','hero_slider','বিশ্বস্ত পণ্য, সহজ কেনাকাটা।','প্রকৃতির কাছ থেকে, আপনার পরিবারের জন্য',
'{"description":"খাঁটি খাবার, মৌসুমি ফল, বই ও দৈনন্দিন প্রয়োজন—যাচাইকৃত মানে, সারা বাংলাদেশে ডেলিভারি।","slides":[{"image":"https://torunmart.com/wp-content/uploads/2025/10/1000115858-scaled-500x750.jpg","eyebrow":"আজকের পছন্দ","name":"প্রিমিয়াম আম্রপালি আম","price":"১০ কেজি · ৳১,৩০০"},{"image":"https://torunmart.com/wp-content/uploads/2025/09/1000131485.png","eyebrow":"খাঁটি খাবার","name":"কালোজিরা ফুলের মধু","price":"৫০০ গ্রাম · ৳৬৪৫"},{"image":"https://torunmart.com/wp-content/uploads/2025/09/1000131497-500x750.png","eyebrow":"পরিবারের জন্য","name":"ঘানি ভাঙা সরিষার তেল","price":"৫ লিটার · ৳১,৩০০"}]}',true,1),
('trust','trust_strip','কেন তরুণ মার্ট',null,'{"items":[{"title":"যাচাইকৃত মান","text":"বিশ্বস্ত উৎস থেকে সংগ্রহ"},{"title":"সারা দেশে ডেলিভারি","text":"নিরাপদ ও সময়মতো"},{"title":"৭ দিনের সহজ রিটার্ন","text":"শর্তসাপেক্ষে বদলে নিন"},{"title":"মানবিক সহায়তা","text":"প্রয়োজনে আমরা পাশে আছি"}]}',true,2),
('seasonal','campaign','বাগান থেকে সোজা আপনার টেবিলে','মৌসুমি আয়োজন','{"image":"https://torunmart.com/wp-content/uploads/2025/10/1000115858-scaled-500x750.jpg","description":"ফরমালিনমুক্ত, পরিপক্ব এবং যত্নে বাছাই করা আম।","price":"৳১,১০০","oldPrice":"৳১,২০০","cta":"প্রি-অর্ডার করুন"}',true,5)
on conflict(section_key) do update set title=excluded.title,subtitle=excluded.subtitle,content=excluded.content;

insert into public.store_settings(key,value,is_public) values
('store','{"name":"তরুণ মার্ট","tagline":"বিশ্বস্ত পণ্য, সহজ কেনাকাটা।","phone":"+8801886494257","email":"admin@torunmart.com","address":"বারিক ভিলা, ১১/১ ফোল্ডার স্ট্রিট, ওয়ারী, ঢাকা–১২০৩"}',true),
('delivery','{"inside_dhaka":70,"outside_dhaka":120,"inside_days":"২–৩ কার্যদিবস","outside_days":"৩–৫ কার্যদিবস","return_days":7}',true),
('announcement','{"enabled":true,"text":"নতুন ক্রেতার প্রথম অর্ডারে ১০% ছাড়","code":"NOTUN10"}',true)
on conflict(key) do update set value=excluded.value,is_public=excluded.is_public;

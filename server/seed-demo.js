const prisma = require('./config/database');

const parentIds = {
  books: 'fca10bca-1097-4465-961d-73b75b88702a',
  stationary: 'c7504d0a-fc4b-40f8-adce-9153f2ffefc9',
  electronics: '3618d996-fb20-45bf-8b98-4604ffcf7f9f',
  printing: 'bb4fc331-1dfa-4016-9a48-493d6103ced6',
  schoolProject: 'aa9814c1-f3c0-4321-8af4-2d0b0bf5c6b9',
  services: 'c2da6780-9055-4ea1-914e-5cd186859843',
  eventsGifts: 'd2462ed4-ac74-40f1-9b63-74d0f0b5e058',
  islamicCorner: '3888874e-460f-4f1c-928c-510d2aec1f60',
  toys: '6a5479a9-6077-4951-a9b6-935f5f73e212',
  gamesCorner: '7690b711-900c-491d-a354-bb74c7dc527f',
};

// L2 and L3 category structure
const categoryTree = {
  books: [
    { name: 'Fiction', nameAr: 'روايات', slug: 'fiction', children: [
      { name: 'Science Fiction', nameAr: 'خيال علمي', slug: 'science-fiction' },
      { name: 'Mystery & Thriller', nameAr: 'غموض وإثارة', slug: 'mystery-thriller' },
      { name: 'Romance', nameAr: 'رومانسية', slug: 'romance' },
    ]},
    { name: 'Non-Fiction', nameAr: 'كتب غير خيالية', slug: 'non-fiction', children: [
      { name: 'Biography', nameAr: 'سيرة ذاتية', slug: 'biography' },
      { name: 'Self-Help', nameAr: 'تطوير الذات', slug: 'self-help' },
      { name: 'History', nameAr: 'تاريخ', slug: 'history' },
    ]},
    { name: 'Children', nameAr: 'كتب أطفال', slug: 'children-books', children: [
      { name: 'Picture Books', nameAr: 'كتب مصورة', slug: 'picture-books' },
      { name: 'Early Readers', nameAr: 'القراءة المبكرة', slug: 'early-readers' },
    ]},
    { name: 'Islamic Books', nameAr: 'كتب إسلامية', slug: 'islamic-books', children: [
      { name: 'Quran & Tafsir', nameAr: 'قرآن وتفسير', slug: 'quran-tafsir' },
      { name: 'Hadith & Sunnah', nameAr: 'حديث وسنة', slug: 'hadith-sunnah' },
    ]},
    { name: 'Academic', nameAr: 'كتب أكاديمية', slug: 'academic', children: [
      { name: 'Science & Math', nameAr: 'علوم ورياضيات', slug: 'science-math' },
      { name: 'Languages', nameAr: 'لغات', slug: 'languages' },
    ]},
  ],
  stationary: [
    { name: 'Writing Tools', nameAr: 'أدوات الكتابة', slug: 'writing-tools', children: [
      { name: 'Pens', nameAr: 'أقلام', slug: 'pens' },
      { name: 'Pencils & Erasers', nameAr: 'أقلام رصاص وممحاة', slug: 'pencils-erasers' },
    ]},
    { name: 'Notebooks & Paper', nameAr: 'دفاتر وأوراق', slug: 'notebooks-paper', children: [
      { name: 'Notebooks', nameAr: 'دفاتر', slug: 'notebooks' },
      { name: 'Sticky Notes', nameAr: 'ملاحظات لاصقة', slug: 'sticky-notes' },
    ]},
    { name: 'Office Supplies', nameAr: 'مستلزمات مكتبية', slug: 'office-supplies', children: [
      { name: 'Folders & Binders', nameAr: 'ملفات وحافظات', slug: 'folders-binders' },
      { name: 'Desk Organizers', nameAr: 'منظمات مكتب', slug: 'desk-organizers' },
    ]},
  ],
  electronics: [
    { name: 'Calculators', nameAr: 'آلات حاسبة', slug: 'calculators', children: [
      { name: 'Scientific Calculators', nameAr: 'آلات حاسبة علمية', slug: 'scientific-calculators' },
      { name: 'Basic Calculators', nameAr: 'آلات حاسبة أساسية', slug: 'basic-calculators' },
    ]},
    { name: 'Accessories', nameAr: 'إكسسوارات', slug: 'electronics-accessories', children: [
      { name: 'Headphones', nameAr: 'سماعات', slug: 'headphones' },
      { name: 'USB & Cables', nameAr: 'يو إس بي وكابلات', slug: 'usb-cables' },
    ]},
  ],
  printing: [
    { name: 'Document Printing', nameAr: 'طباعة مستندات', slug: 'document-printing', children: [
      { name: 'Color Printing', nameAr: 'طباعة ملونة', slug: 'color-printing' },
      { name: 'Black & White', nameAr: 'أبيض وأسود', slug: 'bw-printing' },
    ]},
    { name: 'Custom Printing', nameAr: 'طباعة مخصصة', slug: 'custom-printing', children: [
      { name: 'Business Cards', nameAr: 'بطاقات عمل', slug: 'business-cards' },
      { name: 'Banners & Posters', nameAr: 'لافتات وملصقات', slug: 'banners-posters' },
    ]},
  ],
  schoolProject: [
    { name: 'Art Supplies', nameAr: 'مستلزمات فنية', slug: 'art-supplies', children: [
      { name: 'Colors & Paints', nameAr: 'ألوان ودهانات', slug: 'colors-paints' },
      { name: 'Craft Materials', nameAr: 'مواد حرفية', slug: 'craft-materials' },
    ]},
    { name: 'Project Boards', nameAr: 'لوحات مشاريع', slug: 'project-boards', children: [
      { name: 'Foam Boards', nameAr: 'لوحات فوم', slug: 'foam-boards' },
      { name: 'Cork Boards', nameAr: 'لوحات فلين', slug: 'cork-boards' },
    ]},
  ],
  services: [
    { name: 'Design Services', nameAr: 'خدمات تصميم', slug: 'design-services', children: [
      { name: 'Logo Design', nameAr: 'تصميم شعار', slug: 'logo-design' },
      { name: 'Graphic Design', nameAr: 'تصميم جرافيك', slug: 'graphic-design' },
    ]},
    { name: 'Binding Services', nameAr: 'خدمات تجليد', slug: 'binding-services', children: [
      { name: 'Spiral Binding', nameAr: 'تجليد حلزوني', slug: 'spiral-binding' },
      { name: 'Hardcover Binding', nameAr: 'تجليد مقوى', slug: 'hardcover-binding' },
    ]},
  ],
  eventsGifts: [
    { name: 'Gift Items', nameAr: 'هدايا', slug: 'gift-items', children: [
      { name: 'Gift Cards', nameAr: 'بطاقات هدايا', slug: 'gift-cards' },
      { name: 'Gift Wrapping', nameAr: 'تغليف هدايا', slug: 'gift-wrapping' },
    ]},
    { name: 'Party Supplies', nameAr: 'مستلزمات حفلات', slug: 'party-supplies', children: [
      { name: 'Decorations', nameAr: 'زينة', slug: 'decorations' },
      { name: 'Balloons', nameAr: 'بالونات', slug: 'balloons' },
    ]},
  ],
  islamicCorner: [
    { name: 'Prayer Items', nameAr: 'مستلزمات الصلاة', slug: 'prayer-items', children: [
      { name: 'Prayer Rugs', nameAr: 'سجادة صلاة', slug: 'prayer-rugs' },
      { name: 'Prayer Beads', nameAr: 'مسابح', slug: 'prayer-beads' },
    ]},
    { name: 'Islamic Decor', nameAr: 'ديكور إسلامي', slug: 'islamic-decor', children: [
      { name: 'Wall Art', nameAr: 'لوحات جدارية', slug: 'islamic-wall-art' },
      { name: 'Calligraphy', nameAr: 'خط عربي', slug: 'calligraphy' },
    ]},
  ],
  toys: [
    { name: 'Educational Toys', nameAr: 'ألعاب تعليمية', slug: 'educational-toys', children: [
      { name: 'Puzzles', nameAr: 'ألغاز', slug: 'puzzles' },
      { name: 'Building Blocks', nameAr: 'مكعبات بناء', slug: 'building-blocks' },
    ]},
    { name: 'Outdoor Toys', nameAr: 'ألعاب خارجية', slug: 'outdoor-toys', children: [
      { name: 'Sports Equipment', nameAr: 'معدات رياضية', slug: 'sports-equipment' },
      { name: 'Water Toys', nameAr: 'ألعاب مائية', slug: 'water-toys' },
    ]},
  ],
  gamesCorner: [
    { name: 'Board Games', nameAr: 'ألعاب لوحية', slug: 'board-games', children: [
      { name: 'Strategy Games', nameAr: 'ألعاب استراتيجية', slug: 'strategy-games' },
      { name: 'Family Games', nameAr: 'ألعاب عائلية', slug: 'family-games' },
    ]},
    { name: 'Card Games', nameAr: 'ألعاب ورق', slug: 'card-games', children: [
      { name: 'Classic Cards', nameAr: 'أوراق كلاسيكية', slug: 'classic-cards' },
      { name: 'Trading Cards', nameAr: 'بطاقات تداول', slug: 'trading-cards' },
    ]},
  ],
};

// Products for L3 categories
const products = {
  // === BOOKS ===
  'science-fiction': [
    { title: 'Dune', titleAr: 'الكثبان الرملية', author: 'Frank Herbert', authorAr: 'فرانك هربرت', publisher: 'Ace Books', price: 65, description: 'A science fiction masterpiece set on the desert planet Arrakis.', descriptionAr: 'تحفة خيال علمي تدور أحداثها على كوكب أراكيس الصحراوي.', language: 'en', pages: 688 },
    { title: '1984', titleAr: '١٩٨٤', author: 'George Orwell', authorAr: 'جورج أورويل', publisher: 'Penguin', price: 45, description: 'A dystopian novel about totalitarian surveillance.', descriptionAr: 'رواية ديستوبية عن المراقبة الشمولية.', language: 'en', pages: 328 },
    { title: 'The Martian', titleAr: 'المريخي', author: 'Andy Weir', authorAr: 'آندي وير', publisher: 'Crown', price: 55, description: 'An astronaut stranded on Mars must find a way to survive.', descriptionAr: 'رائد فضاء عالق على المريخ يحاول البقاء على قيد الحياة.', language: 'en', pages: 384 },
  ],
  'mystery-thriller': [
    { title: 'Gone Girl', titleAr: 'الفتاة المفقودة', author: 'Gillian Flynn', authorAr: 'جيليان فلين', publisher: 'Crown', price: 50, description: 'A thrilling tale of a marriage gone terribly wrong.', descriptionAr: 'قصة مثيرة عن زواج انحرف بشكل رهيب.', language: 'en', pages: 432 },
    { title: 'The Girl on the Train', titleAr: 'فتاة القطار', author: 'Paula Hawkins', authorAr: 'باولا هوكينز', publisher: 'Riverhead', price: 48, description: 'A psychological thriller about obsession and deception.', descriptionAr: 'إثارة نفسية عن الهوس والخداع.', language: 'en', pages: 336 },
    { title: 'The Silent Patient', titleAr: 'المريضة الصامتة', author: 'Alex Michaelides', authorAr: 'أليكس ميخائيليدس', publisher: 'Celadon', price: 52, description: 'A woman shoots her husband and never speaks again.', descriptionAr: 'امرأة تطلق النار على زوجها ولا تتكلم مرة أخرى.', language: 'en', pages: 336 },
  ],
  'romance': [
    { title: 'Pride and Prejudice', titleAr: 'كبرياء وتحامل', author: 'Jane Austen', authorAr: 'جين أوستن', publisher: 'Penguin Classics', price: 35, description: 'A timeless love story set in Georgian England.', descriptionAr: 'قصة حب خالدة في إنجلترا الجورجية.', language: 'en', pages: 432 },
    { title: 'The Notebook', titleAr: 'المفكرة', author: 'Nicholas Sparks', authorAr: 'نيكولاس سباركس', publisher: 'Grand Central', price: 42, description: 'An unforgettable story of enduring love.', descriptionAr: 'قصة حب لا تُنسى.', language: 'en', pages: 227 },
    { title: 'Me Before You', titleAr: 'أنا قبلك', author: 'Jojo Moyes', authorAr: 'جوجو مويز', publisher: 'Penguin', price: 45, description: 'A love story that will break your heart.', descriptionAr: 'قصة حب ستكسر قلبك.', language: 'en', pages: 369 },
  ],
  'biography': [
    { title: 'Steve Jobs', titleAr: 'ستيف جوبز', author: 'Walter Isaacson', authorAr: 'والتر إيزاكسون', publisher: 'Simon & Schuster', price: 70, description: 'The exclusive biography of Steve Jobs.', descriptionAr: 'السيرة الذاتية الحصرية لستيف جوبز.', language: 'en', pages: 656 },
    { title: 'Becoming', titleAr: 'أصبحت', author: 'Michelle Obama', authorAr: 'ميشيل أوباما', publisher: 'Crown', price: 65, description: 'An intimate memoir by the former First Lady.', descriptionAr: 'مذكرات حميمة للسيدة الأولى السابقة.', language: 'en', pages: 448 },
    { title: 'Long Walk to Freedom', titleAr: 'مسيرة طويلة نحو الحرية', author: 'Nelson Mandela', authorAr: 'نيلسون مانديلا', publisher: 'Back Bay', price: 55, description: 'The autobiography of Nelson Mandela.', descriptionAr: 'السيرة الذاتية لنيلسون مانديلا.', language: 'en', pages: 656 },
  ],
  'self-help': [
    { title: 'Atomic Habits', titleAr: 'العادات الذرية', author: 'James Clear', authorAr: 'جيمس كلير', publisher: 'Avery', price: 58, description: 'Tiny changes, remarkable results.', descriptionAr: 'تغييرات صغيرة، نتائج مذهلة.', language: 'en', pages: 320 },
    { title: 'The 7 Habits', titleAr: 'العادات السبع', author: 'Stephen Covey', authorAr: 'ستيفن كوفي', publisher: 'Simon & Schuster', price: 50, description: 'Powerful lessons in personal change.', descriptionAr: 'دروس قوية في التغيير الشخصي.', language: 'en', pages: 381 },
    { title: 'Rich Dad Poor Dad', titleAr: 'الأب الغني والأب الفقير', author: 'Robert Kiyosaki', authorAr: 'روبرت كيوساكي', publisher: 'Plata', price: 45, description: 'What the rich teach their kids about money.', descriptionAr: 'ما يعلمه الأغنياء لأطفالهم عن المال.', language: 'en', pages: 336 },
  ],
  'history': [
    { title: 'Sapiens', titleAr: 'العاقل', author: 'Yuval Noah Harari', authorAr: 'يوفال نوح هراري', publisher: 'Harper', price: 62, description: 'A brief history of humankind.', descriptionAr: 'تاريخ موجز للبشرية.', language: 'en', pages: 443 },
    { title: 'Guns, Germs and Steel', titleAr: 'أسلحة وجراثيم وفولاذ', author: 'Jared Diamond', authorAr: 'جاريد دايموند', publisher: 'Norton', price: 55, description: 'The fates of human societies.', descriptionAr: 'مصائر المجتمعات البشرية.', language: 'en', pages: 528 },
    { title: 'A Brief History of Time', titleAr: 'تاريخ موجز للزمن', author: 'Stephen Hawking', authorAr: 'ستيفن هوكينج', publisher: 'Bantam', price: 48, description: 'From the Big Bang to black holes.', descriptionAr: 'من الانفجار العظيم إلى الثقوب السوداء.', language: 'en', pages: 256 },
  ],
  'picture-books': [
    { title: 'The Very Hungry Caterpillar', titleAr: 'اليرقة الجائعة جداً', author: 'Eric Carle', authorAr: 'إريك كارل', publisher: 'Philomel', price: 30, description: 'A beloved story about a caterpillar eating through food.', descriptionAr: 'قصة محبوبة عن يرقة تأكل الطعام.', language: 'en', pages: 26, ageRange: '2-5 years' },
    { title: 'Goodnight Moon', titleAr: 'تصبحين على خير يا قمر', author: 'Margaret Wise Brown', authorAr: 'مارغريت وايز براون', publisher: 'Harper', price: 28, description: 'A classic bedtime story.', descriptionAr: 'قصة كلاسيكية قبل النوم.', language: 'en', pages: 32, ageRange: '1-4 years' },
    { title: 'Where the Wild Things Are', titleAr: 'حيث تعيش الوحوش', author: 'Maurice Sendak', authorAr: 'موريس سنداك', publisher: 'Harper', price: 32, description: 'Max sails to where the wild things are.', descriptionAr: 'ماكس يبحر إلى حيث تعيش الوحوش.', language: 'en', pages: 48, ageRange: '3-7 years' },
  ],
  'early-readers': [
    { title: 'The Cat in the Hat', titleAr: 'القط في القبعة', author: 'Dr. Seuss', authorAr: 'دكتور سوس', publisher: 'Random House', price: 35, description: 'A rainy day adventure with a mischievous cat.', descriptionAr: 'مغامرة يوم ممطر مع قط مشاغب.', language: 'en', pages: 72, ageRange: '4-8 years' },
    { title: 'Charlotte\'s Web', titleAr: 'شبكة شارلوت', author: 'E.B. White', authorAr: 'إي بي وايت', publisher: 'Harper', price: 38, description: 'The story of a pig named Wilbur and his friend Charlotte.', descriptionAr: 'قصة خنزير يدعى ويلبر وصديقته شارلوت.', language: 'en', pages: 192, ageRange: '6-10 years' },
    { title: 'Matilda', titleAr: 'ماتيلدا', author: 'Roald Dahl', authorAr: 'رولد دال', publisher: 'Penguin', price: 40, description: 'A genius little girl with extraordinary powers.', descriptionAr: 'فتاة صغيرة عبقرية ذات قدرات خارقة.', language: 'en', pages: 240, ageRange: '7-11 years' },
  ],
  'quran-tafsir': [
    { title: 'The Holy Quran', titleAr: 'القرآن الكريم', author: 'Various', authorAr: 'متعدد', publisher: 'Dar Al Salam', price: 85, description: 'The Holy Quran with English translation.', descriptionAr: 'القرآن الكريم مع ترجمة إنجليزية.', language: 'ar', pages: 604 },
    { title: 'Tafsir Ibn Kathir', titleAr: 'تفسير ابن كثير', author: 'Ibn Kathir', authorAr: 'ابن كثير', publisher: 'Dar Al Salam', price: 120, description: 'Classical Quran commentary.', descriptionAr: 'تفسير قرآني كلاسيكي.', language: 'ar', pages: 1200 },
    { title: 'The Quran Journal', titleAr: 'يوميات القرآن', author: 'Various', authorAr: 'متعدد', publisher: 'Islamic Press', price: 45, description: 'A guided journal for Quran reflection.', descriptionAr: 'دفتر يوميات موجه لتأملات القرآن.', language: 'en', pages: 200 },
  ],
  'hadith-sunnah': [
    { title: 'Riyad as-Salihin', titleAr: 'رياض الصالحين', author: 'Imam Nawawi', authorAr: 'الإمام النووي', publisher: 'Dar Al Salam', price: 75, description: 'Gardens of the Righteous - a collection of hadith.', descriptionAr: 'رياض الصالحين - مجموعة أحاديث.', language: 'ar', pages: 800 },
    { title: 'Sahih Al-Bukhari', titleAr: 'صحيح البخاري', author: 'Imam Bukhari', authorAr: 'الإمام البخاري', publisher: 'Dar Al Salam', price: 150, description: 'The most authentic collection of hadith.', descriptionAr: 'أصح مجموعة أحاديث.', language: 'ar', pages: 1500 },
    { title: 'The Sealed Nectar', titleAr: 'الرحيق المختوم', author: 'Safiur Rahman', authorAr: 'صفي الرحمن المباركفوري', publisher: 'Dar Al Salam', price: 55, description: 'Biography of Prophet Muhammad (PBUH).', descriptionAr: 'سيرة النبي محمد صلى الله عليه وسلم.', language: 'ar', pages: 580 },
  ],
  'science-math': [
    { title: 'Physics for Students', titleAr: 'الفيزياء للطلاب', author: 'David Halliday', authorAr: 'ديفيد هاليداي', publisher: 'Wiley', price: 95, description: 'Comprehensive physics textbook.', descriptionAr: 'كتاب فيزياء شامل.', language: 'en', pages: 720 },
    { title: 'Calculus Made Easy', titleAr: 'التفاضل والتكامل بسهولة', author: 'Silvanus Thompson', authorAr: 'سيلفانوس تومبسون', publisher: 'Dover', price: 40, description: 'An accessible introduction to calculus.', descriptionAr: 'مقدمة سهلة في التفاضل والتكامل.', language: 'en', pages: 336 },
    { title: 'Biology Essentials', titleAr: 'أساسيات الأحياء', author: 'Campbell', authorAr: 'كامبل', publisher: 'Pearson', price: 110, description: 'Essential biology concepts.', descriptionAr: 'مفاهيم أساسية في الأحياء.', language: 'en', pages: 850 },
  ],
  'languages': [
    { title: 'English Grammar in Use', titleAr: 'قواعد اللغة الإنجليزية', author: 'Raymond Murphy', authorAr: 'ريموند ميرفي', publisher: 'Cambridge', price: 65, description: 'Self-study reference and practice book.', descriptionAr: 'كتاب مرجعي وتمارين للدراسة الذاتية.', language: 'en', pages: 380 },
    { title: 'Arabic for Beginners', titleAr: 'العربية للمبتدئين', author: 'Dr. Imran Hamza', authorAr: 'د. عمران حمزة', publisher: 'Al Huda', price: 48, description: 'Learn Arabic step by step.', descriptionAr: 'تعلم العربية خطوة بخطوة.', language: 'ar', pages: 280 },
    { title: 'French Made Simple', titleAr: 'الفرنسية بسهولة', author: 'Eugene Jackson', authorAr: 'يوجين جاكسون', publisher: 'Crown', price: 42, description: 'A beginner\'s guide to French.', descriptionAr: 'دليل المبتدئين للفرنسية.', language: 'en', pages: 320 },
  ],
  // === STATIONARY ===
  'pens': [
    { title: 'Parker Jotter Ballpoint Pen', titleAr: 'قلم باركر جوتر', price: 35, brand: 'Parker', color: 'Blue', material: 'Stainless Steel' },
    { title: 'Pilot G2 Gel Pen Set', titleAr: 'طقم أقلام بايلوت جل', price: 25, brand: 'Pilot', color: 'Black', material: 'Plastic' },
    { title: 'Faber-Castell Fountain Pen', titleAr: 'قلم فابر كاستل حبر', price: 85, brand: 'Faber-Castell', color: 'Black', material: 'Metal' },
  ],
  'pencils-erasers': [
    { title: 'Staedtler Pencil Set 12pc', titleAr: 'طقم أقلام رصاص ستيدلر ١٢ قطعة', price: 18, brand: 'Staedtler', color: 'Yellow', material: 'Wood' },
    { title: 'Faber-Castell Eraser Pack', titleAr: 'عبوة ممحاة فابر كاستل', price: 8, brand: 'Faber-Castell', color: 'White', material: 'Rubber' },
    { title: 'Mechanical Pencil 0.5mm', titleAr: 'قلم رصاص ميكانيكي ٠.٥مم', price: 15, brand: 'Pentel', color: 'Silver', material: 'Metal' },
  ],
  'notebooks': [
    { title: 'Moleskine Classic Notebook', titleAr: 'دفتر مولسكين كلاسيكي', price: 55, brand: 'Moleskine', color: 'Black', material: 'Paper' },
    { title: 'A4 Ruled Notebook 200 Pages', titleAr: 'دفتر مسطر A4 ٢٠٠ صفحة', price: 15, brand: 'Generic', color: 'Blue', material: 'Paper' },
    { title: 'Spiral Notebook A5', titleAr: 'دفتر حلزوني A5', price: 12, brand: 'Generic', color: 'Red', material: 'Paper' },
  ],
  'sticky-notes': [
    { title: 'Post-it Super Sticky Notes', titleAr: 'ملاحظات لاصقة بوست إت', price: 18, brand: 'Post-it', color: 'Yellow', material: 'Paper' },
    { title: 'Colored Sticky Tabs', titleAr: 'علامات لاصقة ملونة', price: 10, brand: '3M', color: 'Multicolor', material: 'Paper' },
    { title: 'Transparent Sticky Notes', titleAr: 'ملاحظات لاصقة شفافة', price: 12, brand: 'Generic', color: 'Clear', material: 'Plastic' },
  ],
  'folders-binders': [
    { title: 'Ring Binder A4', titleAr: 'ملف حلقات A4', price: 20, brand: 'Leitz', color: 'Black', material: 'Plastic' },
    { title: 'Manila Folder Pack 50', titleAr: 'عبوة ملفات مانيلا ٥٠', price: 25, brand: 'Generic', color: 'Brown', material: 'Paper' },
    { title: 'Document Wallet', titleAr: 'حافظة مستندات', price: 8, brand: 'Generic', color: 'Blue', material: 'Plastic' },
  ],
  'desk-organizers': [
    { title: 'Bamboo Desk Organizer', titleAr: 'منظم مكتب خيزران', price: 45, brand: 'Generic', color: 'Natural', material: 'Bamboo' },
    { title: 'Metal Pen Holder', titleAr: 'حامل أقلام معدني', price: 25, brand: 'Generic', color: 'Silver', material: 'Metal' },
    { title: 'Acrylic Drawer Organizer', titleAr: 'منظم أدراج أكريليك', price: 35, brand: 'Generic', color: 'Clear', material: 'Acrylic' },
  ],
  // === ELECTRONICS ===
  'scientific-calculators': [
    { title: 'Casio FX-991EX', titleAr: 'كاسيو FX-991EX', price: 95, brand: 'Casio', color: 'Black' },
    { title: 'Texas Instruments TI-84', titleAr: 'تكساس إنسترومنتس TI-84', price: 180, brand: 'Texas Instruments', color: 'Black' },
    { title: 'Sharp EL-W516', titleAr: 'شارب EL-W516', price: 75, brand: 'Sharp', color: 'White' },
  ],
  'basic-calculators': [
    { title: 'Casio MX-12B Desktop', titleAr: 'كاسيو MX-12B مكتبي', price: 25, brand: 'Casio', color: 'Black' },
    { title: 'Canon AS-120', titleAr: 'كانون AS-120', price: 20, brand: 'Canon', color: 'Silver' },
    { title: 'Solar Calculator', titleAr: 'آلة حاسبة شمسية', price: 10, brand: 'Generic', color: 'Silver' },
  ],
  'headphones': [
    { title: 'Sony WH-1000XM5', titleAr: 'سوني WH-1000XM5', price: 450, brand: 'Sony', color: 'Black' },
    { title: 'JBL Tune 510BT', titleAr: 'جي بي إل تيون 510BT', price: 120, brand: 'JBL', color: 'Blue' },
    { title: 'Apple AirPods 3rd Gen', titleAr: 'أبل إيربودز الجيل الثالث', price: 350, brand: 'Apple', color: 'White' },
  ],
  'usb-cables': [
    { title: 'Anker USB-C Cable 2m', titleAr: 'كابل أنكر USB-C ٢م', price: 35, brand: 'Anker', color: 'Black' },
    { title: 'SanDisk 64GB USB Flash', titleAr: 'سان ديسك فلاش ٦٤ جيجا', price: 28, brand: 'SanDisk', color: 'Red' },
    { title: 'Lightning to USB-C Cable', titleAr: 'كابل لايتنينج إلى USB-C', price: 45, brand: 'Apple', color: 'White' },
  ],
  // === PRINTING ===
  'color-printing': [
    { title: 'A4 Color Print (per page)', titleAr: 'طباعة ملونة A4 (للصفحة)', price: 2 },
    { title: 'A3 Color Print (per page)', titleAr: 'طباعة ملونة A3 (للصفحة)', price: 5 },
    { title: 'Photo Print 4x6', titleAr: 'طباعة صور ٤×٦', price: 3 },
  ],
  'bw-printing': [
    { title: 'A4 B&W Print (per page)', titleAr: 'طباعة أبيض وأسود A4 (للصفحة)', price: 0.5 },
    { title: 'A3 B&W Print (per page)', titleAr: 'طباعة أبيض وأسود A3 (للصفحة)', price: 1.5 },
    { title: 'Bulk B&W Print 100 pages', titleAr: 'طباعة أبيض وأسود ١٠٠ صفحة', price: 35 },
  ],
  'business-cards': [
    { title: 'Standard Business Cards 100pc', titleAr: 'بطاقات عمل قياسية ١٠٠ قطعة', price: 50 },
    { title: 'Premium Business Cards 100pc', titleAr: 'بطاقات عمل فاخرة ١٠٠ قطعة', price: 85 },
    { title: 'Laminated Business Cards 100pc', titleAr: 'بطاقات عمل مغلفة ١٠٠ قطعة', price: 95 },
  ],
  'banners-posters': [
    { title: 'Vinyl Banner (per sqm)', titleAr: 'لافتة فينيل (للمتر المربع)', price: 30 },
    { title: 'A1 Poster Print', titleAr: 'طباعة ملصق A1', price: 25 },
    { title: 'Roll-up Banner Stand', titleAr: 'حامل لافتة رول أب', price: 120 },
  ],
  // === SCHOOL PROJECT ===
  'colors-paints': [
    { title: 'Watercolor Set 24 Colors', titleAr: 'طقم ألوان مائية ٢٤ لون', price: 35, brand: 'Faber-Castell', ageRange: '5+ years' },
    { title: 'Acrylic Paint Set 12 Tubes', titleAr: 'طقم ألوان أكريليك ١٢ أنبوب', price: 45, brand: 'Winsor & Newton', ageRange: '8+ years' },
    { title: 'Color Pencils 36 Set', titleAr: 'أقلام تلوين ٣٦ قطعة', price: 28, brand: 'Staedtler', ageRange: '4+ years' },
  ],
  'craft-materials': [
    { title: 'Craft Paper Pack 100 Sheets', titleAr: 'عبوة ورق حرف ١٠٠ ورقة', price: 15, ageRange: '4+ years' },
    { title: 'Glitter Glue Set', titleAr: 'طقم غراء لامع', price: 18, ageRange: '5+ years' },
    { title: 'Felt Fabric Sheets 20pc', titleAr: 'أوراق لباد ٢٠ قطعة', price: 22, ageRange: '6+ years' },
  ],
  'foam-boards': [
    { title: 'White Foam Board A3', titleAr: 'لوحة فوم بيضاء A3', price: 8 },
    { title: 'Colored Foam Board Set', titleAr: 'طقم لوحات فوم ملونة', price: 25 },
    { title: 'Foam Board A1', titleAr: 'لوحة فوم A1', price: 15 },
  ],
  'cork-boards': [
    { title: 'Cork Board 60x90cm', titleAr: 'لوحة فلين ٦٠×٩٠سم', price: 35 },
    { title: 'Mini Cork Board with Frame', titleAr: 'لوحة فلين صغيرة بإطار', price: 20 },
    { title: 'Cork Board Pins 100pc', titleAr: 'دبابيس لوحة فلين ١٠٠ قطعة', price: 8 },
  ],
  // === SERVICES ===
  'logo-design': [
    { title: 'Basic Logo Design', titleAr: 'تصميم شعار أساسي', price: 150 },
    { title: 'Premium Logo Design', titleAr: 'تصميم شعار فاخر', price: 350 },
    { title: 'Logo + Brand Kit', titleAr: 'شعار + هوية بصرية', price: 500 },
  ],
  'graphic-design': [
    { title: 'Social Media Post Design', titleAr: 'تصميم منشور سوشيال ميديا', price: 50 },
    { title: 'Flyer Design A5', titleAr: 'تصميم فلاير A5', price: 80 },
    { title: 'Menu Design', titleAr: 'تصميم قائمة طعام', price: 120 },
  ],
  'spiral-binding': [
    { title: 'Spiral Binding (up to 50 pages)', titleAr: 'تجليد حلزوني (حتى ٥٠ صفحة)', price: 10 },
    { title: 'Spiral Binding (up to 200 pages)', titleAr: 'تجليد حلزوني (حتى ٢٠٠ صفحة)', price: 20 },
    { title: 'Color Cover Spiral Binding', titleAr: 'تجليد حلزوني بغلاف ملون', price: 25 },
  ],
  'hardcover-binding': [
    { title: 'Hardcover Binding Standard', titleAr: 'تجليد مقوى قياسي', price: 40 },
    { title: 'Leather Hardcover Binding', titleAr: 'تجليد مقوى جلد', price: 80 },
    { title: 'Gold Embossed Binding', titleAr: 'تجليد مذهب', price: 120 },
  ],
  // === EVENTS & GIFTS ===
  'gift-cards': [
    { title: 'Arkaan Gift Card QAR 50', titleAr: 'بطاقة هدية أركان ٥٠ ريال', price: 50 },
    { title: 'Arkaan Gift Card QAR 100', titleAr: 'بطاقة هدية أركان ١٠٠ ريال', price: 100 },
    { title: 'Arkaan Gift Card QAR 200', titleAr: 'بطاقة هدية أركان ٢٠٠ ريال', price: 200 },
  ],
  'gift-wrapping': [
    { title: 'Premium Gift Wrapping', titleAr: 'تغليف هدايا فاخر', price: 15 },
    { title: 'Standard Gift Bag', titleAr: 'كيس هدايا قياسي', price: 8 },
    { title: 'Gift Box with Ribbon', titleAr: 'صندوق هدية بشريطة', price: 25 },
  ],
  'decorations': [
    { title: 'Birthday Party Kit', titleAr: 'طقم حفلة عيد ميلاد', price: 45 },
    { title: 'Ramadan Decoration Set', titleAr: 'طقم زينة رمضان', price: 55 },
    { title: 'Eid Mubarak Banner', titleAr: 'لافتة عيد مبارك', price: 20 },
  ],
  'balloons': [
    { title: 'Helium Balloon Bundle 10pc', titleAr: 'حزمة بالونات هيليوم ١٠ قطع', price: 35 },
    { title: 'Number Foil Balloon', titleAr: 'بالون رقم فويل', price: 15 },
    { title: 'Latex Balloons 50pc', titleAr: 'بالونات لاتكس ٥٠ قطعة', price: 12 },
  ],
  // === ISLAMIC CORNER ===
  'prayer-rugs': [
    { title: 'Velvet Prayer Rug', titleAr: 'سجادة صلاة مخمل', price: 45, brand: 'Generic', material: 'Velvet' },
    { title: 'Travel Prayer Mat', titleAr: 'سجادة صلاة سفر', price: 25, brand: 'Generic', material: 'Polyester' },
    { title: 'Premium Embroidered Prayer Rug', titleAr: 'سجادة صلاة مطرزة فاخرة', price: 85, brand: 'Generic', material: 'Cotton' },
  ],
  'prayer-beads': [
    { title: 'Crystal Tasbih 33 Beads', titleAr: 'مسبحة كريستال ٣٣ حبة', price: 35 },
    { title: 'Wooden Tasbih 99 Beads', titleAr: 'مسبحة خشب ٩٩ حبة', price: 20 },
    { title: 'Digital Tasbih Counter', titleAr: 'عداد تسبيح إلكتروني', price: 15 },
  ],
  'islamic-wall-art': [
    { title: 'Ayatul Kursi Canvas', titleAr: 'لوحة آية الكرسي', price: 120 },
    { title: 'Bismillah Metal Wall Art', titleAr: 'ديكور جداري بسملة معدني', price: 95 },
    { title: '99 Names of Allah Frame', titleAr: 'إطار أسماء الله الحسنى', price: 75 },
  ],
  'calligraphy': [
    { title: 'Arabic Calligraphy Set', titleAr: 'طقم خط عربي', price: 65 },
    { title: 'Calligraphy Practice Book', titleAr: 'كتاب تمارين الخط', price: 25 },
    { title: 'Quran Calligraphy Poster', titleAr: 'ملصق خط قرآني', price: 40 },
  ],
  // === TOYS ===
  'puzzles': [
    { title: '1000 Piece World Map Puzzle', titleAr: 'لغز خريطة العالم ١٠٠٠ قطعة', price: 45, ageRange: '8+ years' },
    { title: 'Kids Wooden Puzzle Set', titleAr: 'طقم ألغاز خشبية للأطفال', price: 25, ageRange: '3-6 years' },
    { title: '3D Crystal Puzzle', titleAr: 'لغز كريستال ثلاثي الأبعاد', price: 35, ageRange: '10+ years' },
  ],
  'building-blocks': [
    { title: 'LEGO Classic 500pc', titleAr: 'ليغو كلاسيك ٥٠٠ قطعة', price: 120, brand: 'LEGO', ageRange: '4-99 years' },
    { title: 'Magnetic Building Tiles 60pc', titleAr: 'مكعبات مغناطيسية ٦٠ قطعة', price: 85, ageRange: '3+ years' },
    { title: 'Wooden Stacking Blocks', titleAr: 'مكعبات خشبية قابلة للتكديس', price: 40, ageRange: '1-5 years' },
  ],
  'sports-equipment': [
    { title: 'Badminton Set', titleAr: 'طقم بادمنتون', price: 55, ageRange: '6+ years' },
    { title: 'Kids Basketball', titleAr: 'كرة سلة للأطفال', price: 35, ageRange: '5+ years' },
    { title: 'Jump Rope', titleAr: 'حبل قفز', price: 15, ageRange: '4+ years' },
  ],
  'water-toys': [
    { title: 'Water Gun Super Soaker', titleAr: 'مسدس ماء سوبر سوكر', price: 30, ageRange: '5+ years' },
    { title: 'Inflatable Pool Float', titleAr: 'عوامة مسبح', price: 45, ageRange: '4+ years' },
    { title: 'Water Balloon Pack 100pc', titleAr: 'عبوة بالونات ماء ١٠٠ قطعة', price: 12, ageRange: '5+ years' },
  ],
  // === GAMES CORNER ===
  'strategy-games': [
    { title: 'Chess Set Wooden', titleAr: 'طقم شطرنج خشبي', price: 65 },
    { title: 'Risk Board Game', titleAr: 'لعبة ريسك', price: 85 },
    { title: 'Settlers of Catan', titleAr: 'مستوطنو كاتان', price: 95 },
  ],
  'family-games': [
    { title: 'Monopoly Classic', titleAr: 'مونوبولي كلاسيك', price: 75 },
    { title: 'Scrabble', titleAr: 'سكرابل', price: 65 },
    { title: 'Pictionary', titleAr: 'بيكشنري', price: 55 },
  ],
  'classic-cards': [
    { title: 'Standard Playing Cards', titleAr: 'أوراق لعب قياسية', price: 10 },
    { title: 'UNO Card Game', titleAr: 'لعبة أونو', price: 25 },
    { title: 'Premium Poker Set', titleAr: 'طقم بوكر فاخر', price: 85 },
  ],
  'trading-cards': [
    { title: 'Pokemon Booster Pack', titleAr: 'حزمة بوكيمون', price: 18 },
    { title: 'Yu-Gi-Oh Starter Deck', titleAr: 'مجموعة يوغي أو للمبتدئين', price: 35 },
    { title: 'Football Trading Cards Pack', titleAr: 'حزمة بطاقات كرة قدم', price: 15 },
  ],
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  let catCount = 0;
  let prodCount = 0;

  for (const [parentKey, l2Categories] of Object.entries(categoryTree)) {
    const parentId = parentIds[parentKey];
    let l2Order = 0;

    for (const l2 of l2Categories) {
      const createdL2 = await prisma.category.create({
        data: { name: l2.name, nameAr: l2.nameAr, slug: l2.slug, parentId, displayOrder: l2Order++, isActive: true },
      });
      catCount++;
      console.log(`  L2: ${l2.name}`);

      if (l2.children) {
        let l3Order = 0;
        for (const l3 of l2.children) {
          const createdL3 = await prisma.category.create({
            data: { name: l3.name, nameAr: l3.nameAr, slug: l3.slug, parentId: createdL2.id, displayOrder: l3Order++, isActive: true },
          });
          catCount++;
          console.log(`    L3: ${l3.name}`);

          // Add products to L3
          const prods = products[l3.slug] || [];
          for (const p of prods) {
            const bookData = {
              title: p.title,
              titleAr: p.titleAr || null,
              slug: slugify(p.title) + '-' + Math.random().toString(36).substring(2, 6),
              author: p.author || 'Unknown',
              authorAr: p.authorAr || null,
              publisher: p.publisher || null,
              publisherAr: p.publisherAr || null,
              description: p.description || null,
              descriptionAr: p.descriptionAr || null,
              price: p.price,
              stock: Math.floor(Math.random() * 50) + 5,
              language: p.language || 'en',
              pages: p.pages || null,
              isbn: p.isbn || null,
              brand: p.brand || null,
              color: p.color || null,
              material: p.material || null,
              ageRange: p.ageRange || null,
              categoryId: createdL3.id,
              isActive: true,
              isFeatured: Math.random() > 0.7,
              isNewArrival: Math.random() > 0.7,
            };
            await prisma.book.create({ data: bookData });
            prodCount++;
          }
        }
      }
    }
  }

  console.log(`\nDone! Created ${catCount} categories and ${prodCount} products.`);
  process.exit();
}

seed().catch((e) => { console.error(e); process.exit(1); });

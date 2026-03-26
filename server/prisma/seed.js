const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arkaan.com' },
    update: {},
    create: {
      email: 'admin@arkaan.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Arkaan',
      firstNameAr: 'مدير',
      lastNameAr: 'أركان',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@arkaan.com' },
    update: {},
    create: {
      email: 'user@arkaan.com',
      password: userPassword,
      firstName: 'Ahmed',
      lastName: 'Ali',
      firstNameAr: 'أحمد',
      lastNameAr: 'علي',
      phone: '+97459943131',
      address: 'Al Sadd Street',
      city: 'Doha',
      role: 'USER',
    },
  });
  console.log('Test user created:', user.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'fiction' },
      update: {},
      create: { name: 'Fiction', nameAr: 'روايات', slug: 'fiction', description: 'Novels, short stories, and literary fiction', descriptionAr: 'روايات وقصص قصيرة وأدب', displayOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: 'non-fiction' },
      update: {},
      create: { name: 'Non-Fiction', nameAr: 'كتب غير خيالية', slug: 'non-fiction', description: 'Real-world knowledge and insights', descriptionAr: 'معرفة ورؤى من العالم الحقيقي', displayOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: 'islamic' },
      update: {},
      create: { name: 'Islamic Studies', nameAr: 'دراسات إسلامية', slug: 'islamic', description: 'Quran, Hadith, Fiqh, and Islamic knowledge', descriptionAr: 'القرآن والحديث والفقه والعلوم الإسلامية', displayOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: 'children' },
      update: {},
      create: { name: 'Children', nameAr: 'كتب أطفال', slug: 'children', description: 'Books for young readers', descriptionAr: 'كتب للقراء الصغار', displayOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: 'science' },
      update: {},
      create: { name: 'Science & Technology', nameAr: 'علوم وتكنولوجيا', slug: 'science', description: 'Scientific discoveries and technology', descriptionAr: 'اكتشافات علمية وتكنولوجيا', displayOrder: 5 },
    }),
    prisma.category.upsert({
      where: { slug: 'history' },
      update: {},
      create: { name: 'History', nameAr: 'تاريخ', slug: 'history', description: 'Historical accounts and analysis', descriptionAr: 'روايات وتحليلات تاريخية', displayOrder: 6 },
    }),
    prisma.category.upsert({
      where: { slug: 'self-help' },
      update: {},
      create: { name: 'Self-Help', nameAr: 'تطوير الذات', slug: 'self-help', description: 'Personal development and productivity', descriptionAr: 'تطوير شخصي وإنتاجية', displayOrder: 7 },
    }),
  ]);
  console.log('Categories created:', categories.length);

  const [fiction, nonFiction, islamic, children, science, history, selfHelp] = categories;

  // Create books
  const books = [
    // === Existing books (now with covers) ===
    {
      title: 'The Alchemist', titleAr: 'الخيميائي', slug: 'the-alchemist',
      author: 'Paulo Coelho', authorAr: 'باولو كويلو',
      isbn: '9780062315007',
      description: 'A magical tale about following your dreams and listening to your heart. Santiago, a young Andalusian shepherd, journeys to the Egyptian pyramids in search of a treasure.',
      descriptionAr: 'قصة سحرية عن ملاحقة أحلامك والاستماع إلى قلبك. سانتياغو، راعٍ أندلسي شاب، يسافر إلى الأهرامات المصرية بحثاً عن كنز.',
      price: 45.00, compareAtPrice: 60.00, coverImage: 'uploads/covers/the-alchemist.jpg',
      language: 'en', pages: 197, stock: 50,
      categoryId: fiction.id, isFeatured: true,
      tags: ['bestseller', 'classic', 'philosophy'],
    },
    {
      title: 'Sapiens', titleAr: 'العاقل', slug: 'sapiens',
      author: 'Yuval Noah Harari', authorAr: 'يوفال نوح هراري',
      isbn: '9780062316097',
      description: 'A brief history of humankind from the Stone Age to the Silicon Age. Explores how biology and history have defined us.',
      descriptionAr: 'تاريخ موجز للبشرية من العصر الحجري إلى عصر السيليكون. يستكشف كيف حددنا علم الأحياء والتاريخ.',
      price: 65.00, coverImage: 'uploads/covers/sapiens.jpg',
      language: 'en', pages: 443, stock: 30,
      categoryId: history.id, isFeatured: true,
      tags: ['history', 'science', 'bestseller'],
    },
    {
      title: 'Riyad as-Salihin', titleAr: 'رياض الصالحين', slug: 'riyad-as-salihin',
      author: 'Imam An-Nawawi', authorAr: 'الإمام النووي',
      description: 'A compilation of Hadith covering all aspects of Islamic life and spirituality.',
      descriptionAr: 'مجموعة من الأحاديث تغطي جميع جوانب الحياة الإسلامية والروحانية.',
      price: 55.00, language: 'ar', pages: 600, stock: 40,
      categoryId: islamic.id, isFeatured: true,
      tags: ['hadith', 'islamic', 'essential'],
    },
    {
      title: 'The Little Prince', titleAr: 'الأمير الصغير', slug: 'the-little-prince',
      author: 'Antoine de Saint-Exupery', authorAr: 'أنطوان دو سانت إكزوبيري',
      isbn: '9780156012195',
      description: 'A poetic tale about a little prince who travels the universe, discovering the meaning of life and love.',
      descriptionAr: 'قصة شعرية عن أمير صغير يسافر عبر الكون، يكتشف معنى الحياة والحب.',
      price: 35.00, compareAtPrice: 45.00, coverImage: 'uploads/covers/the-little-prince.jpg',
      language: 'en', pages: 96, stock: 60,
      categoryId: children.id, isFeatured: true,
      tags: ['classic', 'children', 'philosophy'],
    },
    {
      title: 'A Brief History of Time', titleAr: 'تاريخ موجز للزمن', slug: 'brief-history-of-time',
      author: 'Stephen Hawking', authorAr: 'ستيفن هوكينغ',
      isbn: '9780553380163',
      description: 'Explores the mysteries of the cosmos from the Big Bang to black holes in accessible language.',
      descriptionAr: 'يستكشف أسرار الكون من الانفجار العظيم إلى الثقوب السوداء بلغة مبسطة.',
      price: 55.00, coverImage: 'uploads/covers/brief-history-of-time.jpg',
      language: 'en', pages: 256, stock: 25,
      categoryId: science.id, isFeatured: true,
      tags: ['physics', 'cosmology', 'science'],
    },
    {
      title: 'The Sealed Nectar', titleAr: 'الرحيق المختوم', slug: 'the-sealed-nectar',
      author: 'Safi-ur-Rahman Mubarakpuri', authorAr: 'صفي الرحمن المباركفوري',
      description: 'The definitive biography of Prophet Muhammad (peace be upon him).',
      descriptionAr: 'السيرة النبوية الشاملة للنبي محمد صلى الله عليه وسلم.',
      price: 50.00, language: 'ar', pages: 510, stock: 35,
      categoryId: islamic.id, isFeatured: true,
      tags: ['seerah', 'islamic', 'biography'],
    },
    {
      title: 'Atomic Habits', titleAr: 'العادات الذرية', slug: 'atomic-habits',
      author: 'James Clear', authorAr: 'جيمس كلير',
      isbn: '9780735211292',
      description: 'An easy and proven way to build good habits and break bad ones. Tiny changes, remarkable results.',
      descriptionAr: 'طريقة سهلة ومثبتة لبناء عادات جيدة وكسر العادات السيئة. تغييرات صغيرة، نتائج مذهلة.',
      price: 55.00, compareAtPrice: 70.00, coverImage: 'uploads/covers/atomic-habits.jpg',
      language: 'en', pages: 320, stock: 45,
      categoryId: selfHelp.id, isFeatured: true,
      tags: ['self-help', 'productivity', 'bestseller'],
    },
    {
      title: 'One Thousand and One Nights', titleAr: 'ألف ليلة وليلة', slug: 'one-thousand-and-one-nights',
      author: 'Traditional', authorAr: 'تراث',
      description: 'A collection of Middle Eastern folk tales compiled during the Islamic Golden Age.',
      descriptionAr: 'مجموعة من الحكايات الشعبية الشرقية جمعت خلال العصر الذهبي الإسلامي.',
      price: 75.00, language: 'ar', pages: 800, stock: 20,
      categoryId: fiction.id,
      tags: ['classic', 'arabic', 'folklore'],
    },

    // === New books ===
    {
      title: '1984', titleAr: '١٩٨٤', slug: '1984',
      author: 'George Orwell', authorAr: 'جورج أورويل',
      isbn: '9780451524935',
      description: 'A dystopian novel set in a totalitarian society ruled by Big Brother. A masterpiece of political fiction.',
      descriptionAr: 'رواية ديستوبية تدور في مجتمع شمولي يحكمه الأخ الأكبر. تحفة في الأدب السياسي.',
      price: 40.00, coverImage: 'uploads/covers/1984.jpg',
      language: 'en', pages: 328, stock: 35,
      categoryId: fiction.id, isFeatured: true,
      tags: ['dystopian', 'classic', 'political'],
    },
    {
      title: 'Dune', titleAr: 'كثيب', slug: 'dune',
      author: 'Frank Herbert', authorAr: 'فرانك هربرت',
      isbn: '9780441172719',
      description: 'Set on the desert planet Arrakis, Dune is the story of Paul Atreides and his epic journey to fulfill his destiny.',
      descriptionAr: 'تدور أحداثها على كوكب أراكيس الصحراوي، قصة بول أتريدس ورحلته الملحمية لتحقيق مصيره.',
      price: 60.00, compareAtPrice: 75.00, coverImage: 'uploads/covers/dune.jpg',
      language: 'en', pages: 688, stock: 20,
      categoryId: fiction.id, isFeatured: true,
      tags: ['sci-fi', 'epic', 'classic'],
    },
    {
      title: "Harry Potter and the Sorcerer's Stone", titleAr: 'هاري بوتر وحجر الفيلسوف', slug: 'harry-potter-sorcerers-stone',
      author: 'J.K. Rowling', authorAr: 'ج.ك. رولينغ',
      isbn: '9780590353427',
      description: 'The first book in the beloved Harry Potter series. A young wizard discovers his magical heritage.',
      descriptionAr: 'الكتاب الأول في سلسلة هاري بوتر المحبوبة. ساحر شاب يكتشف إرثه السحري.',
      price: 45.00, coverImage: 'uploads/covers/harry-potter.jpg',
      language: 'en', pages: 309, stock: 55,
      categoryId: children.id, isFeatured: true,
      tags: ['fantasy', 'children', 'bestseller'],
    },
    {
      title: 'Pride and Prejudice', titleAr: 'كبرياء وتحامل', slug: 'pride-and-prejudice',
      author: 'Jane Austen', authorAr: 'جين أوستن',
      isbn: '9780141439518',
      description: 'A witty exploration of love, reputation, and class in Georgian-era England through the story of Elizabeth Bennet.',
      descriptionAr: 'استكشاف ذكي للحب والسمعة والطبقة في إنجلترا الجورجية من خلال قصة إليزابيث بينيت.',
      price: 35.00, coverImage: 'uploads/covers/pride-and-prejudice.jpg',
      language: 'en', pages: 432, stock: 30,
      categoryId: fiction.id,
      tags: ['classic', 'romance', 'literature'],
    },
    {
      title: 'Rich Dad Poor Dad', titleAr: 'الأب الغني والأب الفقير', slug: 'rich-dad-poor-dad',
      author: 'Robert T. Kiyosaki', authorAr: 'روبرت كيوساكي',
      isbn: '9781612680194',
      description: 'What the rich teach their kids about money that the poor and middle class do not.',
      descriptionAr: 'ما يعلمه الأغنياء لأطفالهم عن المال ولا يعلمه الفقراء والطبقة الوسطى.',
      price: 50.00, compareAtPrice: 65.00, coverImage: 'uploads/covers/rich-dad-poor-dad.jpg',
      language: 'en', pages: 336, stock: 40,
      categoryId: selfHelp.id, isFeatured: true,
      tags: ['finance', 'self-help', 'bestseller'],
    },
    {
      title: 'The Great Gatsby', titleAr: 'غاتسبي العظيم', slug: 'the-great-gatsby',
      author: 'F. Scott Fitzgerald', authorAr: 'ف. سكوت فيتزجيرالد',
      isbn: '9780743273565',
      description: 'A portrait of the Jazz Age and American dream through the mysterious millionaire Jay Gatsby.',
      descriptionAr: 'صورة لعصر الجاز والحلم الأمريكي من خلال المليونير الغامض جاي غاتسبي.',
      price: 35.00, coverImage: 'uploads/covers/the-great-gatsby.jpg',
      language: 'en', pages: 180, stock: 25,
      categoryId: fiction.id,
      tags: ['classic', 'american', 'literature'],
    },
    {
      title: 'The Hobbit', titleAr: 'الهوبيت', slug: 'the-hobbit',
      author: 'J.R.R. Tolkien', authorAr: 'ج.ر.ر. تولكين',
      isbn: '9780547928227',
      description: 'Bilbo Baggins embarks on an unexpected adventure with dwarves to reclaim their homeland from a dragon.',
      descriptionAr: 'بيلبو باغينز ينطلق في مغامرة غير متوقعة مع الأقزام لاستعادة وطنهم من تنين.',
      price: 45.00, compareAtPrice: 55.00, coverImage: 'uploads/covers/the-hobbit.jpg',
      language: 'en', pages: 310, stock: 30,
      categoryId: fiction.id, isFeatured: true,
      tags: ['fantasy', 'adventure', 'classic'],
    },
    {
      title: 'Thinking, Fast and Slow', titleAr: 'التفكير بسرعة وببطء', slug: 'thinking-fast-and-slow',
      author: 'Daniel Kahneman', authorAr: 'دانيال كانمان',
      isbn: '9780374533557',
      description: 'Nobel laureate explores the two systems that drive how we think — fast intuition and slow deliberation.',
      descriptionAr: 'الحائز على جائزة نوبل يستكشف النظامين اللذين يقودان تفكيرنا — الحدس السريع والتأمل البطيء.',
      price: 60.00, coverImage: 'uploads/covers/thinking-fast-and-slow.jpg',
      language: 'en', pages: 499, stock: 20,
      categoryId: nonFiction.id,
      tags: ['psychology', 'behavioral', 'science'],
    },
    {
      title: 'The Power of Habit', titleAr: 'قوة العادة', slug: 'the-power-of-habit',
      author: 'Charles Duhigg', authorAr: 'تشارلز دوهيغ',
      isbn: '9780812981605',
      description: 'Why we do what we do in life and business. Explores the science behind habit formation.',
      descriptionAr: 'لماذا نفعل ما نفعله في الحياة والعمل. يستكشف العلم وراء تكوين العادات.',
      price: 50.00, coverImage: 'uploads/covers/the-power-of-habit.jpg',
      language: 'en', pages: 371, stock: 35,
      categoryId: selfHelp.id,
      tags: ['psychology', 'self-help', 'business'],
    },
    {
      title: 'To Kill a Mockingbird', titleAr: 'أن تقتل طائراً بريئاً', slug: 'to-kill-a-mockingbird',
      author: 'Harper Lee', authorAr: 'هاربر لي',
      isbn: '9780061120084',
      description: 'A story of racial injustice in the American South, seen through the eyes of young Scout Finch.',
      descriptionAr: 'قصة عن الظلم العنصري في الجنوب الأمريكي، من خلال عيون الطفلة سكاوت فينش.',
      price: 40.00, coverImage: 'uploads/covers/to-kill-a-mockingbird.jpg',
      language: 'en', pages: 336, stock: 30,
      categoryId: fiction.id,
      tags: ['classic', 'american', 'literature'],
    },
  ];

  for (const bookData of books) {
    await prisma.book.upsert({
      where: { slug: bookData.slug },
      update: { coverImage: bookData.coverImage || undefined },
      create: bookData,
    });
  }
  console.log('Books created/updated:', books.length);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

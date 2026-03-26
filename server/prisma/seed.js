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
      phone: '+966500000000',
      address: '123 Book Street',
      city: 'Riyadh',
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
  ]);
  console.log('Categories created:', categories.length);

  // Create sample books
  const books = [
    {
      title: 'The Alchemist', titleAr: 'الخيميائي', slug: 'the-alchemist',
      author: 'Paulo Coelho', authorAr: 'باولو كويلو',
      description: 'A magical tale about following your dreams and listening to your heart.',
      descriptionAr: 'قصة سحرية عن ملاحقة أحلامك والاستماع إلى قلبك.',
      price: 45.00, compareAtPrice: 60.00, language: 'en', pages: 197,
      stock: 50, categoryId: categories[0].id, isFeatured: true,
      tags: ['bestseller', 'classic', 'philosophy'],
    },
    {
      title: 'Sapiens', titleAr: 'العاقل', slug: 'sapiens',
      author: 'Yuval Noah Harari', authorAr: 'يوفال نوح هراري',
      description: 'A brief history of humankind from the Stone Age to the Silicon Age.',
      descriptionAr: 'تاريخ موجز للبشرية من العصر الحجري إلى عصر السيليكون.',
      price: 65.00, language: 'en', pages: 443,
      stock: 30, categoryId: categories[1].id, isFeatured: true,
      tags: ['history', 'science', 'bestseller'],
    },
    {
      title: 'Riyad as-Salihin', titleAr: 'رياض الصالحين', slug: 'riyad-as-salihin',
      author: 'Imam An-Nawawi', authorAr: 'الإمام النووي',
      description: 'A compilation of Hadith covering all aspects of Islamic life.',
      descriptionAr: 'مجموعة من الأحاديث تغطي جميع جوانب الحياة الإسلامية.',
      price: 55.00, language: 'ar', pages: 600,
      stock: 40, categoryId: categories[2].id, isFeatured: true,
      tags: ['hadith', 'islamic', 'essential'],
    },
    {
      title: 'The Little Prince', titleAr: 'الأمير الصغير', slug: 'the-little-prince',
      author: 'Antoine de Saint-Exupery', authorAr: 'أنطوان دو سانت إكزوبيري',
      description: 'A poetic tale about a little prince who travels the universe.',
      descriptionAr: 'قصة شعرية عن أمير صغير يسافر عبر الكون.',
      price: 35.00, compareAtPrice: 45.00, language: 'en', pages: 96,
      stock: 60, categoryId: categories[3].id, isFeatured: true,
      tags: ['classic', 'children', 'philosophy'],
    },
    {
      title: 'A Brief History of Time', titleAr: 'تاريخ موجز للزمن', slug: 'brief-history-of-time',
      author: 'Stephen Hawking', authorAr: 'ستيفن هوكينغ',
      description: 'Explores the mysteries of the cosmos from the Big Bang to black holes.',
      descriptionAr: 'يستكشف أسرار الكون من الانفجار العظيم إلى الثقوب السوداء.',
      price: 55.00, language: 'en', pages: 256,
      stock: 25, categoryId: categories[4].id,
      tags: ['physics', 'cosmology', 'science'],
    },
    {
      title: 'The Sealed Nectar', titleAr: 'الرحيق المختوم', slug: 'the-sealed-nectar',
      author: 'Safi-ur-Rahman Mubarakpuri', authorAr: 'صفي الرحمن المباركفوري',
      description: 'The definitive biography of Prophet Muhammad (peace be upon him).',
      descriptionAr: 'السيرة النبوية الشاملة للنبي محمد صلى الله عليه وسلم.',
      price: 50.00, language: 'ar', pages: 510,
      stock: 35, categoryId: categories[2].id, isFeatured: true,
      tags: ['seerah', 'islamic', 'biography'],
    },
    {
      title: 'Atomic Habits', titleAr: 'العادات الذرية', slug: 'atomic-habits',
      author: 'James Clear', authorAr: 'جيمس كلير',
      description: 'An easy and proven way to build good habits and break bad ones.',
      descriptionAr: 'طريقة سهلة ومثبتة لبناء عادات جيدة وكسر العادات السيئة.',
      price: 55.00, compareAtPrice: 70.00, language: 'en', pages: 320,
      stock: 45, categoryId: categories[1].id, isFeatured: true,
      tags: ['self-help', 'productivity', 'bestseller'],
    },
    {
      title: 'One Thousand and One Nights', titleAr: 'ألف ليلة وليلة', slug: 'one-thousand-and-one-nights',
      author: 'Traditional', authorAr: 'تراث',
      description: 'A collection of Middle Eastern folk tales compiled during the Islamic Golden Age.',
      descriptionAr: 'مجموعة من الحكايات الشعبية الشرقية جمعت خلال العصر الذهبي الإسلامي.',
      price: 75.00, language: 'ar', pages: 800,
      stock: 20, categoryId: categories[0].id,
      tags: ['classic', 'arabic', 'folklore'],
    },
  ];

  for (const bookData of books) {
    await prisma.book.upsert({
      where: { slug: bookData.slug },
      update: {},
      create: bookData,
    });
  }
  console.log('Sample books created:', books.length);

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

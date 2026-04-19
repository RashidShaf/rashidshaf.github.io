import { motion } from 'framer-motion';

const positionClasses = {
  'top-left': 'top-[38%] sm:top-[35%] -translate-y-1/2 left-3 sm:left-14 lg:left-24',
  'top-center': 'top-[38%] sm:top-[35%] -translate-y-1/2 left-1/2 -translate-x-1/2',
  'top-right': 'top-[38%] sm:top-[35%] -translate-y-1/2 right-3 sm:right-14 lg:right-24',
  'center-left': 'top-[50%] sm:top-[46%] -translate-y-1/2 left-3 sm:left-14 lg:left-24',
  'center': 'top-[50%] sm:top-[46%] -translate-y-1/2 left-1/2 -translate-x-1/2',
  'center-right': 'top-[50%] sm:top-[46%] -translate-y-1/2 right-3 sm:right-14 lg:right-24',
  'bottom-left': 'bottom-[10%] left-3 sm:left-14 lg:left-24',
  'bottom-center': 'bottom-[10%] left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-[10%] right-3 sm:right-14 lg:right-24',
};

const LogoOverlay = ({ position = 'center-left', compact = false, hideMobile = false }) => (
  <div className={`absolute z-10 ${hideMobile ? 'hidden sm:flex' : 'flex'} flex-col items-center pointer-events-none ${positionClasses[position] || positionClasses['center-left']}`}>
    <div className="relative flex items-center justify-center">
      {compact ? (
        <>
          <div className="absolute w-[58px] h-[58px] sm:w-[120px] sm:h-[120px] md:w-[125px] md:h-[125px] lg:w-[160px] lg:h-[160px] xl:w-[215px] xl:h-[215px] 2xl:w-[225px] 2xl:h-[225px] 3xl:w-[370px] 3xl:h-[370px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.25)' }} />
          <div className="absolute w-[75px] h-[75px] sm:w-[150px] sm:h-[150px] md:w-[155px] md:h-[155px] lg:w-[200px] lg:h-[200px] xl:w-[265px] xl:h-[265px] 2xl:w-[285px] 2xl:h-[285px] 3xl:w-[460px] 3xl:h-[460px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.12)' }} />
          <motion.img
            src="/logo.jpg"
            alt="Arkaan"
            className="w-12 h-12 sm:w-24 sm:h-24 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-44 xl:h-44 2xl:w-44 2xl:h-44 3xl:w-72 3xl:h-72 rounded-full object-cover shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(122,27,78,0.4), 0 0 20px rgba(212,165,116,0.15)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
        </>
      ) : (
        <>
          <div className="absolute w-[70px] h-[70px] sm:w-[140px] sm:h-[140px] md:w-[160px] md:h-[160px] lg:w-[200px] lg:h-[200px] xl:w-[260px] xl:h-[260px] 2xl:w-[280px] 2xl:h-[280px] 3xl:w-[400px] 3xl:h-[400px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.25)' }} />
          <div className="absolute w-[90px] h-[90px] sm:w-[170px] sm:h-[170px] md:w-[195px] md:h-[195px] lg:w-[250px] lg:h-[250px] xl:w-[325px] xl:h-[325px] 2xl:w-[350px] 2xl:h-[350px] 3xl:w-[500px] 3xl:h-[500px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.12)' }} />
          <motion.img
            src="/logo.jpg"
            alt="Arkaan"
            className="w-14 h-14 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-52 xl:h-52 2xl:w-56 2xl:h-56 3xl:w-80 3xl:h-80 rounded-full object-cover shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(122,27,78,0.5), 0 0 30px rgba(212,165,116,0.2)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}
    </div>
    <div className={compact ? '-mt-1.5 sm:-mt-3' : '-mt-2 sm:-mt-4'}>
      <img src="/arkaan-banner-logo.png" alt="مكتبة أركان - Arkaan Bookstore" className={compact ? 'w-14 sm:w-20 md:w-24 lg:w-28 xl:w-40 2xl:w-40 3xl:w-56 drop-shadow-lg' : 'w-16 sm:w-24 md:w-28 lg:w-32 xl:w-44 2xl:w-48 3xl:w-64 drop-shadow-lg'} />
    </div>
  </div>
);

export default LogoOverlay;

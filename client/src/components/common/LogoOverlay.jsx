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
          <div className="absolute w-[58px] h-[58px] sm:w-[150px] sm:h-[150px] md:w-[105px] md:h-[105px] lg:w-[180px] lg:h-[180px] xl:w-[260px] xl:h-[260px] 3xl:w-[370px] 3xl:h-[370px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.25)' }} />
          <div className="absolute w-[75px] h-[75px] sm:w-[185px] sm:h-[185px] md:w-[130px] md:h-[130px] lg:w-[220px] lg:h-[220px] xl:w-[330px] xl:h-[330px] 3xl:w-[460px] 3xl:h-[460px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.12)' }} />
          <motion.img
            src="/logo.jpg"
            alt="Arkaan"
            className="w-12 h-12 sm:w-28 sm:h-28 md:w-20 md:h-20 lg:w-36 lg:h-36 xl:w-52 xl:h-52 3xl:w-72 3xl:h-72 rounded-full object-cover shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(122,27,78,0.4), 0 0 20px rgba(212,165,116,0.15)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
        </>
      ) : (
        <>
          <div className="absolute w-[70px] h-[70px] sm:w-[180px] sm:h-[180px] md:w-[140px] md:h-[140px] lg:w-[220px] lg:h-[220px] xl:w-[320px] xl:h-[320px] 3xl:w-[400px] 3xl:h-[400px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.25)' }} />
          <div className="absolute w-[90px] h-[90px] sm:w-[220px] sm:h-[220px] md:w-[170px] md:h-[170px] lg:w-[270px] lg:h-[270px] xl:w-[400px] xl:h-[400px] 3xl:w-[500px] 3xl:h-[500px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.12)' }} />
          <motion.img
            src="/logo.jpg"
            alt="Arkaan"
            className="w-14 h-14 sm:w-36 sm:h-36 md:w-28 md:h-28 lg:w-44 lg:h-44 xl:w-64 xl:h-64 3xl:w-80 3xl:h-80 rounded-full object-cover shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(122,27,78,0.5), 0 0 30px rgba(212,165,116,0.2)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}
    </div>
    <div className={compact ? '-mt-1.5 sm:-mt-3' : '-mt-2 sm:-mt-4'}>
      <img src="/arkaan-banner-logo.png" alt="مكتبة أركان - Arkaan Bookstore" className={compact ? 'w-14 sm:w-24 md:w-20 lg:w-32 xl:w-44 3xl:w-56 drop-shadow-lg' : 'w-16 sm:w-28 md:w-24 lg:w-36 xl:w-52 3xl:w-64 drop-shadow-lg'} />
    </div>
  </div>
);

export default LogoOverlay;

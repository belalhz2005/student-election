import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Syrian Private University (SPU) Logo
 * Renders the uploaded photo /img/logo-spu.jpg with graceful vector fallback
 */
export const SpuLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const containerSizes = {
    sm: 'h-10 px-2 py-0.5',
    md: 'h-14 sm:h-16 px-2.5 py-1',
    lg: 'h-20 px-3.5 py-1.5',
    xl: 'h-24 px-4 py-2',
  };

  const heights = {
    sm: 'h-8 max-w-[140px]',
    md: 'h-11 sm:h-13 max-w-[200px]',
    lg: 'h-16 max-w-[260px]',
    xl: 'h-20 max-w-[320px]',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-[#133774] border border-blue-900/60 shadow-sm overflow-hidden transition-all ${containerSizes[size]} ${className}`}
    >
      {!imgError ? (
        <img
          src="/img/logo-spu.jpg"
          alt="Syrian Private University / الجامعة السورية الخاصة"
          className={`${heights[size]} w-auto object-contain rounded-lg`}
          onError={() => setImgError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 320 180"
          className={`${heights[size]} w-auto drop-shadow-sm`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Book arcs */}
          <path d="M 115 50 Q 160 38 205 50" stroke="#0f356d" strokeWidth="2.5" fill="none" />
          <path d="M 120 44 Q 160 32 200 44" stroke="#0f356d" strokeWidth="2" fill="none" />
          <path d="M 125 38 Q 160 26 195 38" stroke="#0f356d" strokeWidth="1.5" fill="none" />

          {/* SPU */}
          <text x="100" y="105" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="68" fill="#133774">
            S
          </text>
          <text x="142" y="105" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="68" fill="#133774">
            P
          </text>
          <text x="185" y="105" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="68" fill="#7f182a">
            U
          </text>

          {/* Arabic */}
          <text x="160" y="138" textAnchor="middle" fontFamily="'Cairo', sans-serif" fontWeight="800" fontSize="18" fill="#133774">
            الجامعة السورية الخاصة
          </text>
          <text x="160" y="160" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="10" fill="#133774" letterSpacing="1.5">
            SYRIAN PRIVATE UNIVERSITY
          </text>
        </svg>
      )}
    </div>
  );
};

/**
 * Syrian Private University - Faculty of Dentistry circular official seal
 * Renders the uploaded photo /img/logo-dentistry.jpg with graceful vector fallback
 */
export const DentistrySeal: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    sm: 'w-10 h-10 p-0.5',
    md: 'w-14 h-14 sm:w-16 sm:h-16 p-0.5',
    lg: 'w-20 h-20 p-1',
    xl: 'w-24 h-24 p-1.5',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-white border border-slate-200 dark:border-slate-700 shadow-sm transition-all overflow-hidden ${sizes[size]} ${className}`}
    >
      {!imgError ? (
        <img
          src="/img/logo-dentistry.jpg"
          alt="Faculty of Dentistry - Syrian Private University / كلية طب الأسنان"
          className="w-full h-full object-contain rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#133774" strokeWidth="4" />
          <circle cx="100" cy="100" r="86" fill="#133774" />
          <circle cx="100" cy="100" r="54" fill="#ffffff" stroke="#133774" strokeWidth="3" />

          <defs>
            <path id="sealTextArcTop" d="M 30,100 A 70,70 0 0,1 170,100" fill="none" />
            <path id="sealTextArcBottom" d="M 170,100 A 70,70 0 0,1 30,100" fill="none" />
          </defs>

          <text fill="#ffffff" fontSize="13.5" fontFamily="'Cairo', sans-serif" fontWeight="800">
            <textPath href="#sealTextArcTop" startOffset="50%" textAnchor="middle">
              الجامعة السورية الخاصة • كلية طب الأسنان
            </textPath>
          </text>

          <text fill="#ffffff" fontSize="8.5" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" letterSpacing="0.8">
            <textPath href="#sealTextArcBottom" startOffset="50%" textAnchor="middle">
              FACULTY OF DENTISTRY • SPU
            </textPath>
          </text>

          <text x="73" y="106" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="28" fill="#133774">
            S
          </text>
          <text x="91" y="106" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="28" fill="#133774">
            P
          </text>
          <text x="110" y="106" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="28" fill="#7f182a">
            U
          </text>

          {/* Tooth emblem */}
          <path
            d="M 94 114 C 91 114 88 116 88 120 C 88 126 91 133 93 137 C 94 139 96 139 97 137 C 98 135 99 127 100 126 C 101 127 102 135 103 137 C 104 139 106 139 107 137 C 109 133 112 126 112 120 C 112 116 109 114 106 114 C 103 114 101 116 100 117 C 99 116 97 114 94 114 Z"
            fill="#133774"
          />
        </svg>
      )}
    </div>
  );
};

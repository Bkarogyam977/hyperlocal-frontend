'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

const SLIDES = [
  {
    badge: '🌿 100% Certified Ayurvedic',
    heading: 'Pure Wellness,\nDelivered Fast',
    sub: 'Authentic herbal products from certified local practitioners.',
    cta: 'Shop Now',
    bg: '/slider7.jpg', 
    isImage: true,
    emoji: '🌿',
  },
  {
    badge: '🌸 Seasonal Health Packs',
    heading: 'Monsoon\nEssentials',
    sub: 'Boost immunity before the season changes with our curated bundles.',
    cta: 'Explore Packs',
    bg: '/slider6.jpg', 
    isImage: true,
    emoji: '🍃',
  },
  {
    badge: '✨ New Arrivals',
    heading: 'Natural Skin\nCare Range',
    sub: 'Chemical-free, plant-based goodness for your daily glow.',
    cta: 'View All',
    bg: '/slider1.png', 
    isImage: true,
    emoji: '✨',
  },
];

const TILES = [
  { emoji: '🌿', title: 'Herbal Picks', sub: 'Curated weekly', bg: 'from-amber-50 to-orange-100', border: 'border-orange-100', tc: 'text-orange-800', sc: 'text-orange-500' },
  { emoji: '⚡', title: 'Fast Delivery', sub: 'From your nearest store',  bg: 'from-sky-50 to-blue-100',     border: 'border-blue-100',   tc: 'text-blue-800',   sc: 'text-blue-500' },
  { emoji: '🛡️', title: 'Lab Tested',  sub: 'FSSAI approved', bg: 'from-emerald-50 to-green-100', border: 'border-green-100',  tc: 'text-green-800',  sc: 'text-green-500' },
];

export default function HeroCarousel() {
  const [cur, setCur] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const goNext = useCallback(() => {
    setCur((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const goPrev = () => {
    setCur((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const resetTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(goNext, 5000);
  }, [goNext]);

  useEffect(() => {
    resetTimer();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [resetTimer]);

  const s = SLIDES[cur];

  return (
    <div className="mb-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* MAIN CONTAINER: 
          - min-h-64 (Mobile: 256px) 
          - sm:min-h-80 (Desktop: 320px)
          Inhe aap min-h-60, 72, 80, 96 me se koi bhi standard value de sakte hain
      */}
      <div 
        className="relative rounded-3xl overflow-hidden min-h-64 sm:min-h-120 flex items-center transition-all duration-1000 shadow-xl"
        style={{ backgroundColor: !s.isImage ? s.bg : '#f3f4f6' }}
      >
        {s.isImage && (
          <>
            <Image
              src={s.bg}
              alt={s.heading}
              fill
              priority
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/30 z-[1]" />
          </>
        )}

        {/* Content Section - Adjusted Padding for smaller height */}
        <div className="relative z-10 w-full p-6 sm:p-12">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold mb-4 text-white border border-white/30 uppercase tracking-wider">
              {s.badge}
            </span>
            {/* Heading size adjusted for smaller container */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-3 drop-shadow-md whitespace-pre-line">
              {s.heading}
            </h1>
            <p className="text-white/90 text-xs sm:text-base leading-relaxed mb-6 max-w-sm font-medium">
              {s.sub}
            </p>
            
            <div className="flex gap-3 flex-wrap">
              <button className="bg-white text-gray-900 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-100 transition-all shadow-lg">
                {s.cta}
              </button>
              <button className="bg-transparent border border-white/60 text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-white/10 backdrop-blur-sm transition-all">
                Consult Vaidya
              </button>
            </div>
          </div>
        </div>

        {/* Navigation - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-20 flex gap-2 sm:bottom-6 sm:right-6">
          <button
            onClick={() => { goPrev(); resetTimer(); }}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/10 group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => { goNext(); resetTimer(); }}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/10 group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center items-center gap-2 mt-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCur(i); resetTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-500 ${i === cur ? 'w-8 bg-green-700' : 'w-1.5 bg-gray-300'}`}
          />
        ))}
      </div>

      {/* Bento sub-tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {TILES.map((t) => (
          <div
            key={t.title}
            className={`rounded-2xl bg-gradient-to-br ${t.bg} p-4 flex items-center gap-3 border ${t.border} shadow-sm`}
          >
            <span className="text-2xl sm:text-3xl">{t.emoji}</span>
            <div>
              <p className={`text-xs font-bold ${t.tc}`}>{t.title}</p>
              <p className={`text-[10px] ${t.sc} font-medium`}>{t.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
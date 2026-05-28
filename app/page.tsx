'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@/types';
import { api } from '@/services/api';
import HeroCarousel from '@/components/HeroCarousel';
import CategoryBar, { HEALTH_CONCERNS } from '@/components/CategoryBar';
import AyurvedaProductCard from '@/components/AyurvedaProductCard';
import WhatsAppButton from '@/components/WhatsAppButton';
import LeadPopup from '@/components/LeadPopup';
import Footer from '@/components/Footer';

// --- 1. FORCED LOCATION MODAL COMPONENT ---
function LocationModal({ onSelect }: { onSelect: (v: string) => void }) {
  const [input, setInput] = useState('');
  const [locating, setLocating] = useState(false);

  // --- HYDRATION FIX START ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const popularCities = ['Ghazipur', 'Varanasi', 'Lucknow', 'Delhi', 'Noida', 'Patna'];

  // Agar server pe hai toh kuch render mat karo
  if (!mounted) return null;
  // --- HYDRATION FIX END ---

  const handleGPS = () => {
    if (!navigator.geolocation) return alert("GPS not supported by your browser");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const label = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        onSelect(label);
        setLocating(false);
      },
      () => {
        alert("Location access denied. Please type your city.");
        setLocating(false);
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Check Availability</h2>
          <p className="text-gray-500 text-sm mb-8">Please select your delivery location to see products available in your area.</p>

          {/* GPS Button with Hydration Fix */}
          <button 
            suppressHydrationWarning
            onClick={handleGPS}
            disabled={locating}
            className="w-full mb-4 flex items-center justify-center gap-3 bg-green-50 text-green-800 py-4 rounded-2xl font-bold border-2 border-green-100 hover:bg-green-100 transition-all disabled:opacity-60"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
            {locating ? 'Locating...' : 'Use Current Location'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400 font-medium">Or type manually</span></div>
          </div>

          {/* Input with Hydration Fix */}
          <input 
            suppressHydrationWarning
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && input && onSelect(input)}
            placeholder="Enter city name..."
            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-green-800 outline-none mb-4 text-gray-900 font-medium"
          />

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {popularCities.map(city => (
              <button 
                suppressHydrationWarning
                key={city}
                onClick={() => onSelect(city)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-green-800 hover:text-green-800 transition-all"
              >
                {city}
              </button>
            ))}
          </div>

          {/* Final Submit Button with Hydration Fix */}
          <button 
            suppressHydrationWarning
            onClick={() => input && onSelect(input)}
            disabled={!input}
            className="w-full bg-green-800 text-white py-4 rounded-2xl font-bold uppercase tracking-wide shadow-lg hover:bg-green-900 transition-all disabled:opacity-50"
          >
            Show Products
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 2. TOP LOCATION BAR COMPONENT ---
function LocationBar({
  location,
  onLocationChange,
}: {
  location: string;
  onLocationChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(location);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- HYDRATION FIX START ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Server-side rendering ke time ek placeholder dikhayenge
  if (!mounted) {
    return <div className="h-10 w-full" style={{ backgroundColor: '#14532d' }} />;
  }
  // --- HYDRATION FIX END ---

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const label = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        onLocationChange(label);
        setDraft(label);
        setLocating(false);
        setEditing(false);
      },
      () => setLocating(false),
    );
  };

  const save = () => {
    if (draft.trim()) onLocationChange(draft.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 text-white text-sm sticky top-0 z-[0]" style={{ backgroundColor: '#14532d' }}>
      <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      
      {editing ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            suppressHydrationWarning  // Warning fix
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Enter area or city"
            className="flex-1 bg-green-900 text-white placeholder-green-500 text-sm px-2.5 py-1 rounded-lg outline-none border border-green-700 focus:border-green-400"
          />
          <button 
            suppressHydrationWarning // Warning fix
            onClick={handleGPS} 
            disabled={locating} 
            className="text-green-300 hover:text-white text-xs font-medium whitespace-nowrap disabled:opacity-60"
          >
            {locating ? 'Locating' : 'GPS'}
          </button>
          <button 
            suppressHydrationWarning // Warning fix
            onClick={save} 
            className="text-green-300 hover:text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      ) : (
        <button 
          suppressHydrationWarning // Warning fix
          onClick={() => setEditing(true)} 
          className="flex items-center gap-1 group"
        >
          <span className="text-green-400 text-xs">Deliver to</span>
          <span className="font-semibold text-white truncate max-w-[200px] group-hover:text-green-200 transition-colors">
            {location || 'Select Location'}
          </span>
          <svg className="w-3 h-3 text-green-400 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
// --- 3. LOADING SKELETON ---
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-36 bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="flex gap-1 mt-2">
              <div className="h-5 bg-gray-100 rounded-md w-14" />
              <div className="h-5 bg-gray-100 rounded-md w-14" />
            </div>
            <div className="flex gap-1.5 mt-3">
              <div className="h-8 bg-gray-100 rounded-xl flex-1" />
              <div className="h-8 bg-gray-100 rounded-xl flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- 4. MAIN HOME PAGE ---
export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [location, setLocation] = useState('');

  // LocalStorage se location load karna page load par
  useEffect(() => {
    const saved = localStorage.getItem('userCity');
    if (saved) setLocation(saved);
  }, []);

  const fetchProducts = useCallback(async (term = '') => {
    if (!location) return; // Jab tak location nahi, tab tak fetch mat karo
    setLoading(true);
    setError('');
    try {
      const data = await api.products.list({ 
        limit: 50, 
        search: term || undefined,
        city: location || undefined 
      });
      setProducts(data);
    } catch {
      setError('Failed to load products. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Debounced Search and Location Effect
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 400);
    return () => clearTimeout(t);
  }, [search, location, fetchProducts]);

  const handleLocationUpdate = (newCity: string) => {
    setLocation(newCity);
    localStorage.setItem('userCity', newCity);
  };

  const cat = HEALTH_CONCERNS.find((c) => c.id === activeCategory);
  const displayed =
    activeCategory === 'all' || !cat || cat.keywords.length === 0
      ? products
      : products.filter((p) => {
          const lower = (p.name + ' ' + p.description).toLowerCase();
          return cat.keywords.some((k) => lower.includes(k));
        });

  return (
    <>
      {/* 🛑 FORCE LOCATION: Jab tak location nahi hai, modal dikhao */}
      {!location && <LocationModal onSelect={handleLocationUpdate} />}

      <LocationBar location={location} onLocationChange={handleLocationUpdate} />

      <div id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <HeroCarousel />

        {/* Search Bar */}
        <div className="relative mb-4 mt-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            suppressHydrationWarning
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, herbs, remedies"
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <CategoryBar active={activeCategory} onChange={setActiveCategory} />

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 mb-6 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-4">&#x1F50D;</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-400 text-sm">Try a different search or location</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 mt-8">
              <h2 className="font-bold text-xl text-gray-900 tracking-tight">
                {search ? ('Results for "' + search + '"') : (cat?.label ?? 'Featured Products')}
              </h2>
              <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100">{displayed.length} items nearby</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayed.map((product) => (
                <AyurvedaProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>

      <WhatsAppButton />

         {/* LEAD CONTENT */}
      <LeadPopup />

       {/* PAGE CONTENT */}
      <Footer />
    </>
  );
}
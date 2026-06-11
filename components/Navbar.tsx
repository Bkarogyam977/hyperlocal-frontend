'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';

interface SubMenu {
  id: number;
  name_en: string;
  name_hi: string;
  description: string;
}


export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const pathname = usePathname();

  const [submenus, setSubmenus] = useState<SubMenu[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const router = useRouter();


  
 useEffect(() => {
  fetch("/api/menuList")
    .then((res) => res.json())
    .then((data) => setSubmenus(Array.isArray(data) ? data : []))
    .catch(() => {});
}, []);


  // Admin and vendor panels have their own sidebar nav
  if (pathname.startsWith('/admin') || pathname.startsWith('/vendor')) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
  <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      
      <Link href="/" className="flex items-center gap-2">
        
        <img src="/logo.jpg" alt="BK Arogyam" className="h-13 w-auto" />

        <span className="font-bold text-xl text-gray-900">BK Arogyam</span>

        <span className="hidden sm:inline-block bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full">
          Pure Ayurveda
        </span>
        
      </Link>

<div className="flex items-center gap-6">

 

  {/* Vertical Marquee */}
  <div className="h-10 overflow-hidden relative w-40">

    <div className="animate-marquee-up text-sm font-semibold text-green-700">

      <div className="space-y-2">
        <div>⚡ Super Fast Delivery</div>
        <div>🚚 Fast Delivery</div>
        <div>📦 Normal Delivery</div>
      </div>

      <div className="space-y-2 mt-2">
        <div>⚡ Super Fast Delivery</div>
        <div>🚚 Fast Delivery</div>
        <div>📦 Normal Delivery</div>
      </div>

    </div>

  </div>

  {/* Search Box */}
  <div className="relative w-72">

    <input
      type="text"
      placeholder="Search products..."
      className="
        w-full
        border
        border-gray-300
        rounded-full
        py-2
        pl-10
        pr-4
        outline-none
        focus:border-green-500
        focus:ring-2
        focus:ring-green-200
      "
    />

    {/* Search Icon */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>

  </div>
 {/* Shop Menu */}
  <div className="relative group z-[9999]">

    <button className="font-semibold text-green-600 px-4 py-2 whitespace-nowrap">
      Shop of Concern ▼
    </button>

    <div
      className="
        absolute
        left-0
        top-full
        pt-1
        opacity-0
        invisible
        group-hover:opacity-100
        group-hover:visible
        transition-all
        duration-200
        bg-white
        rounded-xl
        shadow-2xl
        border
        min-w-[300px]
        p-3
        z-[99999]
      "
    >
      {submenus.map((submenu) => (
       <div
  key={submenu.id}
  onClick={() => {
  router.push(
    `/?category=${submenu.name_en.toLowerCase()}`
  );
}}
  className="
    p-4
    rounded-xl
    hover:bg-green-50
    cursor-pointer
    transition-all
    duration-200
    border-b
    border-gray-100
  "
>

  {/* Name */}
  <div className="flex items-center gap-1">

    <span className="font-semibold text-gray-800">
      {submenu.name_en}
    </span>

    <span className="text-sm text-gray-500">
      ({submenu.name_hi})
    </span>

  </div>

  {/* Description */}
  <p className="text-sm text-green-700 mt-1">
    {submenu.description}
  </p>

</div>
      ))}
    </div>

  </div>
</div>



          <div className="flex items-center gap-1">
            {user && (
              <span className="hidden md:block text-sm text-gray-500 mr-2">
                Hi, {user.name.split(' ')[0]}
              </span>
            )}

            {user?.role === 'customer' && (
              <>
                <Link
                  href="/orders"
                  className={`text-sm font-medium px-3 py-2 rounded-xl transition-colors ${
                    pathname === '/orders'
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Orders
                </Link>

                <Link
                  href="/cart"
                  className="relative flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Cart
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm font-medium px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
              >
                Admin Panel
              </Link>
            )}

            {user?.role === 'vendor' && (
              <Link
                href="/vendor"
                className="text-sm font-medium px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                Vendor Panel
              </Link>
            )}

            {user ? (
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-800 font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-green-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

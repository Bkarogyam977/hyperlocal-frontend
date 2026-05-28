'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';

const EMOJI_MAP: Record<string, string> = {
  milk: '🥛',
  bread: '🍞',
  egg: '🥚',
  eggs: '🥚',
  rice: '🍚',
  oil: '🫙',
  water: '💧',
  juice: '🧃',
  coffee: '☕',
  tea: '🍵',
  sugar: '🍬',
  salt: '🧂',
  butter: '🧈',
  cheese: '🧀',
  yogurt: '🥛',
  fruit: '🍎',
  vegetable: '🥦',
  chicken: '🍗',
  meat: '🥩',
  fish: '🐟',
};

const GRADIENTS = [
  'bg-linear-to-br from-green-100 to-emerald-50',
  'bg-linear-to-br from-blue-100 to-sky-50',
  'bg-linear-to-br from-orange-100 to-amber-50',
  'bg-linear-to-br from-purple-100 to-violet-50',
  'bg-linear-to-br from-pink-100 to-rose-50',
  'bg-linear-to-br from-teal-100 to-cyan-50',
  'bg-linear-to-br from-yellow-100 to-lime-50',
  'bg-linear-to-br from-indigo-100 to-blue-50',
];

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '🛒';
}

export default function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart();
  const [adding, setAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const isLowStock = product.total_available > 0 && product.total_available <= 5;
  const gradient = GRADIENTS[product.id % GRADIENTS.length];

  const showImage = !!product.image_url && !imgError;

  const handleAdd = () => {
    setAdding(true);
    addItem(product);
    setTimeout(() => setAdding(false), 300);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image area — use relative+absolute so height is guaranteed regardless of flex context */}
      <div className={`${gradient} h-32 relative shrink-0 overflow-hidden`}>
        {showImage ? (
          <img
            src={product.image_url!}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">{getEmoji(product.name)}</span>
          </div>
        )}

        {isLowStock && (
  <span className="absolute top-2 left-2 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
    Only {product.total_available} left
  </span>
)}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate mb-0.5">
          {product.name}
        </h3>
        <p className="text-xs text-gray-400 truncate mb-2">{product.description}</p>

        <div className="flex items-center gap-1 mb-3">
          {product.available_vendors_count > 0 && (
            <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-medium">
              {product.available_vendors_count} vendor
              {product.available_vendors_count > 1 ? 's' : ''}
            </span>
          )}
          {product.warehouse_available > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">
              warehouse
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-gray-900">₹{product.price.toFixed(2)}</span>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all bg-green-500 hover:bg-green-600 text-white active:scale-95 disabled:opacity-60"
            >
              {adding ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                   Add
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center bg-green-500 rounded-xl overflow-hidden">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="w-7 h-7 flex items-center justify-center text-white font-bold hover:bg-green-600 transition-colors"
              >
                −
              </button>
              <span className="text-white font-bold text-sm w-5 text-center">{quantity}</span>
              <button
                onClick={() => addItem(product)}
                className="w-7 h-7 flex items-center justify-center text-white font-bold hover:bg-green-600 transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

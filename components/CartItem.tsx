'use client';

import type { CartItem } from '@/types';
import { useCart } from '@/context/CartContext';

const EMOJI_MAP: Record<string, string> = {
  milk: '🥛',
  bread: '🍞',
  egg: '🥚',
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
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '🛒';
}

export default function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-2xl">{getEmoji(item.product.name)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{item.product.name}</p>
        <p className="text-xs text-gray-400">₹{item.product.price.toFixed(2)} each</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center border border-green-200 rounded-xl overflow-hidden">
          <button
            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
            className="w-7 h-7 flex items-center justify-center text-green-600 font-bold hover:bg-green-50 transition-colors"
          >
            −
          </button>
          <span className="font-semibold text-sm w-5 text-center text-gray-900">
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
            className="w-7 h-7 flex items-center justify-center text-green-600 font-bold hover:bg-green-50 transition-colors"
          >
            +
          </button>
        </div>

        <span className="font-semibold text-gray-900 text-sm w-14 text-right">
          ₹{(item.product.price * item.quantity).toFixed(2)}
        </span>

        <button
          onClick={() => removeItem(item.product.id)}
          className="text-gray-300 hover:text-red-400 transition-colors"
          aria-label="Remove item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';

const G = '#166534';
const GOLD = '#D97706';

const GRADIENTS = [
  'from-green-100 to-emerald-50', 'from-amber-100 to-yellow-50',
  'from-orange-100 to-amber-50',  'from-teal-100 to-cyan-50',
  'from-purple-100 to-violet-50', 'from-pink-100 to-rose-50',
  'from-indigo-100 to-blue-50',   'from-lime-100 to-green-50',
];

const EMOJI_MAP: Record<string, string> = {
  milk:'🥛', bread:'🍞', egg:'🥚', eggs:'🥚', rice:'🍚', oil:'🫙',  water:'💧',
  juice:'🧃', coffee:'☕', tea:'🍵', sugar:'🍬', salt:'🧂', butter:'🧈',
  cheese:'🧀', yogurt:'🥛', fruit:'🍎', vegetable:'🥦', chicken:'🍗',
  meat:'🥩', fish:'🐟', ghee:'🫙', dal:'🍲', atta:'🌾', masala:'🌶️',
  paneer:'🧀', curd:'🥛', onion:'🧅', potato:'🥔', tomato:'🍅',
  honey:'🍯', ginger:'🫚', neem:'🌿', tulsi:'🍃', amla:'🔵',
};

const INGREDIENT_MAP: Record<string, string[]> = {
  milk: ['Calcium', 'Protein'],         ghee: ['Butyric Acid', 'Vitamin A'],
  honey: ['Enzymes', 'Antioxidants'],   ginger: ['Gingerol', 'Digestive'],
  turmeric: ['Curcumin', 'Anti-inflammatory'], neem: ['Nimbidin', 'Antibacterial'],
  tulsi: ['Eugenol', 'Antiviral'],      ashwagandha: ['Withanolides', 'Adaptogenic'],
  amla: ['Vitamin C', 'Antioxidant'],   triphala: ['Haritaki', 'Amla'],
  rice: ['Carbs', 'Iron'],              dal: ['Protein', 'Fiber'],
  oil: ['Vitamin E', 'Omega-6'],        tea: ['Polyphenols', 'Antioxidants'],
  coffee: ['Caffeine', 'Antioxidants'], sesame: ['Sesamol', 'Vitamin E'],
  coconut: ['MCT', 'Lauric Acid'],      aloe: ['Aloin', 'Hydrating'],
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(EMOJI_MAP)) if (lower.includes(k)) return v;
  return '🌿';
}

function getTags(name: string): string[] {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(INGREDIENT_MAP)) if (lower.includes(k)) return v.slice(0, 2);
  return ['Natural', 'Herbal'];
}

export default function AyurvedaProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart();
  const router = useRouter();
  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const gradient = GRADIENTS[product.id % GRADIENTS.length];
  const tags = getTags(product.name);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    addItem(product);
    setTimeout(() => setAdding(false), 300);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cartItem) addItem(product);
    router.push('/checkout');
  };

    const handleProductClick = () => {
  router.push(`/ProductOverview/${product.id}`);
};

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image */}
      <div 
       onClick={handleProductClick}
      className={`bg-linear-to-br ${gradient} h-36 flex items-center justify-center relative shrink-0`}>
        {product.image_url ? (
          <img
  src={product.image_url}
  onError={(e) => {
    const target = e.target as HTMLImageElement;

    if (target.src.endsWith('.jpg')) {
      target.src = target.src.replace('.jpg', '.png');
    }
  }}
/>
        ) : (
          <span className="text-5xl">{getEmoji(product.name)}</span>
        )}
        {product.total_available < 20 && product.total_available > 0 && (
          <span className="absolute top-2 left-2 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
            Only {product.total_available} left
          </span>
        )}
        {product.available_vendors_count > 1 && qty === 0 && (
          <span
            className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#FEF3C7', color: GOLD }}
          >
            {product.available_vendors_count} stores
          </span>
        )}
        {qty > 0 && (
          <span
            className="absolute top-2 right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: G }}
          >
            {qty}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5 line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-gray-400 truncate mb-1.5">{product.description}</p>
        )}

        {/* Ingredient tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ backgroundColor: '#F0FDF4', color: G, border: '1px solid #BBF7D0' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Price + qty stepper */}
        <div className="flex items-center justify-between mb-2 mt-auto">
          <div>
            <span className="font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
            <span className="text-xs text-gray-400 ml-1">/ unit</span>
          </div>
          {qty > 0 && (
            <div className="flex items-center rounded-lg overflow-hidden border" style={{ borderColor: G }}>
              <button
                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1); }}
                className="w-6 h-6 flex items-center justify-center font-bold text-sm hover:bg-green-50 transition-colors"
                style={{ color: G }}
              >
                −
              </button>
              <span className="font-bold text-xs w-5 text-center" style={{ color: G }}>{qty}</span>
              <button
                onClick={(e) => { e.stopPropagation(); addItem(product); }}
                className="w-6 h-6 flex items-center justify-center font-bold text-sm hover:bg-green-50 transition-colors"
                style={{ color: G }}
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={handleBuyNow}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: G }}
          >
           {product.id} Buy Now
          </button>
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50"
            style={{ borderColor: G, color: G }}
          >
            {adding ? (
              <span className="flex items-center justify-center">
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </span>
            ) : qty > 0 ? (
              'Add More'
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

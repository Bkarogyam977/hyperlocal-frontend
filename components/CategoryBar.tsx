'use client';

const G = '#166534';

export const HEALTH_CONCERNS = [
  { id: 'all',         label: 'All Products',  emoji: '🛒',  keywords: [] as string[] },
  { id: 'immunity',    label: 'Immunity',       emoji: '🛡️', keywords: ['tulsi','amla','giloy','ashwagandha','vitamin','immunity','ginger','turmeric'] },
  { id: 'digestion',   label: 'Digestion',      emoji: '🌀', keywords: ['triphala','ajwain','jeera','haritaki','ginger','digestive','dal','rice','isabgol'] },
  { id: 'skin',        label: 'Skin & Hair',    emoji: '✨', keywords: ['neem','bhringraj','aloe','coconut','sesame','skin','hair','kumkumadi'] },
  { id: 'stress',      label: 'Stress Relief',  emoji: '🧘', keywords: ['ashwagandha','brahmi','shatavari','chamomile','sleep','shankhpushpi'] },
  { id: 'joint',       label: 'Joint Care',     emoji: '🦴', keywords: ['shallaki','guggul','nirgundi','calcium','joint','bone'] },
  { id: 'respiratory', label: 'Respiratory',    emoji: '💨', keywords: ['tulsi','honey','ginger','vasaka','cough','cold','sitopaladi'] },
  { id: 'diabetes',    label: 'Diabetes Care',  emoji: '🩸', keywords: ['karela','jamun','fenugreek','methi','bitter','glucose'] },
  { id: 'dairy',       label: 'Dairy',          emoji: '🥛', keywords: ['milk','butter','cheese','yogurt','cream','paneer','curd','ghee'] },
  { id: 'grains',      label: 'Grains',         emoji: '🌾', keywords: ['rice','wheat','bread','atta','flour','dal','oats'] },
  { id: 'oils',        label: 'Oils & Ghee',    emoji: '🫙', keywords: ['oil','ghee','vanaspati','sesame','mustard'] },
  { id: 'fresh',       label: 'Fresh',          emoji: '🥦', keywords: ['vegetable','fruit','fresh','tomato','onion','potato','sabzi'] },
];

export default function CategoryBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-0.5" style={{ color: '#D97706' }}>
        Shop by Health Concern
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {HEALTH_CONCERNS.map((cat) => {
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border"
              style={
                isActive
                  ? { backgroundColor: G, borderColor: G, color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#4b5563' }
              }
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

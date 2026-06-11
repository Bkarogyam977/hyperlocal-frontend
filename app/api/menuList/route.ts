import { NextResponse } from 'next/server';

const MENU_ITEMS = [
  { id: 1,  name_en: 'Immunity',      name_hi: 'रोग प्रतिरोधक शक्ति', description: 'Tulsi, Amla, Giloy & Ashwagandha products' },
  { id: 2,  name_en: 'Digestion',     name_hi: 'पाचन शक्ति',           description: 'Triphala, Ajwain & digestive herbs' },
  { id: 3,  name_en: 'Skin & Hair',   name_hi: 'त्वचा और बाल',         description: 'Neem, Bhringraj & natural care' },
  { id: 4,  name_en: 'Stress Relief', name_hi: 'तनाव मुक्ति',           description: 'Brahmi, Shatavari & calming herbs' },
  { id: 5,  name_en: 'Joint Care',    name_hi: 'जोड़ों की देखभाल',       description: 'Shallaki, Guggul & bone health' },
  { id: 6,  name_en: 'Respiratory',   name_hi: 'श्वसन स्वास्थ्य',        description: 'Tulsi, Vasaka & cough remedies' },
  { id: 7,  name_en: 'Diabetes Care', name_hi: 'मधुमेह देखभाल',         description: 'Karela, Jamun & glucose management' },
  { id: 8,  name_en: 'Oils & Ghee',   name_hi: 'तेल और घी',             description: 'Pure sesame, mustard & Ayurvedic oils' },
];

export async function GET() {
  return NextResponse.json(MENU_ITEMS);
}

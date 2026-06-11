
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  total_available: number;
}

export default function ProductOverviewPage() {
  const params = useParams();
  const id = params.id;

  const [product, setProduct] = useState<Product | null>(null);

  // selected image
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    fetch(`/api/backend/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);

        // default image
        setSelectedImage(data.image_url);
      });
  }, [id]);

  if (!product) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold">
        Loading...
      </div>
    );
  }

  // demo thumbnails
  const thumbnails = [
    product.image_url,
    product.image_url,
    product.image_url,
    product.image_url,
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
        
        {/* LEFT SIDE */}
        <div>
          {/* Main Image */}
          <div className="bg-[#f5f5f5] rounded-3xl p-10 flex justify-center items-center">
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-[500px] object-contain"
            />
          </div>

          {/* Thumbnails */}
          <div className="flex gap-5 mt-6">
            {thumbnails.map((img, index) => (
              <div
                key={index}
                onClick={() => setSelectedImage('https://purenutrition.in/cdn/shop/files/WheyProteinChocolate2kg2.jpg?v=1759318806&width=1946')}
                className={`w-28 h-28 rounded-2xl border-2 cursor-pointer overflow-hidden bg-[#f5f5f5] p-2 transition-all duration-200
                  
                  ${
                    selectedImage === img
                      ? 'border-indigo-500'
                      : 'border-transparent'
                  }
                `}
              >
                <img
                  src={'https://purenutrition.in/cdn/shop/files/WheyProteinChocolate2kg2.jpg?v=1759318806&width=1946'}
                  alt={`thumb-${index}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="pt-3">
          {/* Price */}
          <h4 className="text-5xl font-bold text-gray-900 mb-4">
            ₹{product.price}
          </h4>

          {/* Product Name */}
          <h1 className="text-3xl font-bold text-gray-800 mb-5">
            {product.name}
          </h1>

          {/* Description */}
          <p className="text-gray-600 leading-8 text-lg mb-8">
            {product.description}
          </p>

          <div className="border-t pt-2">
            {/* Features Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-indigo-600">
                Features
              </h3>
            </div>

            {/* Features List */}
            <ul className="space-y-4 text-gray-600 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                Multiple strap configurations
              </li>

              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                Spacious interior with top zip
              </li>

              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                Leather handle and tabs
              </li>

              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                Interior dividers
              </li>

              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                Stainless strap loops
              </li>
            </ul>

            {/* Stock */}
            <div className="mt-10 text-lg">
              Stock Available:
              <span className="ml-2 font-bold text-green-600">
                {product.total_available}
              </span>
            </div>
          </div>
           {/* Buttons */}
          <div className="flex items-center gap-5 mb-12">
            <button className="bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 text-white font-semibold px-16 py-4 rounded-2xl text-lg shadow-lg">
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
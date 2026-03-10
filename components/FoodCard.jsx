'use client';

import Image       from 'next/image';
import { Plus, Check } from 'lucide-react';
import { useState }    from 'react';
import { useCart }     from '@/context/CartContext';

export default function FoodCard({ item }) {
  const { addItem, items } = useCart();
  const [added, setAdded]  = useState(false);

  const inCart = items.find(i => i.id === item.id);

  const handleAdd = () => {
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">

      {/* Image */}
      <div className="relative h-44 w-full bg-gray-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🍽️</div>
        )}
        {/* Category badge */}
        <span className="absolute top-2 left-2 badge bg-orange-100 text-orange-700">
          {item.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-base">{item.name}</h3>
        <p className="text-sm text-gray-500 mt-1 flex-1 line-clamp-2">{item.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-orange-500">
            ${parseFloat(item.price).toFixed(2)}
          </span>

          <button
            onClick={handleAdd}
            disabled={added}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${added
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
          >
            {added ? (
              <><Check className="w-4 h-4" /> Added</>
            ) : (
              <><Plus className="w-4 h-4" /> Add to Cart{inCart ? ` (${inCart.quantity})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

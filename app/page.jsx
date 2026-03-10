'use client';

import { useState, useEffect, useMemo } from 'react';
import { foodItemsApi }   from '@/lib/api';
import FoodCard           from '@/components/FoodCard';
import LoadingSpinner     from '@/components/LoadingSpinner';
import { Search, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = ['All', 'Sandwiches', 'Pizza', 'Cake'];

export default function HomePage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await foodItemsApi.getAll();
        setItems(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory !== 'All') {
      result = result.filter(i => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeCategory, search]);

  // Group by category for display
  const grouped = useMemo(() => {
    if (activeCategory !== 'All') {
      return { [activeCategory]: filtered };
    }
    return CATEGORIES.slice(1).reduce((acc, cat) => {
      const catItems = filtered.filter(i => i.category === cat);
      if (catItems.length) acc[cat] = catItems;
      return acc;
    }, {});
  }, [filtered, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white p-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Fresh Food, Fast Delivery 🚀</h1>
        <p className="text-orange-100 text-lg">Sandwiches, pizzas and cakes — delivered to your door.</p>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner message="Fetching the menu…" />}

      {error && (
        <div className="card p-6 text-center">
          <p className="text-red-500 font-medium">⚠️ {error}</p>
          <p className="text-sm text-gray-500 mt-1">Make sure the backend is running at {process.env.NEXT_PUBLIC_API_URL}.</p>
        </div>
      )}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="text-lg font-medium">No items found</p>
          <p className="text-sm mt-1">Try a different search or category.</p>
        </div>
      )}

      {!loading && !error && Object.entries(grouped).map(([category, catItems]) => (
        <section key={category} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">{category}</h2>
            <span className="badge bg-orange-100 text-orange-700">{catItems.length} items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {catItems.map(item => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

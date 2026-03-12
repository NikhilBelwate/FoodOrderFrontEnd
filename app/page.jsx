'use client';

import { useState, useEffect, useMemo } from 'react';
import { foodItemsApi, categoriesApi } from '@/lib/api';
import FoodCard       from '@/components/FoodCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Search, SlidersHorizontal } from 'lucide-react';

// ── Veg / Non-veg toggle component ──────────────────────────────────────────
function VegToggle({ value, onChange }) {
  const btn = (val, label, active, colors) => (
    <button
      onClick={() => onChange(val)}
      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
        value === val ? colors.active : colors.idle
      }`}
    >
      {val !== 'all' && (
        <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 shrink-0">
      {btn('all',    'All',     value === 'all',    { active: 'bg-white text-gray-800 shadow-sm', idle: 'text-gray-500 hover:text-gray-700' })}
      {btn('veg',    'Veg',     value === 'veg',    { active: 'bg-green-500 text-white shadow-sm', idle: 'text-gray-500 hover:text-green-600' })}
      {btn('nonveg', 'Non-Veg', value === 'nonveg', { active: 'bg-red-500 text-white shadow-sm', idle: 'text-gray-500 hover:text-red-600' })}
    </div>
  );
}

export default function HomePage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [search,         setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [vegFilter,      setVegFilter]      = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [catRes, itemRes] = await Promise.all([
          categoriesApi.getAll(),
          foodItemsApi.getAll(),
        ]);
        setCategories(catRes.data || []);
        setItems(itemRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoryNames = useMemo(
    () => ['All', ...categories.map(c => c.name)],
    [categories]
  );

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory !== 'All') result = result.filter(i => i.category === activeCategory);
    if (vegFilter === 'veg')     result = result.filter(i => i.is_veg === true);
    if (vegFilter === 'nonveg')  result = result.filter(i => i.is_veg === false);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeCategory, vegFilter, search]);

  const grouped = useMemo(() => {
    if (activeCategory !== 'All') return { [activeCategory]: filtered };
    const groups = {};
    for (const cat of categories) {
      const catItems = filtered.filter(i => i.category === cat.name);
      if (catItems.length > 0) groups[cat.name] = catItems;
    }
    const knownCats = new Set(categories.map(c => c.name));
    const other = filtered.filter(i => !knownCats.has(i.category));
    if (other.length > 0) groups['Other'] = other;
    return groups;
  }, [filtered, activeCategory, categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white p-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Fresh Food, Fast Delivery 🚀</h1>
        <p className="text-orange-100 text-lg">
          {categories.length > 0
            ? categories.map(c => c.name).join(', ') + ' — delivered to your door.'
            : 'Delicious food delivered to your door.'}
        </p>
      </div>

      {/* Search + Veg Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
        <VegToggle value={vegFilter} onChange={setVegFilter} />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {loading
          ? [0, 1, 2, 3].map(i => (
              <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse shrink-0" />
            ))
          : categoryNames.map(cat => (
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
            ))
        }
      </div>

      {/* Active filter chips */}
      {(vegFilter !== 'all' || search) && (
        <div className="flex flex-wrap gap-2 mb-4 text-sm">
          {vegFilter !== 'all' && (
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium
              ${vegFilter === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {vegFilter === 'veg' ? '🟢 Veg only' : '🔴 Non-veg only'}
              <button onClick={() => setVegFilter('all')} className="opacity-60 hover:opacity-100">×</button>
            </span>
          )}
          {search && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="opacity-60 hover:opacity-100">×</button>
            </span>
          )}
        </div>
      )}

      {loading && <LoadingSpinner message="Fetching the menu…" />}

      {error && (
        <div className="card p-6 text-center">
          <p className="text-red-500 font-medium">⚠️ {error}</p>
          <p className="text-sm text-gray-500 mt-1">
            Make sure the backend is running at {process.env.NEXT_PUBLIC_API_URL}.
          </p>
        </div>
      )}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="text-lg font-medium">No items found</p>
          <p className="text-sm mt-1">
            {vegFilter !== 'all'
              ? `No ${vegFilter === 'veg' ? 'vegetarian' : 'non-vegetarian'} items match your criteria.`
              : 'Try a different search or category.'}
          </p>
          {vegFilter !== 'all' && (
            <button onClick={() => setVegFilter('all')}
              className="mt-3 text-orange-500 font-medium text-sm hover:underline">
              Show all items
            </button>
          )}
        </div>
      )}

      {!loading && !error && Object.entries(grouped).map(([category, catItems]) => (
        <section key={category} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">{category}</h2>
            <span className="badge bg-orange-100 text-orange-700">
              {catItems.length} item{catItems.length !== 1 ? 's' : ''}
            </span>
            {vegFilter === 'veg'    && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">🟢 Veg</span>}
            {vegFilter === 'nonveg' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">🔴 Non-Veg</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {catItems.map(item => <FoodCard key={item.id} item={item} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

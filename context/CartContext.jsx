'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';

// ─── State Shape ──────────────────────────────────────────────────────────────
// items: [{ id, name, description, category, price, imageUrl, quantity }]

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'foodorder_cart';

// ─── Reducer ──────────────────────────────────────────────────────────────────
function cartReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.payload };

    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.id !== action.payload.id) };
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i
        ),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) dispatch({ type: 'HYDRATE', payload: JSON.parse(saved) });
    } catch (_) { /* ignore */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch (_) { /* ignore */ }
  }, [state.items]);

  // ─── Derived values ──────────────────────────────────────────────────────
  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const addItem      = (item)           => dispatch({ type: 'ADD_ITEM',        payload: item });
  const removeItem   = (id)             => dispatch({ type: 'REMOVE_ITEM',     payload: id });
  const updateQty    = (id, quantity)   => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  const clearCart    = ()               => dispatch({ type: 'CLEAR_CART' });

  return (
    <CartContext.Provider value={{
      items:      state.items,
      totalItems,
      totalPrice,
      addItem,
      removeItem,
      updateQty,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};

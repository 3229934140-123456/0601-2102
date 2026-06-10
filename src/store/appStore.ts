import { create } from 'zustand';
import { UserRole, Booking, Ship, Message, QueueItem, ReviewItem } from '@/types';

interface AppState {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  currentShip: Ship | null;
  setCurrentShip: (ship: Ship | null) => void;

  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;

  queueItems: QueueItem[];
  setQueueItems: (items: QueueItem[]) => void;

  messages: Message[];
  addMessage: (message: Message) => void;
  markMessageAsRead: (id: string) => void;
  markAllMessagesAsRead: () => void;

  reviewItems: ReviewItem[];
  updateReviewItem: (id: string, updates: Partial<ReviewItem>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  userRole: 'shipOwner',
  setUserRole: (role) => set({ userRole: role }),

  currentShip: null,
  setCurrentShip: (ship) => set({ currentShip: ship }),

  bookings: [],
  addBooking: (booking) => set((state) => ({ bookings: [booking, ...state.bookings] })),
  updateBooking: (id, updates) => set((state) => ({
    bookings: state.bookings.map((b) => b.id === id ? { ...b, ...updates } : b),
  })),
  cancelBooking: (id) => set((state) => ({
    bookings: state.bookings.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b),
  })),

  queueItems: [],
  setQueueItems: (items) => set({ queueItems: items }),

  messages: [],
  addMessage: (message) => set((state) => ({ messages: [message, ...state.messages] })),
  markMessageAsRead: (id) => set((state) => ({
    messages: state.messages.map((m) => m.id === id ? { ...m, isRead: true } : m),
  })),
  markAllMessagesAsRead: () => set((state) => ({
    messages: state.messages.map((m) => ({ ...m, isRead: true })),
  })),

  reviewItems: [],
  updateReviewItem: (id, updates) => set((state) => ({
    reviewItems: state.reviewItems.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),
}));

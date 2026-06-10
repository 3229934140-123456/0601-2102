import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import {
  UserRole,
  Booking,
  Ship,
  Message,
  QueueItem,
  ReviewItem,
  BookingStatus,
  NoShowItem,
} from '@/types';
import { generateId } from '@/utils';

interface AppState {
  // ===== 用户角色 =====
  role: UserRole;
  setRole: (role: UserRole) => void;

  // ===== 船舶 =====
  ships: Ship[];
  currentShipId: string;
  getCurrentShip: () => Ship | undefined;
  setCurrentShipId: (id: string) => void;
  addShip: (ship: Ship) => void;
  updateShip: (id: string, updates: Partial<Ship>) => void;

  // ===== 预约（单一数据源） =====
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;

  // ===== 审核操作（同时更新 bookings + messages + queue） =====
  approveBooking: (id: string, reviewer: string) => void;
  rejectBooking: (id: string, reviewer: string, reason: string) => void;
  recordPassTime: (id: string, reviewer: string, passTime?: number) => void;

  // ===== 排队 =====
  queueItems: QueueItem[];
  refreshQueueFromBookings: () => void;

  // ===== 消息 =====
  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'createTime' | 'isRead'>) => void;
  markMessageAsRead: (id: string) => void;
  markAllMessagesAsRead: () => void;

  // ===== 爽约名单 =====
  noShowItems: NoShowItem[];
  addNoShow: (item: Omit<NoShowItem, 'id' | 'createTime'>) => void;

  // ===== 重置 =====
  resetAll: () => void;
}

// Taro Storage 适配层
const taroStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const res = await Taro.getStorageSync(name);
      return res ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      Taro.setStorageSync(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      Taro.removeStorageSync(name);
    } catch {
      /* ignore */
    }
  },
};

const storage =
  typeof window !== 'undefined' && window.localStorage
    ? createJSONStorage(() => window.localStorage)
    : createJSONStorage(() => taroStorage as any);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ========== 用户角色 ==========
      role: 'shipOwner',
      setRole: (role) => set({ role }),

      // ========== 船舶 ==========
      ships: [],
      currentShipId: '',
      getCurrentShip: () => {
        const { ships, currentShipId } = get();
        return ships.find((s) => s.id === currentShipId);
      },
      setCurrentShipId: (id) => set({ currentShipId: id }),
      addShip: (ship) =>
        set((state) => ({
          ships: [...state.ships, ship],
          currentShipId: state.currentShipId || ship.id,
        })),
      updateShip: (id, updates) =>
        set((state) => ({
          ships: state.ships.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      // ========== 预约（单一数据源） ==========
      bookings: [],
      addBooking: (booking) => {
        set((state) => ({ bookings: [booking, ...state.bookings] }));
        get().addMessage({
          type: 'booking',
          title: '预约申请已提交',
          content: `您已成功提交「${booking.shipName}」在 ${booking.lockName} ${booking.timeSlot} 的过闸申请，请等待审核。`,
          bookingId: booking.id,
          targetPage: '/pages/booking/index',
          targetParams: { tab: 'pending' },
        });
      },
      updateBooking: (id, updates) =>
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      cancelBooking: (id) => {
        const booking = get().bookings.find((b) => b.id === id);
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, status: 'cancelled' as BookingStatus } : b
          ),
        }));
        if (booking) {
          get().addMessage({
            type: 'booking',
            title: '预约已取消',
            content: `您已取消「${booking.shipName}」在 ${booking.lockName} ${booking.timeSlot} 的过闸预约。`,
            bookingId: id,
            targetPage: '/pages/booking/index',
            targetParams: { tab: 'all' },
          });
        }
        get().refreshQueueFromBookings();
      },

      // ========== 审核（联动 bookings + messages + queue） ==========
      approveBooking: (id, reviewer) => {
        const booking = get().bookings.find((b) => b.id === id);
        if (!booking) return;

        // 排队号：同一船闸在 booking 之后的 approved+queuing 数量 + 1
        const sameLockCount = get().bookings.filter(
          (b) =>
            b.lockId === booking.lockId &&
            (b.status === 'approved' || b.status === 'queuing') &&
            b.id !== id
        ).length;
        const queueNumber = sameLockCount + 1;

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'queuing' as BookingStatus,
                  reviewer,
                  reviewTime: dayjs().format('YYYY-MM-DD HH:mm'),
                  queueNumber,
                }
              : b
          ),
        }));

        get().addMessage({
          type: 'review',
          title: '预约审核通过',
          content: `恭喜！「${booking.shipName}」在 ${booking.lockName} ${booking.timeSlot} 的过闸申请已通过，排队序号：${queueNumber}。`,
          bookingId: id,
          targetPage: '/pages/queue/index',
          targetParams: { bookingId: id },
        });
        get().refreshQueueFromBookings();
      },

      rejectBooking: (id, reviewer, reason) => {
        const booking = get().bookings.find((b) => b.id === id);
        if (!booking) return;

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'rejected' as BookingStatus,
                  reviewer,
                  reviewTime: dayjs().format('YYYY-MM-DD HH:mm'),
                  reviewRemark: reason,
                }
              : b
          ),
        }));

        get().addMessage({
          type: 'review',
          title: '预约审核退回',
          content: `「${booking.shipName}」在 ${booking.lockName} ${booking.timeSlot} 的过闸申请被退回。原因：${reason}`,
          bookingId: id,
          targetPage: '/pages/review/index',
          targetParams: { tab: 'rejected', bookingId: id },
        });
        get().refreshQueueFromBookings();
      },

      recordPassTime: (id, reviewer, passTime) => {
        const booking = get().bookings.find((b) => b.id === id);
        if (!booking) return;
        const timeStr = dayjs(passTime || Date.now()).format('YYYY-MM-DD HH:mm');

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'passed' as BookingStatus,
                  actualPassTime: timeStr,
                }
              : b
          ),
        }));

        get().addMessage({
          type: 'queue',
          title: '船舶已过闸',
          content: `「${booking.shipName}」于 ${timeStr} 顺利通过 ${booking.lockName}。`,
          bookingId: id,
          targetPage: '/pages/review/index',
          targetParams: { tab: 'approved', bookingId: id },
        });
        get().refreshQueueFromBookings();
      },

      // ========== 排队（从 bookings 派生） ==========
      queueItems: [],
      refreshQueueFromBookings: () => {
        const { bookings } = get();
        const queuables = bookings
          .filter((b) => b.status === 'queuing' || b.status === 'approved')
          .sort((a, b) => {
            const aq = a.queueNumber ?? 9999;
            const bq = b.queueNumber ?? 9999;
            if (aq !== bq) return aq - bq;
            return dayjs(a.applyTime).valueOf() - dayjs(b.applyTime).valueOf();
          });

        const items: QueueItem[] = queuables.map((b, idx) => ({
          id: `q_${b.id}`,
          bookingId: b.id,
          shipName: b.shipName,
          queueNumber: b.queueNumber || idx + 1,
          status: b.status,
          estimatedWaitTime: (b.queueNumber || idx + 1) * 45,
          expectedPassTime: dayjs()
            .add((b.queueNumber || idx + 1) * 45, 'minute')
            .format('YYYY-MM-DD HH:mm'),
          lockName: b.lockName,
          direction: 'up',
        }));

        set({ queueItems: items });
      },

      // ========== 消息 ==========
      messages: [],
      addMessage: (msg) =>
        set((state) => ({
          messages: [
            {
              ...msg,
              id: generateId('msg'),
              createTime: Date.now(),
              isRead: false,
            },
            ...state.messages,
          ],
        })),
      markMessageAsRead: (id) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, isRead: true } : m)),
        })),
      markAllMessagesAsRead: () =>
        set((state) => ({
          messages: state.messages.map((m) => ({ ...m, isRead: true })),
        })),

      // ========== 爽约名单 ==========
      noShowItems: [],
      addNoShow: (item) =>
        set((state) => ({
          noShowItems: [
            { ...item, id: generateId('ns'), createTime: Date.now() },
            ...state.noShowItems,
          ],
        })),

      // ========== 重置 ==========
      resetAll: () =>
        set({
          role: 'shipOwner',
          ships: [],
          currentShipId: '',
          bookings: [],
          queueItems: [],
          messages: [],
          noShowItems: [],
        }),
    }),
    {
      name: 'ship-lock-storage',
      storage,
      partialize: (state) => ({
        role: state.role,
        ships: state.ships,
        currentShipId: state.currentShipId,
        bookings: state.bookings,
        messages: state.messages,
        noShowItems: state.noShowItems,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 重新水合后，根据 bookings 重建排队
          setTimeout(() => state.refreshQueueFromBookings(), 0);
        }
      },
    }
  )
);

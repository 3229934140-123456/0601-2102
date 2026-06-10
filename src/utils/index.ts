import dayjs from 'dayjs';
import { BookingStatus, CargoType, MessageType } from '@/types';

export const statusMap: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: '#FF7D00' },
  approved: { label: '审核通过', color: '#00B42A' },
  rejected: { label: '审核退回', color: '#F53F3F' },
  queuing: { label: '排队中', color: '#165DFF' },
  released: { label: '已放行', color: '#722ED1' },
  cancelled: { label: '已取消', color: '#86909C' },
  passed: { label: '已过闸', color: '#00B42A' },
};

export const cargoTypeMap: Record<CargoType, string> = {
  general: '普通货物',
  dangerous: '危险品',
  bulk: '散货',
  container: '集装箱',
  liquid: '液体货物',
};

export const messageTypeMap: Record<MessageType, string> = {
  system: '系统通知',
  booking: '预约通知',
  queue: '排队通知',
  review: '审核通知',
};

export const formatTime = (date: string | number, format: string = 'YYYY-MM-DD HH:mm'): string => {
  if (date === null || date === undefined) return '';
  return dayjs(date).format(format);
};

export const formatDate = (date: string): string => {
  if (date === null || date === undefined) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

export const generateId = (prefix?: string): string => {
  const rand = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  return prefix ? `${prefix}_${rand}` : rand;
};

export const getTimeSlots = (date: string) => {
  const slots = [];
  for (let i = 0; i < 24; i += 2) {
    const available = Math.floor(Math.random() * 5) + 1;
    slots.push({
      id: `${date}-${i}`,
      date,
      startTime: `${i.toString().padStart(2, '0')}:00`,
      endTime: `${(i + 2).toString().padStart(2, '0')}:00`,
      available,
      total: 5,
    });
  }
  return slots;
};

export const getLocks = () => {
  return [
    { id: 'lock1', name: '三峡船闸', location: '湖北省宜昌市' },
    { id: 'lock2', name: '葛洲坝船闸', location: '湖北省宜昌市' },
    { id: 'lock3', name: '三峡升船机', location: '湖北省宜昌市' },
    { id: 'lock4', name: '向家坝船闸', location: '云南省水富市' },
    { id: 'lock5', name: '溪洛渡船闸', location: '四川省雷波县' },
  ];
};

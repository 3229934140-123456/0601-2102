import { QueueItem } from '@/types';
import dayjs from 'dayjs';

export const mockQueueItems: QueueItem[] = [
  {
    id: 'q001',
    bookingId: 'bk001',
    shipName: '长江之星',
    queueNumber: 3,
    status: 'queuing',
    estimatedWaitTime: 120,
    expectedPassTime: dayjs().add(2, 'hour').format('YYYY-MM-DD HH:mm'),
    lockName: '三峡船闸',
    direction: 'up',
  },
  {
    id: 'q002',
    bookingId: 'bk007',
    shipName: '黄河号',
    queueNumber: 1,
    status: 'queuing',
    estimatedWaitTime: 30,
    expectedPassTime: dayjs().add(0.5, 'hour').format('YYYY-MM-DD HH:mm'),
    lockName: '三峡船闸',
    direction: 'up',
  },
  {
    id: 'q003',
    bookingId: 'bk008',
    shipName: '珠江明珠',
    queueNumber: 2,
    status: 'queuing',
    estimatedWaitTime: 75,
    expectedPassTime: dayjs().add(1.25, 'hour').format('YYYY-MM-DD HH:mm'),
    lockName: '三峡船闸',
    direction: 'up',
  },
  {
    id: 'q004',
    bookingId: 'bk009',
    shipName: '东海号',
    queueNumber: 4,
    status: 'queuing',
    estimatedWaitTime: 180,
    expectedPassTime: dayjs().add(3, 'hour').format('YYYY-MM-DD HH:mm'),
    lockName: '三峡船闸',
    direction: 'up',
  },
  {
    id: 'q005',
    bookingId: 'bk010',
    shipName: '南海明珠',
    queueNumber: 5,
    status: 'queuing',
    estimatedWaitTime: 240,
    expectedPassTime: dayjs().add(4, 'hour').format('YYYY-MM-DD HH:mm'),
    lockName: '三峡船闸',
    direction: 'up',
  },
];

export const mockCurrentQueue = mockQueueItems.find((q) => q.bookingId === 'bk001');

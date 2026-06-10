export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'queuing'
  | 'released'
  | 'cancelled'
  | 'passed';

export type CargoType = 'general' | 'dangerous' | 'bulk' | 'container' | 'liquid';

export type MessageType = 'system' | 'booking' | 'queue' | 'review';

export type UserRole = 'shipOwner' | 'operator';

export interface ShipCertificate {
  id: string;
  name: string;
  number: string;
  expireDate: string;
  photo?: string;
}

export interface Ship {
  id: string;
  name: string;
  mmsi: string;
  callSign: string;
  length: number;
  width: number;
  draft: number;
  tonnage: number;
  shipType: string;
  flag: string;
  photos: string[];
  certificates: ShipCertificate[];
  specialCargo: string;
  ownerName: string;
  ownerPhone: string;
  certificatePhoto?: string;
  certificateNumber?: string;
  certificateExpire?: string;
}

export interface Booking {
  id: string;
  shipId: string;
  shipName: string;
  lockId: string;
  lockName: string;
  expectedArrivalTime: string;
  bookingDate: string;
  timeSlot: string;
  cargoType: CargoType;
  cargoDescription: string;
  cargoWeight: number;
  specialCargo?: string;
  status: BookingStatus;
  queueNumber?: number;
  applyTime: string;
  reviewTime?: string;
  reviewRemark?: string;
  reviewer?: string;
  actualPassTime?: string;
  operatorId?: string;
}

export interface QueueItem {
  id: string;
  bookingId: string;
  shipName: string;
  queueNumber: number;
  status: BookingStatus;
  estimatedWaitTime: number;
  expectedPassTime?: string;
  lockName: string;
  direction: 'up' | 'down';
}

export interface Message {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  bookingId?: string;
  createTime: number;
  isRead: boolean;
}

export interface ReviewItem extends Booking {
  operatorName?: string;
}

export interface Lock {
  id: string;
  name: string;
  location: string;
  availableSlots: TimeSlot[];
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: number;
  total: number;
}

export interface DailyStats {
  date: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  queuing: number;
  passed: number;
  cancelled: number;
}

export interface NoShowItem {
  id: string;
  bookingId: string;
  shipId: string;
  shipName: string;
  bookingDate: string;
  lockName: string;
  timeSlot: string;
  reason: string;
  createTime: number;
}

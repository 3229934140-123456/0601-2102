import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { Booking } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { formatTime, cargoTypeMap } from '@/utils';
import styles from './index.module.scss';

interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
  onEdit?: (booking: Booking) => void;
  showActions?: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel, onEdit, showActions = true }) => {
  const canEdit = booking.status === 'pending';
  const canCancel = ['pending', 'approved'].includes(booking.status);

  const handleCancel = () => {
    Taro.showModal({
      title: '确认取消',
      content: `确定要取消 ${booking.shipName} 的预约吗？`,
      success: (res) => {
        if (res.confirm && onCancel) {
          onCancel(booking.id);
        }
      },
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(booking);
    }
  };

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <View className={styles.shipInfo}>
          <Text className={styles.shipName}>{booking.shipName}</Text>
          <StatusBadge status={booking.status} size="sm" />
        </View>
        {booking.queueNumber && (
          <View className={styles.queueBadge}>
            <Text className={styles.queueNumber}>#{booking.queueNumber}</Text>
          </View>
        )}
      </View>

      <View className={styles.content}>
        <View className={styles.row}>
          <Text className={styles.label}>船闸</Text>
          <Text className={styles.value}>{booking.lockName}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>预计到达</Text>
          <Text className={styles.value}>{formatTime(booking.expectedArrivalTime)}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>时段</Text>
          <Text className={styles.value}>{booking.timeSlot}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>货物</Text>
          <Text className={styles.value}>
            {cargoTypeMap[booking.cargoType]} · {booking.cargoWeight}吨
          </Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>货名</Text>
          <Text className={styles.value}>{booking.cargoDescription}</Text>
        </View>
        {booking.specialCargo && (
          <View className={classnames(styles.row, styles.specialRow)}>
            <Text className={styles.specialLabel}>特殊说明</Text>
            <Text className={styles.specialValue}>{booking.specialCargo}</Text>
          </View>
        )}
        {booking.reviewRemark && (
          <View className={classnames(styles.row, styles.rejectRow)}>
            <Text className={styles.rejectLabel}>审核意见</Text>
            <Text className={styles.rejectValue}>{booking.reviewRemark}</Text>
          </View>
        )}
      </View>

      <View className={styles.footer}>
        <Text className={styles.applyTime}>申请时间：{formatTime(booking.applyTime)}</Text>
        {showActions && (canEdit || canCancel) && (
          <View className={styles.actions}>
            {canEdit && (
              <Button className={classnames(styles.btn, styles.editBtn)} onClick={handleEdit}>
                修改
              </Button>
            )}
            {canCancel && (
              <Button className={classnames(styles.btn, styles.cancelBtn)} onClick={handleCancel}>
                取消
              </Button>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default BookingCard;

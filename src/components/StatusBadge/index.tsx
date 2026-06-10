import React from 'react';
import { View, Text } from '@tarojs/components';
import { BookingStatus } from '@/types';
import { statusMap } from '@/utils';
import styles from './index.module.scss';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusInfo = statusMap[status];

  return (
    <View
      className={`${styles.badge} ${size === 'sm' ? styles.small : ''}`}
      style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}
    >
      <Text className={styles.text}>{statusInfo.label}</Text>
    </View>
  );
};

export default StatusBadge;

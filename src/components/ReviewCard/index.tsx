import React, { useState } from 'react';
import { View, Text, Button, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { ReviewItem } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { formatTime, cargoTypeMap } from '@/utils';
import styles from './index.module.scss';

interface ReviewCardProps {
  item: ReviewItem;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onRecordPass?: (id: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ item, onApprove, onReject, onRecordPass }) => {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPassTime, setShowPassTime] = useState(false);

  const handleApprove = () => {
    Taro.showModal({
      title: '审核通过',
      content: `确定要通过 ${item.shipName} 的预约申请吗？`,
      success: (res) => {
        if (res.confirm && onApprove) {
          onApprove(item.id);
        }
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Taro.showToast({ title: '请填写退回原因', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '审核退回',
      content: `确定要退回 ${item.shipName} 的预约申请吗？`,
      success: (res) => {
        if (res.confirm && onReject) {
          onReject(item.id, rejectReason);
          setShowRejectInput(false);
          setRejectReason('');
        }
      },
    });
  };

  const handleRecordPass = () => {
    Taro.showModal({
      title: '记录过闸',
      content: `确定要记录 ${item.shipName} 已过闸吗？`,
      success: (res) => {
        if (res.confirm && onRecordPass) {
          onRecordPass(item.id);
        }
      },
    });
  };

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <View className={styles.shipInfo}>
          <Text className={styles.shipName}>{item.shipName}</Text>
          <StatusBadge status={item.status} size="sm" />
        </View>
        <Text className={styles.operator}>{item.operatorName}</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.row}>
          <Text className={styles.label}>船闸</Text>
          <Text className={styles.value}>{item.lockName}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>预计到达</Text>
          <Text className={styles.value}>{formatTime(item.expectedArrivalTime)}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>时段</Text>
          <Text className={styles.value}>{item.timeSlot}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>货物</Text>
          <Text className={styles.value}>
            {cargoTypeMap[item.cargoType]} · {item.cargoWeight}吨 · {item.cargoDescription}
          </Text>
        </View>
        {item.specialCargo && (
          <View className={classnames(styles.row, styles.specialRow)}>
            <Text className={styles.specialLabel}>特殊货物</Text>
            <Text className={styles.specialValue}>{item.specialCargo}</Text>
          </View>
        )}
      </View>

      {showRejectInput && (
        <View className={styles.rejectSection}>
          <Text className={styles.rejectLabel}>退回原因</Text>
          <Textarea
            className={styles.rejectInput}
            value={rejectReason}
            onInput={(e) => setRejectReason(e.detail.value)}
            placeholder="请填写退回原因"
            maxlength={200}
          />
          <View className={styles.rejectActions}>
            <Button
              className={classnames(styles.actionBtn, styles.cancelRejectBtn)}
              onClick={() => setShowRejectInput(false)}
            >
              取消
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.confirmRejectBtn)}
              onClick={handleReject}
            >
              确认退回
            </Button>
          </View>
        </View>
      )}

      <View className={styles.footer}>
        <Text className={styles.applyTime}>申请时间：{formatTime(item.applyTime)}</Text>
        {item.status === 'pending' && !showRejectInput && (
          <View className={styles.actions}>
            <Button
              className={classnames(styles.btn, styles.rejectBtn)}
              onClick={() => setShowRejectInput(true)}
            >
              退回
            </Button>
            <Button
              className={classnames(styles.btn, styles.approveBtn)}
              onClick={handleApprove}
            >
              通过
            </Button>
          </View>
        )}
        {item.status === 'queuing' && (
          <Button
            className={classnames(styles.btn, styles.passBtn)}
            onClick={handleRecordPass}
          >
            记录过闸
          </Button>
        )}
      </View>
    </View>
  );
};

export default ReviewCard;

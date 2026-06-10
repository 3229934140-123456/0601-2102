import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store/appStore';
import { mockQueueItems } from '@/data/queue';
import { mockBookings } from '@/data/booking';
import { QueueItem, Booking } from '@/types';
import { formatTime } from '@/utils';
import styles from './index.module.scss';

const QueuePage: React.FC = () => {
  const { queueItems, setQueueItems, bookings } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = useCallback(() => {
    if (queueItems.length === 0) {
      setQueueItems(mockQueueItems);
    }
    if (bookings.length === 0) {
      useAppStore.setState({ bookings: mockBookings });
    }
    setLastUpdate(new Date());
  }, [queueItems.length, bookings.length, setQueueItems]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useDidShow(() => {
    loadData();
  });

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      loadData();
      setIsRefreshing(false);
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 1000);
  };

  useEffect(() => {
    if (isRefreshing) {
      onRefresh();
    }
  }, [isRefreshing]);

  const sortedQueue = [...queueItems].sort((a, b) => a.queueNumber - b.queueNumber);
  const currentQueue = sortedQueue.find((q) => q.shipName === '长江之星');
  const showAlert = currentQueue && currentQueue.queueNumber <= 3;

  const passedBookings = bookings.filter((b) => b.status === 'passed' || b.status === 'released');
  const sortedHistory = [...passedBookings].sort(
    (a, b) => new Date(b.expectedArrivalTime).getTime() - new Date(a.expectedArrivalTime).getTime()
  );

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'rank1';
    if (rank === 2) return 'rank2';
    if (rank === 3) return 'rank3';
    return 'normal';
  };

  return (
    <View className={styles.page}>
      {showAlert && (
        <View className={styles.alertBanner}>
          <View className={styles.alertIcon}>
            <Text className={styles.alertIconText}>!</Text>
          </View>
          <Text className={styles.alertText}>
            即将轮到您的船舶「长江之星」，请做好过闸准备！
          </Text>
        </View>
      )}

      <ScrollView
        scrollY
        onPullDownRefresh={onRefresh}
        refresherEnabled
        refresherTriggered={isRefreshing}
      >
        {currentQueue ? (
          <View className={styles.statusCard}>
            <View className={styles.statusHeader}>
              <View className={styles.lockInfo}>
                <Text className={styles.lockName}>{currentQueue.lockName}</Text>
                <Text className={styles.direction}>
                  {currentQueue.direction === 'up' ? '上行' : '下行'}
                </Text>
              </View>
              <View className={styles.statusBadge}>
                <Text className={styles.statusBadgeText}>排队中</Text>
              </View>
            </View>

            <View className={styles.queueNumberSection}>
              <Text className={styles.queueNumber}>{currentQueue.queueNumber}</Text>
              <Text className={styles.queueLabel}>当前排队序号</Text>
            </View>

            <View className={styles.statusInfo}>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>预计等待</Text>
                <Text className={styles.infoValue}>
                  {formatWaitTime(currentQueue.estimatedWaitTime)}
                </Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>预计过闸</Text>
                <Text className={styles.infoValue}>
                  {currentQueue.expectedPassTime
                    ? formatTime(currentQueue.expectedPassTime, 'HH:mm')
                    : '--'}
                </Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>前方等待</Text>
                <Text className={styles.infoValue}>{currentQueue.queueNumber - 1}艘</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.section}>
            <View className={styles.emptyState}>
              <View className={styles.emptyIcon}>
                <Text className={styles.emptyIconText}>🚢</Text>
              </View>
              <Text className={styles.emptyText}>当前没有排队中的预约</Text>
              <Text className={styles.emptyDesc}>请先提交预约申请</Text>
            </View>
          </View>
        )}

        {sortedQueue.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionTitle}>
              <Text>排队列表</Text>
              <Text className={styles.sectionCount}>共{sortedQueue.length}艘</Text>
            </View>
            <View className={styles.queueList}>
              {sortedQueue.map((item) => (
                <View
                  key={item.id}
                  className={classnames(
                    styles.queueItem,
                    item.shipName === '长江之星' && styles.current
                  )}
                >
                  <View
                    className={classnames(styles.queueRank, styles[getRankClass(item.queueNumber)])}
                  >
                    <Text
                      className={classnames(
                        styles.queueRankText,
                        styles[getRankClass(item.queueNumber)]
                      )}
                    >
                      {item.queueNumber}
                    </Text>
                  </View>
                  <View className={styles.queueShipInfo}>
                    <Text className={styles.queueShipName}>{item.shipName}</Text>
                    <Text className={styles.queueShipStatus}>
                      {item.lockName} · {item.direction === 'up' ? '上行' : '下行'}
                    </Text>
                  </View>
                  <View className={styles.queueTime}>
                    <Text className={styles.queueTimeLabel}>预计过闸</Text>
                    <Text className={styles.queueTimeValue}>
                      {item.expectedPassTime
                        ? formatTime(item.expectedPassTime, 'HH:mm')
                        : '--:--'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {sortedHistory.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionTitle}>
              <Text>过闸记录</Text>
              <Text className={styles.sectionCount}>最近{sortedHistory.length}条</Text>
            </View>
            <View className={styles.historyList}>
              {sortedHistory.slice(0, 5).map((booking) => (
                <View key={booking.id} className={styles.historyItem}>
                  <View className={styles.historyLeft}>
                    <Text className={styles.historyShip}>{booking.shipName}</Text>
                    <Text className={styles.historyLock}>
                      {booking.lockName} · {booking.timeSlot}
                    </Text>
                  </View>
                  <View className={styles.historyRight}>
                    <Text className={styles.historyStatus}>
                      {booking.status === 'passed' ? '已过闸' : '已放行'}
                    </Text>
                    <Text className={styles.historyTime}>
                      {booking.actualPassTime
                        ? formatTime(booking.actualPassTime, 'MM-DD HH:mm')
                        : formatTime(booking.expectedArrivalTime, 'MM-DD HH:mm')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text className={styles.refreshTip}>
          上次更新：{formatTime(lastUpdate.toISOString(), 'HH:mm:ss')}
        </Text>
      </ScrollView>
    </View>
  );
};

export default QueuePage;

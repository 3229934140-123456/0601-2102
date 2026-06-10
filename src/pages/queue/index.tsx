import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store/appStore';
import { mockBookings } from '@/data/booking';
import { QueueItem, Booking } from '@/types';
import { formatTime, getLocks } from '@/utils';
import styles from './index.module.scss';

const QueuePage: React.FC = () => {
  const {
    queueItems,
    bookings,
    ships,
    currentShipId,
    getCurrentShip,
    refreshQueueFromBookings,
  } = useAppStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [seedLoaded, setSeedLoaded] = useState(false);
  const [selectedLockId, setSelectedLockId] = useState<string>('all');

  const locks = getLocks();
  const lockOptions = [{ id: 'all', name: '全部船闸' }, ...locks];
  const currentLockName = lockOptions.find((l) => l.id === selectedLockId)?.name || '全部船闸';

  const handleLockChange = () => {
    Taro.showActionSheet({
      itemList: lockOptions.map((l) => l.name),
      success: (res) => {
        const newLock = lockOptions[res.tapIndex];
        setSelectedLockId(newLock.id);
        Taro.showToast({ title: `已切换：${newLock.name}`, icon: 'none' });
      },
    });
  };

  const seedData = useCallback(() => {
    if (seedLoaded) return;
    const state = useAppStore.getState();
    const patch: Record<string, unknown> = {};
    if (state.bookings.length === 0) patch.bookings = mockBookings;
    if (state.ships.length === 0) {
      import('@/data/ship').then(({ mockShipList }) => {
        useAppStore.setState({
          ships: mockShipList,
          currentShipId: mockShipList[0].id,
        });
      });
    }
    if (Object.keys(patch).length > 0) {
      useAppStore.setState(patch);
    }
    setTimeout(() => useAppStore.getState().refreshQueueFromBookings(), 0);
    setSeedLoaded(true);
  }, [seedLoaded]);

  useEffect(() => {
    seedData();
  }, [seedData]);

  useDidShow(() => {
    seedData();
    setTimeout(() => useAppStore.getState().refreshQueueFromBookings(), 0);
    setLastUpdate(new Date());
  });

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      useAppStore.getState().refreshQueueFromBookings();
      setLastUpdate(new Date());
      setIsRefreshing(false);
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 800);
  };

  useEffect(() => {
    if (isRefreshing) onRefresh();
  }, [isRefreshing]);

  const currentShip = useMemo(() => getCurrentShip(), [getCurrentShip, ships, currentShipId]);

  // 按船闸筛选队列，并重新计算当前船闸内的排队序号
  const filteredQueue = useMemo(() => {
    let list = [...queueItems];
    if (selectedLockId !== 'all') {
      list = list.filter((item) => {
        const booking = bookings.find((b) => b.id === item.bookingId);
        return booking && booking.lockId === selectedLockId;
      });
    }
    return list
      .sort((a, b) => a.queueNumber - b.queueNumber)
      .map((item, idx) => ({
        ...item,
        displayNumber: idx + 1,
        displayWaitTime: (idx + 1) * 45,
        displayExpectedPass: new Date(Date.now() + (idx + 1) * 45 * 60 * 1000),
      }));
  }, [queueItems, selectedLockId, bookings]);

  const currentQueue = filteredQueue.find(
    (q) => currentShip && q.shipName === currentShip.name
  );
  const showAlert = currentQueue && currentQueue.displayNumber <= 3;

  const passedBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status === 'passed' ||
          b.status === 'released' ||
          b.status === 'cancelled' ||
          b.status === 'rejected'
      ),
    [bookings]
  );
  const sortedHistory = useMemo(
    () =>
      [...passedBookings].sort(
        (a, b) =>
          new Date(b.expectedArrivalTime).getTime() -
          new Date(a.expectedArrivalTime).getTime()
      ),
    [passedBookings]
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

  const getHistoryStatus = (status: Booking['status']) => {
    const map: Record<string, string> = {
      passed: '已过闸',
      released: '已放行',
      cancelled: '已取消',
      rejected: '已退回',
    };
    return map[status] || '已完成';
  };

  return (
    <View className={styles.page}>
      {showAlert && currentShip && (
        <View className={styles.alertBanner}>
          <View className={styles.alertIcon}>
            <Text className={styles.alertIconText}>!</Text>
          </View>
          <Text className={styles.alertText}>
            即将轮到您的船舶「{currentShip.name}」，请做好过闸准备！
          </Text>
        </View>
      )}

      <View className={styles.filterBar}>
        <View className={styles.filterBtn} onClick={handleLockChange}>
          <Text className={styles.filterIcon}>🚢</Text>
          <Text className={styles.filterText}>{currentLockName}</Text>
          <Text className={styles.filterArrow}>▼</Text>
        </View>
      </View>

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
              <Text className={styles.queueNumber}>{currentQueue.displayNumber}</Text>
              <Text className={styles.queueLabel}>当前排队序号</Text>
            </View>

            <View className={styles.statusInfo}>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>预计等待</Text>
                <Text className={styles.infoValue}>
                  {formatWaitTime(currentQueue.displayWaitTime)}
                </Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>预计过闸</Text>
                <Text className={styles.infoValue}>
                  {formatTime(currentQueue.displayExpectedPass, 'HH:mm')}
                </Text>
              </View>
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>前方等待</Text>
                <Text className={styles.infoValue}>
                  {Math.max(0, currentQueue.displayNumber - 1)}艘
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.section}>
            <View className={styles.emptyState}>
              <View className={styles.emptyIcon}>
                <Text className={styles.emptyIconText}>🚢</Text>
              </View>
              <Text className={styles.emptyText}>当前船闸没有排队中的预约</Text>
              <Text className={styles.emptyDesc}>请先提交预约申请，审核通过后自动入队</Text>
            </View>
          </View>
        )}

        {filteredQueue.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionTitle}>
              <Text>排队列表</Text>
              <Text className={styles.sectionCount}>共{filteredQueue.length}艘</Text>
            </View>
            <View className={styles.queueList}>
              {filteredQueue.map((item) => (
                <View
                  key={item.id}
                  className={classnames(
                    styles.queueItem,
                    currentShip && item.shipName === currentShip.name && styles.current
                  )}
                >
                  <View
                    className={classnames(
                      styles.queueRank,
                      styles[getRankClass(item.displayNumber)]
                    )}
                  >
                    <Text
                      className={classnames(
                        styles.queueRankText,
                        styles[getRankClass(item.displayNumber)]
                      )}
                    >
                      {item.displayNumber}
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
                      {formatTime(item.displayExpectedPass, 'HH:mm')}
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
                      {getHistoryStatus(booking.status)}
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

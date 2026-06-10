import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { mockReviewItems, mockDailyStats, mockNoShowList } from '@/data/review';
import { ReviewItem, BookingStatus, DailyStats, NoShowItem } from '@/types';
import ReviewCard from '@/components/ReviewCard';
import { statusMap, cargoTypeMap, formatTime } from '@/utils';
import styles from './index.module.scss';

const ReviewPage: React.FC = () => {
  const { reviewList, updateBookingStatus, role, setRole } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [noShowList, setNoShowList] = useState<NoShowItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tabs = [
    { key: 'pending', label: '待审核', status: 'pending' },
    { key: 'approved', label: '已通过', status: 'approved' },
    { key: 'rejected', label: '已拒绝', status: 'rejected' },
    { key: 'stats', label: '统计', status: '' },
  ];

  const loadData = useCallback(() => {
    if (reviewList.length === 0) {
      useAppStore.setState({ reviewList: mockReviewItems });
    }
    setDailyStats(mockDailyStats[0]);
    setNoShowList(mockNoShowList);
  }, [reviewList.length]);

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

  const getFilteredList = (status: string) => {
    return reviewList.filter((item) => {
      if (status === 'pending') return item.status === 'pending';
      if (status === 'approved') return item.status === 'approved';
      if (status === 'rejected') return item.status === 'rejected';
      return false;
    });
  };

  const getCountByStatus = (status: string) => {
    if (status === 'pending') return reviewList.filter((item) => item.status === 'pending').length;
    if (status === 'approved') return reviewList.filter((item) => item.status === 'approved').length;
    if (status === 'rejected') return reviewList.filter((item) => item.status === 'rejected').length;
    return 0;
  };

  const handleApprove = (item: ReviewItem) => {
    setSelectedBooking(item);
    setShowApproveModal(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedBooking) return;
    updateBookingStatus(selectedBooking.id, 'approved', '值班员-张工');
    Taro.showToast({ title: '审核通过', icon: 'success' });
    setShowApproveModal(false);
    setSelectedBooking(null);
  };

  const handleReject = (item: ReviewItem) => {
    setSelectedBooking(item);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!selectedBooking) return;
    if (!rejectReason.trim()) {
      Taro.showToast({ title: '请填写退回原因', icon: 'none' });
      return;
    }
    updateBookingStatus(selectedBooking.id, 'rejected', '值班员-张工', rejectReason);
    Taro.showToast({ title: '已退回', icon: 'success' });
    setShowRejectModal(false);
    setSelectedBooking(null);
    setRejectReason('');
  };

  const handleRecordPassing = (item: ReviewItem) => {
    Taro.showModal({
      title: '记录过闸',
      content: `确定记录 ${item.shipName} 实际过闸时间为\n${formatTime(Date.now(), 'YYYY-MM-DD HH:mm')}？`,
      success: (res) => {
        if (res.confirm) {
          updateBookingStatus(item.id, 'passed', '值班员-张工', undefined, Date.now());
          Taro.showToast({ title: '已记录过闸', icon: 'success' });
        }
      },
    });
  };

  const handleDateChange = () => {
    Taro.showActionSheet({
      itemList: ['今天', '昨天', '前天', '自定义'],
      success: (res) => {
        const days = [0, 1, 2];
        if (res.tapIndex < 3) {
          const newDate = dayjs().subtract(days[res.tapIndex], 'day').format('YYYY-MM-DD');
          setSelectedDate(newDate);
        } else {
          Taro.showToast({ title: '请在H5端选择日期', icon: 'none' });
        }
      },
    });
  };

  const handleToggleRole = () => {
    Taro.showActionSheet({
      itemList: ['切换为船主', '切换为值班员'],
      success: (res) => {
        const newRole = res.tapIndex === 0 ? 'owner' : 'operator';
        setRole(newRole);
        Taro.showToast({
          title: `已切换为${newRole === 'owner' ? '船主' : '值班员'}`,
          icon: 'success',
        });
      },
    });
  };

  const trendData = [
    { date: '12-15', value: 12 },
    { date: '12-16', value: 18 },
    { date: '12-17', value: 15 },
    { date: '12-18', value: 22 },
    { date: '12-19', value: 20 },
    { date: '12-20', value: 25 },
    { date: '12-21', value: dailyStats?.total || 0 },
  ];

  const maxValue = Math.max(...trendData.map((d) => d.value), 1);

  const renderList = (status: string) => {
    const list = getFilteredList(status);
    if (list.length === 0) {
      return (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📋</Text>
          <Text className={styles.emptyText}>暂无数据</Text>
        </View>
      );
    }
    return list.map((item) => (
      <ReviewCard
        key={item.id}
        item={item}
        onApprove={() => handleApprove(item)}
        onReject={() => handleReject(item)}
        onRecordPassing={() => handleRecordPassing(item)}
      />
    ));
  };

  const renderStats = () => {
    if (!dailyStats) return null;
    return (
      <View className={styles.statsSection}>
        <View className={styles.chartCard}>
          <Text className={styles.chartTitle}>近7日预约趋势</Text>
          <View className={styles.trendChart}>
            <View className={styles.yAxis}>
              <Text className={styles.yTick}>{maxValue}</Text>
              <Text className={styles.yTick}>{Math.floor(maxValue / 2)}</Text>
              <Text className={styles.yTick}>0</Text>
            </View>
            {trendData.map((item, index) => (
              <View key={index} className={styles.chartBar}>
                <View className={styles.barFill} style={{ height: `${(item.value / maxValue) * 100}%` }}>
                  <Text className={styles.barValue}>{item.value}</Text>
                </View>
                <Text className={styles.barLabel}>{item.date}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.noShowSection}>
          <Text className={styles.sectionTitle}>爽约名单</Text>
          {noShowList.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>暂无爽约记录</Text>
            </View>
          ) : (
            noShowList.map((item) => (
              <View key={item.id} className={styles.noShowCard}>
                <View className={styles.noShowHeader}>
                  <Text className={styles.noShowShip}>{item.shipName}</Text>
                  <Text className={styles.noShowCount}>爽约 {item.noShowCount} 次</Text>
                </View>
                <Text className={styles.noShowDates}>
                  最近爽约：{formatTime(item.lastNoShowTime, 'YYYY-MM-DD HH:mm')}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.title}>值班审核</Text>
          <View className={styles.datePicker} onClick={handleDateChange}>
            <Text className={styles.dateText}>📅 {selectedDate}</Text>
          </View>
        </View>
        {dailyStats && (
          <View className={styles.statsRow}>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{dailyStats.total}</Text>
              <Text className={styles.statLabel}>今日预约</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{dailyStats.approved}</Text>
              <Text className={styles.statLabel}>已通过</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{dailyStats.pending}</Text>
              <Text className={styles.statLabel}>待审核</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{dailyStats.rejected}</Text>
              <Text className={styles.statLabel}>已拒绝</Text>
            </View>
          </View>
        )}
      </View>

      <View className={styles.tabs}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text>{tab.label}</Text>
            {tab.status && (
              <Text className={styles.tabCount}>{getCountByStatus(tab.status)}</Text>
            )}
          </View>
        ))}
      </View>

      <ScrollView
        className={styles.listContainer}
        scrollY
        onPullDownRefresh={onRefresh}
        refresherEnabled
        refresherTriggered={isRefreshing}
      >
        {activeTab === 'stats' ? renderStats() : renderList(activeTab)}
      </ScrollView>

      {showApproveModal && selectedBooking && (
        <View className={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>审核通过</Text>
            </View>
            <View className={styles.modalBody}>
              <Text className={styles.modalText}>
                确定通过
                {'\n'}
                「{selectedBooking.shipName}」
                {'\n'}
                的过闸申请吗？
              </Text>
            </View>
            <View className={styles.modalFooter}>
              <Button
                className={classnames(styles.modalBtn, styles.cancel)}
                onClick={() => setShowApproveModal(false)}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.modalBtn, styles.confirm)}
                onClick={handleConfirmApprove}
              >
                确认通过
              </Button>
            </View>
          </View>
        </View>
      )}

      {showRejectModal && selectedBooking && (
        <View className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>审核退回</Text>
            </View>
            <View className={styles.modalBody}>
              <Text className={styles.modalText}>
                请填写退回「{selectedBooking.shipName}」的原因：
              </Text>
              <Textarea
                className={styles.textarea}
                placeholder="请输入退回原因，如：证件不齐全、货物信息不符等"
                value={rejectReason}
                onInput={(e) => setRejectReason(e.detail.value)}
                maxlength={200}
              />
            </View>
            <View className={styles.modalFooter}>
              <Button
                className={classnames(styles.modalBtn, styles.cancel)}
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.modalBtn, styles.danger)}
                onClick={handleConfirmReject}
              >
                确认退回
              </Button>
            </View>
          </View>
        </View>
      )}

      <Button
        style={{
          position: 'fixed',
          bottom: '140rpx',
          right: '32rpx',
          width: '120rpx',
          height: '120rpx',
          borderRadius: '60rpx',
          background: 'linear-gradient(135deg, #FF7D00 0%, #FF9A2E 100%)',
          color: '#fff',
          fontSize: '24rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8rpx 24rpx rgba(255, 125, 0, 0.4)',
        }}
        onClick={handleToggleRole}
      >
        {role === 'operator' ? '切换船主' : '切换值班'}
      </Button>
    </View>
  );
};

export default ReviewPage;

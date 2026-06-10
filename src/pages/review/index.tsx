import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView, Textarea } from '@tarojs/components';
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { mockNoShowList } from '@/data/review';
import { mockBookings } from '@/data/booking';
import { DailyStats, NoShowItem, Booking } from '@/types';
import { formatTime, getLocks } from '@/utils';
import styles from './index.module.scss';

type TabKey = 'pending' | 'approved' | 'rejected' | 'queuing' | 'passed' | 'stats';

const ReviewPage: React.FC = () => {
  const {
    role,
    setRole,
    bookings,
    approveBooking,
    rejectBooking,
    recordPassTime,
    noShowItems,
    addNoShow,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [seedLoaded, setSeedLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLockId, setSelectedLockId] = useState<string>('all');
  const [showLockPicker, setShowLockPicker] = useState(false);

  const locks = getLocks();
  const lockOptions = [{ id: 'all', name: '全部船闸' }, ...locks];
  const currentLockName = lockOptions.find((l) => l.id === selectedLockId)?.name || '全部船闸';

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已通过' },
    { key: 'queuing', label: '排队中' },
    { key: 'passed', label: '已过闸' },
    { key: 'rejected', label: '已拒绝' },
    { key: 'stats', label: '统计' },
  ];

  const seedData = useCallback(() => {
    if (seedLoaded) return;
    const state = useAppStore.getState();
    const patch: Record<string, unknown> = {};
    if (state.bookings.length === 0) patch.bookings = mockBookings;
    if (state.noShowItems.length === 0) patch.noShowItems = mockNoShowList;
    if (Object.keys(patch).length > 0) useAppStore.setState(patch);
    setTimeout(() => state.refreshQueueFromBookings(), 0);
    setSeedLoaded(true);
  }, [seedLoaded]);

  useEffect(() => {
    seedData();
  }, [seedData]);

  useDidShow(() => {
    seedData();
    setTimeout(() => useAppStore.getState().refreshQueueFromBookings(), 0);
  });

  // 按选中日期和船闸过滤 bookings（统计和列表都基于此）
  const filteredBookings = useMemo(() => {
    let list = bookings.filter((b) => b.bookingDate === selectedDate);
    if (selectedLockId !== 'all') {
      list = list.filter((b) => b.lockId === selectedLockId);
    }
    return list;
  }, [bookings, selectedDate, selectedLockId]);

  // 今日统计（动态计算，完全对得上列表）
  const dailyStats: DailyStats = useMemo(() => {
    const base = { date: selectedDate, total: 0, approved: 0, pending: 0, rejected: 0, queuing: 0, passed: 0, cancelled: 0 };
    return filteredBookings.reduce((acc, b) => {
      acc.total += 1;
      if (b.status in acc) (acc as any)[b.status] += 1;
      return acc;
    }, base);
  }, [filteredBookings, selectedDate]);

  // 已通过总数 = 所有审核通过过的（queuing 正在排队 + passed 已过闸）
  const approvedCount = dailyStats.queuing + dailyStats.passed;

  // 按日期和船闸过滤的爽约名单
  const dateNoShowItems = useMemo(() => {
    let list = noShowItems.filter((n) => n.bookingDate === selectedDate);
    if (selectedLockId !== 'all') {
      list = list.filter((n) => n.lockId === selectedLockId);
    }
    return list;
  }, [noShowItems, selectedDate, selectedLockId]);

  // 近 7 天趋势（每日 total bookings）
  const trendData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
      const count = bookings.filter((b) => b.bookingDate === date).length;
      return { date: dayjs(date).format('MM-DD'), value: count, rawDate: date };
    });
  }, [bookings]);

  const maxValue = Math.max(...trendData.map((d) => d.value), 1);

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      useAppStore.getState().refreshQueueFromBookings();
      setIsRefreshing(false);
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 800);
  };

  useEffect(() => {
    if (isRefreshing) onRefresh();
  }, [isRefreshing]);

  // 从 URL 参数读取 tab，用于消息跳转
  useEffect(() => {
    const instance = getCurrentInstance();
    const params = instance.router?.params || {};
    if (params.tab) {
      const validTabs: TabKey[] = ['pending', 'approved', 'queuing', 'passed', 'rejected', 'stats'];
      if (validTabs.includes(params.tab as TabKey)) {
        setActiveTab(params.tab as TabKey);
      }
    }
  }, []);

  const getFilteredBookings = (tab: TabKey): Booking[] => {
    if (tab === 'stats') return [];
    if (tab === 'approved') {
      return filteredBookings.filter(
        (b) => b.status === 'approved' || b.status === 'queuing' || b.status === 'passed'
      );
    }
    return filteredBookings.filter((b) => b.status === tab);
  };

  const getCount = (tab: TabKey) => {
    if (tab === 'stats') return '';
    return getFilteredBookings(tab).length;
  };

  const handleApprove = (id: string) => {
    setSelectedBookingId(id);
    Taro.showModal({
      title: '审核通过',
      content: `确认通过该船舶的过闸申请？\n通过后将自动排入等待队列。`,
      success: (res) => {
        if (res.confirm) {
          approveBooking(id, '值班员-张工');
          Taro.showToast({ title: '已通过', icon: 'success' });
          setSelectedBookingId(null);
        }
      },
    });
  };

  const handleOpenReject = (id: string) => {
    setSelectedBookingId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      Taro.showToast({ title: '请填写退回原因', icon: 'none' });
      return;
    }
    if (selectedBookingId) {
      rejectBooking(selectedBookingId, '值班员-张工', rejectReason);
      Taro.showToast({ title: '已退回', icon: 'success' });
    }
    setShowRejectModal(false);
    setSelectedBookingId(null);
    setRejectReason('');
  };

  const handleRecordPassing = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    Taro.showModal({
      title: '记录实际过闸',
      content: `确认记录「${b.shipName}」于\n${dayjs().format('YYYY-MM-DD HH:mm')} 通过 ${b.lockName}？`,
      success: (res) => {
        if (res.confirm) {
          recordPassTime(id, '值班员-张工', Date.now());
          Taro.showToast({ title: '已记录', icon: 'success' });
        }
      },
    });
  };

  const handleDateChange = () => {
    const options: string[] = [];
    const dateList: string[] = [];
    for (let i = -7; i <= 7; i++) {
      const d = dayjs().add(i, 'day');
      const dStr = d.format('YYYY-MM-DD');
      dateList.push(dStr);
      if (i === 0) options.push(`今天 (${dStr})`);
      else if (i === -1) options.push(`昨天 (${dStr})`);
      else if (i === 1) options.push(`明天 (${dStr})`);
      else if (i === 2) options.push(`后天 (${dStr})`);
      else if (i < 0) options.push(`${-i}天前 (${dStr})`);
      else options.push(`${i}天后 (${dStr})`);
    }
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        const newDate = dateList[res.tapIndex];
        setSelectedDate(newDate);
        Taro.showToast({ title: `已切换到 ${newDate}`, icon: 'none' });
      },
    });
  };

  const handleLockChange = () => {
    Taro.showActionSheet({
      itemList: lockOptions.map((l) => l.name),
      success: (res) => {
        const newLock = lockOptions[res.tapIndex];
        setSelectedLockId(newLock.id);
        Taro.showToast({ title: `已筛选：${newLock.name}`, icon: 'none' });
      },
    });
  };

  const handleToggleRole = () => {
    Taro.showActionSheet({
      itemList: ['切换为船主', '切换为值班员'],
      success: (res) => {
        const newRole = res.tapIndex === 0 ? 'shipOwner' : 'operator';
        setRole(newRole);
        Taro.showToast({
          title: `已切换为${newRole === 'shipOwner' ? '船主' : '值班员'}`,
          icon: 'success',
        });
      },
    });
  };

  const selectedBooking = selectedBookingId
    ? bookings.find((b) => b.id === selectedBookingId)
    : null;

  return (
    <View className={styles.page}>
      {/* Header */}
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.title}>值班审核</Text>
          <View className={styles.datePicker} onClick={handleDateChange}>
            <Text className={styles.dateText}>📅 {selectedDate}</Text>
          </View>
        </View>

        <View className={styles.filterRow}>
          <View className={styles.filterBtn} onClick={handleLockChange}>
            <Text className={styles.filterIcon}>🚢</Text>
            <Text className={styles.filterText}>{currentLockName}</Text>
            <Text className={styles.filterArrow}>▼</Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statCard} onClick={() => setActiveTab('stats')}>
            <Text className={styles.statValue}>{dailyStats.total}</Text>
            <Text className={styles.statLabel}>今日预约</Text>
          </View>
          <View className={styles.statCard} onClick={() => setActiveTab('approved')}>
            <Text className={styles.statValue}>{approvedCount}</Text>
            <Text className={styles.statLabel}>已通过</Text>
          </View>
          <View className={styles.statCard} onClick={() => setActiveTab('pending')}>
            <Text className={styles.statValue}>{dailyStats.pending}</Text>
            <Text className={styles.statLabel}>待审核</Text>
          </View>
          <View className={styles.statCard} onClick={() => setActiveTab('rejected')}>
            <Text className={styles.statValue}>{dailyStats.rejected}</Text>
            <Text className={styles.statLabel}>已拒绝</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className={styles.tabs}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text>{tab.label}</Text>
            {tab.key !== 'stats' && (
              <Text className={styles.tabCount}>{getCount(tab.key)}</Text>
            )}
          </View>
        ))}
      </View>

      {/* List */}
      <ScrollView
        className={styles.listContainer}
        scrollY
        onPullDownRefresh={onRefresh}
        refresherEnabled
        refresherTriggered={isRefreshing}
      >
        {activeTab === 'stats' ? (
          <StatsSection
            trendData={trendData}
            maxValue={maxValue}
            noShowItems={dateNoShowItems}
            allNoShowCount={noShowItems.filter(
              (n) => dayjs(n.bookingDate).isAfter(dayjs().subtract(30, 'day'))
            ).length}
          />
        ) : (
          <BookingsList
            data={getFilteredBookings(activeTab)}
            onApprove={handleApprove}
            onReject={handleOpenReject}
            onRecord={handleRecordPassing}
          />
        )}
      </ScrollView>

      {/* 退回弹窗 */}
      {showRejectModal && selectedBooking && (
        <View className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>审核退回</Text>
            </View>
            <View className={styles.modalBody}>
              <Text className={styles.modalText}>
                请填写「{selectedBooking.shipName}」的退回原因：
              </Text>
              <Textarea
                className={styles.textarea}
                placeholder="如：证件不齐全、货物信息不符、超过预约时段等"
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

      {/* 角色切换 */}
      <View className={styles.fab} onClick={handleToggleRole}>
        <Text style={{ color: '#fff', fontSize: 22, lineHeight: 1.2, textAlign: 'center' }}>
          {role === 'operator' ? '切换\n船主' : '切换\n值班'}
        </Text>
      </View>
    </View>
  );
};

/* ---------- 子组件：列表 ---------- */
interface ListProps {
  data: Booking[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRecord: (id: string) => void;
}
const BookingsList: React.FC<ListProps> = ({ data, onApprove, onReject, onRecord }) => {
  if (data.length === 0) {
    return (
      <View className={styles.emptyState}>
        <Text style={{ fontSize: 80, marginBottom: 16 }}>📋</Text>
        <Text className={styles.emptyText}>当前日期暂无此类记录</Text>
        <Text style={{ fontSize: 22, color: '#86909c', marginTop: 8 }}>
          可切换日期查看其他数据
        </Text>
      </View>
    );
  }
  return data.map((b) => (
    <View key={b.id} className={styles.reviewCard}>
      <View className={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text className={styles.shipName}>
            {b.shipName} · {b.lockName}
          </Text>
          <Text style={{ fontSize: 22, color: '#86909c', marginTop: 4 }}>
            申请：{b.applyTime}
          </Text>
        </View>
        <StatusBadgeInline status={b.status} />
      </View>

      <View className={styles.cardContent}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>到达</Text>
          <Text className={styles.infoValue}>
            {b.expectedArrivalTime} ({b.timeSlot})
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>货物</Text>
          <Text className={styles.infoValue}>
            {cargoLabel(b.cargoType)} · {b.cargoWeight} 吨 · {b.cargoDescription}
          </Text>
        </View>
        {b.specialCargo && (
          <View style={{ marginTop: 8, padding: 10, borderRadius: 8, background: '#fff7e6' }}>
            <Text style={{ fontSize: 22, color: '#d46b08', fontWeight: 600 }}>⚠ 特殊说明</Text>
            <Text style={{ fontSize: 22, color: '#874d00', marginTop: 4, lineHeight: 1.6 }}>
              {b.specialCargo}
            </Text>
          </View>
        )}
        {b.reviewer && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>审核人</Text>
            <Text className={styles.infoValue}>
              {b.reviewer}
              {b.reviewTime ? ` · ${b.reviewTime}` : ''}
            </Text>
          </View>
        )}
        {b.reviewRemark && b.status === 'rejected' && (
          <View style={{ marginTop: 8, padding: 10, borderRadius: 8, background: '#fff1f0' }}>
            <Text style={{ fontSize: 22, color: '#cf1322', fontWeight: 600 }}>退回原因</Text>
            <Text style={{ fontSize: 22, color: '#5c0011', marginTop: 4, lineHeight: 1.6 }}>
              {b.reviewRemark}
            </Text>
          </View>
        )}
        {b.actualPassTime && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>实际过闸</Text>
            <Text className={styles.infoValue}>{b.actualPassTime}</Text>
          </View>
        )}
      </View>

      <View className={styles.reviewActions}>
        {b.status === 'pending' && (
          <>
            <Button
              className={classnames(styles.actionBtn, styles.reject)}
              onClick={() => onReject(b.id)}
            >
              退回
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.approve)}
              onClick={() => onApprove(b.id)}
            >
              通过
            </Button>
          </>
        )}
        {b.status === 'queuing' && (
          <Button
            className={classnames(styles.actionBtn, styles.record)}
            onClick={() => onRecord(b.id)}
          >
            记录实际过闸
          </Button>
        )}
        {b.status === 'approved' && (
          <Button
            className={classnames(styles.actionBtn, styles.record)}
            onClick={() => onRecord(b.id)}
          >
            记录实际过闸
          </Button>
        )}
      </View>
    </View>
  ));
};

/* ---------- 子组件：统计 ---------- */
interface StatsProps {
  trendData: { date: string; value: number; rawDate: string }[];
  maxValue: number;
  noShowItems: NoShowItem[];
  allNoShowCount: number;
}
const StatsSection: React.FC<StatsProps> = ({ trendData, maxValue, noShowItems, allNoShowCount }) => {
  return (
    <View>
      <View className={styles.chartCard}>
        <Text className={styles.chartTitle}>近 7 日预约量趋势</Text>
        <View className={styles.trendChart}>
          <View className={styles.yAxis}>
            <Text className={styles.yTick}>{maxValue}</Text>
            <Text className={styles.yTick}>{Math.floor(maxValue / 2)}</Text>
            <Text className={styles.yTick}>0</Text>
          </View>
          {trendData.map((item, i) => (
            <View key={i} className={styles.chartBar}>
              <View
                className={styles.barFill}
                style={{ height: `${(item.value / maxValue) * 100}%` }}
              >
                <Text className={styles.barValue}>{item.value}</Text>
              </View>
              <Text className={styles.barLabel}>{item.date}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.noShowSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text className={styles.sectionTitle}>爽约名单</Text>
          <Text style={{ fontSize: 22, color: '#86909c' }}>
            近 30 天共 {allNoShowCount} 次
          </Text>
        </View>

        {noShowItems.length === 0 ? (
          <View className={styles.emptyState}>
            <Text style={{ fontSize: 80, marginBottom: 16 }}>✅</Text>
            <Text className={styles.emptyText}>该日期暂无爽约记录</Text>
          </View>
        ) : (
          noShowItems.map((item) => (
            <View key={item.id} className={styles.noShowCard}>
              <View className={styles.noShowHeader}>
                <Text className={styles.noShowShip}>{item.shipName}</Text>
                <Text
                  style={{
                    fontSize: 22,
                    color: '#d46b08',
                    background: '#fff7e6',
                    padding: '4rpx 12rpx',
                    borderRadius: 100,
                  }}
                >
                  爽约
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Row label="预约日期" value={item.bookingDate} />
                <Row label="船闸" value={`${item.lockName} · ${item.timeSlot}`} />
                <Row label="爽约原因" value={item.reason} wrap />
                <Row label="登记时间" value={formatTime(item.createTime)} />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

/* ---------- 小组件 ---------- */
const Row: React.FC<{ label: string; value: string; wrap?: boolean }> = ({
  label,
  value,
  wrap,
}) => (
  <View style={{ display: 'flex', marginBottom: 6 }}>
    <Text
      style={{
        fontSize: 22,
        color: '#86909c',
        width: 120,
        flexShrink: 0,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: 22,
        color: '#1d2129',
        flex: 1,
        lineHeight: 1.6,
        ...(wrap ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
      }}
    >
      {value || '—'}
    </Text>
  </View>
);

const StatusBadgeInline: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: '待审核', color: '#d46b08', bg: '#fff7e6' },
    approved: { label: '已通过', color: '#389e0d', bg: '#f6ffed' },
    queuing: { label: '排队中', color: '#0958d9', bg: '#e6f4ff' },
    rejected: { label: '已退回', color: '#cf1322', bg: '#fff1f0' },
    cancelled: { label: '已取消', color: '#595959', bg: '#fafafa' },
    passed: { label: '已过闸', color: '#389e0d', bg: '#f6ffed' },
    released: { label: '已放行', color: '#531dab', bg: '#f9f0ff' },
  };
  const cfg = map[status] || { label: status, color: '#595959', bg: '#fafafa' };
  return (
    <Text
      style={{
        fontSize: 20,
        color: cfg.color,
        background: cfg.bg,
        padding: '6rpx 16rpx',
        borderRadius: 100,
        fontWeight: 500,
      }}
    >
      {cfg.label}
    </Text>
  );
};

const cargoLabel = (t: string) =>
  ({ general: '普通货物', dangerous: '危险品', bulk: '散货', container: '集装箱', liquid: '液体货物' }[t] || t);

export default ReviewPage;

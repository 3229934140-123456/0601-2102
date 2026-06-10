import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView, Input, Picker, Textarea } from '@tarojs/components';
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { Booking, CargoType, TimeSlot } from '@/types';
import BookingCard from '@/components/BookingCard';
import { mockBookings } from '@/data/booking';
import { getLocks, getTimeSlots, generateId, cargoTypeMap } from '@/utils';
import styles from './index.module.scss';

const BookingPage: React.FC = () => {
  const {
    role,
    setRole,
    bookings,
    addBooking,
    updateBooking,
    cancelBooking,
    ships,
    currentShipId,
    setCurrentShipId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [seedLoaded, setSeedLoaded] = useState(false);

  const [formData, setFormData] = useState({
    shipId: '',
    shipName: '',
    lockId: '',
    lockName: '',
    bookingDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    timeSlot: '',
    cargoType: 'general' as CargoType,
    cargoDescription: '',
    cargoWeight: '',
    specialCargo: '',
  });

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const locks = useMemo(() => getLocks(), []);

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已通过' },
    { key: 'queuing', label: '排队中' },
    { key: 'passed', label: '已过闸' },
    { key: 'rejected', label: '已退回' },
  ];

  const cargoTypes: { key: CargoType; label: string }[] = [
    { key: 'general', label: '普通货物' },
    { key: 'dangerous', label: '危险品' },
    { key: 'bulk', label: '散货' },
    { key: 'container', label: '集装箱' },
    { key: 'liquid', label: '液体货物' },
  ];

  const seedData = useCallback(() => {
    if (seedLoaded) return;
    const state = useAppStore.getState();
    const patch: Record<string, unknown> = {};
    if (state.bookings.length === 0) patch.bookings = mockBookings;
    // 不覆盖用户已持久化的船只
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
    setTimeout(() => state.refreshQueueFromBookings(), 0);
    setSeedLoaded(true);
  }, [seedLoaded]);

  useEffect(() => {
    seedData();
  }, [seedData]);

  useDidShow(() => {
    seedData();
    // 每次显示都重建排队
    setTimeout(() => useAppStore.getState().refreshQueueFromBookings(), 0);
  });

  const displayBookings = useMemo(() => {
    return activeTab === 'all' ? bookings : bookings.filter((b) => b.status === activeTab);
  }, [activeTab, bookings]);

  const loadSlots = useCallback((date: string) => {
    const slots = getTimeSlots(date);
    setAvailableSlots(slots);
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadSlots(formData.bookingDate);
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
      const validTabs = ['all', 'pending', 'approved', 'queuing', 'passed', 'rejected', 'cancelled'];
      if (validTabs.includes(params.tab)) {
        setActiveTab(params.tab);
      }
    }
  }, []);

  const defaultShip = ships.find((s) => s.id === currentShipId) || ships[0];

  const handleOpenModal = (booking?: Booking) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
        shipId: booking.shipId,
        shipName: booking.shipName,
        lockId: booking.lockId,
        lockName: booking.lockName,
        bookingDate: booking.bookingDate,
        timeSlot: booking.timeSlot,
        cargoType: booking.cargoType,
        cargoDescription: booking.cargoDescription,
        cargoWeight: booking.cargoWeight.toString(),
        specialCargo: booking.specialCargo || '',
      });
      const slot = booking.timeSlot.split('-');
      setSelectedSlot({
        id: `${booking.bookingDate}-${slot[0]}`,
        date: booking.bookingDate,
        startTime: slot[0],
        endTime: slot[1],
        available: 1,
        total: 5,
      });
      loadSlots(booking.bookingDate);
    } else {
      setEditingBooking(null);
      setFormData({
        shipId: defaultShip?.id || 'ship001',
        shipName: defaultShip?.name || '长江之星',
        lockId: '',
        lockName: '',
        bookingDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        timeSlot: '',
        cargoType: 'general',
        cargoDescription: '',
        cargoWeight: '',
        specialCargo: defaultShip?.specialCargo || '',
      });
      setSelectedSlot(null);
      loadSlots(dayjs().add(1, 'day').format('YYYY-MM-DD'));
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBooking(null);
  };

  const handleLockChange = (e: { detail: { value: number } }) => {
    const lock = locks[e.detail.value];
    if (!lock) return;
    setFormData({ ...formData, lockId: lock.id, lockName: lock.name });
  };

  const handleShipChange = (e: { detail: { value: number } }) => {
    const ship = ships[e.detail.value];
    if (!ship) return;
    setFormData({
      ...formData,
      shipId: ship.id,
      shipName: ship.name,
      specialCargo: ship.specialCargo || formData.specialCargo,
    });
    setCurrentShipId(ship.id);
  };

  const handleDateChange = (e: { detail: { value: string } }) => {
    const newDate = e.detail.value;
    setFormData({ ...formData, bookingDate: newDate, timeSlot: '' });
    setSelectedSlot(null);
    loadSlots(newDate);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available === 0) return;
    setSelectedSlot(slot);
    setFormData({ ...formData, timeSlot: `${slot.startTime}-${slot.endTime}` });
  };

  const handleCargoTypeSelect = (type: CargoType) => {
    setFormData({ ...formData, cargoType: type });
  };

  const validateForm = (): boolean => {
    if (!formData.shipName.trim()) {
      Taro.showToast({ title: '请输入船名', icon: 'none' });
      return false;
    }
    if (!formData.lockId) {
      Taro.showToast({ title: '请选择船闸', icon: 'none' });
      return false;
    }
    if (!formData.timeSlot) {
      Taro.showToast({ title: '请选择时段', icon: 'none' });
      return false;
    }
    if (!formData.cargoDescription.trim()) {
      Taro.showToast({ title: '请输入货物名称', icon: 'none' });
      return false;
    }
    if (!formData.cargoWeight || Number(formData.cargoWeight) <= 0) {
      Taro.showToast({ title: '请输入有效载货量', icon: 'none' });
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const baseBooking = {
      shipId: formData.shipId || 'ship001',
      shipName: formData.shipName,
      lockId: formData.lockId,
      lockName: formData.lockName,
      expectedArrivalTime: `${formData.bookingDate} ${selectedSlot?.startTime || '00:00'}`,
      bookingDate: formData.bookingDate,
      timeSlot: formData.timeSlot,
      cargoType: formData.cargoType,
      cargoDescription: formData.cargoDescription,
      cargoWeight: Number(formData.cargoWeight),
      specialCargo: formData.specialCargo || undefined,
    };

    if (editingBooking) {
      updateBooking(editingBooking.id, {
        ...baseBooking,
      });
      Taro.showToast({ title: '修改成功', icon: 'success' });
    } else {
      addBooking({
        ...baseBooking,
        id: generateId('bk'),
        status: 'pending',
        applyTime: dayjs().format('YYYY-MM-DD HH:mm'),
      });
      Taro.showToast({ title: '提交成功', icon: 'success' });
    }

    handleCloseModal();
  };

  const handleCancelBooking = (id: string) => {
    Taro.showModal({
      title: '取消预约',
      content: '确定要取消该预约吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          cancelBooking(id);
          Taro.showToast({ title: '已取消', icon: 'success' });
        }
      },
    });
  };

  const handleEditBooking = (booking: Booking) => {
    if (booking.status !== 'pending') {
      Taro.showToast({ title: '仅待审核预约可修改', icon: 'none' });
      return;
    }
    handleOpenModal(booking);
  };

  const toggleRole = () => {
    const newRole = role === 'shipOwner' ? 'operator' : 'shipOwner';
    setRole(newRole);
    Taro.showToast({
      title: `已切换为${newRole === 'shipOwner' ? '船主' : '值班员'}`,
      icon: 'none',
    });
  };

  const getTabCount = (status: string) => {
    if (status === 'all') return bookings.length;
    return bookings.filter((b) => b.status === status).length;
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>预约申请</Text>
        <Button className={styles.roleToggle} onClick={toggleRole}>
          {role === 'shipOwner' ? '船主' : '值班员'}
        </Button>
      </View>

      <View className={styles.content}>
        <View className={styles.tabBar}>
          {tabs.map((tab) => (
            <View
              key={tab.key}
              className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text className={styles.tabText}>{tab.label}</Text>
              <Text className={styles.tabCount}>{getTabCount(tab.key)}</Text>
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
          {displayBookings.length === 0 ? (
            <View className={styles.emptyState}>
              <Text style={{ fontSize: 80, marginBottom: 16 }}>📝</Text>
              <Text className={styles.emptyText}>暂无预约记录</Text>
              <Text style={{ fontSize: 22, color: '#86909c', marginTop: 8 }}>
                点击右下角 + 发起新预约
              </Text>
            </View>
          ) : (
            displayBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancelBooking}
                onEdit={handleEditBooking}
              />
            ))
          )}
        </ScrollView>
      </View>

      <View className={styles.fab} onClick={() => handleOpenModal()}>
        <Text className={styles.fabText}>+</Text>
      </View>

      {showModal && (
        <View className={styles.modalOverlay} onClick={handleCloseModal}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>
                {editingBooking ? '修改预约' : '新增预约'}
              </Text>
              <Button className={styles.closeBtn} onClick={handleCloseModal}>
                ×
              </Button>
            </View>

            <ScrollView className={styles.modalBody} scrollY>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>选择船舶
                </Text>
                <Picker
                  mode="selector"
                  range={ships.map((s) => `${s.name} (${s.mmsi.slice(-4)})`)}
                  value={ships.findIndex((s) => s.id === formData.shipId)}
                  onChange={handleShipChange}
                >
                  <View className={styles.formPicker}>
                    <Text className={styles.pickerText}>
                      {formData.shipName || '请选择船舶'}
                    </Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </Picker>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>船名
                </Text>
                <Input
                  className={styles.formInput}
                  value={formData.shipName}
                  onInput={(e) => setFormData({ ...formData, shipName: e.detail.value })}
                  placeholder="请输入船名"
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>选择船闸
                </Text>
                <Picker
                  mode="selector"
                  range={locks.map((l) => l.name)}
                  value={locks.findIndex((l) => l.id === formData.lockId)}
                  onChange={handleLockChange}
                >
                  <View className={styles.formPicker}>
                    <Text
                      className={classnames(
                        styles.pickerText,
                        !formData.lockId && styles.placeholder
                      )}
                    >
                      {formData.lockName || '请选择船闸'}
                    </Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </Picker>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>预约日期
                </Text>
                <Picker
                  mode="date"
                  value={formData.bookingDate}
                  start={dayjs().format('YYYY-MM-DD')}
                  end={dayjs().add(30, 'day').format('YYYY-MM-DD')}
                  onChange={handleDateChange}
                >
                  <View className={styles.formPicker}>
                    <Text className={styles.pickerText}>{formData.bookingDate}</Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </Picker>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>选择时段
                </Text>
                <View className={styles.timeSlotGrid}>
                  {availableSlots.map((slot) => (
                    <View
                      key={slot.id}
                      className={classnames(
                        styles.timeSlotItem,
                        selectedSlot?.id === slot.id && styles.active,
                        slot.available === 0 && styles.disabled
                      )}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      <Text className={styles.slotTime}>
                        {slot.startTime}-{slot.endTime}
                      </Text>
                      <Text className={styles.slotAvailable}>
                        剩余{slot.available}/{slot.total}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>货物类型
                </Text>
                <View className={styles.cargoTypeGrid}>
                  {cargoTypes.map((type) => (
                    <View
                      key={type.key}
                      className={classnames(
                        styles.cargoTypeItem,
                        formData.cargoType === type.key && styles.active
                      )}
                      onClick={() => handleCargoTypeSelect(type.key)}
                    >
                      <Text>{type.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>货物名称
                </Text>
                <Input
                  className={styles.formInput}
                  value={formData.cargoDescription}
                  onInput={(e) =>
                    setFormData({ ...formData, cargoDescription: e.detail.value })
                  }
                  placeholder="例如：煤炭、钢材、粮食、集装箱等"
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>载货量（吨）
                </Text>
                <Input
                  className={styles.formInput}
                  type="digit"
                  value={formData.cargoWeight}
                  onInput={(e) => setFormData({ ...formData, cargoWeight: e.detail.value })}
                  placeholder="请输入载货吨数"
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>特殊货物说明</Text>
                <Textarea
                  className={styles.textarea}
                  value={formData.specialCargo}
                  onInput={(e) => setFormData({ ...formData, specialCargo: e.detail.value })}
                  placeholder="如有危险品、特殊尺寸货物、需要特殊防护措施等请在此说明"
                  maxlength={500}
                />
              </View>
            </ScrollView>

            <View className={styles.modalFooter}>
              <Button
                className={classnames(styles.footerBtn, styles.cancelBtn)}
                onClick={handleCloseModal}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.footerBtn, styles.submitBtn)}
                onClick={handleSubmit}
              >
                {editingBooking ? '保存修改' : '提交申请'}
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default BookingPage;

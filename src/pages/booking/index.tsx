import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ScrollView, Input, Picker, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { Booking, BookingStatus, CargoType, TimeSlot } from '@/types';
import BookingCard from '@/components/BookingCard';
import { mockBookings } from '@/data/booking';
import { getLocks, getTimeSlots, generateId, cargoTypeMap } from '@/utils';
import styles from './index.module.scss';

const BookingPage: React.FC = () => {
  const { userRole, setUserRole, bookings, addBooking, updateBooking, cancelBooking } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [formData, setFormData] = useState({
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

  const locks = getLocks();

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已通过' },
    { key: 'queuing', label: '排队中' },
    { key: 'passed', label: '已完成' },
  ];

  const cargoTypes: { key: CargoType; label: string }[] = [
    { key: 'general', label: '普通货物' },
    { key: 'dangerous', label: '危险品' },
    { key: 'bulk', label: '散货' },
    { key: 'container', label: '集装箱' },
    { key: 'liquid', label: '液体货物' },
  ];

  const displayBookings = activeTab === 'all'
    ? bookings
    : bookings.filter((b) => b.status === activeTab);

  const loadData = useCallback(() => {
    if (bookings.length === 0) {
      useAppStore.setState({ bookings: mockBookings });
    }
    const slots = getTimeSlots(formData.bookingDate);
    setAvailableSlots(slots);
  }, [bookings.length, formData.bookingDate]);

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
    }, 1000);
  };

  useEffect(() => {
    if (isRefreshing) {
      onRefresh();
    }
  }, [isRefreshing]);

  const handleOpenModal = (booking?: Booking) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
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
    } else {
      setEditingBooking(null);
      setFormData({
        shipName: '长江之星',
        lockId: '',
        lockName: '',
        bookingDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        timeSlot: '',
        cargoType: 'general',
        cargoDescription: '',
        cargoWeight: '',
        specialCargo: '',
      });
      setSelectedSlot(null);
    }
    const slots = getTimeSlots(formData.bookingDate);
    setAvailableSlots(slots);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBooking(null);
  };

  const handleLockChange = (e: { detail: { value: number } }) => {
    const lock = locks[e.detail.value];
    setFormData({ ...formData, lockId: lock.id, lockName: lock.name });
  };

  const handleDateChange = (e: { detail: { value: string } }) => {
    const newDate = e.detail.value;
    setFormData({ ...formData, bookingDate: newDate, timeSlot: '' });
    setSelectedSlot(null);
    const slots = getTimeSlots(newDate);
    setAvailableSlots(slots);
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

    const newBooking: Booking = {
      id: editingBooking?.id || `bk${Date.now()}`,
      shipId: 'ship001',
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
      status: 'pending',
      applyTime: dayjs().format('YYYY-MM-DD HH:mm'),
    };

    if (editingBooking) {
      updateBooking(editingBooking.id, newBooking);
      Taro.showToast({ title: '修改成功', icon: 'success' });
    } else {
      addBooking(newBooking);
      Taro.showToast({ title: '提交成功', icon: 'success' });
    }

    handleCloseModal();
  };

  const handleCancelBooking = (id: string) => {
    cancelBooking(id);
    Taro.showToast({ title: '已取消', icon: 'success' });
  };

  const handleEditBooking = (booking: Booking) => {
    handleOpenModal(booking);
  };

  const toggleRole = () => {
    const newRole = userRole === 'shipOwner' ? 'operator' : 'shipOwner';
    setUserRole(newRole);
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
          {userRole === 'shipOwner' ? '船主' : '值班员'}
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
              <Text className={styles.emptyText}>暂无预约记录</Text>
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
                  onInput={(e) => setFormData({ ...formData, cargoDescription: e.detail.value })}
                  placeholder="请输入货物名称"
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
                  placeholder="请输入载货量"
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>特殊货物说明</Text>
                <Textarea
                  className={styles.textarea}
                  value={formData.specialCargo}
                  onInput={(e) => setFormData({ ...formData, specialCargo: e.detail.value })}
                  placeholder="如有危险品、特殊尺寸货物等请在此说明"
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

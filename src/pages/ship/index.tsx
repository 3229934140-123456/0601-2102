import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Input, Button, Image, Textarea } from '@tarojs/components';
import Taro, { useDidShow, chooseImage } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { Ship } from '@/types';
import styles from './index.module.scss';

const ShipPage: React.FC = () => {
  const {
    ships,
    currentShipId,
    setCurrentShipId,
    updateShip,
    getCurrentShip,
  } = useAppStore();

  const [selectedShipId, setSelectedShipId] = useState<string>(currentShipId);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editData, setEditData] = useState<Partial<Ship>>({});
  const [specialCargo, setSpecialCargo] = useState('');
  const [certPhotos, setCertPhotos] = useState<string[]>([]);
  const [seedLoaded, setSeedLoaded] = useState(false);

  const seedData = useCallback(() => {
    if (seedLoaded) return;
    const state = useAppStore.getState();
    if (state.ships.length === 0) {
      import('@/data/ship').then(({ mockShipList }) => {
        useAppStore.setState({
          ships: mockShipList,
          currentShipId: mockShipList[0].id,
        });
        setSelectedShipId(mockShipList[0].id);
      });
    }
    if (state.bookings.length === 0) {
      import('@/data/booking').then(({ mockBookings }) => {
        useAppStore.setState({ bookings: mockBookings });
      });
    }
    setSeedLoaded(true);
  }, [seedLoaded]);

  useEffect(() => {
    seedData();
  }, [seedData]);

  useDidShow(() => {
    seedData();
  });

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || getCurrentShip(),
    [ships, selectedShipId, getCurrentShip]
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 800);
  };

  useEffect(() => {
    if (isRefreshing) onRefresh();
  }, [isRefreshing]);

  useEffect(() => {
    if (currentShipId && !selectedShipId) {
      setSelectedShipId(currentShipId);
    }
  }, [currentShipId, selectedShipId]);

  const handleShipSelect = (ship: Ship) => {
    if (isEditing) {
      Taro.showModal({
        title: '提示',
        content: '有未保存的编辑，确定要切换船舶吗？',
        success: (res) => {
          if (res.confirm) {
            setSelectedShipId(ship.id);
            setCurrentShipId(ship.id);
            setIsEditing(false);
            setCertPhotos(ship.certificatePhoto ? [ship.certificatePhoto] : ship.photos || []);
            setSpecialCargo(ship.specialCargo || '');
          }
        },
      });
    } else {
      setSelectedShipId(ship.id);
      setCurrentShipId(ship.id);
      setCertPhotos(ship.certificatePhoto ? [ship.certificatePhoto] : ship.photos || []);
      setSpecialCargo(ship.specialCargo || '');
    }
  };

  const handleStartEdit = () => {
    if (selectedShip) {
      setEditData({ ...selectedShip });
      setSpecialCargo(selectedShip.specialCargo || '');
      setCertPhotos(
        selectedShip.certificatePhoto
          ? [selectedShip.certificatePhoto]
          : selectedShip.photos?.slice(0, 3) || []
      );
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = () => {
    if (!selectedShip) return;
    if (!editData.name?.trim()) {
      Taro.showToast({ title: '请输入船名', icon: 'none' });
      return;
    }
    if (!editData.mmsi?.trim()) {
      Taro.showToast({ title: '请输入MMSI', icon: 'none' });
      return;
    }

    const updates: Partial<Ship> = {
      ...editData,
      specialCargo,
      certificatePhoto: certPhotos[0],
      photos: certPhotos,
      id: selectedShip.id,
    };

    updateShip(selectedShip.id, updates);

    setIsEditing(false);
    Taro.showToast({ title: '保存成功', icon: 'success' });
  };

  const handleUploadPhoto = async () => {
    try {
      const res = await chooseImage({
        count: Math.max(1, 3 - certPhotos.length),
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      });
      const newPhotos = [...certPhotos, ...res.tempFilePaths].slice(0, 3);
      setCertPhotos(newPhotos);
    } catch (error) {
      console.error('[Ship] 选择图片失败:', error);
      // H5 环境下 chooseImage 不可用的回退
      if (certPhotos.length < 3) {
        const fallbackPhoto = `https://picsum.photos/seed/cert-fallback-${Date.now()}/750/500`;
        setCertPhotos([...certPhotos, fallbackPhoto]);
      }
    }
  };

  const handleDeletePhoto = (index: number) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const newPhotos = certPhotos.filter((_, i) => i !== index);
          setCertPhotos(newPhotos);
        }
      },
    });
  };

  const getCertExpireStatus = (expireDate: string) => {
    if (!expireDate) return '';
    const days = dayjs(expireDate).diff(dayjs(), 'day');
    if (days < 0) return 'error';
    if (days < 30) return 'warning';
    return '';
  };

  const handleInputChange = (field: keyof Ship, value: string | number) => {
    setEditData({ ...editData, [field]: value });
  };

  if (ships.length === 0) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🚢</Text>
          <Text className={styles.emptyText}>暂无船舶资料</Text>
        </View>
      </View>
    );
  }

  const displayShip = isEditing ? editData : selectedShip;
  if (!displayShip) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🚢</Text>
          <Text className={styles.emptyText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <ScrollView
        scrollY
        onPullDownRefresh={onRefresh}
        refresherEnabled
        refresherTriggered={isRefreshing}
      >
        <View className={styles.content}>
          <ScrollView className={styles.shipSelector} scrollX>
            {ships.map((ship) => (
              <View
                key={ship.id}
                className={classnames(
                  styles.shipTab,
                  ship.id === selectedShipId && styles.active
                )}
                onClick={() => handleShipSelect(ship)}
              >
                <Text>{ship.name}</Text>
              </View>
            ))}
          </ScrollView>

          <View className={styles.shipCard}>
            <View className={styles.photoSection}>
              <Image
                className={styles.shipPhoto}
                src={
                  certPhotos[0] ||
                  displayShip.certificatePhoto ||
                  'https://picsum.photos/id/3/750/300'
                }
                mode="aspectFill"
              />
              {isEditing && (
                <Button className={styles.uploadBtn} onClick={handleUploadPhoto}>
                  📷
                </Button>
              )}
              <View className={styles.photoOverlay}>
                <Text className={styles.shipName}>
                  {isEditing ? (
                    <Input
                      value={editData.name}
                      onInput={(e) => handleInputChange('name', e.detail.value)}
                      style={{ color: '#fff', fontSize: '40rpx', fontWeight: 'bold' }}
                    />
                  ) : (
                    displayShip.name
                  )}
                </Text>
                <View className={styles.shipTypeBadge}>
                  <Text className={styles.shipTypeText}>
                    {isEditing ? (
                      <Input
                        value={editData.shipType}
                        onInput={(e) => handleInputChange('shipType', e.detail.value)}
                        style={{ color: '#1E88E5', fontSize: '24rpx' }}
                      />
                    ) : (
                      displayShip.shipType
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View className={styles.infoSection}>
              <View className={styles.sectionTitle}>
                <Text>船舶参数</Text>
                {!isEditing && (
                  <Button className={styles.editBtn} onClick={handleStartEdit}>
                    编辑
                  </Button>
                )}
              </View>

              <View className={styles.paramGrid}>
                <View className={styles.paramItem}>
                  <Text className={styles.paramLabel}>MMSI</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      value={editData.mmsi}
                      onInput={(e) => handleInputChange('mmsi', e.detail.value)}
                    />
                  ) : (
                    <Text className={styles.paramValue}>{displayShip.mmsi}</Text>
                  )}
                </View>
                <View className={styles.paramItem}>
                  <Text className={styles.paramLabel}>呼号</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      value={editData.callSign}
                      onInput={(e) => handleInputChange('callSign', e.detail.value)}
                    />
                  ) : (
                    <Text className={styles.paramValue}>{displayShip.callSign}</Text>
                  )}
                </View>
                <View className={styles.paramItem}>
                  <Text className={styles.paramLabel}>总长</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      type="digit"
                      value={editData.length?.toString()}
                      onInput={(e) => handleInputChange('length', Number(e.detail.value))}
                    />
                  ) : (
                    <Text className={styles.paramValue}>
                      {displayShip.length}
                      <Text className={styles.unit}>m</Text>
                    </Text>
                  )}
                </View>
                <View className={styles.paramItem}>
                  <Text className={styles.paramLabel}>型宽</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      type="digit"
                      value={editData.width?.toString()}
                      onInput={(e) => handleInputChange('width', Number(e.detail.value))}
                    />
                  ) : (
                    <Text className={styles.paramValue}>
                      {displayShip.width}
                      <Text className={styles.unit}>m</Text>
                    </Text>
                  )}
                </View>
                <View className={styles.paramItem}>
                  <Text className={styles.paramLabel}>吃水</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      type="digit"
                      value={editData.draft?.toString()}
                      onInput={(e) => handleInputChange('draft', Number(e.detail.value))}
                    />
                  ) : (
                    <Text className={styles.paramValue}>
                      {displayShip.draft}
                      <Text className={styles.unit}>m</Text>
                    </Text>
                  )}
                </View>
                <View className={styles.paramItem}>
                  <Text className={styles.paramLabel}>吨位</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      type="digit"
                      value={editData.tonnage?.toString()}
                      onInput={(e) => handleInputChange('tonnage', Number(e.detail.value))}
                    />
                  ) : (
                    <Text className={styles.paramValue}>
                      {displayShip.tonnage}
                      <Text className={styles.unit}>t</Text>
                    </Text>
                  )}
                </View>
              </View>

              <View className={styles.sectionTitle}>
                <Text>证书信息</Text>
              </View>
              <View className={styles.certCard}>
                <View className={styles.certRow}>
                  <Text className={styles.certLabel}>证书编号</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      value={editData.certificateNumber}
                      onInput={(e) =>
                        handleInputChange('certificateNumber', e.detail.value)
                      }
                      style={{ width: '300rpx', textAlign: 'right' }}
                    />
                  ) : (
                    <Text className={styles.certValue}>
                      {displayShip.certificateNumber || '--'}
                    </Text>
                  )}
                </View>
                <View className={styles.certRow}>
                  <Text className={styles.certLabel}>有效期至</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      value={editData.certificateExpire}
                      onInput={(e) =>
                        handleInputChange('certificateExpire', e.detail.value)
                      }
                      style={{ width: '200rpx', textAlign: 'right' }}
                    />
                  ) : (
                    <Text
                      className={classnames(
                        styles.certValue,
                        styles.certExpire,
                        styles[getCertExpireStatus(displayShip.certificateExpire || '')]
                      )}
                    >
                      {displayShip.certificateExpire || '--'}
                    </Text>
                  )}
                </View>
              </View>

              <View className={styles.sectionTitle}>
                <Text>船舶所有人</Text>
              </View>
              <View className={styles.ownerSection}>
                <View className={styles.ownerRow}>
                  <Text className={styles.ownerLabel}>姓名</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      value={editData.ownerName}
                      onInput={(e) => handleInputChange('ownerName', e.detail.value)}
                      style={{ width: '300rpx', textAlign: 'right' }}
                    />
                  ) : (
                    <Text className={styles.ownerValue}>{displayShip.ownerName}</Text>
                  )}
                </View>
                <View className={styles.ownerRow}>
                  <Text className={styles.ownerLabel}>联系电话</Text>
                  {isEditing ? (
                    <Input
                      className={styles.paramInput}
                      type="number"
                      value={editData.ownerPhone}
                      onInput={(e) => handleInputChange('ownerPhone', e.detail.value)}
                      style={{ width: '300rpx', textAlign: 'right' }}
                    />
                  ) : (
                    <Text className={classnames(styles.ownerValue, styles.ownerPhone)}>
                      {displayShip.ownerPhone}
                    </Text>
                  )}
                </View>
              </View>

              <View className={styles.sectionTitle}>
                <Text>特殊货物说明</Text>
              </View>
              {isEditing ? (
                <View className={styles.specialSection}>
                  <Text className={styles.specialHint}>
                    如有常运的危险品、特殊尺寸货物等，请在此说明，便于审核
                  </Text>
                  <Textarea
                    className={styles.specialTextarea}
                    value={specialCargo}
                    onInput={(e) => setSpecialCargo(e.detail.value)}
                    placeholder="请输入特殊货物说明（如：危险品、冷藏货物、超长超宽货物等）"
                    maxlength={500}
                  />
                </View>
              ) : (
                <View className={styles.specialDisplay}>
                  {displayShip.specialCargo ? (
                    <Text className={styles.specialDisplayText}>
                      {displayShip.specialCargo}
                    </Text>
                  ) : (
                    <Text className={styles.specialEmpty}>
                      无特殊货物说明（点击右上角"编辑"补充）
                    </Text>
                  )}
                </View>
              )}

              <View className={styles.sectionTitle}>
                <Text>证件照片</Text>
              </View>
              <View className={styles.photoPreviewSection}>
                <View className={styles.photoList}>
                  {certPhotos.map((photo, index) => (
                    <View key={index} className={styles.photoItem}>
                      <Image
                        className={styles.photoImg}
                        src={photo}
                        mode="aspectFill"
                      />
                      {isEditing && (
                        <View
                          className={styles.photoDelete}
                          onClick={() => handleDeletePhoto(index)}
                        >
                          <Text className={styles.photoDeleteText}>×</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {isEditing && certPhotos.length < 3 && (
                    <View className={styles.photoAdd} onClick={handleUploadPhoto}>
                      <Text className={styles.photoAddIcon}>+</Text>
                      <Text className={styles.photoAddText}>上传</Text>
                    </View>
                  )}
                  {!isEditing && certPhotos.length === 0 && (
                    <Text className={styles.specialEmpty}>
                      暂无证件照片（点击"编辑"上传）
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {isEditing && (
        <View className={styles.footerBar}>
          <Button
            className={classnames(styles.footerBtn, styles.cancelBtn)}
            onClick={handleCancelEdit}
          >
            取消
          </Button>
          <Button
            className={classnames(styles.footerBtn, styles.saveBtn)}
            onClick={handleSave}
          >
            保存
          </Button>
        </View>
      )}
    </View>
  );
};

export default ShipPage;

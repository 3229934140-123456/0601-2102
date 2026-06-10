import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import { Ship } from '@/types';
import styles from './index.module.scss';

interface ShipInfoCardProps {
  ship: Ship;
  showPhoto?: boolean;
}

const ShipInfoCard: React.FC<ShipInfoCardProps> = ({ ship, showPhoto = true }) => {
  return (
    <View className={styles.card}>
      {showPhoto && ship.certificatePhoto && (
        <View className={styles.photoSection}>
          <Image
            className={styles.photo}
            src={ship.certificatePhoto}
            mode="aspectFill"
          />
          <View className={styles.shipTypeBadge}>
            <Text className={styles.shipTypeText}>{ship.shipType}</Text>
          </View>
        </View>
      )}

      <View className={styles.infoSection}>
        <View className={styles.shipHeader}>
          <Text className={styles.shipName}>{ship.name}</Text>
          <Text className={styles.flag}>{ship.flag}</Text>
        </View>

        <View className={styles.grid}>
          <View className={styles.gridItem}>
            <Text className={styles.itemLabel}>MMSI</Text>
            <Text className={styles.itemValue}>{ship.mmsi}</Text>
          </View>
          <View className={styles.gridItem}>
            <Text className={styles.itemLabel}>呼号</Text>
            <Text className={styles.itemValue}>{ship.callSign}</Text>
          </View>
          <View className={styles.gridItem}>
            <Text className={styles.itemLabel}>总长</Text>
            <Text className={styles.itemValue}>{ship.length}m</Text>
          </View>
          <View className={styles.gridItem}>
            <Text className={styles.itemLabel}>型宽</Text>
            <Text className={styles.itemValue}>{ship.width}m</Text>
          </View>
          <View className={styles.gridItem}>
            <Text className={styles.itemLabel}>吃水</Text>
            <Text className={styles.itemValue}>{ship.draft}m</Text>
          </View>
          <View className={styles.gridItem}>
            <Text className={styles.itemLabel}>吨位</Text>
            <Text className={styles.itemValue}>{ship.tonnage}t</Text>
          </View>
        </View>

        <View className={styles.certInfo}>
          <View className={styles.certRow}>
            <Text className={styles.certLabel}>证书编号</Text>
            <Text className={styles.certValue}>{ship.certificateNumber}</Text>
          </View>
          <View className={styles.certRow}>
            <Text className={styles.certLabel}>有效期至</Text>
            <Text className={styles.certValue}>{ship.certificateExpire}</Text>
          </View>
        </View>

        <View className={styles.ownerInfo}>
          <Text className={styles.ownerLabel}>船舶所有人</Text>
          <View className={styles.ownerDetail}>
            <Text className={styles.ownerName}>{ship.ownerName}</Text>
            <Text className={styles.ownerPhone}>{ship.ownerPhone}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ShipInfoCard;

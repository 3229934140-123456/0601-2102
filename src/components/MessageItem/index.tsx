import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { Message } from '@/types';
import { formatTime, messageTypeMap } from '@/utils';
import styles from './index.module.scss';

interface MessageItemProps {
  message: Message;
  onClick?: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onClick }) => {
  const typeColors: Record<string, string> = {
    system: '#1E88E5',
    booking: '#26A69A',
    queue: '#722ED1',
    review: '#FF7D00',
  };

  const handleClick = () => {
    if (onClick) {
      onClick(message);
    }
  };

  return (
    <View
      className={classnames(styles.item, !message.isRead && styles.unread)}
      onClick={handleClick}
    >
      <View className={styles.typeBadge} style={{ backgroundColor: typeColors[message.type] }}>
        <Text className={styles.typeText}>{messageTypeMap[message.type]}</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.header}>
          <Text className={styles.title}>{message.title}</Text>
          {!message.isRead && <View className={styles.dot} />}
        </View>
        <Text className={styles.desc}>{message.content}</Text>
        <Text className={styles.time}>{formatTime(message.createTime)}</Text>
      </View>
    </View>
  );
};

export default MessageItem;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store/appStore';
import { Message, MessageType } from '@/types';
import { formatTime, messageTypeMap } from '@/utils';
import styles from './index.module.scss';

const MessagesPage: React.FC = () => {
  const { messages, markMessageAsRead, markAllMessagesAsRead } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [seedLoaded, setSeedLoaded] = useState(false);

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'system', label: '系统' },
    { key: 'booking', label: '预约' },
    { key: 'queue', label: '排队' },
    { key: 'review', label: '审核' },
  ];

  const seedData = useCallback(() => {
    if (seedLoaded) return;
    const state = useAppStore.getState();
    if (state.messages.length === 0) {
      import('@/data/messages').then(({ mockMessages }) => {
        useAppStore.setState({ messages: mockMessages });
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

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 800);
  };

  useEffect(() => {
    if (isRefreshing) onRefresh();
  }, [isRefreshing]);

  const displayMessages = useMemo(
    () => (activeFilter === 'all' ? messages : messages.filter((m) => m.type === activeFilter)),
    [activeFilter, messages]
  );

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.isRead).length,
    [messages]
  );

  const getUnreadCountByType = (type: string) => {
    if (type === 'all') return unreadCount;
    return messages.filter((m) => m.type === type && !m.isRead).length;
  };

  const handleMessageClick = (message: Message) => {
    if (!message.isRead) {
      markMessageAsRead(message.id);
    }
    setSelectedMessage(message);
    setShowDetail(true);
  };

  const handleToggleExpand = (messageId: string, e: any) => {
    e.stopPropagation();
    setExpandedId(expandedId === messageId ? null : messageId);
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) {
      Taro.showToast({ title: '没有未读消息', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '全部已读',
      content: `确定要将所有 ${unreadCount} 条未读消息标记为已读吗？`,
      success: (res) => {
        if (res.confirm) {
          markAllMessagesAsRead();
          Taro.showToast({ title: '已标记全部已读', icon: 'success' });
        }
      },
    });
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedMessage(null);
  };

  const getTypeShortName = (type: MessageType) => {
    const map: Record<MessageType, string> = {
      system: '系统',
      booking: '预约',
      queue: '排队',
      review: '审核',
    };
    return map[type];
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.title}>通知消息</Text>
          <View className={styles.headerActions}>
            {unreadCount > 0 && (
              <View className={styles.unreadBadge}>
                <Text className={styles.unreadText}>
                  未读
                  <Text className={styles.count}>{unreadCount}</Text>
                  条
                </Text>
              </View>
            )}
            <Button className={styles.markAllBtn} onClick={handleMarkAllRead}>
              全部已读
            </Button>
          </View>
        </View>
      </View>

      <View className={styles.filterBar}>
        {filters.map((filter) => (
          <View
            key={filter.key}
            className={classnames(
              styles.filterItem,
              activeFilter === filter.key && styles.active
            )}
            onClick={() => setActiveFilter(filter.key)}
          >
            <Text>{filter.label}</Text>
            {getUnreadCountByType(filter.key) > 0 && (
              <View className={styles.filterDot} />
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
        {displayMessages.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>暂无消息</Text>
            <Text className={styles.emptyDesc}>新消息将在这里显示</Text>
          </View>
        ) : (
          displayMessages.map((message) => (
            <View
              key={message.id}
              className={classnames(
                styles.messageItem,
                !message.isRead && styles.unread,
                expandedId === message.id && styles.expanded
              )}
              onClick={() => handleMessageClick(message)}
            >
              <View className={classnames(styles.typeBadge, styles[message.type])}>
                <Text className={styles.typeText}>{getTypeShortName(message.type)}</Text>
              </View>

              <View className={styles.messageContent}>
                <View className={styles.messageHeader}>
                  <Text className={styles.messageTitle}>{message.title}</Text>
                  <Text className={styles.messageTime}>
                    {formatTime(message.createTime, 'MM-DD HH:mm')}
                  </Text>
                </View>
                <Text
                  className={styles.messageDesc}
                  style={
                    expandedId !== message.id && message.content.length > 60
                      ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }
                      : undefined
                  }
                >
                  {message.content}
                </Text>
                {message.content.length > 60 && (
                  <Text
                    className={styles.expandHint}
                    onClick={(e) => handleToggleExpand(message.id, e)}
                  >
                    {expandedId === message.id ? '收起' : '展开全文'}
                  </Text>
                )}
              </View>

              {!message.isRead && <View className={styles.unreadDot} />}
            </View>
          ))
        )}
      </ScrollView>

      {showDetail && selectedMessage && (
        <View className={styles.detailModal} onClick={handleCloseDetail}>
          <View className={styles.detailContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>消息详情</Text>
              <Button className={styles.closeBtn} onClick={handleCloseDetail}>
                ×
              </Button>
            </View>
            <ScrollView className={styles.detailBody} scrollY>
              <View className={classnames(styles.detailType, styles[selectedMessage.type])}>
                <Text>{messageTypeMap[selectedMessage.type]}</Text>
              </View>
              <Text className={styles.detailTime}>
                {formatTime(selectedMessage.createTime, 'YYYY-MM-DD HH:mm:ss')}
              </Text>
              <Text className={styles.detailText}>{selectedMessage.content}</Text>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default MessagesPage;

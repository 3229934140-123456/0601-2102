import { Message } from '@/types';
import dayjs from 'dayjs';

export const mockMessages: Message[] = [
  {
    id: 'm001',
    type: 'review',
    title: '预约审核通过',
    content:
      '恭喜！「长江之星」在 三峡船闸 08:00-10:00 的过闸申请已通过，排队序号：3。请提前 2 小时到达船闸锚地待命。',
    bookingId: 'bk001',
    createTime: dayjs().subtract(1, 'day').add(8, 'hour').valueOf(),
    isRead: false,
    targetPage: '/pages/queue/index',
    targetParams: { bookingId: 'bk001' },
  },
  {
    id: 'm002',
    type: 'queue',
    title: '排队信息更新',
    content:
      '「黄河号」当前在 三峡船闸 排队序号：1，预计通过时间：30分钟后。请做好过闸准备，保持VHF16频道值守。',
    bookingId: 'bk004',
    createTime: dayjs().subtract(1, 'hour').valueOf(),
    isRead: false,
    targetPage: '/pages/queue/index',
    targetParams: { bookingId: 'bk004' },
  },
  {
    id: 'm003',
    type: 'booking',
    title: '预约申请已提交',
    content: '您已成功提交「长江之星」在 葛洲坝船闸 14:00-16:00 的过闸申请，请等待值班人员审核。',
    bookingId: 'bk002',
    createTime: dayjs().subtract(6, 'hour').valueOf(),
    isRead: false,
    targetPage: '/pages/booking/index',
    targetParams: { tab: 'pending' },
  },
  {
    id: 'm004',
    type: 'review',
    title: '预约审核退回',
    content:
      '「珠江明珠」在 向家坝船闸 16:00-18:00 的过闸申请被退回。原因：危险品申报资料不全，请补充安全运输许可证、应急处置方案及船员培训合格证。',
    bookingId: 'bk005',
    createTime: dayjs().subtract(2, 'day').valueOf(),
    isRead: true,
    targetPage: '/pages/review/index',
    targetParams: { tab: 'rejected', bookingId: 'bk005' },
  },
  {
    id: 'm005',
    type: 'queue',
    title: '船舶已过闸',
    content: '「长江之星」于 10:30 顺利通过 三峡船闸。祝您航行顺利，一路平安！',
    bookingId: 'bk003',
    createTime: dayjs().subtract(2, 'day').add(10, 'hour').valueOf(),
    isRead: true,
    targetPage: '/pages/review/index',
    targetParams: { tab: 'approved', bookingId: 'bk003' },
  },
  {
    id: 'm006',
    type: 'system',
    title: '系统维护公告',
    content:
      '【重要通知】三峡船闸将于 2026年6月15日 00:00-06:00 进行年度检修，期间暂停通航。请合理安排过闸计划，给您带来的不便敬请谅解！',
    createTime: dayjs().subtract(3, 'day').valueOf(),
    isRead: true,
  },
  {
    id: 'm007',
    type: 'system',
    title: '功能升级通知',
    content:
      '系统已升级 V2.0：新增船舶证件智能识别、危险品申报快速通道、排队实时消息推送等功能，欢迎体验！',
    createTime: dayjs().subtract(1, 'week').valueOf(),
    isRead: true,
  },
];

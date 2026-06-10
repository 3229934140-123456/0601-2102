export default defineAppConfig({
  pages: [
    'pages/booking/index',
    'pages/queue/index',
    'pages/ship/index',
    'pages/messages/index',
    'pages/review/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '船闸通行预约',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/booking/index',
        text: '预约申请'
      },
      {
        pagePath: 'pages/queue/index',
        text: '排队进度'
      },
      {
        pagePath: 'pages/ship/index',
        text: '船舶资料'
      },
      {
        pagePath: 'pages/messages/index',
        text: '通知消息'
      },
      {
        pagePath: 'pages/review/index',
        text: '值班审核'
      }
    ]
  }
})

const theme = require('./utils/theme');

// 全局主题注入:包装 Page,让每个页面无需单独改动即可获得 data.theme,
// 并在 onShow 时把导航栏/窗口底色同步为当前主题。
// 页面可通过 themeMode: 'dark' 声明为恒定暗色页(如图片详情页)。
const originalPage = Page;
Page = function (config) {
  const mode = config.themeMode || 'auto';
  const originalOnShow = config.onShow;
  config.onShow = function () {
    if (originalOnShow) originalOnShow.apply(this, arguments);
    const t = mode === 'dark' ? 'dark' : theme.getTheme();
    if (this.data.theme !== t) this.setData({ theme: t });
    theme.applyChrome(t);
  };
  return originalPage(config);
};

App({
  onLaunch() {
    // 检查登录态,token 由各页面按需读取
  },
  globalData: {}
});

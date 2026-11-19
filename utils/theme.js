/**
 * 全局明暗主题
 * 状态存本地 storage('app_theme'),值: 'light' | 'dark'(缺省 light)
 * 页面根节点通过 app.js 注入的 data.theme 驱动 .page-theme.dark 类,
 * 暗色覆盖样式统一放在 app.wxss 的 .page-theme.dark 段。
 */
const KEY = 'app_theme';

function getTheme() {
  try {
    return wx.getStorageSync(KEY) === 'dark' ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

/** 同步导航栏 / 窗口底色,与主题一致(页面 onShow 与切换时调用) */
function applyChrome(t) {
  const dark = t === 'dark';
  const bg = dark ? '#0B0C12' : '#F4F5FA';
  wx.setNavigationBarColor({
    frontColor: dark ? '#ffffff' : '#000000',
    backgroundColor: bg,
    fail() {}
  });
  wx.setBackgroundColor({ backgroundColor: bg, fail() {} });
}

/** 切换主题:写 storage → 同步导航栏 → 可选通知当前页面刷新根节点类 */
function toggle(page) {
  const t = getTheme() === 'dark' ? 'light' : 'dark';
  try {
    wx.setStorageSync(KEY, t);
  } catch (e) {}
  applyChrome(t);
  if (page && page.setData) page.setData({ theme: t });
  return t;
}

module.exports = { getTheme, applyChrome, toggle };

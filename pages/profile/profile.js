const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    logged: false,
    profile: null,
    groupName: '',
    usageText: '',
    usagePercent: 0,
    cacheSize: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    if (!api.isLogged()) {
      this.setData({ logged: false, profile: null });
      return;
    }
    this.setData({ logged: true });
    this.load();
    this.updateCacheSize();
  },

  /** 计算本地缓存大小(不含登录凭证) */
  updateCacheSize() {
    try {
      const info = wx.getStorageInfoSync();
      let size = 0;
      info.keys.forEach((k) => {
        if (k === 'token') return;
        const v = wx.getStorageSync(k);
        if (v) size += JSON.stringify(v).length;
      });
      // 字符长度近似字节(中文占多字节,粗略即可)
      const kb = (size * 2) / 1024;
      this.setData({
        cacheSize: kb >= 1024 ? (kb / 1024).toFixed(1) + 'MB' : Math.max(1, Math.round(kb)) + 'KB'
      });
    } catch (e) {
      this.setData({ cacheSize: '' });
    }
  },

  /** 清除缓存:保留登录 token,清掉其余本地数据 */
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除本地临时数据(不会退出登录),清除后部分页面会重新加载数据。确定继续?',
      success: (r) => {
        if (!r.confirm) return;
        try {
          // 先取出登录凭证,清除后恢复
          const token = api.getToken();
          wx.clearStorageSync();
          if (token) api.setToken(token);
        } catch (e) {}
        wx.showToast({ title: '缓存已清除', icon: 'success' });
        this.updateCacheSize();
      }
    });
  },

  load() {
    Promise.all([api.getProfile(), api.getGroup()])
      .then(([p, g]) => {
        const profile = p.data;
        wx.setStorageSync('profile', profile);
        const percent = profile.total_storage
          ? (profile.used_storage / profile.total_storage) * 100
          : 0;
        this.setData({
          profile,
          groupName: (g.data.group && g.data.group.name) || '默认组',
          usageText: util.formatSize(profile.used_storage) + ' / ' + util.formatSize(profile.total_storage),
          usagePercent: Math.min(100, percent).toFixed(1)
        });
      })
      .catch((err) => {
        // 401 已在 request 中统一处理
        if (err && err.message) api.showError(err);
      });
  },

  goUpload() {
    wx.navigateTo({ url: '/pages/upload/upload' });
  },
  goEdit() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },
  goAlbums() {
    wx.switchTab({ url: '/pages/albums/albums' });
  },
  goPlans() {
    wx.navigateTo({ url: '/pages/plans/plans' });
  },
  goTokens() {
    wx.navigateTo({ url: '/pages/tokens/tokens' });
  },
  goTickets() {
    wx.navigateTo({ url: '/pages/tickets/tickets' });
  },
  goGallery() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗?',
      success: (r) => {
        if (r.confirm) {
          api.logout().catch(() => {}).then(() => {
            api.clearToken();
            wx.showToast({ title: '已退出', icon: 'success' });
            setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
          });
        }
      }
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});

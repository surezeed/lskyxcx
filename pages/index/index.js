const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    logged: false,
    loading: true,
    profile: null,
    groupName: '',
    usageText: '',
    usagePercent: 0,
    recent: [],
    keyword: '',
    searchExpanded: false,
    deckIndex: 0,
    deckTotal: 0,
    deck3: []
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    if (!api.isLogged()) {
      this.setData({ logged: false, loading: false, profile: null, recent: [], deckIndex: 0, deckTotal: 0, deck3: [] });
      return;
    }
    this.setData({ logged: true, loading: true });
    this.refresh();
  },

  refresh() {
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
        return api.getPhotos({ page: 1, per_page: 6, order_by: 'latest' });
      })
      .then((res) => {
        if (res) {
          const recent = res.data.data.map((p) => ({
            id: p.id,
            thumb: p.thumbnail_url || p.public_url,
            name: p.name || p.filename
          }));
          this.setData({
            recent,
            deckIndex: 0,
            deckTotal: recent.length,
            deck3: this.buildDeck(0, recent)
          });
        }
        this.setData({ loading: false });
      })
      .catch(() => this.setData({ loading: false }));
  },

  /**
   * 按 deckIndex 从 recent 循环取 3 张构建牌堆：
   * deck3[0] = 上一张（左卡）、deck3[1] = 当前（主卡）、deck3[2] = 下一张（右卡）
   * recent 为空时用 deco 占位；不足 3 张时 key 追加槽位后缀避免 wx:key 重复
   */
  buildDeck(idx, recentList) {
    const recent = recentList || this.data.recent;
    const n = recent.length;
    const slots = [
      { slot: 'left', offset: -1, deco: 'deck-deco-a' },
      { slot: 'main', offset: 0, deco: 'deck-deco-main' },
      { slot: 'right', offset: 1, deco: 'deck-deco-b' }
    ];
    return slots.map((s) => {
      if (!n) {
        return { type: 'deco', key: 'deco-' + s.slot, cls: 'deck-' + s.slot, decoClass: s.deco };
      }
      const pos = n === 1 ? 0 : (((idx + s.offset) % n) + n) % n;
      const p = recent[pos];
      const suffix = n < 3 ? '-' + s.slot : '';
      return {
        type: 'photo',
        thumb: p.thumb,
        name: p.name,
        id: p.id,
        key: 'p' + p.id + suffix,
        cls: 'deck-' + s.slot
      };
    });
  },

  /** 滑动判定阈值：40rpx 换算 px（带缓存） */
  getDeckThreshold() {
    if (this._deckThreshold) return this._deckThreshold;
    let windowWidth = 375;
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      if (info && info.windowWidth) windowWidth = info.windowWidth;
    } catch (err) { /* 取默认值 */ }
    this._deckThreshold = Math.max(20, (windowWidth / 750) * 40);
    return this._deckThreshold;
  },

  onDeckTouchStart(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    this._deckTouch = { x: t.clientX, y: t.clientY };
  },

  onDeckTouchEnd(e) {
    const start = this._deckTouch;
    this._deckTouch = null;
    if (!start) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const threshold = this.getDeckThreshold();
    // 位移过小视为点击（交给 bindtap）；纵向占主导视为页面滚动，均不切换
    if (Math.abs(dx) < threshold || Math.abs(dy) >= Math.abs(dx)) return;
    const total = this.data.deckTotal;
    if (!total) return;
    let idx = this.data.deckIndex + (dx < 0 ? 1 : -1);
    idx = ((idx % total) + total) % total;
    // 标记本次为滑动，吞掉 touchend 后可能误触发的 tap，短窗口后自动清除
    this._deckSwiped = true;
    setTimeout(() => { this._deckSwiped = false; }, 350);
    this.setData({ deckIndex: idx, deck3: this.buildDeck(idx) });
  },

  /** 搜索胶囊：原位展开横向搜索条 */
  openSearch() {
    this.setData({ searchExpanded: true });
  },

  /** 点击搜索条以外区域（遮罩）：收起并还原胶囊 */
  closeSearch() {
    this.setData({ searchExpanded: false, keyword: '' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },
  goUpload() {
    wx.navigateTo({ url: '/pages/upload/upload' });
  },
  goGallery() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },
  goAlbums() {
    wx.switchTab({ url: '/pages/albums/albums' });
  },
  goShares() {
    wx.switchTab({ url: '/pages/shares/shares' });
  },
  goPlans() {
    wx.navigateTo({ url: '/pages/plans/plans' });
  },
  goTokens() {
    wx.navigateTo({ url: '/pages/tokens/tokens' });
  },
  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  onKeyword(e) {
    this.setData({ keyword: e.detail.value });
  },
  /** 首页大搜索框:跳转到图库并带入关键字 */
  doSearch() {
    const kw = (this.data.keyword || '').trim();
    if (kw) wx.setStorageSync('searchKeyword', kw);
    this.setData({ keyword: '', searchExpanded: false }); // 最小增量：提交后收起搜索条还原胶囊
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },
  openPhoto(e) {
    if (this._deckSwiped) { this._deckSwiped = false; return; }
    wx.navigateTo({ url: '/pages/photo-detail/photo-detail?id=' + e.currentTarget.dataset.id });
  },

  onPullDownRefresh() {
    if (this.data.logged) {
      this.refresh();
    }
    wx.stopPullDownRefresh();
  }
});

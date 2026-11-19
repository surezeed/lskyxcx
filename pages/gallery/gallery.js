const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    photos: [],
    page: 1,
    q: '',
    order: 'latest',
    albumId: '',
    albumName: '',
    total: 0,
    hasMore: true,
    loading: false,
    logged: false,
    inited: false
  },

  photoMap: {},

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    const logged = api.isLogged();
    // 从相册页跳转过来携带筛选条件
    const filter = wx.getStorageSync('albumFilter');
    if (filter) {
      wx.removeStorageSync('albumFilter');
      this.setData({ albumId: String(filter.id), albumName: filter.name || '相册' });
      this.setData({ logged, inited: true });
      this.load(true);
      return;
    }
    // 从首页大搜索框跳转过来携带关键字
    const kw = wx.getStorageSync('searchKeyword');
    if (kw) {
      wx.removeStorageSync('searchKeyword');
      this.setData({ q: kw, logged, inited: true });
      this.load(true);
      return;
    }
    if (!logged) {
      this.setData({ logged: false });
      return;
    }
    this.setData({ logged: true });
    if (!this.data.inited) {
      this.setData({ inited: true });
      this.load(true);
    }
  },

  load(reset) {
    if (this.data.loading) return Promise.resolve();
    if (!reset && !this.data.hasMore) return Promise.resolve();
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    const params = { page, per_page: 24, order_by: this.data.order };
    if (this.data.q) params.q = this.data.q;
    if (this.data.albumId) params.album_id = this.data.albumId;
    api
      .getPhotos(params)
      .then((res) => {
        const list = res.data.data.map((p) => {
          this.photoMap[p.id] = p;
          return {
            id: p.id,
            name: p.name || p.filename,
            thumb: p.thumbnail_url || p.public_url,
            isPublic: p.is_public,
            sizeText: util.formatSize(p.size),
            dateText: util.formatDate(p.created_at)
          };
        });
        this.setData({
          photos: reset ? list : this.data.photos.concat(list),
          page: page + 1,
          hasMore: res.data.meta.current_page < res.data.meta.last_page,
          total: res.data.meta.total
        });
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  onSearch(e) {
    this.setData({ q: e.detail.value });
  },
  doSearch() {
    this.load(true);
  },
  clearFilter() {
    this.setData({ albumId: '', albumName: '' });
    this.load(true);
  },
  switchOrder() {
    this.setData({ order: this.data.order === 'latest' ? 'oldest' : 'latest' });
    this.load(true);
  },

  openPhoto(e) {
    wx.navigateTo({ url: '/pages/photo-detail/photo-detail?id=' + e.currentTarget.dataset.id });
  },

  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const p = this.photoMap[id];
    if (!p) return;
    wx.showActionSheet({
      itemList: ['复制图片链接', '删除图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({ data: p.public_url });
        } else if (res.tapIndex === 1) {
          this.confirmDelete(id);
        }
      }
    });
  },

  confirmDelete(id) {
    wx.showModal({
      title: '删除图片',
      content: '删除后无法恢复,确定删除这张图片吗?',
      confirmColor: '#ef4444',
      success: (r) => {
        if (r.confirm) {
          api.deletePhoto(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.setData({
              photos: this.data.photos.filter((x) => x.id !== id),
              total: this.data.total - 1
            });
          }).catch(api.showError);
        }
      }
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onPullDownRefresh() {
    if (!this.data.logged) {
      wx.stopPullDownRefresh();
      return;
    }
    // 数据加载完成后再收起下拉动画
    Promise.resolve(this.load(true)).then(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.logged) this.load(false);
  }
});

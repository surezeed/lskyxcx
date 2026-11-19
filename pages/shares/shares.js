const api = require('../../utils/api');
const util = require('../../utils/util');

/** 分享访问链接(slug 拼接) */
function shareLink(slug) {
  return 'https://wordimges.com/s/' + slug;
}

Page({
  data: {
    logged: true,
    shares: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    page: 1,
    keyword: '',
    typeFilter: '', // '' 全部 | photo | album

    // 新建分享
    showForm: false,
    formType: 'photo',
    objects: [],          // 可选图片/相册
    objectNames: [],
    objectIndex: -1,
    content: '',
    password: '',
    expiredAt: '',
    creating: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const logged = api.isLogged();
    this.setData({ logged });
    if (logged) this.load(true);
  },

  onPullDownRefresh() {
    if (this.data.logged) {
      this.load(true).then(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) this.load(false);
  },

  buildParams(reset) {
    const params = { page: reset ? 1 : this.data.page + 1, per_page: 20 };
    if (this.data.keyword) params.q = this.data.keyword;
    if (this.data.typeFilter) params.type = this.data.typeFilter;
    return params;
  },

  load(reset) {
    if (reset) this.setData({ page: 1, loading: true });
    else this.setData({ loadingMore: true });

    return api.getShares(this.buildParams(reset))
      .then((res) => {
        const payload = res.data || {};
        const raw = payload.data || [];
        const items = raw.map((s) => ({
          id: s.id,
          type: s.type,
          typeText: s.type === 'album' ? '相册' : '图片',
          slug: s.slug,
          link: shareLink(s.slug),
          content: s.content || '',
          hasPwd: !!s.password,
          viewCount: s.view_count || 0,
          likeCount: s.like_count || 0,
          createdAt: (s.created_at || '').replace('T', ' ').substring(0, 16),
          expiredAt: s.expired_at
            ? (s.expired_at.replace('T', ' ').replace('.000000Z', '').substring(0, 16))
            : ''
        }));
        const meta = payload.meta || {};
        const merged = reset ? items : this.data.shares.concat(items);
        this.setData({
          shares: merged,
          page: reset ? 1 : this.data.page + 1,
          hasMore: meta.current_page ? meta.current_page < (meta.last_page || 1) : items.length >= 20
        });
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false, loadingMore: false }));
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  doSearch() {
    this.load(true);
  },

  setFilter(e) {
    const t = e.currentTarget.dataset.type;
    if (t === this.data.typeFilter) return;
    this.setData({ typeFilter: t });
    this.load(true);
  },

  copyLink(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.link });
  },

  del(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除分享',
      content: '删除后分享链接将立即失效,确定删除?',
      confirmColor: '#ef4444',
      success: (r) => {
        if (r.confirm) {
          api.deleteShare(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.load(true);
          }).catch(api.showError);
        }
      }
    });
  },

  // ---------- 新建分享 ----------
  toggleForm() {
    const show = !this.data.showForm;
    this.setData({ showForm: show });
    if (show) this.loadObjects();
  },

  setType(e) {
    const t = e.currentTarget.dataset.type;
    if (t === this.data.formType) return;
    this.setData({ formType: t, objectIndex: -1, objects: [], objectNames: [] });
    this.loadObjects();
  },

  /** 加载可选择的图片或相册 */
  loadObjects() {
    const isPhoto = this.data.formType === 'photo';
    const req = isPhoto
      ? api.getPhotos({ page: 1, per_page: 50 })
      : api.getAlbums({ page: 1, per_page: 50 });
    req.then((res) => {
      const payload = res.data || {};
      const raw = payload.data || [];
      const list = (Array.isArray(raw) ? raw : raw.data || []).map((o) => ({
        id: o.id,
        name: o.name || o.filename || o.pathname || ('#' + o.id),
        pathname: o.pathname || ''
      }));
      this.setData({
        objects: list,
        objectNames: list.map((o) => o.name)
      });
    }).catch(api.showError);
  },

  pickObject(e) {
    this.setData({ objectIndex: Number(e.detail.value) });
  },

  onFormInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onExpireChange(e) {
    this.setData({ expiredAt: e.detail.value });
  },

  create() {
    const d = this.data;
    if (d.creating) return;
    if (d.objectIndex < 0) {
      wx.showToast({ title: d.formType === 'photo' ? '请选择图片' : '请选择相册', icon: 'none' });
      return;
    }
    const obj = d.objects[d.objectIndex];
    const data = { type: d.formType, ids: [obj.id] };
    if (d.content) data.content = d.content;
    if (d.password) data.password = d.password;
    if (d.expiredAt) data.expired_at = d.expiredAt + ' 00:00:00';

    this.setData({ creating: true });
    api.createShare(data)
      .then((res) => {
        const slug = (res.data && res.data.slug) || '';
        wx.setClipboardData({
          data: shareLink(slug),
          success: () => {
            wx.showToast({ title: '链接已复制', icon: 'success' });
          }
        });
        this.setData({ showForm: false, content: '', password: '', expiredAt: '', objectIndex: -1 });
        this.load(true);
      })
      .catch(api.showError)
      .then(() => this.setData({ creating: false }));
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});

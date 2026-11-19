const api = require('../../utils/api');

const TYPE_MAP = {
  vip: { label: 'VIP', cls: 'type-vip' },
  storage: { label: '容量', cls: 'type-storage' }
};

Page({
  data: {
    plans: [],
    filtered: [],
    typeFilter: 'all', // all | vip | storage
    loading: true
  },

  onShow() {
    if (!api.isLogged()) {
      wx.showModal({
        title: '提示',
        content: '查看套餐需要先登录',
        confirmText: '去登录',
        cancelText: '取消',
        success: (r) => {
          if (r.confirm) {
            wx.redirectTo({ url: '/pages/login/login' });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    this.load();
  },

  load() {
    this.setData({ loading: true });
    api.getPlans({ page: 1, per_page: 50 })
      .then((res) => {
        const plans = (res.data.data || []).map((p) => {
          const t = TYPE_MAP[p.type] || { label: p.type, cls: 'type-storage' };
          return Object.assign({}, p, {
            typeLabel: t.label,
            typeCls: t.cls,
            featureList: p.features || []
          });
        });
        this.setData({ plans });
        this.applyFilter();
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  applyFilter() {
    const f = this.data.typeFilter;
    const filtered = f === 'all'
      ? this.data.plans
      : this.data.plans.filter((p) => p.type === f);
    this.setData({ filtered });
  },

  setFilter(e) {
    this.setData({ typeFilter: e.currentTarget.dataset.type });
    this.applyFilter();
  },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/plan-detail/plan-detail?id=' + e.currentTarget.dataset.id });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});

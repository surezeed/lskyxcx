const api = require('../../utils/api');

Page({
  data: {
    plan: null,
    loading: true
  },

  onLoad(query) {
    this.id = query.id;
  },

  onShow() {
    this.load();
  },

  load() {
    this.setData({ loading: true });
    api.getPlan(this.id)
      .then((res) => {
        this.setData({ plan: res.data });
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});

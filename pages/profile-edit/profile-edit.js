const api = require('../../utils/api');

Page({
  data: {
    form: {
      name: '',
      tagline: '',
      bio: '',
      url: '',
      location: '',
      company: '',
      company_title: ''
    },
    saving: false
  },

  onLoad() {
    api
      .getProfile()
      .then((res) => {
        const p = res.data;
        this.setData({
          form: {
            name: p.name || '',
            tagline: p.tagline || '',
            bio: p.bio || '',
            url: p.url || '',
            location: p.location || '',
            company: p.company || '',
            company_title: p.company_title || ''
          }
        });
      })
      .catch(api.showError);
  },

  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value });
  },

  save() {
    if (this.data.saving) return;
    if (!this.data.form.name) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    api
      .updateProfile(this.data.form)
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 600);
      })
      .catch(api.showError)
      .then(() => this.setData({ saving: false }));
  }
});

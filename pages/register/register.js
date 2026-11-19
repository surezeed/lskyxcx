const api = require('../../utils/api');

Page({
  data: {
    username: '',
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    loading: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  submit() {
    const d = this.data;
    if (d.loading) return;
    if (!d.username || !d.email || !d.password) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    if (d.password !== d.passwordConfirmation) {
      wx.showToast({ title: '两次输入的密码不一致', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    api
      .register({
        username: d.username,
        name: d.name || d.username,
        email: d.email,
        password: d.password,
        password_confirmation: d.passwordConfirmation
      })
      .then(() => {
        wx.showToast({ title: '注册成功,请登录', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  }
});

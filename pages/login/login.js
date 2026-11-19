const api = require('../../utils/api');

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  submit() {
    const { username, password, loading } = this.data;
    if (loading) return;
    if (!username || !password) {
      wx.showToast({ title: '请填写账号和密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    api
      .login({
        login_type: 'username',
        username: username,
        password: password,
        remember: true
      })
      .then((res) => {
        api.setToken(res.data.token);
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 600);
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});

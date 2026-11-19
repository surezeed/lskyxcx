const api = require('../../utils/api');

const LEVELS = [
  { value: 'low', label: '低', cls: 'level-low' },
  { value: 'medium', label: '中', cls: 'level-medium' },
  { value: 'high', label: '高', cls: 'level-high' }
];

Page({
  data: {
    tickets: [],
    loading: true,
    page: 1,
    hasMore: true,
    // 创建表单
    showForm: false,
    title: '',
    content: '',
    levelIndex: 0,
    levelNames: LEVELS.map((l) => l.label),
    creating: false
  },

  onShow() {
    if (!api.isLogged()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.load(true);
  },

  load(reset) {
    if (this.data.loading && !reset) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    api.getTickets({ page, per_page: 20 })
      .then((res) => {
        const list = (res.data.data || []).map((t) => {
          const lv = LEVELS.find((l) => l.value === t.level) || LEVELS[0];
          return {
            issueNo: t.issue_no,
            title: t.title,
            levelLabel: lv.label,
            levelCls: lv.cls,
            status: t.status,
            closed: t.status === 'closed' || t.closed_at,
            createdAt: (t.created_at || '').replace('T', ' ').substring(0, 16)
          };
        });
        this.setData({
          tickets: reset ? list : this.data.tickets.concat(list),
          page: page + 1,
          hasMore: res.data.meta ? res.data.meta.current_page < res.data.meta.last_page : false
        });
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },
  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },
  onLevel(e) {
    this.setData({ levelIndex: Number(e.detail.value) });
  },

  create() {
    const d = this.data;
    if (d.creating) return;
    if (!d.title || !d.content) {
      wx.showToast({ title: '请填写标题和内容', icon: 'none' });
      return;
    }
    this.setData({ creating: true });
    api.createTicket({
      title: d.title,
      level: LEVELS[d.levelIndex].value,
      content: d.content
    })
      .then(() => {
        wx.showToast({ title: '提交成功', icon: 'success' });
        this.setData({ title: '', content: '', showForm: false });
        this.load(true);
      })
      .catch(api.showError)
      .then(() => this.setData({ creating: false }));
  },

  openDetail(e) {
    wx.navigateTo({
      url: '/pages/ticket-detail/ticket-detail?issue_no=' + e.currentTarget.dataset.no
    });
  },

  onPullDownRefresh() {
    this.load(true);
    wx.stopPullDownRefresh();
  },
  onReachBottom() {
    this.load(false);
  }
});

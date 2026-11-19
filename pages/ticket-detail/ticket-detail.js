const api = require('../../utils/api');

Page({
  data: {
    ticket: null,
    replies: [],
    loading: true,
    replyText: '',
    sending: false,
    closed: false
  },

  onLoad(query) {
    this.issueNo = query.issue_no;
  },

  onShow() {
    this.load();
  },

  load() {
    this.setData({ loading: true });
    Promise.all([
      api.getTicket(this.issueNo),
      api.getTicketReplies(this.issueNo, { page: 1, per_page: 100 })
    ])
      .then(([t, r]) => {
        const ticket = t.data;
        const closed = ticket.status === 'closed' || !!ticket.closed_at;
        const replies = (r.data.data || r.data || []).map((x) => ({
          id: x.id,
          content: x.content,
          isStaff: !x.user_id, // 站方回复(无 user_id 视为客服)
          staffName: x.staff_name || x.admin_name || '客服',
          createdAt: (x.created_at || '').replace('T', ' ').substring(0, 16)
        }));
        this.setData({ ticket, replies, closed });
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  onInput(e) {
    this.setData({ replyText: e.detail.value });
  },

  send() {
    const text = this.data.replyText.trim();
    if (!text || this.data.sending || this.data.closed) return;
    this.setData({ sending: true });
    api.replyTicket(this.issueNo, { content: text, is_notify: true })
      .then(() => {
        this.setData({ replyText: '' });
        this.load();
      })
      .catch(api.showError)
      .then(() => this.setData({ sending: false }));
  },

  closeTicket() {
    wx.showModal({
      title: '关闭工单',
      content: '关闭后将无法继续回复,确定关闭?',
      success: (r) => {
        if (r.confirm) {
          api.closeTicket(this.issueNo).then(() => {
            wx.showToast({ title: '已关闭', icon: 'success' });
            this.load();
          }).catch(api.showError);
        }
      }
    });
  },

  del() {
    wx.showModal({
      title: '删除工单',
      content: '删除后无法恢复,确定删除该工单?',
      confirmColor: '#ef4444',
      success: (r) => {
        if (r.confirm) {
          api.deleteTicket(this.issueNo).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 600);
          }).catch(api.showError);
        }
      }
    });
  }
});

const api = require('../../utils/api');

const CATEGORY_LABELS = {
  user: '用户',
  content: '内容',
  service: '服务',
  integration: '集成',
  oauth: 'OAuth',
  explore: '探索',
  upload: '上传',
  basic: '基础'
};

Page({
  data: {
    tokens: [],
    loading: true,
    showForm: false,
    name: '',
    expiresAt: '',
    creating: false,
    newToken: '', // 刚创建的 token,用于复制

    permGroups: [],   // 权限分组 [{category,label,items:[{value,label,detail,checked}]}]
    selectedCount: 0,
    allSelected: false,
    permLoading: false
  },

  onShow() {
    if (!api.isLogged()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.load();
    this.loadPermissions();
  },

  load() {
    this.setData({ loading: true });
    api.getTokens({ page: 1, per_page: 100 })
      .then((res) => {
        const list = res.data.data || res.data || [];
        const permMap = this.permMap || {};
        this.setData({
          tokens: (Array.isArray(list) ? list : list.data || []).map((t) => {
            const abilities = Array.isArray(t.abilities) ? t.abilities : [];
            return {
              id: t.id,
              name: t.name,
              abilitiesText: abilities.length
                ? abilities.map((v) => permMap[v] || v).join('、')
                : '基础权限',
              createdAt: (t.created_at || '').replace('T', ' ').substring(0, 16),
              expiresAt: t.expires_at ? t.expires_at.replace('T', ' ').replace('.000000Z', '').substring(0, 16) : '永久'
            };
          })
        });
      })
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  /** 拉取系统支持的权限白名单(GET /token_permissions) */
  loadPermissions() {
    this.setData({ permLoading: true });
    api.getTokenPermissions()
      .then((res) => {
        const perms = (res.data && res.data.permissions) || [];
        const byCat = {};
        this.permMap = {};
        perms.forEach((p) => {
          this.permMap[p.value] = p.label;
          const cat = p.category || 'other';
          (byCat[cat] = byCat[cat] || []).push({
            value: p.value,
            label: p.label,
            detail: p.detail,
            checked: false
          });
        });
        const permGroups = Object.keys(byCat).map((cat) => ({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          items: byCat[cat]
        }));
        this.setData({ permGroups });
      })
      .catch(() => {})
      .then(() => this.setData({ permLoading: false }));
  },

  togglePerm(e) {
    const gi = Number(e.currentTarget.dataset.group);
    const pi = Number(e.currentTarget.dataset.index);
    const item = this.data.permGroups[gi].items[pi];
    this.setData({
      ['permGroups[' + gi + '].items[' + pi + '].checked']: !item.checked
    });
    this.refreshCount();
  },

  /** 全选 / 清空 */
  toggleAll() {
    const target = !this.data.allSelected;
    const permGroups = this.data.permGroups.map((g) => ({
      ...g,
      items: g.items.map((p) => ({ ...p, checked: target }))
    }));
    this.setData({ permGroups });
    this.refreshCount();
  },

  refreshCount() {
    let count = 0;
    let total = 0;
    this.data.permGroups.forEach((g) => {
      g.items.forEach((p) => {
        total += 1;
        if (p.checked) count += 1;
      });
    });
    this.setData({ selectedCount: count, allSelected: total > 0 && count === total });
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm, newToken: '' });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  create() {
    const d = this.data;
    if (d.creating) return;
    if (!d.name) {
      wx.showToast({ title: '请填写令牌名称', icon: 'none' });
      return;
    }
    // 收集勾选的权限值(后端为白名单校验,如 upload:write / user:photo:read)
    const abilities = [];
    d.permGroups.forEach((g) => g.items.forEach((p) => {
      if (p.checked) abilities.push(p.value);
    }));
    if (!abilities.length) {
      wx.showToast({ title: '请至少勾选一项权限', icon: 'none' });
      return;
    }
    const data = { name: d.name, abilities };
    if (d.expiresAt) data.expires_at = d.expiresAt;
    this.setData({ creating: true });
    api.createToken(data)
      .then((res) => {
        this.setData({ newToken: res.data.token, name: '', expiresAt: '' });
        this.toggleAllReset();
        this.load();
      })
      .catch(api.showError)
      .then(() => this.setData({ creating: false }));
  },

  toggleAllReset() {
    const permGroups = this.data.permGroups.map((g) => ({
      ...g,
      items: g.items.map((p) => ({ ...p, checked: false }))
    }));
    this.setData({ permGroups, selectedCount: 0, allSelected: false });
  },

  copyNewToken() {
    if (this.data.newToken) wx.setClipboardData({ data: this.data.newToken });
  },

  copyAbilities(e) {
    const a = e.currentTarget.dataset.abilities;
    if (a) wx.setClipboardData({ data: a });
  },

  del(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除令牌',
      content: '使用该令牌的应用将立即失效,确定删除?',
      confirmColor: '#ef4444',
      success: (r) => {
        if (r.confirm) {
          api.deleteToken(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.load();
          }).catch(api.showError);
        }
      }
    });
  }
});

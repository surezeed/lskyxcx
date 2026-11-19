const api = require('../../utils/api');

Page({
  data: {
    albums: [],
    covers: {},
    loading: true,
    logged: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    const logged = api.isLogged();
    this.setData({ logged });
    if (logged) this.load();
  },

  load() {
    this.setData({ loading: true });
    // 相册列表 + 最近照片(一次请求):照片按 albums 归池,每个相册随机挑一张做封面
    Promise.all([
      api.getAlbums({ page: 1, per_page: 100 }),
      api.getPhotos({ page: 1, per_page: 100 })
    ])
      .then(([albumRes, photoRes]) => {
        const albums = albumRes.data.data;
        const pool = {};
        ((photoRes.data && photoRes.data.data) || []).forEach((p) => {
          const url = p.thumbnail_url || p.public_url;
          if (!url) return;
          (p.albums || []).forEach((a) => {
            (pool[a.id] = pool[a.id] || []).push(url);
          });
        });
        if (Object.keys(pool).length) {
          const covers = {};
          Object.keys(pool).forEach((id) => {
            const arr = pool[id];
            covers[id] = arr[Math.floor(Math.random() * arr.length)];
          });
          return { albums, covers };
        }
        // 兜底:列表照片不带相册归属时,按相册逐个取少量图片(前 20 个,控制请求数)
        return Promise.all(
          albums.slice(0, 20).map((a) =>
            api
              .getPhotos({ page: 1, per_page: 6, album_id: a.id })
              .then((r) => ({ id: a.id, photos: (r.data && r.data.data) || [] }))
              .catch(() => ({ id: a.id, photos: [] }))
          )
        ).then((groups) => {
          const covers = {};
          groups.forEach(({ id, photos }) => {
            const urls = photos
              .map((p) => p.thumbnail_url || p.public_url)
              .filter(Boolean);
            if (urls.length) covers[id] = urls[Math.floor(Math.random() * urls.length)];
          });
          return { albums, covers };
        });
      })
      .then(({ albums, covers }) => this.setData({ albums, covers }))
      .catch(api.showError)
      .then(() => this.setData({ loading: false }));
  },

  openAlbum(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.setStorageSync('albumFilter', { id, name });
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  addAlbum() {
    wx.showModal({
      title: '新建相册',
      editable: true,
      placeholderText: '请输入相册名称',
      success: (res) => {
        if (res.confirm && res.content) {
          api.createAlbum({ name: res.content }).then(() => {
            wx.showToast({ title: '创建成功', icon: 'success' });
            this.load();
          }).catch(api.showError);
        }
      }
    });
  },

  editAlbum(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '修改相册名称',
      editable: true,
      content: name,
      success: (res) => {
        if (res.confirm && res.content) {
          api.updateAlbum(id, { name: res.content }).then(() => {
            wx.showToast({ title: '已保存', icon: 'success' });
            this.load();
          }).catch(api.showError);
        }
      }
    });
  },

  deleteAlbum(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除相册',
      content: '仅删除相册,不会删除相册内的图片。确定删除吗?',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          api.deleteAlbum(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.load();
          }).catch(api.showError);
        }
      }
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});

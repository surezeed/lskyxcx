const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  themeMode: 'dark', // 本页为深黑杂志风设计,恒定暗色主题
  data: {
    photo: null,
    loading: true,
    editing: false,
    form: { name: '', intro: '', is_public: false, tags: '' },
    meta: { size: '', ext: '', date: '' },
    albums: [],
    albumNames: ['不放入相册'],
    albumIndex: -1,
    rows: []
  },

  onLoad(query) {
    this.id = query.id;
    if (api.isLogged()) {
      api.getAlbums({ page: 1, per_page: 100 })
        .then((res) => this.setData({ albums: res.data.data }))
        .catch(() => {});
    }
    this.load();
  },

  load() {
    this.setData({ loading: true });
    api
      .getPhoto(this.id)
      .then((res) => {
        const p = res.data;
        const albums = p.albums || [];
        const ai = albums.length
          ? this.data.albums.findIndex((a) => a.id === albums[0].id)
          : -1;
        const tags = (p.tags || []).map((t) => t.name || t).join(', ');
        this.setData({
          photo: p,
          loading: false,
          meta: {
            size: util.formatSize(p.size),
            ext: p.extension ? p.extension.toUpperCase() : (p.mimetype || 'IMG'),
            date: util.formatDate(p.created_at)
          },
          form: {
            name: p.name || '',
            intro: p.intro || '',
            is_public: !!p.is_public,
            tags
          },
          albumIndex: ai,
          rows: [
            ['文件名', p.filename],
            ['尺寸', p.width + ' × ' + p.height],
            ['大小', util.formatSize(p.size)],
            ['格式', p.extension ? p.extension.toUpperCase() : p.mimetype],
            ['储存', p.storage && p.storage.name],
            ['公开', p.is_public ? '公开' : '私有'],
            ['上传时间', util.formatDate(p.created_at)]
          ]
        });
      })
      .catch((err) => {
        api.showError(err);
        this.setData({ loading: false });
      });
  },

  back() {
    wx.navigateBack();
  },

  preview() {
    const p = this.data.photo;
    if (p) wx.previewImage({ urls: [p.public_url] });
  },

  copyLink() {
    wx.setClipboardData({ data: this.data.photo.public_url });
  },

  copyPath() {
    wx.setClipboardData({ data: this.data.photo.pathname });
  },

  toggleEdit() {
    this.setData({ editing: !this.data.editing });
  },

  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value });
  },
  onPublic(e) {
    this.setData({ 'form.is_public': e.detail.value });
  },
  onAlbum(e) {
    this.setData({ albumIndex: Number(e.detail.value) - 1 });
  },

  save() {
    // 批量修改接口要求的字段:tags 为字符串数组,不支持 album_id
    const tags = this.data.form.tags.split(/[,，]+/).map((s) => s.trim()).filter(Boolean);
    const data = {
      name: this.data.form.name,
      intro: this.data.form.intro,
      is_public: this.data.form.is_public,
      tags
    };

    // 相册变更走独立接口:先从原相册移除,再加入新相册
    const oldAlbums = (this.data.photo && this.data.photo.albums) || [];
    const oldAlbum = oldAlbums.length ? oldAlbums[0] : null;
    const newAlbum = this.data.albums[this.data.albumIndex];
    const albumChanged = (oldAlbum ? oldAlbum.id : 0) !== (newAlbum ? newAlbum.id : 0);

    let chain = api.updatePhoto(this.id, data);
    if (albumChanged) {
      chain = chain.then(() => {
        const tasks = [];
        if (oldAlbum) tasks.push(api.detachPhotosFromAlbum(oldAlbum.id, [Number(this.id)]));
        if (newAlbum) tasks.push(api.attachPhotosToAlbum(newAlbum.id, [Number(this.id)]));
        return Promise.all(tasks);
      });
    }

    chain
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' });
        this.setData({ editing: false });
        this.load();
      })
      .catch(api.showError);
  },

  del() {
    wx.showModal({
      title: '删除图片',
      content: '删除后无法恢复,确定删除这张图片吗?',
      confirmColor: '#ef4444',
      success: (r) => {
        if (r.confirm) {
          api.deletePhoto(this.id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 600);
          }).catch(api.showError);
        }
      }
    });
  },

  copyMd() {
    wx.setClipboardData({
      data: '![' + (this.data.photo.name || this.data.photo.filename) + '](' + this.data.photo.public_url + ')'
    });
  }
});

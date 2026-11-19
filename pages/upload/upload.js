const api = require('../../utils/api');

Page({
  data: {
    images: [], // {path, status: wait|uploading|done|fail, url, msg}
    storages: [],
    storageNames: [],
    storageIndex: 0,
    albums: [],
    albumNames: ['不放入相册'],
    albumIndex: -1,
    isPublic: false,
    intro: '',
    tags: '',
    uploading: false
  },

  onLoad() {
    const tasks = [api.getGroup()];
    if (api.isLogged()) tasks.push(api.getAlbums({ page: 1, per_page: 100 }));
    Promise.all(tasks)
      .then(([g, a]) => {
        const storages = (g.data && g.data.storages) || [];
        const albums = a ? a.data.data : [];
        this.setData({
          storages,
          storageNames: storages.map((s) => s.name),
          albums,
          albumNames: ['不放入相册'].concat(albums.map((x) => x.name))
        });
      })
      .catch(api.showError);
  },

  choose() {
    if (this.data.uploading) return;
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      success: (res) => {
        const items = res.tempFiles.map((f) => ({
          path: f.tempFilePath,
          status: 'wait',
          url: '',
          msg: ''
        }));
        this.setData({ images: this.data.images.concat(items) });
      }
    });
  },

  remove(e) {
    if (this.data.uploading) return;
    const i = e.currentTarget.dataset.index;
    const images = this.data.images.slice();
    images.splice(i, 1);
    this.setData({ images });
  },

  preview(e) {
    const url = e.currentTarget.dataset.url || e.currentTarget.dataset.path;
    wx.previewImage({ urls: [url] });
  },

  onStorage(e) {
    this.setData({ storageIndex: Number(e.detail.value) });
  },
  onAlbum(e) {
    this.setData({ albumIndex: Number(e.detail.value) - 1 });
  },
  onPublic(e) {
    this.setData({ isPublic: e.detail.value });
  },
  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  start() {
    if (this.data.uploading) return;
    const wait = this.data.images.filter((i) => i.status !== 'done');
    if (!wait.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.setData({ uploading: true });
    this.uploadNext();
  },

  setStatus(index, status, url, msg) {
    const key = 'images[' + index + ']';
    this.setData({
      [key + '.status']: status,
      [key + '.url']: url || '',
      [key + '.msg']: msg || ''
    });
  },

  uploadNext() {
    const images = this.data.images;
    const idx = images.findIndex((i) => i.status === 'wait');
    if (idx === -1) {
      const fail = images.filter((i) => i.status === 'fail').length;
      const ok = images.filter((i) => i.status === 'done').length;
      this.setData({ uploading: false });
      wx.showToast({
        title: fail ? '完成:' + ok + ' 张成功,' + fail + ' 张失败' : '全部上传成功',
        icon: 'none',
        duration: 2500
      });
      return;
    }
    this.setStatus(idx, 'uploading');
    const storage = this.data.storages[this.data.storageIndex];
    const album = this.data.albums[this.data.albumIndex];
    const tags = this.data.tags.split(/[,，\s]+/).filter(Boolean);

    const formData = {
      storage_id: storage ? storage.id : 1,
      is_public: this.data.isPublic ? '1' : '0',
      intro: this.data.intro || ''
    };
    if (album) formData.album_id = album.id;
    tags.forEach((t, i) => {
      formData['tags[' + i + ']'] = t;
    });

    wx.uploadFile({
      url: api.BASE_URL + '/upload',
      filePath: images[idx].path,
      name: 'file',
      formData,
      header: {
        Accept: 'application/json',
        Authorization: api.getToken() ? 'Bearer ' + api.getToken() : ''
      },
      success: (res) => {
        let body = {};
        try {
          body = JSON.parse(res.data);
        } catch (e) {}
        if (res.statusCode >= 200 && res.statusCode < 300 && body.data) {
          this.setStatus(idx, 'done', body.data.public_url);
        } else {
          let msg = body.message || '上传失败(' + res.statusCode + ')';
          if (body.data && body.data.errors) {
            const first = Object.values(body.data.errors)[0];
            if (Array.isArray(first) && first.length) msg = first[0];
          }
          this.setStatus(idx, 'fail', '', msg);
        }
      },
      fail: () => this.setStatus(idx, 'fail', '', '网络错误'),
      complete: () => this.uploadNext()
    });
  },

  copyUrl(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.setClipboardData({ data: url });
  },

  clearDone() {
    if (this.data.uploading) return;
    this.setData({ images: this.data.images.filter((i) => i.status !== 'done') });
  }
});

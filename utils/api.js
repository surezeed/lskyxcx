/**
 * WordImages 图床 API 封装
 * 文档: https://lsky-pro.apifox.cn/
 * 服务端: https://wordimges.com  (接口前缀 /api/v2)
 */
const BASE_URL = 'https://wordimges.com/api/v2';

function getToken() {
  return wx.getStorageSync('token') || '';
}

function setToken(token) {
  wx.setStorageSync('token', token);
}

function clearToken() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('profile');
}

function isLogged() {
  return !!getToken();
}

/**
 * 基础请求,返回 Promise
 * 成功(2xx) resolve 整个 body: { status, message, data, time }
 * 失败 reject body(含 message / data.errors)或 { message }
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: Object.assign(
        {
          Accept: 'application/json',
          Authorization: token ? 'Bearer ' + token : ''
        },
        options.header || {}
      ),
      success(res) {
        if (res.statusCode === 401) {
          clearToken();
          reject(res.data || { message: '登录已失效' });
          wx.showModal({
            title: '提示',
            content: '登录已失效,请重新登录',
            showCancel: false,
            confirmText: '去登录',
            success() {
              wx.reLaunch({ url: '/pages/login/login' });
            }
          });
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || { message: '请求失败(' + res.statusCode + ')' });
        }
      },
      fail() {
        reject({ message: '网络请求失败,请检查网络或域名白名单配置' });
      }
    });
  });
}

/** 从 reject 的错误对象中提取提示文案并 toast */
function showError(err) {
  let msg = '操作失败,请稍后重试';
  if (err) {
    if (err.data && err.data.errors) {
      const first = Object.values(err.data.errors)[0];
      if (Array.isArray(first) && first.length) msg = first[0];
    } else if (err.message) {
      msg = err.message;
    } else if (err.data && err.data.message) {
      msg = err.data.message;
    }
  }
  wx.showToast({ title: msg, icon: 'none', duration: 2500 });
}

const api = {
  BASE_URL,
  getToken,
  setToken,
  clearToken,
  isLogged,
  request,
  showError,

  // ---------- 授权 ----------
  login(data) {
    return request({ url: '/login', method: 'POST', data });
  },
  register(data) {
    return request({ url: '/register', method: 'POST', data });
  },
  logout() {
    return request({ url: '/logout', method: 'POST' });
  },

  // ---------- 用户 ----------
  getProfile() {
    return request({ url: '/user/profile' });
  },
  updateProfile(data) {
    return request({ url: '/user/profile', method: 'PUT', data });
  },

  // ---------- 组 / 储存 ----------
  getGroup() {
    return request({ url: '/group' });
  },

  // ---------- 图库 ----------
  getPhotos(params) {
    return request({ url: '/user/photos', data: params });
  },
  getPhoto(id) {
    return request({ url: '/user/photos/' + id });
  },
  /**
   * 修改图片信息:统一走批量接口 PUT /user/photos/update
   * (单条 PUT /user/photos/{id} 在服务端不存在,会 405)
   * body: { ids:[id], name, intro, is_public, tags:[] }
   */
  updatePhoto(id, data) {
    const body = Object.assign({ ids: [Number(id)] }, data);
    return request({
      url: '/user/photos/update',
      method: 'PUT',
      data: JSON.stringify(body),
      header: { 'content-type': 'application/json' }
    });
  },
  /** 添加图片到相册:POST /user/albums/{albumId}/photos,body 为图片 ID 数组 */
  attachPhotosToAlbum(albumId, photoIds) {
    return request({
      url: '/user/albums/' + albumId + '/photos',
      method: 'POST',
      data: JSON.stringify(photoIds),
      header: { 'content-type': 'application/json' }
    });
  },
  /** 从相册移除图片:DELETE /user/albums/{albumId}/photos,body 为图片 ID 数组 */
  detachPhotosFromAlbum(albumId, photoIds) {
    return request({
      url: '/user/albums/' + albumId + '/photos',
      method: 'DELETE',
      data: JSON.stringify(photoIds),
      header: { 'content-type': 'application/json' }
    });
  },
  /**
   * 删除图片:DELETE /user/photos,body 为图片 ID 数组(支持批量)
   * 传单个 id 或数组均可;body 手动序列化,避免 DELETE 方法下 data 序列化差异
   */
  deletePhoto(ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    return request({
      url: '/user/photos',
      method: 'DELETE',
      data: JSON.stringify(list),
      header: { 'content-type': 'application/json' }
    });
  },

  // ---------- 相册 ----------
  getAlbums(params) {
    return request({ url: '/user/albums', data: params });
  },
  getAlbum(id) {
    return request({ url: '/user/albums/' + id });
  },
  createAlbum(data) {
    return request({ url: '/user/albums', method: 'POST', data });
  },
  updateAlbum(id, data) {
    return request({ url: '/user/albums/' + id, method: 'PUT', data });
  },
  deleteAlbum(id, data) {
    return request({ url: '/user/albums/' + id, method: 'DELETE', data });
  },

  // ---------- 套餐 ----------
  getPlans(params) {
    return request({ url: '/plans', data: params });
  },
  getPlan(id) {
    return request({ url: '/plans/' + id });
  },

  // ---------- Tokens ----------
  getTokens(params) {
    return request({ url: '/user/tokens', data: params });
  },
  createToken(data) {
    return request({ url: '/user/tokens', method: 'POST', data });
  },
  deleteToken(id) {
    return request({ url: '/user/tokens/' + id, method: 'DELETE' });
  },
  getTokenPermissions() {
    return request({ url: '/token_permissions' });
  },

  // ---------- 工单 ----------
  getTickets(params) {
    return request({ url: '/user/tickets', data: params });
  },
  getTicket(issueNo) {
    return request({ url: '/user/tickets/' + issueNo });
  },
  createTicket(data) {
    return request({ url: '/user/tickets', method: 'POST', data });
  },
  getTicketReplies(issueNo, params) {
    return request({ url: '/user/tickets/' + issueNo + '/replies', data: params });
  },
  replyTicket(issueNo, data) {
    return request({ url: '/user/tickets/' + issueNo + '/reply', method: 'POST', data });
  },
  closeTicket(issueNo) {
    return request({ url: '/user/tickets/' + issueNo + '/close', method: 'PUT' });
  },
  deleteTicket(issueNo) {
    return request({ url: '/user/tickets/' + issueNo, method: 'DELETE' });
  },

  // ---------- 分享 ----------
  getShares(params) {
    return request({ url: '/user/shares', data: params });
  },
  getShare(id) {
    return request({ url: '/user/shares/' + id });
  },
  createShare(data) {
    return request({ url: '/user/shares', method: 'POST', data });
  },
  updateShare(id, data) {
    return request({ url: '/user/shares/' + id, method: 'PUT', data });
  },
  deleteShare(id) {
    return request({ url: '/user/shares/' + id, method: 'DELETE' });
  }
};

module.exports = api;

/** 通用工具函数 */

/** KB 起始的容量格式化(接口中 used_storage / total_storage 单位为 KB) */
function formatSize(kb) {
  if (kb === null || kb === undefined || isNaN(Number(kb))) return '-';
  let v = Number(kb);
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return v.toFixed(i === 0 ? 0 : 2) + ' ' + units[i];
}

/** ISO 时间转 yyyy-MM-dd HH:mm */
function formatDate(str) {
  if (!str) return '-';
  return str.replace('T', ' ').substring(0, 16);
}

module.exports = {
  formatSize,
  formatDate
};

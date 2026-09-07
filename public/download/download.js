(function() {
  var ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(ua)) {
    document.getElementById('windows-card').style.display = 'none';
    document.getElementById('android-card').style.display = '';
  }

  // 从 API 获取 Windows 下载信息
  fetch('/api/vars/win').then(function(r) { return r.json(); }).then(function(data) {
    var link = document.getElementById('win-download-link');
    if (data.WIN_DOWNLOAD_URL) link.href = data.WIN_DOWNLOAD_URL;
    var verEl = document.getElementById('win-ver');
    if (data.WIN_VERSION_NAME) verEl.textContent = 'v' + data.WIN_VERSION_NAME + ' · .exe';
  }).catch(function(e) { console.error('获取 Windows 版本信息失败:', e); });

  // 从 API 获取 Android 下载信息
  fetch('/api/vars/app').then(function(r) { return r.json(); }).then(function(data) {
    var link = document.getElementById('android-download-link');
    if (data.APP_DOWNLOAD_URL) link.href = data.APP_DOWNLOAD_URL;
    var verEl = document.getElementById('android-ver');
    if (data.APP_VERSION_NAME) verEl.textContent = 'v' + data.APP_VERSION_NAME + ' · .apk';
  }).catch(function(e) { console.error('获取 Android 版本信息失败:', e); });
})();
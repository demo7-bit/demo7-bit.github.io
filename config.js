// Настройки GitHub Releases.
// На стандартном адресе GitHub Pages репозиторий определяется автоматически.
// Для собственного домена укажите его вручную в формате "владелец/репозиторий".
// Создайте GitHub Release с тегом "beta" и загрузите APK с именем из GITHUB_APK_ASSET.
// Сайт сам найдёт файл в этом Release и покажет его download_count.
const GITHUB_REPOSITORY = "demo7-bit/demo7-bit.github.io";
const GITHUB_APK_ASSET = "vector-latest.apk";
const GITHUB_RELEASE_TAG = "beta";

// Дополнительные ссылки.
const SAMSUNG_URL = "";
const VEKKI_BOT_URL = "https://t.me/VekkiAI_Bot?start=_tgr_urrZQoI2MjAy";

window.VECTOR_CONFIG = Object.freeze({
  GITHUB_REPOSITORY,
  GITHUB_APK_ASSET,
  GITHUB_RELEASE_TAG,
  SAMSUNG_URL,
  VEKKI_BOT_URL,
});

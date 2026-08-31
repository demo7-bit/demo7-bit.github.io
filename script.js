(() => {
  "use strict";

  const config = window.VECTOR_CONFIG || {};

  const isSafeUrl = (url) => /^(https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(url);

  const setDownloadLink = (id, url, options = {}) => {
    const link = document.getElementById(id);
    if (!link) return;

    const cleanUrl = typeof url === "string" ? url.trim() : "";
    if (!cleanUrl || !isSafeUrl(cleanUrl)) {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      link.removeAttribute("download");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
      return;
    }

    link.href = cleanUrl;
    link.classList.add("is-ready");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("tabindex");

    if (options.directDownload) {
      link.setAttribute("download", "");
      link.setAttribute("aria-label", "Скачать актуальный APK Vector");
    } else {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  };

  setDownloadLink("samsung-download", config.SAMSUNG_URL);
  setDownloadLink("vekki-bot-link", config.VEKKI_BOT_URL);

  const apkLink = document.getElementById("apk-download");
  const apkButtonLabel = document.getElementById("apk-button-label");
  const apkSourceLabel = document.getElementById("apk-source-label");
  const countValue = document.getElementById("download-count-value");
  const countLabel = document.getElementById("download-count-label");
  const countNote = document.getElementById("download-count-note");
  const inferGitHubRepository = () => {
    const host = window.location.hostname.toLowerCase();
    if (!host.endsWith(".github.io")) return "";

    const owner = host.slice(0, -".github.io".length);
    const firstPathPart = window.location.pathname.split("/").filter(Boolean)[0];
    const repositoryName = firstPathPart || `${owner}.github.io`;
    return owner && repositoryName ? `${owner}/${repositoryName}` : "";
  };

  const configuredRepository = typeof config.GITHUB_REPOSITORY === "string" ? config.GITHUB_REPOSITORY.trim() : "";
  const repository = configuredRepository || inferGitHubRepository();
  const assetName = typeof config.GITHUB_APK_ASSET === "string" ? config.GITHUB_APK_ASSET.trim() : "";
  const releaseTag = typeof config.GITHUB_RELEASE_TAG === "string" ? config.GITHUB_RELEASE_TAG.trim() : "";
  const repositoryIsValid = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository);
  const assetIsValid = /^[A-Za-z0-9_.-]+\.apk$/i.test(assetName);
  const releaseTagIsValid = /^[A-Za-z0-9._-]+$/.test(releaseTag);

  const pluralizeDownloads = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "загрузка APK";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "загрузки APK";
    return "загрузок APK";
  };

  const setApkReady = (url) => {
    if (!apkLink || !isSafeUrl(url)) return;
    apkLink.href = url;
    apkLink.classList.add("is-ready");
    apkLink.removeAttribute("aria-disabled");
    apkLink.removeAttribute("tabindex");
    apkLink.setAttribute("aria-label", "Скачать актуальный APK Vector с GitHub Releases");
    if (apkButtonLabel) apkButtonLabel.textContent = "Скачать APK";
  };

  const setApkUnavailable = (message) => {
    if (apkLink) {
      apkLink.removeAttribute("href");
      apkLink.setAttribute("aria-disabled", "true");
      apkLink.setAttribute("tabindex", "-1");
    }
    if (apkButtonLabel) apkButtonLabel.textContent = "APK пока недоступен";
    if (countNote) countNote.textContent = message;
  };

  const loadLatestRelease = async () => {
    if (!repositoryIsValid || !assetIsValid) {
      setApkUnavailable("После публикации на GitHub Pages загрузка подключится автоматически.");
      return;
    }

    const releasePath = releaseTagIsValid ? `download/${encodeURIComponent(releaseTag)}` : "latest/download";
    const apiPath = releaseTagIsValid ? `tags/${encodeURIComponent(releaseTag)}` : "latest";
    const directUrl = `https://github.com/${repository}/releases/${releasePath}/${encodeURIComponent(assetName)}`;
    setApkReady(directUrl);

    try {
      const response = await fetch(`https://api.github.com/repos/${repository}/releases/${apiPath}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!response.ok) throw new Error(`GitHub API: ${response.status}`);

      const release = await response.json();
      const asset = Array.isArray(release.assets)
        ? release.assets.find((item) => item && item.name === assetName)
        : null;
      if (!asset || !isSafeUrl(asset.browser_download_url)) {
        throw new Error("APK не найден в последнем Release");
      }

      setApkReady(asset.browser_download_url);
      const downloads = Number.isFinite(asset.download_count) ? asset.download_count : 0;
      if (countValue) countValue.textContent = new Intl.NumberFormat("ru-RU").format(downloads);
      if (countLabel) countLabel.textContent = pluralizeDownloads(downloads);
      if (countNote) countNote.textContent = "Фактическое число скачиваний файла из GitHub Releases.";
      if (apkSourceLabel && release.name) apkSourceLabel.textContent = String(release.name).slice(0, 48);
    } catch (error) {
      if (countNote) countNote.textContent = "Счётчик временно недоступен. Скачивание продолжает работать через GitHub Releases.";
      console.warn("Vector: не удалось обновить счётчик загрузок.", error);
    }
  };

  loadLatestRelease();

  const preventContentTransfer = (event) => event.preventDefault();
  for (const eventName of ["copy", "cut", "selectstart", "dragstart"]) {
    document.addEventListener(eventName, preventContentTransfer);
  }
  document.querySelector(".logo-stage img")?.addEventListener("contextmenu", preventContentTransfer);
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ["a", "c", "x"].includes(key)) {
      event.preventDefault();
    }
  });

  const canvas = document.getElementById("interactive-background");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!canvas || reduceMotion.matches) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let visible = true;
  let points = [];

  const makePoints = () => {
    const count = Math.max(48, Math.min(90, Math.round(width / 18)));
    points = Array.from({ length: count }, (_, index) => ({
      x: (index * 89.37) % width,
      y: (index * 53.21) % height,
      vx: ((index % 5) - 2) * 0.045,
      vy: (((index + 2) % 5) - 2) * 0.04,
      size: 1.35 + (index % 3) * 0.65,
    }));
  };

  const resize = () => {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    makePoints();
  };

  const drawLine = (fromX, fromY, toX, toY, alpha) => {
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.strokeStyle = `rgba(234, 107, 23, ${alpha})`;
    context.lineWidth = 0.8;
    context.stroke();
  };

  const draw = () => {
    if (!visible) {
      frame = requestAnimationFrame(draw);
      return;
    }

    context.clearRect(0, 0, width, height);
    for (const point of points) {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < -10) point.x = width + 10;
      if (point.x > width + 10) point.x = -10;
      if (point.y < -10) point.y = height + 10;
      if (point.y > height + 10) point.y = -10;

      context.beginPath();
      context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
      context.fillStyle = "rgba(236, 130, 23, 0.23)";
      context.fill();

      if (pointer.active) {
        const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
        if (distance < 225) drawLine(point.x, point.y, pointer.x, pointer.y, (1 - distance / 225) * 0.2);
      }
    }

    if (pointer.active) {
      const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 150);
      glow.addColorStop(0, "rgba(234, 107, 23, 0.075)");
      glow.addColorStop(0.42, "rgba(234, 107, 23, 0.022)");
      glow.addColorStop(1, "rgba(234, 107, 23, 0)");
      context.fillStyle = glow;
      context.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);
      context.beginPath();
      context.arc(pointer.x, pointer.y, 21, 0, Math.PI * 2);
      context.strokeStyle = "rgba(236, 130, 23, 0.075)";
      context.lineWidth = 1;
      context.stroke();
    }

    frame = requestAnimationFrame(draw);
  };

  const updatePointer = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= width && pointer.y <= height;
  };

  resize();
  draw();
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("blur", () => { pointer.active = false; }, { passive: true });
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; }, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pagehide", () => cancelAnimationFrame(frame), { once: true });
})();

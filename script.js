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
      link.setAttribute("aria-label", "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0439 APK Vector");
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
  let lastReleaseCheck = 0;

  const pluralizeDownloads = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430 APK";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 APK";
    return "\u0437\u0430\u0433\u0440\u0443\u0437\u043e\u043a APK";
  };

  const setApkReady = (url) => {
    if (!apkLink || !isSafeUrl(url)) return;
    apkLink.href = url;
    apkLink.classList.add("is-ready");
    apkLink.removeAttribute("aria-disabled");
    apkLink.removeAttribute("tabindex");
    apkLink.setAttribute("aria-label", "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0439 APK Vector \u0441 GitHub Releases");
    if (apkButtonLabel) apkButtonLabel.textContent = "\u0421\u043a\u0430\u0447\u0430\u0442\u044c APK";
  };

  const setApkUnavailable = (message) => {
    if (apkLink) {
      apkLink.removeAttribute("href");
      apkLink.setAttribute("aria-disabled", "true");
      apkLink.setAttribute("tabindex", "-1");
    }
    if (apkButtonLabel) apkButtonLabel.textContent = "APK \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d";
    if (countNote) countNote.textContent = message;
  };

  const loadLatestRelease = async () => {
    if (!repositoryIsValid || !assetIsValid) {
      setApkUnavailable("\u041f\u043e\u0441\u043b\u0435 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u043d\u0430 GitHub Pages \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.");
      return;
    }

    const releasePath = releaseTagIsValid ? `download/${encodeURIComponent(releaseTag)}` : "latest/download";
    const apiPath = releaseTagIsValid ? `tags/${encodeURIComponent(releaseTag)}` : "latest";
    const directUrl = `https://github.com/${repository}/releases/${releasePath}/${encodeURIComponent(assetName)}`;
    setApkReady(directUrl);

    try {
      const apiUrl = `https://api.github.com/repos/${repository}/releases/${apiPath}?refresh=${Date.now()}`;
      const response = await fetch(apiUrl, {
        cache: "no-store",
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
        throw new Error("APK \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0432 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u043c Release");
      }

      setApkReady(asset.browser_download_url);
      const downloads = Number.isFinite(asset.download_count) ? asset.download_count : 0;
      if (countValue) countValue.textContent = new Intl.NumberFormat("ru-RU").format(downloads);
      if (countLabel) countLabel.textContent = pluralizeDownloads(downloads);
      if (countNote) countNote.textContent = "\u0424\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0447\u0438\u0441\u043b\u043e \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0439 \u0444\u0430\u0439\u043b\u0430 \u0438\u0437 GitHub Releases.";
      if (apkSourceLabel && release.name) apkSourceLabel.textContent = String(release.name).slice(0, 48);
    } catch (error) {
      if (countNote) countNote.textContent = "\u0421\u0447\u0451\u0442\u0447\u0438\u043a \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u0421\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0447\u0435\u0440\u0435\u0437 GitHub Releases.";
      console.warn("Vector: \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0441\u0447\u0451\u0442\u0447\u0438\u043a \u0437\u0430\u0433\u0440\u0443\u0437\u043e\u043a.", error);
    }
  };

  const refreshReleaseData = () => {
    const now = Date.now();
    if (now - lastReleaseCheck < 3000) return;
    lastReleaseCheck = now;
    loadLatestRelease();
  };

  refreshReleaseData();
  apkLink?.addEventListener("click", () => {
    window.setTimeout(refreshReleaseData, 8000);
    window.setTimeout(refreshReleaseData, 25000);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshReleaseData();
  }, { passive: true });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshReleaseData();
  }, { passive: true });
  window.addEventListener("focus", refreshReleaseData, { passive: true });
  window.setInterval(() => {
    if (!document.hidden) refreshReleaseData();
  }, 60000);

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

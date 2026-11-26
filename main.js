/* LE storefront interactions. Loaded with defer after the HTML is parsed. */
(() => {
  "use strict";

  const media = {
    compact: matchMedia("(max-width: 1099px)"),
    mobile: matchMedia("(max-width: 599px)"),
    hover: matchMedia("(hover: hover) and (pointer: fine)"),
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)"),
  };

  function initializeMobileNavigation() {
    const dialog = document.querySelector(".mobile-navigation");
    const toggle = document.querySelector(".mobile-navigation-toggle");
    if (!dialog || !toggle) return;

    const shop = dialog.querySelector(".mobile-navigation__shop");
    const summary = shop.querySelector("summary");
    let submenuAnimation;
    summary.setAttribute("aria-expanded", "false");
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      const startHeight = shop.getBoundingClientRect().height;
      const expand = summary.getAttribute("aria-expanded") !== "true";
      submenuAnimation?.cancel();
      shop.open = true;
      summary.setAttribute("aria-expanded", String(expand));
      const targetHeight = expand
        ? shop.getBoundingClientRect().height
        : summary.getBoundingClientRect().height;
      if (media.reducedMotion.matches || typeof shop.animate !== "function") {
        shop.open = expand;
        return;
      }
      const animation = shop.animate(
        [{ height: `${startHeight}px` }, { height: `${targetHeight}px` }],
        { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      submenuAnimation = animation;
      animation.finished
        .then(() => {
          shop.open = expand;
          submenuAnimation = undefined;
        })
        .catch(() => {});
    });
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      submenuAnimation?.cancel();
      shop.open = false;
      summary.setAttribute("aria-expanded", "false");
      dialog.showModal();
      toggle.setAttribute("aria-expanded", "true");
    });
    dialog
      .querySelector(".mobile-navigation__close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", (event) => {
      const bounds = dialog.getBoundingClientRect();
      const outside = event.clientX < bounds.left || event.clientX > bounds.right;
      if (event.target.closest("a") || outside) dialog.close();
    });
    media.compact.addEventListener("change", () => {
      if (!media.compact.matches && dialog.open) dialog.close();
    });
  }

  function initializeDesktopNavigation() {
    const header = document.querySelector(".site-header");
    const navigation = document.querySelector(".desktop-nav");
    if (!header || !navigation) return;
    const triggers = [...navigation.querySelectorAll("[aria-controls]")];

    function updateViewportWidth() {
      header.style.setProperty(
        "--viewport-width",
        `${document.documentElement.clientWidth}px`,
      );
    }
    function setDropdown(activeTrigger = null) {
      triggers.forEach((trigger) => {
        const isOpen = trigger === activeTrigger;
        trigger.setAttribute("aria-expanded", String(isOpen));
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        if (panel) panel.hidden = !isOpen;
      });
      header.classList.toggle("dropdown-open", Boolean(activeTrigger));
    }

    triggers.forEach((trigger) => {
      trigger.parentElement.addEventListener("pointerenter", (event) => {
        if (media.hover.matches && event.pointerType === "mouse") setDropdown(trigger);
      });
      trigger.addEventListener("click", (event) => {
        const isOpen = trigger.getAttribute("aria-expanded") === "true";
        if (event.detail && media.hover.matches && isOpen) return;
        setDropdown(isOpen ? null : trigger);
      });
    });
    navigation.querySelectorAll(":scope > a").forEach((link) => {
      link.addEventListener("pointerenter", () => setDropdown());
    });
    header.addEventListener("pointerleave", () => setDropdown());
    header.addEventListener("focusout", (event) => {
      if (!header.contains(event.relatedTarget)) setDropdown();
    });
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const trigger = triggers.find(
        (item) => item.getAttribute("aria-expanded") === "true",
      );
      if (trigger) {
        setDropdown();
        trigger.focus();
      }
    });
    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) setDropdown();
    });
    document.addEventListener("pointerdown", (event) => {
      if (!header.contains(event.target)) setDropdown();
    });
    media.compact.addEventListener("change", () => setDropdown());
    window.addEventListener("resize", updateViewportWidth, { passive: true });
    updateViewportWidth();
  }

  function initializeAnnouncement() {
    const bar = document.querySelector(".announcement-bar");
    const link = bar?.querySelector(".announcement-bar__link");
    if (!bar || !link) return;
    const messages = [
      { text: "26 FALL WINTER DROP", href: "#collection" },
      { text: "BLACK FRIDAY SALE !", href: "#sale" },
      { text: "무료 배송 안내", href: "https://le-official.co.kr/shopinfo/guide.html" },
    ];
    const rotationInterval = 4000;
    const fadeDuration = 150;
    let index = 0;
    let intervalId;
    let fadeId;
    let isHovered = false;
    let isFocused = false;

    function schedule() {
      clearInterval(intervalId);
      clearTimeout(fadeId);
      link.classList.remove("is-changing");
      if (
        bar.hidden ||
        media.reducedMotion.matches ||
        document.hidden ||
        isHovered ||
        isFocused
      )
        return;
      intervalId = setInterval(() => {
        link.classList.add("is-changing");
        fadeId = setTimeout(() => {
          index = (index + 1) % messages.length;
          link.textContent = messages[index].text;
          link.href = messages[index].href;
          link.classList.remove("is-changing");
        }, fadeDuration);
      }, rotationInterval);
    }
    bar.addEventListener("pointerenter", (event) => {
      if (!media.hover.matches || event.pointerType !== "mouse") return;
      isHovered = true;
      schedule();
    });
    bar.addEventListener("pointerleave", () => {
      isHovered = false;
      schedule();
    });
    bar.addEventListener("focusin", () => {
      isFocused = true;
      schedule();
    });
    bar.addEventListener("focusout", (event) => {
      if (!bar.contains(event.relatedTarget)) {
        isFocused = false;
        schedule();
      }
    });
    bar.querySelector(".announcement-bar__close").addEventListener("click", () => {
      bar.hidden = true;
      schedule();
    });
    media.compact.addEventListener("change", schedule);
    media.reducedMotion.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", schedule);
    schedule();
  }

  function initializeHeroCarousel() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const slides = [...hero.querySelectorAll("[data-slide]")];
    const controls = [...hero.querySelectorAll("[data-go]")];
    const toggle = hero.querySelector(".hero__toggle");
    const pauseIcon = toggle.firstElementChild;
    const playIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    playIcon.setAttribute("viewBox", "0 0 16 16");
    playIcon.setAttribute("width", "16");
    playIcon.setAttribute("height", "16");
    playIcon.setAttribute("aria-hidden", "true");
    const playPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    playPath.setAttribute("d", "M5 3.5 12 8l-7 4.5Z");
    playPath.setAttribute("fill", "currentColor");
    playIcon.append(playPath);
    let activeIndex = 0;
    let isPlaying = !media.reducedMotion.matches;
    let isInView = true;
    let isHovered = false;
    let isFocused = false;
    let intervalId;
    let touchOrigin;

    function showSlide(index) {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, position) => {
        const isHidden = position !== activeIndex;
        slide.setAttribute("aria-hidden", String(isHidden));
        slide.inert = isHidden;
      });
      controls.forEach((control, position) => {
        control.setAttribute("aria-pressed", String(position === activeIndex));
      });
    }
    function schedule() {
      clearInterval(intervalId);
      const menuIsOpen = Boolean(document.querySelector("dialog[open]"));
      if (
        isPlaying &&
        isInView &&
        !document.hidden &&
        !isHovered &&
        !isFocused &&
        !menuIsOpen
      ) {
        intervalId = setInterval(() => showSlide(activeIndex + 1), 5500);
      }
    }
    function updatePlayback() {
      toggle.replaceChildren(isPlaying ? pauseIcon : playIcon);
      toggle.setAttribute(
        "aria-label",
        isPlaying ? "자동 재생 일시정지" : "자동 재생 시작",
      );
      schedule();
    }
    controls.forEach((control, index) => {
      control.addEventListener("click", () => {
        showSlide(index);
        schedule();
      });
    });
    toggle.addEventListener("click", () => {
      isPlaying = !isPlaying;
      updatePlayback();
    });
    hero.addEventListener("pointerenter", (event) => {
      if (media.hover.matches && event.pointerType === "mouse") {
        isHovered = true;
        schedule();
      }
    });
    hero.addEventListener("pointerleave", () => {
      isHovered = false;
      schedule();
    });
    hero.addEventListener("focusin", () => {
      isFocused = true;
      schedule();
    });
    hero.addEventListener("focusout", (event) => {
      if (!hero.contains(event.relatedTarget)) {
        isFocused = false;
        schedule();
      }
    });
    hero.addEventListener(
      "touchstart",
      (event) => {
        touchOrigin = event.changedTouches[0];
      },
      { passive: true },
    );
    hero.addEventListener(
      "touchend",
      (event) => {
        if (!touchOrigin) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchOrigin.clientX;
        const dy = touch.clientY - touchOrigin.clientY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          showSlide(activeIndex + (dx < 0 ? 1 : -1));
          schedule();
        }
        touchOrigin = undefined;
      },
      { passive: true },
    );
    hero.addEventListener(
      "touchcancel",
      () => {
        touchOrigin = undefined;
      },
      { passive: true },
    );
    media.reducedMotion.addEventListener("change", () => {
      isPlaying = !media.reducedMotion.matches;
      updatePlayback();
    });
    document.addEventListener("visibilitychange", schedule);
    document
      .querySelectorAll("dialog")
      .forEach((dialog) => dialog.addEventListener("toggle", schedule));
    new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      schedule();
    }).observe(hero);
    showSlide(0);
    updatePlayback();
  }

  function initializeProductImages() {
    document.querySelectorAll(".product-card__alternate-image").forEach((image) => {
      const card = image.closest(".product-card");
      const markReady = () => {
        if (image.naturalWidth > 0) card?.classList.add("is-alternate-ready");
      };
      if (image.complete) markReady();
      else image.addEventListener("load", markReady, { once: true });
    });
  }

  function initializeFooter() {
    const groups = [...document.querySelectorAll(".footer details")];
    function synchronize() {
      groups.forEach((group) => {
        group.open = !media.mobile.matches;
      });
    }
    groups.forEach((group) => {
      group.querySelector("summary").addEventListener("click", (event) => {
        if (!media.mobile.matches) event.preventDefault();
      });
    });
    media.mobile.addEventListener("change", synchronize);
    synchronize();
  }

  function initializeSearch() {
    const dialog = document.querySelector(".product-search");
    if (!dialog) return;
    const form = dialog.querySelector("form");
    const input = dialog.querySelector("input");
    const results = dialog.querySelector(".product-search__results");
    const status = dialog.querySelector(".product-search__status");
    let opener;
    let restoreFocus = true;
    document.querySelectorAll(".search-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        opener = button;
        restoreFocus = true;
        dialog.showModal();
        input.focus();
      });
    });
    dialog
      .querySelector(".product-search__close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      if (restoreFocus) opener?.focus({ preventScroll: true });
    });
    dialog
      .querySelector(".product-search__suggestion")
      .addEventListener("click", (event) => {
        input.value = event.currentTarget.dataset.query;
        form.requestSubmit();
      });
    dialog
      .querySelector(".product-search__logo")
      .addEventListener("click", () => dialog.close());
    const aliases = {
      "퍼 재킷": ["fur"],
      니트: ["sweater", "knit"],
      코트: ["coat"],
      패딩: ["padded", "puffer", "down"],
      재킷: ["jacket"],
      자켓: ["jacket"],
      아우터: ["jacket", "coat", "padded", "puffer", "down"],
    };
    const cards = [...document.querySelectorAll(".product-card")];
    cards.forEach((card, index) => {
      if (!card.id) card.id = `product-card-${index + 1}`;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim().toLocaleLowerCase();
      results.replaceChildren();
      if (!query) {
        status.textContent = "검색어를 입력해주세요.";
        input.focus();
        return;
      }
      const words = aliases[query] || [query];
      const seen = new Set();
      const matches = cards.filter((card) => {
        const title = card.querySelector("h3").textContent.trim();
        if (
          !card.getClientRects().length ||
          seen.has(title) ||
          !words.some((word) => title.toLocaleLowerCase().includes(word))
        )
          return false;
        seen.add(title);
        return true;
      });
      status.textContent = matches.length
        ? `검색 결과 ${matches.length}개`
        : "일치하는 상품이 없습니다. 다른 상품명이나 종류로 검색해보세요.";
      matches.forEach((card) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${card.id}`;
        link.textContent = `${card.querySelector("h3").textContent.trim()} · ${card.querySelector(".product-price").textContent.trim()}`;
        link.addEventListener("click", () => {
          restoreFocus = false;
          dialog.close();
          card.tabIndex = -1;
          card.focus({ preventScroll: true });
        });
        item.append(link);
        results.append(item);
      });
    });
  }

  initializeSearch();
  initializeMobileNavigation();
  initializeDesktopNavigation();
  initializeAnnouncement();
  initializeHeroCarousel();
  initializeProductImages();
  initializeFooter();
})();

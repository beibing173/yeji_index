/* ==========================================================================
   野鸡私立大学 — 脚本
   模块：状态判断 / 导航 / 平滑滚动 / 打字机 / 计数器 / 滚动动画 / 实时状态 / 彩蛋
   ========================================================================== */
(function () {
  'use strict';

  /* 0. 环境与依赖判断 */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';

  if (hasGsap && hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  var mobileNav = document.getElementById('mobileNav');
  var navOverlay = document.getElementById('navOverlay');

  /* 1. 导航：滚动状态 */
  var onScrollHeader = function () {
    if (window.scrollY > 12) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* 2. 导航：移动端抽屉（状态挂在 body 上，避免被 header 的 backdrop-filter 影响） */
  var openNav = function () {
    document.body.classList.add('nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', '关闭菜单');
    mobileNav.setAttribute('aria-hidden', 'false');
  };

  var closeNav = function () {
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '打开菜单');
    mobileNav.setAttribute('aria-hidden', 'true');
  };

  navToggle.addEventListener('click', function () {
    if (document.body.classList.contains('nav-open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  navOverlay.addEventListener('click', closeNav);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeNav();
      navToggle.focus();
    }
  });

  /* 3. 平滑滚动（桌面端 Lenis，移动端原生） */
  var navHeight = header ? header.offsetHeight : 68;
  var lenis = null;

  if (hasLenis && !reducedMotion && window.matchMedia('(min-width: 1024px)').matches) {
    try {
      lenis = new Lenis({
        duration: 1.1,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });

      if (hasGsap && hasScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      } else {
        var rafLoop = function (time) {
          lenis.raf(time);
          requestAnimationFrame(rafLoop);
        };
        requestAnimationFrame(rafLoop);
      }
    } catch (err) {
      lenis = null;
    }
  }

  var scrollToTarget = function (target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: -(navHeight + 12) });
    } else {
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id.length <= 1) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeNav();
      scrollToTarget(target);
      if (history && history.pushState) {
        history.pushState(null, '', id);
      }
    });
  });

  /* 4. 打字机效果 */
  var typingEl = document.getElementById('typingText');
  if (typingEl && !reducedMotion) {
    var fullText = typingEl.textContent;
    typingEl.textContent = '';
    var typeIndex = 0;
    var typeWriter = function () {
      if (typeIndex <= fullText.length) {
        typingEl.textContent = fullText.slice(0, typeIndex);
        typeIndex += 1;
        setTimeout(typeWriter, 55);
      }
    };
    setTimeout(typeWriter, 600);
  }

  /* 5. 数字统计滚动 */
  var animateCounter = function (el) {
    var target = parseInt(el.getAttribute('data-target'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1800;
    var start = null;

    var step = function (timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);
      el.textContent = value.toLocaleString('en-US') + (progress >= 1 ? suffix : '');
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  var counters = document.querySelectorAll('.counter');
  if (counters.length && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-target'), 10) || 0;
          var suffix = el.getAttribute('data-suffix') || '';
          if (reducedMotion) {
            el.textContent = target.toLocaleString('en-US') + suffix;
          } else {
            animateCounter(el);
          }
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { counterObserver.observe(c); });
  }

  /* 6. 滚动与加载动画（GSAP + ScrollTrigger） */
  if (hasGsap && hasScrollTrigger && !reducedMotion) {
    try {
      // 6a. 首页加载动画：标题逐行上移 + 淡入
      gsap.from(['.hero__title-line', '.hero__title-en'], {
        y: 26,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.14,
        delay: 0.15
      });

      gsap.from(['.hero__kicker', '.hero__typing', '.hero__intro', '.hero__actions', '.hero__panel'], {
        y: 24,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.4
      });

      // 6b. 滚动进入视口时的位移 + 淡入
      var scrollEls = gsap.utils.toArray('[data-reveal]').filter(function (el) {
        if (!el.closest('.hero')) return true;
        return el.classList.contains('stats');
      });

      scrollEls.forEach(function (el) {
        gsap.from(el, {
          y: 26,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            once: true
          }
        });
      });

      ScrollTrigger.refresh();

      window.addEventListener('load', function () {
        ScrollTrigger.refresh();
      });

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          ScrollTrigger.refresh();
        });
      }
    } catch (err) {
      // 动画失败时保持内容可见，不影响交互
    }
  }

  /* 7. 校园实时状态（模拟数据） */
  var siteStatus = document.getElementById('siteStatus');
  var studentCount = document.getElementById('studentCount');

  if (siteStatus) {
    var states = [
      { text: '运行中', cls: 'status-row__value--ok' },
      { text: '有点卡', cls: 'status-row__value--warn' },
      { text: '正在重启', cls: 'status-row__value--warn' },
      { text: '正常', cls: 'status-row__value--ok' },
      { text: '负载过高', cls: 'status-row__value--warn' }
    ];
    setInterval(function () {
      var s = states[Math.floor(Math.random() * states.length)];
      siteStatus.textContent = s.text;
      siteStatus.className = 'status-row__value ' + s.cls;
    }, 5000);
  }

  if (studentCount) {
    setInterval(function () {
      var count = Math.floor(Math.random() * 10000) + 90000;
      studentCount.textContent = count.toLocaleString('en-US') + '+';
    }, 3000);
  }

  /* 8. 彩蛋：连点校徽三次 */
  var brand = document.getElementById('brand');
  var modal = document.getElementById('easterEgg');
  var clickCount = 0;
  var clickTimer = null;

  var openModal = function () {
    if (!modal) return;
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var btn = modal.querySelector('[data-close]');
    if (btn) btn.focus();
  };

  var closeModal = function () {
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (brand) brand.focus();
  };

  if (brand && modal) {
    brand.addEventListener('click', function () {
      clickCount += 1;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(function () { clickCount = 0; }, 1200);
      if (clickCount >= 3) {
        clickCount = 0;
        openModal();
      }
    });
  }

  if (modal) {
    modal.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-visible')) {
        closeModal();
      }
    });
  }
})();

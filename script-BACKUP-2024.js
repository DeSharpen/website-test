/* ============================================================
   PART 0 — SHARED GLOW HELPERS (DOM clone = perfect size match)
   ============================================================ */
   var glowHost    = document.getElementById("viewsHover");   // whole line
   var glowCounter = document.getElementById("viewsCount");   // rolling digits
   
   function rebuildGlow() {
     if (!glowHost) return null;
     var old = glowHost.querySelector(".views-glow-layer");
     if (old) old.remove();
   
     var clone = glowHost.cloneNode(true);
     clone.className = "views-glow-layer";
     clone.removeAttribute("id");
     clone.setAttribute("aria-hidden", "true");
   
     var nested = clone.querySelector(".views-glow-layer");
     if (nested) nested.remove();
     clone.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });
   
     clone.querySelectorAll(".digit").forEach(function (cell) {
       if (cell.classList.contains("comma")) return;
       var strip = cell.querySelector(".digit-strip");
       var val = 0;
       if (strip) {
         var m = (strip.style.transform || "").match(/-(\d+)em/);
         val = m ? parseInt(m[1], 10) : 0;
       }
       cell.innerHTML = "";
       cell.textContent = String(val);
     });
   
     glowHost.appendChild(clone);
     return clone;
   }
   
   
   /* ============================================================
      PART 1 — SCROLL VIDEO INTRO
      ============================================================ */
   (function () {
     "use strict";
   
     var DESKTOP_VIDEO_SOURCE = "intro.mp4";
     var MOBILE_VIDEO_SOURCE = "intromobile.mp4";
     var MOBILE_BREAKPOINT = 767;
     var SCROLL_LENGTH_MULTIPLIER = 190;
     var AUTO_PLAYBACK_RATE = 1;
     var AUTO_START_DELAY = 100;
     var AUTOSCROLL_END_OFFSET = 1;
     var JUMP_BEHAVIOR = "auto";
     var STORY_ANCHOR_ID = "story";
   
     var loader = document.getElementById("loader");
     var video = document.getElementById("scrubVideo");
     var scrollZone = document.getElementById("scrollZone");
     var overlay = document.getElementById("videoOverlay");
   
     var ready = false;
     var autoPlayActive = false;
     var autoPlayRaf = null;
     var currentVideoSource = "";
     var hasJumped = false;
     var VIDEO_END_TIME = 12;
     var AUTOSCROLL_END_TIME = 11;
   
     if ("scrollRestoration" in history) history.scrollRestoration = "manual";
     window.scrollTo(0, 0);
   
     if (!video) {
       console.error('Could not find <video id="scrubVideo">.');
       hideLoader();
       return;
     }
   
     video.muted = true;
     video.playsInline = true;
     video.setAttribute("muted", "");
     video.setAttribute("playsinline", "");
     video.setAttribute("webkit-playsinline", "");
     video.preload = "auto";
   
     function hideLoader() {
       if (!loader) return;
       loader.classList.add("is-hidden");
       setTimeout(function () {
         if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
       }, 600);
     }
   
     function isMobile() { return window.innerWidth <= MOBILE_BREAKPOINT; }
     function getCorrectVideoSource() { return isMobile() ? MOBILE_VIDEO_SOURCE : DESKTOP_VIDEO_SOURCE; }
   
     function setScrollZoneHeight() {
       if (!scrollZone) return;
       scrollZone.style.height = AUTOSCROLL_END_TIME * SCROLL_LENGTH_MULTIPLIER + "px";
     }
   
     function getVideoTimeFromScroll() {
       var t = Math.max(0, window.scrollY) / SCROLL_LENGTH_MULTIPLIER;
       return Math.max(0, Math.min(AUTOSCROLL_END_TIME, t));
     }
     function getScrollYFromVideoTime(t) { return Math.max(0, t * SCROLL_LENGTH_MULTIPLIER); }
   
     function updateOverlay(time) {
       if (!overlay) return;
       overlay.style.opacity = String(Math.max(0, 1 - Math.min(1, time / 2)));
     }
   
     function jumpToStory() {
      if (hasJumped) return;
      hasJumped = true;
      console.trace("🚨 jumpToStory was called from here:");   // ⬅️ ADD THIS LINE
      var story = document.getElementById(STORY_ANCHOR_ID);
      if (story) story.scrollIntoView({ behavior: JUMP_BEHAVIOR });
    }
  
   
     function applyTimeline(time, seek) {
       time = Math.max(0, Math.min(VIDEO_END_TIME, time));
       updateOverlay(time);
       if (!seek) return;
       var safe = Math.min(time, Math.max(0, video.duration - 0.02));
       if (Math.abs(video.currentTime - safe) > 0.025) {
         try { video.currentTime = safe; } catch (e) {}
       }
     }
   
     function updateVideoFromScroll() {
       if (!ready || autoPlayActive) return;
       applyTimeline(getVideoTimeFromScroll(), true);
     }
   
     function stopNaturalAutoPlay() {
       if (!autoPlayActive) return;
       autoPlayActive = false;
       if (autoPlayRaf) { cancelAnimationFrame(autoPlayRaf); autoPlayRaf = null; }
       video.pause();
       updateVideoFromScroll();
     }
   
     function runNaturalAutoPlay() {
       if (!autoPlayActive) return;
       var t = Math.max(0, video.currentTime);
       var scrollTime = Math.min(t, AUTOSCROLL_END_TIME);
       updateOverlay(scrollTime);
       window.scrollTo(0, getScrollYFromVideoTime(scrollTime));
       if (t >= AUTOSCROLL_END_TIME) {
         autoPlayActive = false;
         autoPlayRaf = null;
         video.pause();
         jumpToStory();
         return;
       }
       autoPlayRaf = requestAnimationFrame(runNaturalAutoPlay);
     }
   
     function startNaturalAutoPlay() {
       if (!ready || autoPlayActive) return;
       window.scrollTo(0, 0);
       try {
         video.pause();
         video.currentTime = 0;
         video.playbackRate = AUTO_PLAYBACK_RATE;
         updateOverlay(0);
         autoPlayActive = true;
         var p = video.play();
         if (p && typeof p.then === "function") {
           p.then(function () {
             if (!autoPlayActive) return;
             autoPlayRaf = requestAnimationFrame(runNaturalAutoPlay);
           }).catch(function () {
             autoPlayActive = false;
             updateVideoFromScroll();
           });
         } else {
           autoPlayRaf = requestAnimationFrame(runNaturalAutoPlay);
         }
       } catch (e) {
         autoPlayActive = false;
         updateVideoFromScroll();
       }
     }
   
     function loadCorrectVideo() {
       var next = getCorrectVideoSource();
       if (currentVideoSource === next) return;
       currentVideoSource = next;
       ready = false;
       autoPlayActive = false;
       if (autoPlayRaf) { cancelAnimationFrame(autoPlayRaf); autoPlayRaf = null; }
       video.pause();
       video.removeAttribute("src");
       video.load();
       video.src = next;
       video.load();
     }
   
     function startExperience() {
       if (ready) return;
       if (!video.duration || !isFinite(video.duration)) return;
       VIDEO_END_TIME = video.duration;
       AUTOSCROLL_END_TIME = Math.max(1, VIDEO_END_TIME - AUTOSCROLL_END_OFFSET);
       ready = true;
       hasJumped = false;
       setScrollZoneHeight();
       window.scrollTo(0, 0);
       updateOverlay(0);
       hideLoader();
       setTimeout(startNaturalAutoPlay, AUTO_START_DELAY);
     }
   
     video.addEventListener("loadedmetadata", startExperience);
     video.addEventListener("canplay", startExperience);
   
     video.addEventListener("ended", function () {
       if (autoPlayActive) {
         autoPlayActive = false;
         if (autoPlayRaf) { cancelAnimationFrame(autoPlayRaf); autoPlayRaf = null; }
         video.pause();
       }
       jumpToStory();
     });
   
     video.addEventListener("error", function () {
       console.error("Could not load video:", currentVideoSource);
       hideLoader();
     });
   
     window.addEventListener("scroll", updateVideoFromScroll, { passive: true });
   
     function userSkip() {
       if (!autoPlayActive) return;
       stopNaturalAutoPlay();
       // ✅ FIX: removed jumpToStory() — manual scroll now scrubs the video
       //         instead of instantly jumping to the story section.
     }
     window.addEventListener("wheel", userSkip, { passive: true });
     window.addEventListener("touchstart", userSkip, { passive: true });
     window.addEventListener("pointerdown", userSkip, { passive: true });
     window.addEventListener("keydown", function (e) {
       var keys = ["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," ","Spacebar"];
       if (keys.indexOf(e.key) !== -1) userSkip();
     });
   
     var prevMobile = isMobile();
     window.addEventListener("resize", function () {
       var nowMobile = isMobile();
       setScrollZoneHeight();
       if (nowMobile !== prevMobile) {
         prevMobile = nowMobile;
         window.scrollTo(0, 0);
         loadCorrectVideo();
       }
     });
   
     loadCorrectVideo();
     setTimeout(function () { if (!ready) hideLoader(); }, 7000);
   })();
   
   
   /* ============================================================
      PART 2 — LIVE VIEWS COUNTER (rolling digits)
      ============================================================ */
   (function () {
     "use strict";
   
     var container = document.getElementById("viewsCount");
     if (!container) return;
   
     var START_NUMBER = 398029023;
     var START_DATE = new Date("2026-07-18T00:00:00Z").getTime();
     var VIEWS_PER_STEP = 17;
     var STEP_MS = 7000;
     var REFRESH_MS = 5000;
   
     var digitCells = {};
   
     function getBaseCount() {
       var elapsed = Date.now() - START_DATE;
       if (elapsed < 0) return START_NUMBER;
       return Math.floor(START_NUMBER + (elapsed / STEP_MS) * VIEWS_PER_STEP);
     }
     function formatted(n) { return Math.floor(n).toLocaleString("en-US"); }
   
     function createDigit() {
       var cell = document.createElement("span");
       cell.className = "digit";
       var strip = document.createElement("span");
       strip.className = "digit-strip";
       for (var i = 0; i <= 9; i++) {
         var s = document.createElement("span");
         s.textContent = i;
         strip.appendChild(s);
       }
       cell.appendChild(strip);
       return { el: cell, strip: strip };
     }
     function setDigit(cell, value) {
       cell.strip.style.transform = "translateY(-" + value + "em)";
       cell.value = value;
     }
   
     function buildLayout(str) {
       container.innerHTML = "";
       digitCells = {};
       for (var i = 0; i < str.length; i++) {
         var ch = str[i];
         if (ch === ",") {
           var comma = document.createElement("span");
           comma.className = "digit comma";
           comma.textContent = ",";
           container.appendChild(comma);
         } else {
           var d = createDigit();
           container.appendChild(d.el);
           digitCells[i] = d;
           setDigit(d, parseInt(ch, 10));
         }
       }
       container.dataset.len = str.length;
   
       if (typeof rebuildGlow === "function") rebuildGlow();
     }
   
     function update() {
       var str = formatted(getBaseCount());
   
       if (container.dataset.len !== String(str.length)) {
         buildLayout(str);
         return;
       }
   
       for (var i = 0; i < str.length; i++) {
         var ch = str[i];
         if (ch === ",") continue;
         var cell = digitCells[i];
         if (!cell) continue;
         var newVal = parseInt(ch, 10);
         if (cell.value !== newVal) {
           setDigit(cell, newVal);
           cell.el.classList.remove("rolling");
           void cell.el.offsetWidth;
           cell.el.classList.add("rolling");
         }
       }
   
       if (typeof rebuildGlow === "function") rebuildGlow();
     }
   
     var started = false;
     function start() {
       if (started) return;
       started = true;
       buildLayout(formatted(getBaseCount()));
       window.setInterval(update, REFRESH_MS);
     }
   
     var section = document.getElementById("views");
     if ("IntersectionObserver" in window && section) {
       var obs = new IntersectionObserver(function (entries) {
         entries.forEach(function (e) {
           if (e.isIntersecting) { start(); obs.disconnect(); }
         });
       }, { threshold: 0.3 });
       obs.observe(section);
     } else {
       start();
     }
   
     buildLayout(formatted(getBaseCount()));
   })();
   
   
   /* ============================================================
      PART 3 — CURSOR-FOLLOW PURPLE GLOW
      ============================================================ */
   (function () {
     "use strict";
     if (!glowHost) return;
   
     var cs = getComputedStyle(glowHost);
     if (cs.position === "static") glowHost.style.position = "relative";
   
     rebuildGlow();
   
     glowHost.addEventListener("pointermove", function (e) {
       var clone = glowHost.querySelector(".views-glow-layer");
       if (!clone) return;
       var rect = clone.getBoundingClientRect();
       clone.style.setProperty("--mx", (e.clientX - rect.left) + "px");
       clone.style.setProperty("--my", (e.clientY - rect.top) + "px");
     });
   
     glowHost.addEventListener("pointerleave", function () {
       var clone = glowHost.querySelector(".views-glow-layer");
       if (!clone) return;
       clone.style.setProperty("--mx", "-999px");
       clone.style.setProperty("--my", "-999px");
     });
   })();
   
   
   /* ============================================================
      PART 4 — REVEAL NUMBER WHEN SECTION SCROLLS INTO VIEW
      ============================================================ */
   (function () {
     "use strict";
     if (!glowHost) return;
     var sec = document.getElementById("views");
   
     if ("IntersectionObserver" in window && sec) {
       var o = new IntersectionObserver(function (entries) {
         entries.forEach(function (e) {
           if (e.isIntersecting) {
             glowHost.classList.add("is-visible");
             o.disconnect();
           }
         });
       }, { threshold: 0.3 });
       o.observe(sec);
     } else {
       glowHost.classList.add("is-visible");
     }
   })();
   
   
   /* Reveal the views number on scroll (fade in + zoom out) */
   (function () {
     var num = document.querySelector(".views-number");
     if (!num) return;
   
     var observer = new IntersectionObserver(
       function (entries) {
         entries.forEach(function (entry) {
           if (entry.isIntersecting) {
             num.classList.add("is-visible");
           } else {
             num.classList.remove("is-visible");
           }
         });
       },
       { threshold: 0.4 }
     );
   
     observer.observe(num);
   })();
   
   
   /* Reveal story texts on scroll (fade in + zoom out) */
   (function () {
     var items = document.querySelectorAll(
       ".story-title, .story-text, .story-tagline"
     );
     if (!items.length) return;
   
     var observer = new IntersectionObserver(
       function (entries) {
         entries.forEach(function (entry) {
           if (entry.isIntersecting) {
             entry.target.classList.add("is-visible");
           } else {
             entry.target.classList.remove("is-visible");
           }
         });
       },
       { threshold: 0.35 }
     );
   
     items.forEach(function (el) {
       observer.observe(el);
     });
   })();

(function () {
    "use strict";
  
    /*
      VIDEO FILES
    */
    var DESKTOP_VIDEO_SOURCE = "intro.mp4";
    var MOBILE_VIDEO_SOURCE = "intromobile.mp4";
    var MOBILE_BREAKPOINT = 767;
  
    /*
      SCROLL SPEED
      Higher number = longer scroll distance for the video.
    */
    var SCROLL_LENGTH_MULTIPLIER = 190;
  
    /*
      ORIGINAL DESKTOP TIMING RATIOS
  
      Desktop original:
      video duration = 12s
      exit starts at = 10.5s
      content starts at = 11s
  
      These ratios are used so mobile video timing scales correctly.
    */
    var EXIT_START_RATIO = 9.5 / 10;
    var CONTENT_START_RATIO = 9 / 11;
  
    /*
      AUTOPLAY SETTINGS
    */
    var AUTO_PLAYBACK_RATE = 1;
    var AUTO_START_DELAY = 500;
  
    var loader = document.getElementById("loader");
    var video = document.getElementById("scrubVideo");
    var scrollZone = document.getElementById("scrollZone");
    var videoStage = document.querySelector(".video-stage");
    var overlay = document.getElementById("videoOverlay");
  
    var ready = false;
    var autoPlayActive = false;
    var autoPlayRaf = null;
    var currentVideoSource = "";
  
    var VIDEO_END_TIME = 12;
    var VIDEO_EXIT_START_TIME = 8.5;
    var CONTENT_SCROLL_START_TIME = 9;
  
    /*
      Always start every visit from the top.
    */
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  
    window.scrollTo(0, 0);
  
    if (!video) {
      console.error('Could not find <video id="scrubVideo">.');
      hideLoader();
      return;
    }
  
    /*
      Required for browser autoplay, especially mobile.
    */
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
  
    function hideLoader() {
      if (!loader) return;
  
      loader.classList.add("is-hidden");
  
      window.setTimeout(function () {
        if (loader && loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 600);
    }
  
    function isMobile() {
      return window.innerWidth <= MOBILE_BREAKPOINT;
    }
  
    function getCorrectVideoSource() {
      return isMobile()
        ? MOBILE_VIDEO_SOURCE
        : DESKTOP_VIDEO_SOURCE;
    }
  
    function setScrollZoneHeight() {
      if (!scrollZone) return;
  
      /*
        The page height must include enough space for the whole video timeline.
      */
      scrollZone.style.height =
        window.innerHeight +
        VIDEO_END_TIME * SCROLL_LENGTH_MULTIPLIER +
        "px";
    }
  
    /*
      Scroll animation starts from the first scroll pixel.
  
      scrollY = 0      => video time 0
      scrollY = 190    => video time 1s
      scrollY = 380    => video time 2s
    */
    function getVideoTimeFromScroll() {
      var scrollAmount = Math.max(0, window.scrollY);
      var time = scrollAmount / SCROLL_LENGTH_MULTIPLIER;
  
      return Math.max(0, Math.min(VIDEO_END_TIME, time));
    }
  
    function getScrollYFromVideoTime(time) {
      return Math.max(0, time * SCROLL_LENGTH_MULTIPLIER);
    }
  
    function updateOverlay(time) {
      if (!overlay) return;
  
      /*
        Fade overlay during the first 2 seconds.
      */
      var opacity = Math.max(0, 1 - Math.min(1, time / 2));
      overlay.style.opacity = String(opacity);
    }
  
    function updateVideoExit(time) {
      if (!videoStage) return;
  
      /*
        VERY IMPORTANT:
  
        The video stage must NOT move up before VIDEO_EXIT_START_TIME.
  
        Example desktop:
        0s    - 10.5s  => video stays fixed
        10.5s - 12s    => video moves upward
        scroll back up => video moves back down
      */
      var exitDuration = VIDEO_END_TIME - VIDEO_EXIT_START_TIME;
  
      if (exitDuration <= 0) {
        exitDuration = 0.01;
      }
  
      var progress = (time - VIDEO_EXIT_START_TIME) / exitDuration;
  
      progress = Math.max(0, Math.min(1, progress));
  
      videoStage.style.transform =
        "translate3d(0, -" + progress * 100 + "%, 0)";
    }
  
    function applyTimeline(time, shouldSeekVideo) {
      time = Math.max(0, Math.min(VIDEO_END_TIME, time));
  
      updateOverlay(time);
      updateVideoExit(time);
  
      if (!shouldSeekVideo) return;
  
      /*
        Avoid seeking exactly past the last decodable video frame.
      */
      var safeTime = Math.min(
        time,
        Math.max(0, video.duration - 0.02)
      );
  
      if (Math.abs(video.currentTime - safeTime) > 0.025) {
        try {
          video.currentTime = safeTime;
        } catch (error) {
          console.warn("Could not seek video:", error);
        }
      }
    }
  
    /*
      Manual scroll control.
    */
    function updateVideoFromScroll() {
      if (!ready || autoPlayActive) return;
  
      var time = getVideoTimeFromScroll();
  
      /*
        Manual scrolling controls:
        - video frame
        - overlay
        - exit scroll-up animation
      */
      applyTimeline(time, true);
    }
  
    function stopNaturalAutoPlay() {
      if (!autoPlayActive) return;
  
      autoPlayActive = false;
  
      if (autoPlayRaf) {
        cancelAnimationFrame(autoPlayRaf);
        autoPlayRaf = null;
      }
  
      video.pause();
  
      /*
        Immediately give control to scroll position.
      */
      updateVideoFromScroll();
    }
  
    /*
      Automatic playback.
      The video plays normally, and the page scroll follows its currentTime.
    */
    function runNaturalAutoPlay() {
      if (!autoPlayActive) return;
  
      var currentTime = Math.max(
        0,
        Math.min(video.currentTime, VIDEO_END_TIME)
      );
  
      /*
        Auto play uses the same timeline as manual scroll,
        including the correct exit timing.
      */
      applyTimeline(currentTime, false);
  
      window.scrollTo(
        0,
        getScrollYFromVideoTime(currentTime)
      );
  
      if (
        currentTime >= VIDEO_END_TIME - 0.03 ||
        video.ended
      ) {
        autoPlayActive = false;
        autoPlayRaf = null;
        video.pause();
        return;
      }
  
      autoPlayRaf = requestAnimationFrame(runNaturalAutoPlay);
    }
  
    function startNaturalAutoPlay() {
      if (!ready || autoPlayActive) return;
  
      /*
        Always start homepage animation from the first frame.
      */
      window.scrollTo(0, 0);
  
      try {
        video.pause();
        video.currentTime = 0;
        video.playbackRate = AUTO_PLAYBACK_RATE;
  
        applyTimeline(0, false);
  
        autoPlayActive = true;
  
        var playPromise = video.play();
  
        if (playPromise && typeof playPromise.then === "function") {
          playPromise
            .then(function () {
              if (!autoPlayActive) return;
  
              autoPlayRaf = requestAnimationFrame(runNaturalAutoPlay);
            })
            .catch(function (error) {
              /*
                If autoplay is blocked, manual scroll still works.
              */
              console.warn("Autoplay was blocked:", error);
  
              autoPlayActive = false;
              updateVideoFromScroll();
            });
        } else {
          autoPlayRaf = requestAnimationFrame(runNaturalAutoPlay);
        }
      } catch (error) {
        console.warn("Could not start autoplay:", error);
  
        autoPlayActive = false;
        updateVideoFromScroll();
      }
    }
  
    function loadCorrectVideo() {
      var nextSource = getCorrectVideoSource();
  
      if (currentVideoSource === nextSource) return;
  
      currentVideoSource = nextSource;
      ready = false;
      autoPlayActive = false;
  
      if (autoPlayRaf) {
        cancelAnimationFrame(autoPlayRaf);
        autoPlayRaf = null;
      }
  
      video.pause();
      video.removeAttribute("src");
      video.load();
  
      video.src = nextSource;
      video.load();
    }
  
    function startExperience() {
      if (ready) return;
  
      if (!video.duration || !isFinite(video.duration)) return;
  
      /*
        Use the real duration of desktop/mobile video.
      */
      VIDEO_END_TIME = video.duration;
  
      /*
        Preserve your original exit timing proportion.
  
        Desktop example:
        duration = 12s
        exit starts = 10.5s
  
        Mobile example:
        if duration = 10s
        exit starts = 8.75s
      */
      VIDEO_EXIT_START_TIME = VIDEO_END_TIME * EXIT_START_RATIO;
      CONTENT_SCROLL_START_TIME = VIDEO_END_TIME * CONTENT_START_RATIO;
  
      ready = true;
  
      setScrollZoneHeight();
  
      /*
        Force first page open at the top.
      */
      window.scrollTo(0, 0);
  
      applyTimeline(0, false);
  
      hideLoader();
  
      /*
        Start automatic playback without button.
      */
      window.setTimeout(function () {
        startNaturalAutoPlay();
      }, AUTO_START_DELAY);
    }
  
    /*
      VIDEO EVENTS
    */
    video.addEventListener("loadedmetadata", startExperience);
    video.addEventListener("canplay", startExperience);
  
    video.addEventListener("ended", function () {
      if (autoPlayActive) {
        autoPlayActive = false;
  
        if (autoPlayRaf) {
          cancelAnimationFrame(autoPlayRaf);
          autoPlayRaf = null;
        }
  
        video.pause();
      }
    });
  
    video.addEventListener("error", function () {
      console.error("Could not load video:", currentVideoSource);
      hideLoader();
    });
  
    /*
      MANUAL SCROLL CONTROL
    */
    window.addEventListener(
      "scroll",
      function () {
        updateVideoFromScroll();
      },
      { passive: true }
    );
  
    /*
      If the visitor interacts, autoplay stops.
      Then the visitor can fully control the animation manually.
    */
    window.addEventListener(
      "wheel",
      function () {
        stopNaturalAutoPlay();
      },
      { passive: true }
    );
  
    window.addEventListener(
      "touchstart",
      function () {
        stopNaturalAutoPlay();
      },
      { passive: true }
    );
  
    window.addEventListener(
      "pointerdown",
      function () {
        stopNaturalAutoPlay();
      },
      { passive: true }
    );
  
    window.addEventListener("keydown", function (event) {
      var scrollKeys = [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        " ",
        "Spacebar"
      ];
  
      if (scrollKeys.indexOf(event.key) !== -1) {
        stopNaturalAutoPlay();
      }
    });
  
    /*
      Resize handling.
      Only reload video if changing between desktop/mobile.
    */
    var previousMobileState = isMobile();
  
    window.addEventListener("resize", function () {
      var newMobileState = isMobile();
  
      setScrollZoneHeight();
  
      if (newMobileState !== previousMobileState) {
        previousMobileState = newMobileState;
  
        window.scrollTo(0, 0);
        loadCorrectVideo();
      }
    });
  
    /*
      Start.
    */
    loadCorrectVideo();
  
    /*
      Safety fallback.
    */
    window.setTimeout(function () {
      if (!ready) {
        hideLoader();
      }
    }, 7000);
  })();
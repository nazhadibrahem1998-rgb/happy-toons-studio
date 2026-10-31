/* CrazyGames HTML5 SDK v3 bridge for Happy Toons: Toonblade.
   © 2026 Nazhad Ibrahem – Happy Toons Studio. All rights reserved.
   Loaded only by the CrazyGames build. GitHub Pages does not include this file. */
(function () {
  'use strict';
  window.__TOONBLADE_BUILD = 'crazygames';

  var trace = [];
  var sdkReady = false;
  var lastCall = {};
  var tails = {};
  var boot;

  function mark(name) { trace.push(name); }

  function envOk() {
    try {
      var env = window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.environment;
      return env === 'local' || env === 'crazygames';
    } catch (e) {
      return false;
    }
  }

  function callGame(method) {
    if (!sdkReady) return;
    // The SDK logs a console error if the same call repeats inside 1s. Queue instead of dropping.
    var prev = tails[method] || Promise.resolve();
    tails[method] = prev.then(function () {
      return new Promise(function (resolve) {
        var wait = lastCall[method] ? Math.max(0, 1100 - (Date.now() - lastCall[method])) : 0;
        setTimeout(function () {
          lastCall[method] = Date.now();
          try {
            var game = window.CrazyGames.SDK.game;
            if (game && typeof game[method] === 'function') {
              game[method]();
              mark(method);
            }
          } catch (e) { mark(method + ':error'); }
          resolve();
        }, wait);
      });
    });
  }

  function hideOutbound() {
    var anchors = document.querySelectorAll('a[href]');
    for (var i = 0; i < anchors.length; i++) {
      var href = anchors[i].getAttribute('href') || '';
      if (/^https?:/i.test(href) || href.indexOf('//') === 0) anchors[i].remove();
    }
    var marked = document.querySelectorAll('[data-outbound], .buymeacoffee, .bmc, a[href*="buymeacoffee"], a[href*="fiverr"], a[href*="tiktok"], a[href*="itch.io"], a[href*="github.io"]');
    for (var j = 0; j < marked.length; j++) marked[j].remove();
    mark('hideOutbound');
  }

  boot = new Promise(function (resolve) {
    function start() {
      var init = window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.init;
      if (typeof init !== 'function') { mark('init:missing'); resolve(); return; }
      Promise.resolve().then(function () { return init.call(window.CrazyGames.SDK); }).then(function () {
        sdkReady = envOk();
        mark(sdkReady ? 'init:' + window.CrazyGames.SDK.environment : 'init:off');
        if (sdkReady) callGame('loadingStart');
        hideOutbound();
        resolve();
      }).catch(function () {
        sdkReady = false;
        mark('init:error');
        resolve();
      });
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
  });

  function afterReady(fn) {
    boot.then(fn).catch(function () {});
  }

  window.__toonbladePortal = {
    trace: trace,
    hideOutbound: function () { afterReady(hideOutbound); },
    loadingStop: function () { afterReady(function () { callGame('loadingStop'); }); },
    gameplayStart: function () { afterReady(function () { callGame('gameplayStart'); }); },
    gameplayStop: function () { afterReady(function () { callGame('gameplayStop'); }); },
    happytime: function () { afterReady(function () { callGame('happytime'); }); },
    onAdStarted: null,
    onAdEnded: null,
    requestAd: function (type) {
      return boot.then(function () {
        return new Promise(function (resolve) {
          if (!sdkReady) { mark('ad:skip:' + type); resolve('skip'); return; }
          var done = false;
          function finish(result) {
            if (done) return;
            done = true;
            mark('ad:' + result + ':' + type);
            try { if (typeof window.__toonbladePortal.onAdEnded === 'function') window.__toonbladePortal.onAdEnded(); } catch (e) {}
            resolve(result);
          }
          try {
            window.CrazyGames.SDK.ad.requestAd(type, {
              adStarted: function () {
                mark('ad:started:' + type);
                try { if (typeof window.__toonbladePortal.onAdStarted === 'function') window.__toonbladePortal.onAdStarted(); } catch (e) {}
              },
              adFinished: function () { finish('finished'); },
              adError: function () { finish('error'); },
            });
          } catch (e) {
            finish('error');
            return;
          }
          setTimeout(function () { finish('error'); }, 90000);
        });
      });
    },
  };
})();

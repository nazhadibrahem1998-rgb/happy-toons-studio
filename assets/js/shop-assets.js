/**
 * Asset-pack shop band for Happy Toons Studio.
 * Prices and URLs checked from the public itch.io store and Payhip
 * on 24 November 2026 (UK). itch packs are pay-what-you-want with
 * the listed minimum. Music is sold on itch only.
 */
(function () {
  var IMG = "assets/img/shop-assets/";
  var SALE_ENDS = "1 December 2026, 23:59 UK";

  var PRODUCTS = [
    {
      id: "music-bundle",
      group: "Bundles",
      tag: "Music bundle",
      name: "Cozy & Rainy Lo-Fi Music Bundle",
      blurb: "Hearthhop and Nightpane together: winter and late-night rainy loops for games, streams and video.",
      image: IMG + "hearthhop.png",
      featured: true,
      itch: { url: "https://itch.io/s/217669/cozy-rainy-lo-fi-music-bundle", price: 4.5, regular: 6, pwyw: false },
      itchOnly: true
    },
    {
      id: "circuit-complete",
      group: "Bundles",
      tag: "UI bundle",
      name: "Circuit Neon Complete",
      blurb: "The UI kit, 160 neon icons and the chiptune / arcade audio pack, together.",
      image: IMG + "cn-ui.png",
      featured: false,
      itch: { url: "https://itch.io/s/217334/circuit-neon-complete", price: 6.75, regular: 9, pwyw: false },
      itchOnly: true
    },
    {
      id: "diner",
      group: "Pixel and UI",
      tag: "Pixel interior",
      name: "Isometric 24h Diner — Pixel Interior Pack",
      blurb: "All-night retro diner in 2:1 isometric pixel art: 92 sprites, booths, neon and a jukebox.",
      image: IMG + "diner.gif",
      featured: true,
      itch: { url: "https://happytoonsstudio.itch.io/isometric-24h-diner", price: 4, regular: 5, pwyw: true },
      payhip: { url: "https://payhip.com/b/jROkf", price: 4, regular: 5, pwyw: true }
    },
    {
      id: "arcade-juice",
      group: "Pixel and UI",
      tag: "VFX",
      name: "Arcade Juice — 300 Pixel Art VFX",
      blurb: "300 pixel-art VFX sheets (60 animations in 5 colours): hits, slashes, explosions and sparks.",
      image: IMG + "arcade-juice.png",
      featured: true,
      itch: { url: "https://happytoonsstudio.itch.io/arcade-juice-300-pixel-art-vfx", price: 2.4, regular: 3, pwyw: true },
      payhip: { url: "https://payhip.com/b/HzpPe", price: 3, pwyw: false }
    },
    {
      id: "quest-loot",
      group: "Pixel and UI",
      tag: "Icons",
      name: "Quest Loot — 623 Pixel Item Icons",
      blurb: "623 original 16×16 item icons plus a 32×32 set: weapons, armour, potions, food and tools.",
      image: IMG + "quest-loot.gif",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/quest-loot-623-pixel-item-icons", price: 2.4, regular: 3, pwyw: true },
      payhip: { url: "https://payhip.com/b/sv8W0", price: 3, pwyw: false }
    },
    {
      id: "typebit",
      group: "Pixel and UI",
      tag: "Fonts",
      name: "Typebit — 6 Pixel Game Fonts",
      blurb: "Six original pixel fonts (TTF, PNG atlas and BMFont) for HUDs, dialogue, scores and menus.",
      image: IMG + "typebit.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/typebit-6-pixel-game-fonts", price: 2.4, regular: 3, pwyw: true },
      payhip: { url: "https://payhip.com/b/CYEsN", price: 3, pwyw: false }
    },
    {
      id: "neon-station",
      group: "Pixel and UI",
      tag: "Tileset",
      name: "Neon Station — 16×16 Sci-Fi Tileset",
      blurb: "16×16 side-view cyberpunk tileset: floors, wall autotiles, platforms, doors, pipes and a parallax city.",
      image: IMG + "neon-station.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/neon-station-16x16-sci-fi-tileset", price: 2.4, regular: 3, pwyw: true },
      payhip: { url: "https://payhip.com/b/kOw5D", price: 3, pwyw: false }
    },
    {
      id: "frostfair",
      group: "Pixel and UI",
      tag: "Tileset",
      name: "Frostfair — Winter Pixel Assets",
      blurb: "189 snowy 16×16 tiles, 60 winter VFX sheets and 99 festive icons for indie holiday games.",
      image: IMG + "frostfair.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/frostfair-winter-pixel-assets", price: 2.4, regular: 3, pwyw: true },
      itchOnly: true
    },
    {
      id: "cn-ui",
      group: "Pixel and UI",
      tag: "UI kit",
      name: "Circuit Neon UI Kit — Neon HUD + UI Sounds",
      blurb: "A neon sci-fi UI kit: 134 interface pieces and 24 UI sounds for indie game HUDs and menus.",
      image: IMG + "cn-ui.png",
      featured: true,
      itch: { url: "https://happytoonsstudio.itch.io/circuit-neon-ui-kit-neon-hud-ui-sounds", price: 2.4, regular: 3, pwyw: true },
      itchOnly: true
    },
    {
      id: "cn-icons",
      group: "Pixel and UI",
      tag: "Icons",
      name: "Circuit Neon Icon Pack — 160 Neon Game Icons",
      blurb: "160 neon sci-fi game icons in PNG 32/64/128 and SVG. Pairs with the Circuit Neon UI Kit.",
      image: IMG + "cn-icons.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/circuit-neon-icon-pack", price: 2.4, regular: 3, pwyw: true },
      itchOnly: true
    },
    {
      id: "cn-audio",
      group: "Music",
      tag: "Audio",
      name: "Circuit Neon Audio Pack — Chiptune Loops + Arcade SFX",
      blurb: "8 neon-arcade music loops and 50 gameplay sound effects. Pairs with the Circuit Neon UI Kit.",
      image: IMG + "cn-audio.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/circuit-neon-audio-pack", price: 2.4, regular: 3, pwyw: true },
      itchOnly: true
    },
    {
      id: "hearthhop",
      group: "Music",
      tag: "Lo-fi",
      name: "Hearthhop — Cozy Winter Lo-Fi Loops",
      blurb: "13 seamless winter lo-fi loops and 3 hooks for games and videos.",
      image: IMG + "hearthhop.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/hearthhop-cozy-winter-lo-fi-loops", price: 2.4, regular: 3, pwyw: true },
      itchOnly: true
    },
    {
      id: "nightpane",
      group: "Music",
      tag: "Lo-fi",
      name: "Nightpane — Late-Night Rainy Lo-Fi",
      blurb: "12 late-night rainy lo-fi tracks and 12 seamless loops for games, streams and videos.",
      image: IMG + "nightpane.png",
      featured: false,
      itch: { url: "https://happytoonsstudio.itch.io/nightpane-late-night-rainy-lo-fi", price: 2.4, regular: 3, pwyw: true },
      itchOnly: true
    }
  ];

  function money(n) {
    if (Math.abs(n - Math.round(n)) < 1e-9) return "$" + Math.round(n);
    return "$" + n.toFixed(2);
  }

  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function priceBlock(p) {
    var itch = p.itch;
    var sale = itch.regular && itch.regular > itch.price;
    var label = itch.pwyw ? "From " + money(itch.price) : money(itch.price);
    var html = '<div class="sa-price">';
    html += '<span class="sa-now">' + label + "</span>";
    if (sale) html += '<span class="sa-was">' + money(itch.regular) + "</span>";
    if (sale) {
      var pct = Math.round((1 - itch.price / itch.regular) * 100);
      html += '<span class="sa-badge">' + pct + "% off on itch</span>";
    }
    html += "</div>";
    if (p.payhip) {
      var pp = p.payhip.pwyw ? "From " + money(p.payhip.price) : money(p.payhip.price);
      var extra = "";
      if (p.payhip.regular && p.payhip.regular > p.payhip.price) {
        extra = " <span class=\"sa-was\">" + money(p.payhip.regular) + "</span>";
      }
      html += '<p class="sa-note">Payhip: ' + pp + extra + "</p>";
    } else if (p.itchOnly) {
      html += '<p class="sa-note">Sold on itch.io only</p>';
    }
    return html;
  }

  function actions(p) {
    var html = '<div class="sa-actions">';
    html += '<a class="sa-btn sa-btn-main" href="' + p.itch.url + '" target="_blank" rel="noopener">Buy on itch.io</a>';
    if (p.payhip) {
      html += '<a class="sa-btn" href="' + p.payhip.url + '" target="_blank" rel="noopener">Buy on Payhip</a>';
    }
    html += "</div>";
    return html;
  }

  function card(p, heading) {
    var h = heading || "h3";
    return (
      '<article class="sa-card">' +
      '<a class="sa-art" href="' + p.itch.url + '" target="_blank" rel="noopener">' +
      '<img src="' + p.image + '" alt="" width="315" height="220" loading="lazy">' +
      "</a>" +
      '<div class="sa-body">' +
      '<div class="sa-tag">' + p.tag + "</div>" +
      "<" + h + ">" + p.name + "</" + h + ">" +
      '<p class="sa-blurb">' + p.blurb + "</p>" +
      priceBlock(p) +
      actions(p) +
      "</div></article>"
    );
  }

  function saleBar() {
    return (
      '<p class="sa-sale">On itch.io, asset packs are <strong>20% off</strong> until ' +
      SALE_ENDS +
      '. Buy all 11 packs for <strong>$24</strong> <span class="sa-was" style="color:#94a3b8">$35</span>. ' +
      '<a href="https://itch.io/s/218212/game-off-season-20-off-asset-packs" target="_blank" rel="noopener">View the sale</a></p>'
    );
  }

  function renderTeaser(root) {
    var featured = PRODUCTS.filter(function (p) { return p.featured; });
    root.classList.add("shop-assets--teaser");
    root.innerHTML =
      '<div class="wrap">' +
      '<div class="sa-head"><div>' +
      '<div class="sa-kicker">Asset packs</div>' +
      "<h2>Game assets and music</h2>" +
      '<p class="sa-lead">Pixel packs, UI kits and lo-fi music for indie games and video. Checkout is on itch.io, and on Payhip where the pack is listed there. Music is sold on itch.io only.</p>' +
      "</div></div>" +
      saleBar() +
      '<div class="sa-grid">' + featured.map(function (p) { return card(p, "h3"); }).join("") + "</div>" +
      '<p class="sa-more"><a href="shop.html#asset-packs">All asset packs and bundles →</a></p>' +
      "</div>";
  }

  function renderFull(root) {
    var groups = [];
    PRODUCTS.forEach(function (p) {
      if (groups.indexOf(p.group) === -1) groups.push(p.group);
    });
    var sections = groups.map(function (g) {
      var items = PRODUCTS.filter(function (p) { return p.group === g; });
      return (
        '<div class="sa-group">' +
        "<h3>" + g + "</h3>" +
        '<div class="sa-grid">' + items.map(function (p) { return card(p, "h4"); }).join("") + "</div>" +
        "</div>"
      );
    }).join("");
    root.classList.add("shop-assets--on-shop");
    root.innerHTML =
      '<div class="wrap">' +
      '<div class="sa-head"><div>' +
      '<div class="sa-kicker">Asset packs</div>' +
      "<h2>Game assets and music</h2>" +
      '<p class="sa-lead">Buy on itch.io, or on Payhip when a Payhip listing exists. Music and audio packs are sold on itch.io only. itch.io prices are a minimum — you can pay more if you want to. Prices checked 24 November 2026.</p>' +
      "</div></div>" +
      saleBar() +
      sections +
      '<p class="sa-foot">Full catalogues: <a href="https://happytoonsstudio.itch.io/" target="_blank" rel="noopener">itch.io</a> and <a href="https://payhip.com/HappyToonsStudio" target="_blank" rel="noopener">Payhip</a>.</p>' +
      "</div>";
  }

  function init() {
    var nodes = document.querySelectorAll("[data-shop-assets]");
    for (var i = 0; i < nodes.length; i++) {
      var mode = nodes[i].getAttribute("data-shop-assets") || "full";
      if (mode === "teaser") renderTeaser(nodes[i]);
      else renderFull(nodes[i]);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

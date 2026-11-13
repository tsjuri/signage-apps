/* Background photo for any signage app (added by build.mjs).
 * ?background=<file in media/backgrounds/> puts that image behind the app:
 * the app's own full-screen backdrop layers are found on the running page and
 * made see-through, the image goes behind them, and a wash (dark behind light
 * text, light behind dark text) keeps the text readable. */
;(function () {
  var file = new URLSearchParams(location.search).get('background')
  if (!file) return
  var root = document.documentElement
  var bg = document.createElement('div')
  bg.id = 'signage-bg'
  bg.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background:#000 center/cover no-repeat;background-image:url("../media/backgrounds/' + encodeURIComponent(file) + '")'
  var wash = document.createElement('div')
  wash.style.cssText = 'position:absolute;inset:0'
  bg.appendChild(wash)
  document.body.appendChild(bg)
  root.style.background = '#000'

  var lum = function (c) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c || '')
    return m ? (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 : 1
  }
  var painted = function (cs) {
    return cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)
  }
  function clear() {
    var W = innerWidth, H = innerHeight, seen = []
    ;[[0.5, 0.5], [0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.5, 0.1], [0.5, 0.9]].forEach(function (p) {
      document.elementsFromPoint(W * p[0], H * p[1]).forEach(function (el) {
        if (seen.indexOf(el) >= 0 || el === bg || bg.contains(el)) return
        seen.push(el)
        var r = el.getBoundingClientRect()
        if (r.width < W * 0.9 || r.height < H * 0.9) return // only full-screen layers
        var cs = getComputedStyle(el)
        if (painted(cs)) { el.style.setProperty('background', 'transparent', 'important') }
      })
    })
    document.body.style.setProperty('background', 'transparent', 'important')
    // Light text gets a dark wash, dark text a light one.
    // Judge by the biggest visible text on screen (the headline).
    var best = null, size = 0
    document.querySelectorAll('h1, h2, h3, p, time, span, div').forEach(function (el) {
      if (!el.firstChild || el.firstChild.nodeType !== 3 || el.textContent.trim().length < 3) return // skip decorative marks like “
      var cs = getComputedStyle(el)
      var r = el.getBoundingClientRect()
      if (r.width === 0 || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return
      var fs = parseFloat(cs.fontSize)
      if (fs > size) { size = fs; best = cs }
    })
    var text = (best || getComputedStyle(document.body)).color
    wash.style.background = lum(text) > 0.55
      ? 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(0,0,0,.6), rgba(0,0,0,.35))'
      : 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(255,255,255,.72), rgba(255,255,255,.45))'
  }
  // Apps draw at different moments; check a few times.
  clear()
  ;[300, 1200, 3000].forEach(function (t) { setTimeout(clear, t) })
})()

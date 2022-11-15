import React from 'react'

export default async function Head() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="utf-8" />
      <title>Sustainability Map</title>
      {/* Google Tag Manager */}
      {/* <script>
        ;(function (w, d, s, l, i) {
          w[l] = w[l] || []
          w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
          var f = d.getElementsByTagName(s)[0],
            j = d.createElement(s),
            dl = l != 'dataLayer' ? '&l=' + l : ''
          j.async = true
          j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
          f.parentNode.insertBefore(j, f)
        })(window, document, 'script', 'dataLayer', 'GTM-M3XKRGF')
      </script> */}
      {/* End Google Tag Manager */}
      <meta name="viewport" content="initial-scale=1,width=device-width,maximum-scale=1,user-scalable=no" />

      <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png" />
      {/* <link rel="manifest" href="favicon/site.webmanifest"> */}
      <link rel="manifest" href="manifest.json" />

      <link rel="mask-icon" href="favicon/safari-pinned-tab.svg" color="#5bbad5" />
      <link rel="shortcut icon" href="favicon/favicon.ico" />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="msapplication-TileImage" content="favicon/mstile-144x144.png" />
      <meta name="msapplication-config" content="favicon/browserconfig.xml" />
      <meta name="theme-color" content="#ffffff" />

      <meta property="og:type" content="website" />
      <meta property="og:title" content="Avoin Map" />
      <meta property="og:description" content="Helping you improve carbon balance. See it here!" />
      <meta property="og:image:height" content="102" />
      <meta property="og:image:width" content="932" />
      <meta property="og:url" content="https://avoinmap.org/" />
      <meta property="og:image" content="https://avoinmap.org/og-image.jpg?v=2" />
      <meta name="facebook-domain-verification" content="ob9uoavh9ht9brv2p1z19ggg19l4ci" />
      {/* <link rel="stylesheet" href="src/app.css" /> */}

      {/* The line below is only needed for old environments like Internet Explorer and Android 4.x */}
      {/* <script
        nomodule
        src="https://polyfill.io/v3/polyfill.min.js?features=Object.entries%2CObject.assign%2CElement.prototype.toggleAttribute%2CrequestAnimationFrame%2CElement.prototype.classList%2CURL%2Cfetch"
      ></script> */}
      {/* geocoder 4.x is buggy in dealing with bboxes... */}
      {/* <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v3.1.6/mapbox-gl-geocoder.min.js"></script> */}
      <meta name="facebook-domain-verification" content="ki0cgxhpn6oeqmda2lz4fj8uxn5f2m" />
      {/* <script>
        !(function (w, d, t) {
          w.TiktokAnalyticsObject = t
          var ttq = (w[t] = w[t] || [])
          ;(ttq.methods = [
            'page',
            'track',
            'identify',
            'instances',
            'debug',
            'on',
            'off',
            'once',
            'ready',
            'alias',
            'group',
            'enableCookie',
            'disableCookie',
          ]),
            (ttq.setAndDefer = function (t, e) {
              t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
              }
            })
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
          ;(ttq.instance = function (t) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n])
            return e
          }),
            (ttq.load = function (e, n) {
              var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'
              ;(ttq._i = ttq._i || {}),
                (ttq._i[e] = []),
                (ttq._i[e]._u = i),
                (ttq._t = ttq._t || {}),
                (ttq._t[e] = +new Date()),
                (ttq._o = ttq._o || {}),
                (ttq._o[e] = n || {})
              var o = document.createElement('script')
              ;(o.type = 'text/javascript'), (o.async = !0), (o.src = i + '?sdkid=' + e + '&lib=' + t)
              var a = document.getElementsByTagName('script')[0]
              a.parentNode.insertBefore(o, a)
            })

          ttq.load('C5OMEVCVNBDLN9M598B0')
          ttq.page()
        })(window, document, 'ttq')
      </script> */}

      {/* <link
        rel="stylesheet"
        href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v3.1.6/mapbox-gl-geocoder.css"
        type="text/css"
      /> */}
      {/* <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500&display=swap" rel="stylesheet" /> */}
    </>
  )
}

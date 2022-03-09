---
layout: post
title: Securing Go web applications
---

There are lots of security-related things to keep in mind when writing a web application, as the Web is a place full of danger: cross-site scripting (XSS), cross-site request forgery (CSRF), clickjacking, brute forcing, spam and so on.

Go gets many things right by default: for example, templates from the standard library make it hard to accidentally introduce XSS vulnerabilities. But what about other attacks? Fortunately, there are a few open source Go packages that can help us.

Security headers
----------------

Let’s start with easy things: sending HTTP headers that tell modern browsers to protect themselves from some of their bad-by-default behaviors. Package [secure](https://github.com/unrolled/secure) (written by [Cory Jacobsen](https://github.com/unrolled)) implements middleware that provides an HTTP handler wrapper for this.

You tell it which headers to set:

    sec := secure.New(secure.Options{
        FrameDeny:             true,
        ContentTypeNosniff:    true,
        BrowserXssFilter:      true,
        ContentSecurityPolicy: "default-src 'self'",
        // ...
    })


and then wrap your `http.Handler`, for example:

    wrappedHandler := sec.Handler(myHandler)
    http.ListenAndServe("localhost:8080", wrappedHandler)


Here are some of the useful options:

*   `FrameDeny`: if `true`, adds `X-Frame-Options: DENY` header, which tells browser not to render your page in `<frame>`, `<iframe>`, or `<object>` HTML elements, which helps avoid clickjacking attacks, because your content can no longer be embedded on other websites. (If you want to allow your own website to embed your pages, you can instead set `CustomFrameOptionsValue` to `"SAMEORIGIN"`. See [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/X-Frame-Options) header documentation for more details on how to use it.)
*   `ContentTypeNosniff`: if `true`, adds `X-Content-Type-Options: nosniff` header to prevent browsers from doing _content sniffing_, which is deducing format of data by reading a few bytes of it — some browsers do this by default, even overriding the declared `Content-Type`. Content sniffing makes some attacks, such as XSS, possible where you don’t expect them. For example, see this recent change to Go’s own `http.Error` function:

    > [net/http: set nosniff header when serving Error](https://go-review.googlesource.com/#/c/10640/)
    >
    > The Error function is a potential XSS vector if a user can control the error message. For example, an http.FileServer when given a request for this path
    >
    >`/<script>alert("xss!")</script>`
    >
    >may return a response with a body like this
    >
    >`open <script>alert("xss!")</script>: no such file or directory`
    >
    >Browsers that sniff the content may interpret this as HTML and execute the script. The nosniff header added by this CL should help, but we should also try santizing the output entirely.

*   `BrowserXssFilter`: if `true`, adds `X-XSS-Protection: 1; mode=block` header, which turns on cross-site scripting attack filter in IE and Chrome. Read [IE8 Security Part IV: The XSS Filter](http://blogs.msdn.com/b/ie/archive/2008/07/02/ie8-security-part-iv-the-xss-filter.aspx) to learn how it works.

You can also automatically redirect plain text connections to TLS by setting `SSLRedirect` (or `SSLTemporaryRedirect`), and configure [HTTP Strict Transport Security](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security) headers, which tell browsers to always connect to your server via HTTPS during the specified period (`STSSeconds`).

_Secure_ also provides a way to automatically check for allowed host names to protect against [DNS rebinding attacks](https://en.wikipedia.org/wiki/DNS_rebinding): set `AllowedHosts` option to the slice of domain names of your website.

See [secure.Options](https://stablelib.com/doc/v1/net/secure/#Options) documentation for more information.

You can what security headers a website is using with this online service: [securityheaders.io](https://securityheaders.io/).

Rate limiting
-------------

Rate limiting is useful to prevent resource exhaustion on your server or to prevent malicious clients from doing things repeatedly, such as submitting many comments too quickly.

Package [throttled](https://github.com/throttled/throttled) (written by [Martin Angers](https://github.com/PuerkitoBio)) is a Go middleware that throttles requests to your HTTP handlers.

_Throttled_ has different strategies for throttling; for the described use we need `RateLimit`. The default one adds these HTTP headers:

    X-RateLimit-Limit: quota
    X-RateLimit-Remaining: no. of requests remaining in the current window
    X-RateLimit-Reset: seconds before a new window


which is useful if you want to rate limit an API, so that clients can figure out their limits by reading headers. However for normal use, we’d rather avoid adding such headers. This is why StableLib provides `throttled-webrate` package, which implements the same rate limiter, but doesn’t add `X-RateLimit` headers. It also has helper functions that simplifies rate limiting by IP if your Go program runs behind a reverse proxy, such as nginx.

Here’s how to use those two packages if your web app runs behind nginx (it provides the client IP in `X-Real-IP`header). Import packages:

    import (
        "stablelib.com/v1/net/throttled"
        "stablelib.com/v1/net/throttled-webrate"
        "stablelib.com/v1/net/throttled/store"
    )


Then create a new rate limiter:

    lim := webrate.RateLimit(
      throttled.PerMin(30), // allow max 30 request per minute
      []string{"POST"},     // protect only POST requests
      webrate.VaryByIP("X-Real-IP"), // header with client's IP address
      store.NewMemStore(1000)) // memory store for the last 1000 items


and wrap your handler with it:

    wrappedHandler := lim.Throttle(myHandler)


All POST requests coming to `wrappedHandler` will be throttled at 30 request per minute by IP.

You can learn about other throttling strategies provided by the `throttled` package from its documentation.

CSRF protection
---------------

If you’re using cookies for user authentication, you should protect your requests from cross-site request forgery (CSRF or XSRF) attacks. These attacks perform requests on your behalf to a target site while you’re browsing some other website. For example, if you’re logged in to an online banking web app that doesn’t have CSRF protection, other websites may trick you into clicking a button that sends a POST request to your banking website, sending money to the attacker’s account; since the browser sends your authorization cookies, the banking server thinks it was you who sent the request.

To protect against this, websites generate a random number and set it both as a cookie in your browser and as a hidden form field. Then, when you submit the form, the web server checks that both values — from the cookie and from the form — are equal. A malicious website won’t be able to make both of these values the same or learn them, because it can neither set cookies for the target domain nor read them.

Package [nosurf](https://github.com/justinas/nosurf) (written by [Justinas Stankevicius](https://github.com/justinas)) makes implementing this protection very easy in Go web apps:

You just wrap your HTTP handlers with it:

    wrappedHandler := nosurf.NewPure(myHandler)


and then provide a CSRF token to your forms. To get the token for the current request, call `nosurf.Token`, giving the request as an argument. Your form should send it back as a `csrf_token` form value:

    func myHandler(w http.ResponseWriter, req *http.Request) {
        token := nosurf.Token(req) // ⬅️
        // ...
        template := `<!doctype html>
            <html><body>
            <form action="/" method="POST">
            <input type="hidden" name="csrf_token" value="{{`{{.CSRFToken}}`}}"> // ⬅️
            ...
            </form>
            </body></html>`
        // ...
        // render template, setting CSRFToken to token value
        // ..
    }

_Nosurf_ will automatically block any POST request sent to `wrappedHandler` that doesn’t contain a valid `csrf_token`. (It won’t touch GET requests). That’s it!

There are other CSRF protection packages for Go, but most of them require doing all the blocking and cookie setting manually, and some authenticate tokens with HMAC, which provides additional protection, but requires managing secret keys. We decided to include `nosurf` in StableLib, because it is very easy to use and provides adequate protection.

Secure cookies
--------------

If you want to prevent users from modifying or even reading your webapp’s cookies, use [securecookie](https://github.com/gorilla/securecookie) (written by Gorilla Web Tookit contributors).

_Securecookie_ uses strong cryptography to authenticate (HMAC) and, optionally, encrypt (AES-CTR) cookies.

First of all, make sure you use strong randomly generated secret keys. Authentication and encryption require two separate keys.

The package contains a helper function to securely generate keys:

    authKey := securecookie.GenerateRandomKey(32)
    encKey := securecookie.GenerateRandomKey(32)

Save these keys somewhere safe and reuse them: you don’t want to generate them every time your app launches, otherwise it won’t be able to authenticate and decrypt secure cookies from the previous launch.

Alternatively, on \*NIX systems you can generate keys by reading from `/dev/urandom`:

    $ head -c32 /dev/urandom | openssl base64
    q2lgfhTCnSXglBsimGq8QelMljpdDyKvQmd137/FFa0=
    $ head -c32 /dev/urandom | openssl base64
    MX6XPTinRmufw1+jew+gUEcNfhmVsgmwzkS7Dg/+2Lw=

and decoding the result like this:

    var (
        authKey, _ = base64.StdEncoding.DecodeString("q2lgfhTCnSXglBsimGq8QelMljpdDyKvQmd137/FFa0=")
        encKey, _ = base64.StdEncoding.DecodeString("MX6XPTinRmufw1+jew+gUEcNfhmVsgmwzkS7Dg/+2Lw=")
    )

It is recommended to use 32-byte keys for authentication, and 16- or 32-byte keys for encryption (selecting AES-128 or AES-256); in our examples, we use 32-byte keys for both HMAC-SHA-256 and AES-256-CTR.

Finally, create a global `SecureCookie` instance with your keys:

    var bakery = securecookie.New(authKey, encKey)


and use it to encode and decode cookie values:

    func SetCookieHandler(w http.ResponseWriter, r *http.Request) {
        values := map[string]string{
            "foo": "bar",
        }
        if val, err := bakery.Encode("cookie-name", values); err == nil {
            cookie := &http.Cookie{
                Name:  "cookie-name",
                Value: val,
                Path:  "/",
                Secure: true,
                HttpOnly: true,
            }
            http.SetCookie(w, cookie)
        }
    }

    func ReadCookieHandler(w http.ResponseWriter, r *http.Request) {
        if cookie, err := r.Cookie("cookie-name"); err == nil {
            values := make(map[string]string)
            err := bakery.Decode("cookie-name", cookie.Value, &values)
            if err != nil {
                // report error
                return
            }
            // values["foo"] is now "bar"
        }
    }

_Securecookie_ package is pretty low level: if you just want sessions, implemented with cryptographically signed and encrypted cookies, use `sessions` package, which uses _securecookie_ internally to implement `CookieStore`.

    var store = sessions.NewCookieStore(authKey, encKey)

Read its documentation for more details. Note that you can’t revoke sessions that use signed cookies, so for production you should just keep them in the database on the server.

(_Originally published for StableLib._)

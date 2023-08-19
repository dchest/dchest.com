---
layout: post
title: Platform authenticators for Web Authentication in Safari 14
tags: Security, Software
---

[Safari 14 will support](https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes) platform authenticators for [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) (also known as WebAuthn). Current versions of Safari already support WebAuthn for security keys, such as [YubiKey](https://www.yubico.com), which are called _roaming authenticators_, but soon you will be able to authenticate using Touch or Face ID on supported devices without any external keys; this is called a _platform authenticator_.

This is already supported by Chrome on Macs, but the importance of the new development is that millions of iOS and iPadOS users will be able to use WebAuthn without dongles.

Here’s how it works, briefly. You sign up normally with username and password, and then add your device (iPhone, iPad, MacBook with Touch ID) for passwordless log in. The next time you sign in, you don’t even have to enter your password — your device will ask you for your fingerprint or face, and you’re in. Since the cryptographic keys used for WebAuthn are stored securely on the device, if you want to sign in on a different device, you will have to enter your password for the first log in.

![Screenshot](/img/2020/webauth-in-safari-platform-authenticator.webp)
<figcaption><a href="https://developer.apple.com/videos/play/wwdc2020/10670/">Meet Face ID and Touch ID for the web</a> WWDC 2020 video</figcaption>

This flow is much better than the standard two-factor authentication flow, and I expect it to replace TOTP, 2FA with WebAuthn/U2F, and other multifactor authentication methods for most people, now that platform authenticators are becoming available on iOS, iPadOS, macOS, Android, and Windows (with Windows Hello). Which is great, because nobody wants 2FA unless they are forced to use it. (We still need a [solution for the first sign in on device](https://twitter.com/dchest/status/1276957930487758849), though.)

It looks like for now, desktop Linux users will have to figure out how to use their TPM modules (the same modules that hardcore free software people have been opposing for ages) or stick to security keys. If you know about any developments regarding this at Red Hat and Canonical, please let me know in the comments below, I’d love to know.

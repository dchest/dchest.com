---
title: ML-KEM in WebCrypto API
tags: Programming, Security, Cryptography
---

[Web Cryptography API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) is not everyone's favorite thing, but it's the only way to do cryptography client-side in web browsers or web views if you want to avoid third-party libraries (e.g., for compliance reasons, or to [save keys securely in IndexedDB](/2025/06/17/how-to-store-web-data-in-keychain/)).

Only [recently](https://caniuse.com/?search=X25519) have we gotten wide [X25519 and Ed25519 support](https://wicg.github.io/webcrypto-secure-curves/) in browsers.

The next big thing is [ML-KEM](https://en.wikipedia.org/wiki/Kyber), a post-quantum key encapsulation mechanism standardized by NIST last year.

ML-KEM protects against future quantum computers that could break current public key algorithms. Implementing it now is important for many use cases, because attackers can record data encrypted with classical algorithms today and decrypt it later when quantum computers that can break those algorithms become available ([if this ever happens](https://eprint.iacr.org/2025/1237)). Implementing quantum-secure signatures, such as ML-DSA and SLH-DSA, on the other hand, is less pressing for many applications (but not all), because most signatures are verified today, when there's no quantum computer capable of forging them.

As of August 2025, the WebCrypto API does not yet support ML-KEM. But there is a [draft specification](https://wicg.github.io/webcrypto-modern-algos/) written by Daniel Huigens. Browsers already ship with ML-KEM support internally for TLS, so I expect they'll implement this spec sometime soon. I personally hope for 2026, but who knows — X25519 was in TLS for a long time before it got into WebCrypto. There are some other signals that ML-KEM support everywhere is on the horizon, such as Apple adding it to CryptoKit and encouraging developers to use it in their [WWDC 2025 session](https://developer.apple.com/videos/play/wwdc2025/314/).

Meanwhile, if, like me, you are developing a web app that uses the WebCrypto API today, you are left with the following options:

1. Don't implement post-quantum cryptography until it's available, and then suffer the migration pain.

2. Use a third-party library that implements ML-KEM in JavaScript or WASM and then switch to the WebCrypto API when it becomes available, rewriting the code (don't forget that WebCrypto is async, so potentially, you'll have to turn all the functions that use it async).

3. Use a third-party library that implements ML-KEM with a WebCrypto API-like interface, and then switch to the WebCrypto API when it becomes available, with almost no code changes.

I decided to go with the third option, but there was no such library available, so I wrote one! [mlkem-wasm](https://github.com/dchest/mlkem-wasm) implements ML-KEM-768 in WebAssembly with an API from the [Modern Algorithms in the Web Cryptography API](https://wicg.github.io/webcrypto-modern-algos/) draft spec. It's a single 50KB JavaScript file (16 KB gzipped), with WASM embedded in it, so it's easy to use, and, in theory, it would be easy to switch to the WebCrypto API by removing the import and replacing `mlkem` with `crypto.subtle` in the code.

Unlike with my previous crypto libraries, I wrote none of the ML-KEM code myself. Instead, I compiled [mlkem-native](https://github.com/pq-code-package/mlkem-native), which is a memory-safe, type-safe, high-performance C library used by AWS. I only wrote some build scripts and the TypeScript wrapper implementing the WebCrypto-like interface.

While it calls WASM, it would not be hard to customize it to use a different ML-KEM implementation, for example, if you want to use Apple's CryptoKit with a WKWebView-based native app. I will probably release bindings for it when the time comes (assuming native WebCrypto API comes later than that).

It's fast, here are benchmark results on my M1 MacBook Air in Chromium:

```
Benchmark Results (10000 iterations each):

Keypair Generation:
• Total: 360.70ms
• Average: 0.04ms per operation
• Throughput: 27724 ops/sec

Encapsulation:
• Total: 318.40ms
• Average: 0.03ms per operation
• Throughput: 31407 ops/sec

Decapsulation:
• Total: 358.60ms
• Average: 0.04ms per operation
• Throughput: 27886 ops/sec
```

You can try the demo here: <https://dchest.github.io/mlkem-wasm/>.

The source code is at <https://github.com/dchest/mlkem-wasm>. Don't forget to read the "Limitations" section in the README to see if it fits your use case.

Note that since ML-KEM is fairly new and less studied compared to elliptic curve algorithms, most implement it _in addition_ to classical algorithms via various hybrid schemes alongside X25519 or P-256, not replacing them.

So, my plan is to use `mlkem-wasm` in production until the WebCrypto API with ML-KEM ships in all browsers, and then switch to it with minimal changes.

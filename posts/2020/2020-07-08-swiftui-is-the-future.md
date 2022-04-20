---
layout: post
title: SwiftUI is the future
tags: Programming, Swift
---

[SwiftUI](https://developer.apple.com/tutorials/swiftui/) is Apple’s UI framework, which is quite similar to [React](https://reactjs.org/). It lives on top of their other UI frameworks: you declare components, state, and some callbacks, and the system will figure out how to render everything. It was announced last year. This year Apple improved it, added many missing features, and began using it for new widgets, Apple Watch complications, etc.

![Screenshot](/img/2020/swiftui.webp)
<figcaption>SwiftUI code sample from Apple.</figcaption>


What’s interesting is that Apple is clearly going for the ease of cross-platform development. With the same UI code base, the same components adjust their behavior according to the target platform: watchOS, iOS, iPadOS, macOS, and tvOS. (glassOS in the future?)

In [The WWDC 2020 Talk Show](https://web.archive.org/web/20210814125718/https://daringfireball.net/thetalkshow/2020/06/24/ep-286) Craig Federighi said that they are not declaring a single framework a winner for the future, everyone can continue using UIKit and AppKit. This makes sense — for now — since you can do things with them that are not yet possible to do with SwiftUI (and vise versa since iOS 14). But to me, SwiftUI seems like the future of development for Apple’s platforms. It’s easier to write and understand, it can be more performant, and more importantly, Apple has more control of the final result due to its declarative nature.

I don’t expect them to abandon everything else quickly, but this day may come.

What do you think?
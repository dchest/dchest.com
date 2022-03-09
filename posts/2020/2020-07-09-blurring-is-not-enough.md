---
layout: post
title: Blurring is not enough
tags: Security
---

You’ve probably heard of [that thing](https://colab.research.google.com/github/tg-bomze/Face-Depixelizer/blob/master/Face_Depixelizer_Eng.ipynb) that restored (well, tried to restore) pixelated images.

![](/img/2020/restore-pixels.webp)

You may have heard about the [criminal](https://en.wikipedia.org/wiki/Christopher_Paul_Neil) who got caught after he posted a swirled photo of himself. Police was able to undo the deformation to reveal his face.

![](/img/2020/criminal.webp)

Turns out, blurring can also be undone in some cases:

![](/img/2020/text-unblur.webp)

This is the result of [Restoration of defocused and blurred images](https://yuzhikov.com/articles/BlurredImagesRestoration1.htm) project by Vladimir Yuzhikov. Of course, it won’t magically unblur any photo, but the results are impressive nonetheless.

If you want to make something unrecognizable in a photo, just slap a big black rectangle on top. Make sure that the rectangle is opaque. Then take a screenshot of the censored image just to be safe and use it. To be completely sure, print and scan it back if you’re paranoid! Make sure your printer or scanner drivers don’t send pictures somewhere. Ah, screw it, just don’t post the picture!

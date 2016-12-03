---
layout: post
title: Synching Android and macOS with Nextcloud
---

> Google and Microsoft are further along on the technology, but haven't quite
> figured it out yet - tie all of our products together, so we further lock
> customers into our ecosystem.
> — [Steve Jobs](http://www.businessinsider.com/email-reveals-steve-jobss-secret-plans-2014-4)

> We may suspend or stop providing our services to you if you do not comply
> with our terms or policies or if we are investigating suspected misconduct.
> — [Google](https://www.google.com/policies/terms/regional.html)

I recently set up my own [Nextcloud](https://nextcloud.com) server to
synchronize contacts, calendars and files between my laptop and Android
smartphone without intermediaries. Here are the client tools I used.

<!--more-->

## Contacts, Calendars, Tasks

Nextcloud uses CalDAV protocol for synching contacts, calendars and tasks.

Conveniently, macOS have built-in synching of Contacts, Calendar and Reminders
apps using CalDAV. Just go to System Preferences &rarr; Internet Accounts,
click Add Other Account, then add two CalDAV accounts: for calendar and
contacts.

On Android, first (!) install [OpenTasks](https://github.com/dmfs/opentasks)
and then [DAVDroid](https://davdroid.bitfire.at/) (paid). Open DAVDroid and
configure your account. After that OpenTasks should just work (if not, tap on
menu and check that your calendar is in Displayed Lists). Note that some phones
require manipulation with permissions to make it work: for example, on my
Xiaomi Redmi Note 3 I had to go to Settings &rarr; Permissions, and then enable
permissions for DAVDroid and *also* add it to Autostart.

<img
 alt="Screenshot of macOS Reminders app with a Groceries list, which contains bread,
oreos and cat food"
 src="/img/2016/reminders.png"
 style="max-width: 49%"
>
<img
 alt="Screenshot of Android OpenTasks app with a Groceries list, which contains bread,
oreos and cat food"
 src="/img/2016/opentasks.png"
 style="max-width: 49%"
>

## Files

File synching is easy: I've installed the official Nextcloud client apps for
macOS and Android. Both work fine, but the Android client is a bit confusing —
I'm not really sure *when* it syncs. When I need to sync something urgently, I
have to tap on menu &rarr; Synchronize.

<img
 alt="Screenshot of macOS Finder with a folder open containing some files
      and green checks on their icons indicating that they are synched"
 src="/img/2016/nextcloud-macos-client.png"
 style="max-width: 49%"
>
<img
 alt="Screenshot of Nextcloud for Android a folder open containing some files"
 src="/img/2016/nextcloud-android-client.png"
 style="max-width: 49%"
>

## Notes

For keeping notes I first tried
[ownNotes](https://apps.owncloud.com/content/show.php/ownNote+-+Notes+Application?content=168512),
which has an Android app, but uninstalled it.  If you have a note open in the
web app and then edit it both on your phone and on the web, the last device to
save it wins and you lose changes from the other device — it doesn't have
versions or any other conflict resolution! This is just stupid.

So, for notes I've decided to use [QOwnNotes](http://www.qownnotes.org/) on my
Mac and [Writeily Pro](https://github.com/plafue/writeily-pro) on Android. They
store notes in plain text files (with Markdown preview and syntax coloring), so
I created *Notes* folder, which is synched by Nextcloud clients, and pointed
the note editors to this folder. Synching is not as quick as Apple's Notes app
with iCloud, but I hope it will work well and won't lose files. QOwnNotes is
pretty ugly, but after a decade on macOS I'm beginning to prefer functional
apps rather than fancy. Writeily Pro, on the other hand, has a quite nice UI.

<img
 alt="Screenshot of QOwnNotes"
 src="/img/2016/qownnotes.png"
 style="max-width: 97%"
>

<img
 alt="Screenshot of Writeily Pro folders view"
 src="/img/2016/writeily-folders.png"
 style="max-width: 32%; border: 1px solid #eee"
>
<img
 alt="Screenshot of a note open in Writeily Pro's Markdown preview"
 src="/img/2016/writeily-preview.png"
 style="max-width: 32%; border: 1px solid #eee"
>
<img
 alt="Screenshot of Writeily Pro note editor"
 src="/img/2016/writeily-editing.png"
 style="max-width: 32%; border: 1px solid #eee"
>

**Update (2016-12-03):** QOwnNotes froze while I was typing a huge note, and if
not for my carefulness, I'd have lost it. Bugs happen, but I no longer trust
this program and won't use or recommend it. Instead, for now I'll just stick
with editing plain text notes with build-in editor in Nextcloud's web interface
or vim.


## Final thoughts

This whole setup is not perfect: there are some ugly apps, sync is not instant,
but it works quite okay and unlike Google's or Apple's "clouds" didn't eat my
data yet. I may update this post in the future as I use this setup more. If you
have comments or suggestions, please contact me on Twitter —
[@dchest](https://twitter.com/dchest) or by [email](/about/).

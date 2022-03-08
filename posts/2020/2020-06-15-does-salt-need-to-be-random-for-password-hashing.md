---
layout: post
title: Does salt need to be random for password hashing?
---


You probably know that salting is needed to make each password hash unique so that an attacker couldn’t crack multiple hashes at once.

This was already known to the Unix creators, according to the [paper](https://dl.acm.org/doi/pdf/10.1145/359168.359172) written by Robert Morris and Ken Thompson in 1979:

![Extract from RMS/Ken paper](/img/2020/salted-passwords.webp)
<figcaption>(They used the real-time clock as a pseudorandom number generator<br>to get 12 bits of salt, which was fine for the 1970s.)</figcaption>

An attacker who gets your leaked hashes verifies guesses by hashing a password guess and comparing the result with a leaked hash. If there is no salt, the attacker can compare the current guess against every hash, and thus has more chances of finding the correct password for at least one of the users (and they can even precompute hashes before your password database leaks). However, if each password has been hashed with a unique salt, the attacker cannot do it — they will have to do the hashing (which is the expensive part) for each of the leaked hashes to see if they’ve got the match.

OK, so salt should be unique for each user. What else? It also should be unique for each password. This means that if a user changes their password, their new password should be hashed with a new salt, not reuse the old one. This is needed to prevent an attacker that gets access to the historical hashes of a user from attacking them all at once and from learning whether the user changed the password to a previously used one.

When I say unique, I mean _globally unique_. A user on your system must have a different salt than the same user on my system, otherwise attackers will instantly see if the user reused their password, and won’t have to crack it twice to attack two systems.

What else? It should be unpredictable to the attacker, otherwise they can precompute their guesses even before they acquire the leaked hashes.

Sounds good! We established that salt should be globally unique per password and unpredictable. But should it be random? Can’t we somehow derive unique and unpredictable salts instead of storing them? Modern programmers hate state (otherwise they wouldn’t use JWT for sessions). Today everything needs to be stateless or it’s not web scale! Let’s see.

Can we deterministically derive a unique unpredictable salt per user? Sure, let’s try. We need a fixed secret key that our server knows, let’s call it _global salt_, and a user identifier. We can, for example, use `HMAC-SHA256(globalSalt, userID)` to calculate 32 bytes, which are unique for each user, and unpredictable for attackers as long as our global salt stays secret. We can use these bytes or a part of them as a salt…

However, this doesn’t satisfy the other requirement: that the salt must be unique per password, not per user. What can we do to fix this? Simple — just introduce a global counter. After each hashed password, the server increments the counter, and does something like `HMAC-SHA256(globalSalt, counter || userID)` to derive salts. (Note that || here designates concatenation, not logical OR). Boom! We have a unique unpredictable salt per password. Again, as long as the global salt is not leaked (or the attacker will be able to predict future salts and precompute password hashes for them), and as long as our counter doesn’t repeat (no race conditions, safe against VM restores and crashes). But the counter is now a _state_ which you all hate! Also, we’ll have to store the counter along with the hash, just like we store the salt. Well, at least, we saved some disk space.

Alternatively, instead of the counter and even userID, we can use system clock in our HMAC construction, provided that we can always generate a different timestamp, and store the timestamp next to the corresponding hash.

What have we done? Basically, we have invented our own inferior, complicated, high maintenance pseudorandom number generator, which breaks in many cases! (Following in the [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) inventors’ footsteps, aren’t we?) In fact, we are not too far from reinventing a random byte generator that your operating system provides, except our secret key is fixed, but they update it from time to time.

**This is why salts everywhere are random — it is much easier and more secure to just use the proper random number generator and store the generated salt next to the password hash.**

PS Of course, you should use the proper password hashing function! For more details, check out [my book](/authbook/).

![Something random](/img/2020/something-random.webp)

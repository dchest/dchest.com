---
layout: post
title: Improving storage of password-encrypted secrets in end-to-end encrypted apps
tags: Security, Cryptography, Programming
---

Many apps with client-side encryption that use passwords derive both encryption and server authentication keys from them.

One such example is [Bitwarden](https://bitwarden.com), a cross-platform password manager. It [uses](https://bitwarden.com/help/article/what-encryption-is-used/) PBKDF2-HMAC-SHA-256 with 100,000 rounds to derive an encryption key from a user’s master password, and an additional 1-round PBKDF2 to derive a server authentication key from that key. Bitwarden additionally hashes the authentication key on the server with 100,000-iteration PBKDF2 “for a total of 200,001 iterations by default”. In this post I’ll show you that these additional iterations for the server-side hashing are useless if the database is leaked, and the actual strength of the hashing is only as good as the client-side PBKDF2 iterations plus one HKDF and one HMAC. I will also show you how to fix this.

Since Bitwarden doesn’t have publicly available documentation (which is unfortunate for an open source project), I rely on [documentation provided](https://github.com/jcs/rubywarden/blob/master/API.md) by [Joshua Stein](https://twitter.com/jcs) who did a great job of reverse-engineering the protocol for his Bitwarden-compatible server written in Ruby.

On the client side, PBKDF2 is used with a user’s password and email to derive a _master key_. (The email address is used a salt. I’m not a big fan of such salting, but we won’t discuss it today). This master key is then used to encrypt a randomly generated 64-byte key (which encrypts user’s data) — we’ll refer to the result as a _protected key_. The master key is then again put through PBKDF2 (with one iteration this time), to derive a _master password hash_, which is used to authenticate with the server. The server runs the master password hash through PBKDF2 and stores the result in order to authenticate the user. It also stores the _protected key_.

![How Bitwarden stores secrets and authenticates](/img/2020/bitwarden_storage_scheme.webp)

To authenticate a user, the server receives the _master password hash_, hashes it with PBKDF2, and compares the result with the stored hash. If they are equal, authentication is successful, and the server sends the _protected key_ to the client, which will decrypt it to get the encryption key.

The additional hashing on the server has two purposes: to prevent attackers that get access to the stored hash from authenticating with the server (they need to undo the last hashing for that, which is only possible with a dictionary attack), and to improve resistance to dictionary attacks by adding a random salt and more rounds to the client-side hashed password.

The last part does not work well in the described scheme. Have you noticed that the _protected key_ is the random key encrypted with the master key (which is derived from the password)?

    protectedKey = AES-CBC(masterKey, key)

That random key is used to encrypt and authenticate user data, such as login information, passwords, and other information that the password manager deals with. One part of the key (let’s call it _key1_) is used for encryption with AES-CBC, another part (_key2_) is used with HMAC to authenticate the ciphertext:

    encryptedData = AES-CBC(key1, data)
    encryptedAndAuthenticatedData = HMAC(key2, encryptedData)

(I’m skipping initialization vectors and other details for clarity.)

The result, _encryptedAndAuthenticatedData_, is stored on the server. To decrypt data, Bitwarden client needs the user’s password, from which it derives the master key with PBKDF2, then decrypts the key from the _protectedKey_ it fetched from the server, and then uses that key to decrypt data.

If Bitwarden’s server database is leaked, the attackers do not need to run dictionary attacks on the master password hash, which has additional PBKDF2 rounds. Instead, they can run the attack as follows:

1.  Derive master key: `masterKey = PKBDF2(passwordGuess)`
2.  Decrypt _protectedKey_ (AES-CBC) to extract the HMAC key (_key2_).
3.  Verify the HMAC key against a piece of user’s encrypted data.
4.  If it verifies, the password guess it correct; otherwise try other guesses.

(**Update (January 2023)**: actually, we don't even need AES decryption and verification, since it uses Encrypt-then-MAC — we only need HMAC, plus HKDF for deriving the MAC key.)

As you can see, instead of `PBKDF2(PBKDF2(passwordGuess, 100,001), 100,000)`, which is 200,001 iterations, attackers can run ~~`HMAC(AES-CBC(PBKDF2(passwordGuess, 100,000)))`~~ `HMAC(HKDF(PBKDF2(passwordGuess, 100,000)))`, which is 100,000 iterations of PBKDF2, ~~two AES blocks (they only need 32 bytes from _protectedKey_)~~ HKDF, and one HMAC. ~~This attack is not necessary cheaper in Bitwarden’s case than the standard one on PBKDF2, since it includes the cost for an additional circuit for AES and passing around a bit more data compared to just running an additional PBKDF2-HMAC-SHA-256 with 100,000 iterations.~~ However, when this authentication scheme is used with a better server-side password hashing function, the attack cost can be significantly reduced.

The fix is simple. But let’s first generalize our authentication/encryption scheme:

![Generalized authentication/storage scheme](/img/2020/generalized_auth_storage_scheme.webp)

Derive two keys from a password using a password-based key derivation function: _wrappingKey_ and _authKey_. The first one is used to encrypt random key material to get _protectedKey_, which is then sent to the server during the registration or re-keying, the second one is sent to the server for authentication.

In Bitwarden’s case, _authKey_ will be again hashed and stored, while _protectedKey_ will be stored as is (allowing attackers to use it to verify password guesses without additional hashing).

![Bitwarden auth storage](/img/2020/bitwarden_auth_storage.webp)

The improvement that I propose on the server side looks like this:

![Improved auth storage](/img/2020/improved_auth_storage.webp)

1.  Instead of deriving one key (aka hash, aka verifier) with the password hashing function, derive two keys: _serverEncKey_ and _verifier_. (The verifier has the same purpose as in the original scheme.)
(Note: don't use the password hashing function twice! Instead, with a modern password hashing function derive a 64-byte output and split it into two 32-byte keys, or if you're stuck with PBKDF2, use HKDF to derive two keys from a single 32-byte output).

2.  Encrypt _protectedKey_ received from the client with _serverEncKey_ and store the result of this encryption (_serverProtectedKey_) instead of _protectedKey_.

That’s it. When a user logs in, perform the same key derivation, and if _verifier_ is correct, decrypt _serverProtectedKey_ to get the original _protectedKey_ and send it to the client. (In fact, if we use authenticated encryption, we can just use the fact that _serverProtectedKey_ is successfully decrypted to ensure that the user entered the correct password and not store the verifier, but I like the additional measure in case the authenticated encryption turns out to have side-channel or other vulnerabilities.)

Why does it work? In the original scheme, an adversary that has a leaked database can run password guessing attacks against the _verifier_, which requires an additional KDF, or against the _protectedKey_ (and in case of Bitwarden, an additional piece of user’s encrypted data, since the attacker cannot verify whether the decryption of the key was successful), which is easier. In the new scheme, the attacker would have to run the same KDF that is used on the server in any case, whether they wanted to verify guesses against _verifier_ or _serverProtectedKey_. Thus, we successfully added additional protection against dictionary attacks on the server side.


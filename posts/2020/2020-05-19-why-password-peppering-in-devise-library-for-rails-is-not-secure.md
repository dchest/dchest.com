---
layout: post
title: Why password peppering in Devise library for Rails is not secure
tags: Security, Cryptography, Programming
---

![Pepper](/img/2020/pepper.webp)

[Devise](https://github.com/heartcombo/devise) is a popular authentication solution for Ruby on Rails. Most web apps need some kind of authentication system for user accounts and Devise allows adding one with just a few lines of code. This is great for security — if all the developers need to do is to plug a third-party library, there are fewer chances to make a mistake. This, however, requires that the library itself is implemented correctly, which is, unfortunately, not the case for many of them.

Peppering is a technique for making password hashes useless without a secret key. It helps prevent a class of attacks where attackers get read-only access to the database (for example, via an SQL injection or a leaked backup dump), but don’t have access to the app server, where the secret key is stored. With peppering, it would be infeasible for attackers to perform a dictionary attack on leaked password hashes, because they don’t know and can’t guess the secret key.

On the other hand, peppering adds another part to the system that can make it less secure by introducing bugs. Thankfully, Devise doesn’t seem to have such bugs, however, its peppering construction is badly designed and doesn’t provide the security guarantee that peppering should provide.

Devise concatenates password with a secret key (pepper) and then feeds the result to bcrypt, which then hashes them.

Here’s [the code](https://github.com/heartcombo/devise/blob/70f3ae24e00906814b63fe1998c861ca45fbecf6/lib/devise/encryptor.rb#L9):

    def self.digest(klass, password)
    if klass.pepper.present?
        password = "#{password}#{klass.pepper}"
    end
    ::BCrypt::Password.create(password, cost: klass.stretches).to_s
    end

In theory, without knowing the pepper, it is infeasible to perform dictionary attacks on password hashes. However, Devise developers failed to take into account a design quirk of bcrypt: it only hashes the first 72 bytes of the password, and ignores everything else after that. This means that if the concatenation of the password and the pepper exceeds 72 bytes, the rest of the bytes are ignored. Since the password comes first, the longer the password, the fewer bytes of the pepper are available for hashing. If the password is 72 bytes or longer, no peppering is done at all.

Here’s a simple Ruby program to demonstrate that two different passwords that have the same 72-byte prefix produce the same hash:

    require 'bcrypt'

    password1 = 'a'*72 + '1'
    password2 = 'a'*72 + '2'

    puts password1
    puts password2
    puts "Passwords equal? #{password1 == password2}"

    hash1 = ::BCrypt::Password.create(password1)
    puts hash1

    p1 = ::BCrypt::Password.new(hash1)
    puts "Password hashes equal? #{p1 == password2}"

Output:

    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1
    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2
    Passwords equal? false
    $2a$12$.NF.TYUDaWe0rVvMIWqb0OzhG6TrVQj7wLERUeeM4yJdALU4oi/Wq
    Password hashes equal? true

Another mistake in Devise’s peppering scheme is that the pepper is added to the password without a separator, which makes it possible for attackers to guess the pepper value. They can register an account with a 71-byte password, and then keep trying to log in with a 72-byte password by appending a character. If they manage to log in, the character they guessed is the first character of the pepper. Then they can change the password to a 70-byte value and try to log in again, but use the guessed character as the penultimate one, and guess the next character, and so on.

What’s the correct way to pepper bcrypt hashes?
-----------------------------------------------

I recommend using the following construction:

    bcrypt(encode(HMAC-SHA-256(key=pepper, password)))

where _pepper_ is used as a key for HMAC-SHA-256 and _encode_ is Base64 or hex encoding (which is needed to avoid a fatal mistake — bcrypt expects a NUL-terminated string, but we get plain bytes from HMAC, which may include NUL). In fact, I recommend this construction for prehashing before bcrypt even if you don’t use peppering — just set _pepper_ to “com.myapp.passwordhash” or some other constant — this way you avoid the 72-character limit: a password of any length will be hashed with HMAC-SHA-256 into 64 hex or 44 Base64 characters, which then will bee used as the password input for bcrypt. (Of course, you should still limit passwords to some reasonable length, don’t blindly accept megabytes of data.)

As an alternative to peppering, you may consider encrypting password hashes, which has some advantages and disadvantages compared to peppering, but for bcrypt, correctly implemented peppering works well. I discuss this and many other related topics in my book [Password authentication for web and mobile apps](/authbook/), which you should read if you want to avoid mistakes in your user authentication code or recognize them in third-party solutions.


// Written by Dmitry Chestnykh <dmitry@codingrobots.com>
// 2017-08-04. Public domain

// Pseudorandom number generator based on jitter in JavaScript.

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!        VERY EXPERIMENTAL AND POINTLESS.         !!!!
// !!!!          DO NOT USE FOR ANYTHING REAL           !!!!
// !!!!   Use window.crypto.getRandomValues() instead   !!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// It's kinda inspired by http://www.chronox.de/jent.html idea,
// but I actually didn't read how it works before writing this one.

// We'll start by implementing Gimli permutation: gimly() accepts
// 48-byte state and permutes it in-place.
//
// Permutations are the foundation of many new cryptographic primitives, such
// as ChaCha/Salsa ciphers, and the SHA-3 standard, which is based on Keccak
// permutation in sponge mode.
//
// A permutation is a function that reversibly changes the order of the given
// bits; for example there exists a 4-bit permutation, which when given
// [1, 1, 0, 0] returns [1, 0, 1, 0]. For the permutation to be permutation,
// there should also exist a function that reverses it (that is, for our
// example, given [1, 0, 1, 0] always returns back [1, 1, 0, 0]), although for
// our purposes, the reverse doesn't have to be efficient. A nice property of
// permutations is that they do not lose bits — the original bits are all
// there, just in a different order, which can be restored by running the
// reverse permutation. Another nice property is that it turns out if you
// permute some bits, and then cut some bits off the result and forget them,
// it's infeasible to get those cuts bits back unless you know the original
// input (only if the permutation is secure, wide enough, and you cut
// enough bits.) There are many other properties that a permutation must have
// to be useful for cryptography; many cryptographers are working on creating
// useful secure permutations, and trying to break them.
//
// Permutations are cool, but to calculate hashes and message authenticators,
// derive keys and encrypt things, we need to use them in some kind of mode.
// Many new modes are being invented just as I write this, but the
// simplest, the most beautiful, the one that kickstarted the permutation
// revolution in crypto is the "sponge" mode invented by the authors of SHA-3.
// The basic idea of sponge is that you split permutation into "rate" and
// "capacity" parts, XORing or replacing ("absorbing") the rate part with one
// message chunk of the same length, permuting, then repeating until the whole
// message is absorbed, then absorbing padding (just one bit at the end of
// message is enough), permuting, and then outputting the rate part as the hash
// of the absorbed message (you can actually output as many bytes as you want
// by permuting, then outputting more rate bytes, permuting again, etc. -- this
// is called "squeezing"). For a hash function, the capacity must be twice the
// intended security against generic attacks; for example, since Gimli is a
// 48-byte permutation, we can split it to 16-byte rate and 32-byte capacity,
// achieving 32/2 = 16-byte = 128-bit security. Recent results showed that for
// a keyed sponge (where you first absorb a secret key and then a message), the
// security bound is actually min((2^capacity)/message_length, 2^key_length),
// so Gimli provides closer to 256-bit security for keyed hash (MAC, KDF, etc.)
//
// We will use Gimli for all our cryptographic purposes.
//
// For more info and explanation of how it works, see:
// https://gimli.cr.yp.to
//
// Useful reading regarding permutations and sponges:
// http://keccak.noekeon.org, http://sponge.noekeon.org
//
function gimli(s) {
    var r, x, y, z,
        a = s[0] | s[1] << 8 | s[2] << 16 | s[3] << 24,
        b = s[4] | s[5] << 8 | s[6] << 16 | s[7] << 24,
        c = s[8] | s[9] << 8 | s[10] << 16 | s[11] << 24,
        d = s[12] | s[13] << 8 | s[14] << 16 | s[15] << 24,
        e = s[16] | s[17] << 8 | s[18] << 16 | s[19] << 24,
        f = s[20] | s[21] << 8 | s[22] << 16 | s[23] << 24,
        g = s[24] | s[25] << 8 | s[26] << 16 | s[27] << 24,
        h = s[28] | s[29] << 8 | s[30] << 16 | s[31] << 24,
        i = s[32] | s[33] << 8 | s[34] << 16 | s[35] << 24,
        j = s[36] | s[37] << 8 | s[38] << 16 | s[39] << 24,
        k = s[40] | s[41] << 8 | s[42] << 16 | s[43] << 24,
        l = s[44] | s[45] << 8 | s[46] << 16 | s[47] << 24;

    for (r = 24; r > 0; --r) {
        x = a << 24 | a >>> 8;
        y = e << 9 | e >>> 23;
        z = i;

        i = (y & z) << 2 ^ x ^ z << 1;
        e = (x | z) << 1 ^ y ^ x;
        a = (x & y) << 3 ^ z ^ y;

        x = b << 24 | b >>> 8;
        y = f << 9 | f >>> 23;
        z = j;

        j = (y & z) << 2 ^ x ^ z << 1;
        f = (x | z) << 1 ^ y ^ x;
        b = (x & y) << 3 ^ z ^ y;

        x = c << 24 | c >>> 8;
        y = g << 9 | g >>> 23;
        z = k;

        k = (y & z) << 2 ^ x ^ z << 1;
        g = (x | z) << 1 ^ y ^ x;
        c = (x & y) << 3 ^ z ^ y;

        x = d << 24 | d >>> 8;
        y = h << 9 | h >>> 23;
        z = l;

        l = (y & z) << 2 ^ x ^ z << 1;
        h = (x | z) << 1 ^ y ^ x;
        d = (x & y) << 3 ^ z ^ y;

        if ((r & 3) === 0) {
            x = a; a = b; b = x;
            x = c; c = d; d = x;
            a ^= 0x9e377900 ^ r;
        }
        else if ((r & 3) === 2) {
            x = a; a = c; c = x;
            x = b; b = d; d = x;
        }
    }

    s[0] = a; s[1] = a >>> 8; s[2] = a >>> 16; s[3] = a >>> 24;
    s[4] = b; s[5] = b >>> 8; s[6] = b >>> 16; s[7] = b >>> 24;
    s[8] = c; s[9] = c >>> 8; s[10] = c >>> 16; s[11] = c >>> 24;
    s[12] = d; s[13] = d >>> 8; s[14] = d >>> 16; s[15] = d >>> 24;
    s[16] = e; s[17] = e >>> 8; s[18] = e >>> 16; s[19] = e >>> 24;
    s[20] = f; s[21] = f >>> 8; s[22] = f >>> 16; s[23] = f >>> 24;
    s[24] = g; s[25] = g >>> 8; s[26] = g >>> 16; s[27] = g >>> 24;
    s[28] = h; s[29] = h >>> 8; s[30] = h >>> 16; s[31] = h >>> 24;
    s[32] = i; s[33] = i >>> 8; s[34] = i >>> 16; s[35] = i >>> 24;
    s[36] = j; s[37] = j >>> 8; s[38] = j >>> 16; s[39] = j >>> 24;
    s[40] = k; s[41] = k >>> 8; s[42] = k >>> 16; s[43] = k >>> 24;
    s[44] = l; s[45] = l >>> 8; s[46] = l >>> 16; s[47] = l >>> 24;
}

// This is our main function: it returns 32 random bytes (if you need more,
// just use the result as a key for a stream cipher, for example, based on
// Gimli). It accepts an optional rounds argument (will be explained later)
// which is set to 16 if it's not given or if it's smaller than 16.
function jitter(rounds) {
    if (!rounds || rounds < 16) rounds = 16;

    // This is our array of 256 Gimli states, each of 48 bytes.
    //
    // The basic idea is that we'll jump around these states based on current
    // time: starting with 0th Gimli state, XOR current time into it, then
    // permute this state, then fetch a byte from this state, and make this
    // byte an index of the next Gimli state to deal with, for example, if the
    // byte is 127, then do the same with 127th Gimli state, and so on.
    //
    // Why so many states? We want to cause CPU to do some memory accesses to
    // cause more variation in timings; so we jump around 256 * 48 =
    // 12,288-byte piece of memory.
    //
    // Why 256 specifically? Just for convenience — we can use one whole byte
    // as an index into it.
    var s = new Array(256);

    // Initialize our states array.
    for (var i = 0; i < 256; i++) {
        // Create each Gimli state.
        s[i] = new Uint8Array(48);

        // Set 46th byte to a pseudorandom bit returned by coin() function.
        // This is intended to protect against bad timer resolution — the
        // coin() works better the worse the timer is. Thus, even if the latter
        // part of algorithm will not introduce a lot of jitter by jumping
        // around the state and running Gimli, we'll still have some 256 bits
        // (one bit per state) that are possibly unpredictable.
        s[i][46] = coin();

        // Set 47th byte to the index of this Gimli state
        // to make sure each state is distinct.
        s[i][47] = i;

        // Why 46th and 47th? Later we'll XOR timestamp into the first 8 bytes
        // (and squeeze the next jump index from one of the first 32 bytes, but
        // after permuting), so it's natural to just put the initialization
        // part somewhere else.
        //
        // -------------------------------------------------
        // |t|t|t|t|t|t|t|t|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
        // -------------------------------------------------
        // |.|.|.|.|.|.|.|.| | | | | | | | | | | | | | |c|i|
        // -------------------------------------------------

        // We don't permute the state initially, this will be done in each
        // round of the main algorithm.
        // Here's a handy way of looking what's inside each state:
        // console.log(Array.prototype.join.call(s[i]));
    }

    // Now the crazy part: coin() function is modelled after Dan Kaminsky's
    // "The 'Obviously Incorrect' Random Number Generator"
    // https://gist.github.com/PaulCapestany/6148566 or Twuewant/Truerand
    // https://www.finnie.org/2011/09/25/introducing-twuewand/
    // but is a very simplified variant. It returns 0 or 1.
    //
    // The idea is that we flip a bit for some specified time in a while loop
    // and then output the result. Turns out this bit flipping will vary since
    // the time between calling the measurement function and performing XOR is
    // non-deterministic! So the result will vary: sometimes it flips
    // the bit 5 times, sometimes 35.
    //
    // The quirk of this implementation is that it flips the bit for ZERO units
    // of time; that is, it will stop flipping (or won't flip at all) once we
    // can measure any change in time however small. Thus, the better the timer
    // resolution, the worse the result. It may even always return zeros. But
    // this is okay — we use this function only during initialization,
    // and since the rest of the algorithm works better if the timer is more
    // precise, this function will compensate for worse timers. (BTW,
    // window.performance.now() has 5 microsecond resolution according to the
    // standard).
    function coin() {
        var c = 0, start = window.performance.now();
        while (window.performance.now() - start === 0) c ^= 1;
        return c;
    }

    // Now, finally, the MAIN part.
    // Here are some variables that we allocate.
    //
    // We'll use window.performance.now() to measure time, which returns a
    // double-precision floating-point number. To harverst all bits from it,
    // we'll convert it into a 8-byte array using this one weird trick by
    // setting the number into the DataView and then reading bytes from the
    // Uint8Array pointing to the same buffer. Nothing to see here, just a
    // JavaScript way of doing things.
    var buf = new Uint8Array(8),
        view = new DataView(buf.buffer),

        // Index is pointing to the current Gimli state in our states array.
        // We'll start with zero.
        index = 0,

        // Sum is an index to the byte inside Gimli state,
        // it will be explained a bit later.
        sum = 0;

    // Go-o-o-o-o-o! Jump around and permute for the given number of rounds
    // times 256. A good almost minimal number of rounds that makes every state
    // participate was established experimentally to be 16, which gives 4096
    // time measurements.
    //
    // We use the full timestamp instead of measuring difference. This means
    // that the difference in timings between loop iterations, which includes
    // permutation and memory accesses, will be encoded implicitly.
    //
    // It also makes this algorithm secret data-dependant for memory
    // accesses, which is a bad thing, and can be used for side-channel
    // attacks. Oh well. We're trading one thing for another, and it's
    // probably hard to figure out the rest of bytes from jumps.
    for (var i = 0; i < rounds * 256; i++) {
        // Measure time and convert it into 8 bytes.
        view.setFloat64(0, window.performance.now());
        for (var j = 0; j < 8; j++) {
            // XOR each timestamp byte into the current Gimli state.
            s[index][j] ^= buf[j];
            // Also collect the sum of the current timestamp bytes, which we'll
            // use modulo 32 to index into Gimli state. Why the sum instead of
            // just taking the most changing byte? We're not really sure about
            // the timer resolution, for example, if we used Date.now(), the
            // last byte would always be zero, so if we took it, we wouldn't
            // have introduced any variance. Adding all bytes seems like a good
            // way to ensure we'll catch at least one changed byte.
            sum += buf[j];
        }

        // Permute the current Gimli state!
        // The permutation serves three purposes:
        // - mixes time input, turning state into a pseudorandom byte array,
        // - does lots of xors, shifts, ands, ors, introducing jitter,
        // - gets us the next pseudorandom index to jump to.
        gimli(s[index]);

        // Set the next index of Gimli state to use to a byte got from the
        // permuted current state. Which byte to get depends on the sum
        // of all timestamp bytes modulo 32, so it's one of the first 32 bytes
        // in the Gimli state.
        //
        // Accessing Gimli state this way and making this pseudorandom jump also
        // introduces some timing variance due to memory accesses.
        sum %= 32;
        index = s[index][sum];
        sum = 0;

        // After all that, the time we'll measure in the next iteration will be
        // slighly different from the one we measured in this iteration. We
        // also kinda rolling a haystack — our whole state — due to the way the
        // next state to permute depends on timestamp and the previous state.
    }

    // Finally, we need to extract some bytes form the state mess we created.
    // Allocate a new final Gimli state.
    var f = new Uint8Array(48);
    // This is a good time to use real entropy from the system. Why didn't we
    // just use it in the first place?! Well, you should, really. Seriously,
    // just use window.crypto.getRandomValues() to get your random bytes! But
    // this is not the point of this algorithm, so I'll leave it commented out.
    // Just showing the convenient place where we can inject it. If you're
    // gonna use this algorithm in real life (WHY?), please uncomment this.
    //
    // window.crypto.getRandomValues(f);
    for (var i = 0; i < 256; i++) {
        // The extraction works like sponge: XOR into the first 32 bytes of the
        // new Gimli state the 32-byte part of each one of the 256 Gimli states
        // that we worked on. Yes, we are leaving 16 bytes of each state
        // untouched — remember the capacity thing explained earlier? The
        // untouched part is the capacity.
        for (var j = 0; j < 32; j++) {
            f[j] ^= s[i][j];
        }
        // Clear each state, which we don't need anymore, to protect against
        // leaks. (Here's hoping the compiler won't realize that s is unused.)
        for (var j = 0; j < 48; j++) {
            s[i][j] = 0;
        }
        // After absorbing 32 bytes, permute the final state.
        // Just like sponge, just like sponge.
        gimli(f);
    }

    // In the end, we'll output just the first 32 bytes of the final
    // permutation, making the other 16 bytes disappear. Spo-o-o-onge!
    var out = new Uint8Array(f.subarray(0, 32));

    // Cleanup. You'll never guess what were the other 16 bytes.
    // (Again, if the compiler won't figure out that we don't use f anymore.
    // Otherwise our state will stay in memory for who-knows-how-long.)
    for (var i = 0; i < 48; i++) {
        f[i] = 0;
    }
    view.setFloat64(0, 0);
    index = sum = 0;

    // We're done! The callers will get 32 hopefully unpredictable bytes.
    // We know that they are pseudorandom and uniformly distributed due to
    // Gimli. But are they unpredictable? Depends on how unpredictable the CPU
    // and memory behaved and that this algorithm correctly caught enought of
    // this unpredictability.
    return out;
}

//
// Let's test and show how long it takes and what it returns.
// ~25ms per jitter() on my MBP and ~100ms on my cheap smartphone.
//
// Create some HTML file with:
// <script src="jitter.js"></script>
// and open it to run this.
//
var t1 = Date.now();
var r = jitter();
console.log(Date.now() - t1 + 'ms');
var tohex = x => ("0" + (x.toString(16))).slice(-2);
var s = Array.prototype.map.call(r, tohex).join('');
console.log(s);
document.body.innerHTML = Date.now() - t1 + 'ms<br>' + s;

// You can try it here: https://dchest.org/jitter/

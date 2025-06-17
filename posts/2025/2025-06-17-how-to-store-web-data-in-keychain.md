---
title: "How to store web app data in the system keychain"
---

While there are no APIs to store web app data in the system keychain, there is a simple method that allows you do _almost the same thing_ using WebCrypto API. This also applies to native apps that use WKWebView.

## Step 1

Generate a *non-extractable* AES `CryptoKey` using `window.crypto.subtle.generateKey`:

```typescript
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable flag, important!
    ["encrypt", "decrypt"]
  );
```

## Step 2

Save this key into `IndexedDB`.

## Step 3

Use this key to encrypt and decrypt data that you want to be tied to the keychain,
for example, using AES-GCM with a [random nonce](https://www.google.com/search?q=aes+gcm+random+nonce+collision):

```typescript
async function encrypt(data: Uint8Array): Promise<Uint8Array> {
  // Retrieve the key from IndexedDB (implement this yourself).
  const key = await getEncryptionKey();
  // Generate a random nonce.
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  // Encrypt the data.
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    data
  );
  // Prepend nonce to the encrypted data.
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

async function decrypt(data: Uint8Array): Promise<Uint8Array> {
  // Retrieve the key from IndexedDB.
  const key = await getEncryptionKey();
  // Extract the nonce and the encrypted data.
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  try {
    // Decrypt the data.
    return new Uint8Array(
      await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          tagLength: 128,
        },
        key,
        encrypted
      )
    );
  } catch (e) {
    console.error("Failed to decrypt data", e);
    throw e;
  }
}
```

## Step 4

Store the encrypted data anywhere you like, for example, in `IndexedDB` or `localStorage` (base64-encoded). That's it! The data is protected.

## What about the keychain?

If you store a `CryptoKey` in `IndexedDB`, it will be encrypted by another key stored in the system keychain (or other mechanism that eventually uses the keychain). If you have an app that uses `WKWebView`, then this encryption key will be specific to the app.

![WebCrypto Master Key for an app](/img/2025/webcrypto-master-key.png)

(The usual disclaimer for "browser crypto bad" people: none of this prevents cross-site scripting attacks from stealing data, or ton of other attacks, that's not the point of this post.)

export function getQRCodeDataUrl(text) {
  return import("https://esm.sh/qrcode@1.5.3").then((qrcode) => {
    return new Promise((resolve, reject) => {
      qrcode.default.toDataURL(text, (err, url) => {
        console.log('got a result!', err, url);
        if (err) reject(err);
        else resolve(url);
      });
    });
  });
}

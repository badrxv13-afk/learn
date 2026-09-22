function decodeDzId(e) {
  try {
    e = Buffer.from(e, 'base64').toString('binary');
  } catch {
    return "#";
  }
  let t = "";
  for (let n = 0; n < e.length; n++) {
    t += String.fromCharCode(e.charCodeAt(n) - 8);
  }
  return t;
}

const dataId = "bFxrf1tNUmldTzlZa3VSPmt0Ukprc4B5a3VSYmKCOEE=";
const decoded = decodeDzId(dataId);
console.log('Decoded slug / id:', decoded);
console.log('Full URL:', `https://www.dzexams.com/ar/documents/${decoded}`);

const urls = [
  'https://imagecache.365scores.com/image/upload/f_png,w_96,h_96,c_limit,q_auto:eco,dpr_1,d_Competitors:default1.png/v2/Competitors/2376',
  'https://imagecache.365scores.com/image/upload/f_png,w_96,h_96,c_limit,q_auto:eco,dpr_1,d_Competitors:default1.png/v3/Competitors/5054',
];

(async () => {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(url, res.status, res.headers.get('content-type'), res.headers.get('content-length'));
    } catch (err) {
      console.error('ERROR', url, err.message);
    }
  }
})();

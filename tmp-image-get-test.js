const urls = [
  'https://imagecache.365scores.com/image/upload/f_png,w_96,h_96,c_limit,q_auto:eco,dpr_1,d_Competitors:default1.png/v2/Competitors/2376',
  'https://imagecache.365scores.com/image/upload/f_png,w_32,h_32,c_limit,q_auto:eco,dpr_3,d_Athletes:default.png,r_max,c_thumb,g_face,z_0.65/v26/Athletes/NationalTeam/548126',
];

(async () => {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log('URL', url, 'status', res.status, 'content-type', res.headers.get('content-type'));
      const buf = await res.arrayBuffer();
      console.log('bytes', buf.byteLength);
    } catch (err) {
      console.error('ERROR', url, err.message);
    }
  }
})();

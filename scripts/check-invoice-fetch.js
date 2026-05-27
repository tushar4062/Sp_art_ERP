const url = 'http://localhost:3000/api/invoice/download/6a152c5776ea82908e9c54a4';
const cookie = 'student_session=6a13de27c88521b83644e273';
(async () => {
  try {
    const res = await fetch(url, { headers: { cookie } });
    console.log('status', res.status);
    console.log('content-type', res.headers.get('content-type'));
    const body = await res.text().catch(err => 'TEXT_ERROR:' + err);
    console.log('body starts', body.slice(0, 400));
  } catch (err) {
    console.error('fetch error', err);
    process.exit(1);
  }
})();

const matchId = 4760721;

(async () => {
  try {
    const res = await fetch(`http://localhost:3002/api/football/matches/${matchId}/lineups`);
    console.log('status', res.status);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('ERROR', err.message);
  }
})();

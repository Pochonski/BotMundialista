import http from 'node:http';

async function main() {
  const res = await fetch('http://localhost:3002/api/football/matches');
  console.log('status', res.status);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.log('No data or empty array');
    console.log(data);
    return;
  }
  const sample = data[0];
  console.log(JSON.stringify({
    id: sample.id,
    homeTeam: {
      name: sample.homeTeam?.name,
      badgeUrl: sample.homeTeam?.badgeUrl,
    },
    awayTeam: {
      name: sample.awayTeam?.name,
      badgeUrl: sample.awayTeam?.badgeUrl,
    },
    events: sample.events?.length,
  }, null, 2));
}

main().catch((err) => {
  console.error('ERROR', err && err.message);
  process.exit(1);
});

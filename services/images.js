const CDN = 'https://imagecache.365scores.com/image/upload';

const transforms = {
  // d_Athletes:default.png = placeholder de Cloudinary: si el atleta no tiene
  // foto, muestra un silhouette en vez de 404. Debe ser literal, NO el athleteId.
  athlete: 'f_png,w_200,h_200,c_limit,q_auto:eco,dpr_1,r_max,c_thumb,g_face,z_0.65,d_Athletes:default.png',
  athleteThumb: 'f_png,w_32,h_32,c_limit,q_auto:eco,dpr_3,r_max,c_thumb,g_face,z_0.65,d_Athletes:default.png',
  team: 'f_png,w_96,h_96,c_limit,q_auto:eco,dpr_1',
  countryFlag: 'f_auto,q_auto',
};

const folders = {
  athlete: 'Athletes/NationalTeam',
  athleteThumb: 'Athletes/NationalTeam',
  team: 'Competitors',
  countryFlag: 'Countries',
};

function getAthletePhotoUrl(athleteId, imageVersion = 26) {
  if (!athleteId) return null;
  return `${CDN}/${transforms.athlete}/v${imageVersion}/${folders.athlete}/${athleteId}`;
}

function getAthleteThumbUrl(athleteId, imageVersion = 26) {
  if (!athleteId) return null;
  return `${CDN}/${transforms.athleteThumb}/v${imageVersion}/${folders.athleteThumb}/${athleteId}`;
}

function getCountryFlagUrl(countryId) {
  if (!countryId) return null;
  return `${CDN}/${transforms.countryFlag}/${folders.countryFlag}/${countryId}.png`;
}

function getTeamBadgeUrl(competitorId, imageVersion = 1) {
  if (!competitorId) return null;
  return `${CDN}/${transforms.team}/v${imageVersion}/${folders.team}/${competitorId}`;
}

module.exports = { getAthletePhotoUrl, getAthleteThumbUrl, getCountryFlagUrl, getTeamBadgeUrl };

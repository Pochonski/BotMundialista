const path = require('path');
const images = require(path.join(__dirname, 'services', 'images.js'));
console.log('athlete photo:', images.getAthletePhotoUrl(123456));
console.log('athlete thumb:', images.getAthleteThumbUrl(123456));
console.log('team badge:', images.getTeamBadgeUrl(98765));
console.log('country flag:', images.getCountryFlagUrl(123));

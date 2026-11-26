/* Checkout links. The site sells The Full Rebuild only, by application.
   These keys stay empty so a button cannot send someone to another checkout. */
window.PAY_LINKS = {
  'os-monthly': '',
  'os-annual': '',
  'ktm-monthly': '',
  'ktm-annual': '',
  'blueprint-nutrition': '',
  'blueprint-glp1': '',
  'ninety': ''
};
window.payLink = function (key, fallback) {
  var url = (window.PAY_LINKS && window.PAY_LINKS[key]) || '';
  return url !== '' ? url : (fallback || '/apply');
};

/* Old plan names are not sent to a checkout. The link stays as written. */
document.addEventListener('DOMContentLoaded', function () {
  var MAP = {
    'Physique OS: Monthly': 'os-monthly',
    'Physique OS: Annual': 'os-annual',
    'Keep the Muscle: Monthly': 'ktm-monthly',
    'Keep the Muscle: Annual': 'ktm-annual',
    'Nutrition Blueprint': 'blueprint-nutrition',
    'GLP-1 Blueprint': 'blueprint-glp1',
    'The Ninety': 'ninety'
  };
  document.querySelectorAll('a[href*="plan="]').forEach(function (a) {
    var plan;
    try { plan = decodeURIComponent(a.getAttribute('href')).split('plan=')[1] || ''; }
    catch (e) { return; }
    for (var name in MAP) {
      if (plan.indexOf(name) === 0) {
        var url = window.PAY_LINKS[MAP[name]];
        if (url) a.setAttribute('href', url);
        break;
      }
    }
  });
});

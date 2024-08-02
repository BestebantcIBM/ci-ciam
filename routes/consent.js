var express = require('express');
var router = express.Router();

var DPCMClient = require('../lib/dpcm/dpcmClient');
var dpcmClient = new DPCMClient({
  tenantUrl: process.env.OIDC_CI_BASE_URI,
});

router.get('/', function(req, res, next) {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    dpcmClient.getUserConsents(req.session.accessToken, function(_err, result) {
      res.render('insurance/consent-profile', {
        loggedIn: loggedIn,
        consent: result.consents
      });
    });
});

router.get('/terms', function(req, res, next) {
    var userAccessToken = req.session.accessToken;
    var userId = req.session.userId;
    var purposeID = process.env.TERMS_PURPOSE_ID;

    dpcmClient.performDUA(userAccessToken, {
      trace: false,
      items: [
        {
          purposeId: process.env.TERMS_PURPOSE_ID,
          accessTypeId: process.env.DEFAULT_ACCESS_TYPE
        }
      ]
    }, function(_err, duaRespItems) {
      var approved = duaRespItems[0].result[0].approved;
      if (approved) {
        res.redirect("/profile");
        return;
      }

      dpcmClient.getDSP(userAccessToken, { purposeId: [purposeID] }, function(_err, dspResp) {
        if (!dspResp.purposes) {
          res.redirect("/app/profile");
          return;
        }
        var lastModified = new Date(dspResp.purposes[purposeID].lastModifiedTime *1000);
        var termsDSP = dspResp.purposes[purposeID];
        res.render('insurance/privacy/eula_consent', {
          layout: false,
          consentTitle: `Terminos de Servicio (version ${termsDSP.version})`,
          pageDescription: `Los Terminos de servicios fueron actualizados el dia ${lastModified.toGMTString()}. Por favor revise y acepte los nuevos términos antes de acceder a su perfil`,
          refLink: termsDSP.termsOfUse.ref,
          accessTypeId: termsDSP.accessTypes[0].id,
          assertUIDefault: termsDSP.accessTypes[0].assentUIDefault,
          actionHome: "/app/consent/terms"
        });
      });
    });
  });

router.post('/terms', function(req, res, next) {
    var userAccessToken = req.session.accessToken;
    var userId = req.session.userId;
    var purposeID = process.env.TERMS_PURPOSE_ID;
    var assertTerms = (req.body.assertTerms == "true") ? 1 : 2;

    dpcmClient.storeConsents(userAccessToken, [
      {
        purposeId: purposeID,
        accessTypeId: process.env.DEFAULT_ACCESS_TYPE,
        state: (req.body.assertTerms == "true") ? 1 : 2
      }
    ], function(_err, result) {
      res.redirect("/app/profile");
    });
  });

module.exports = router;

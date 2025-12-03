import { Router } from 'express';

const router = Router();

router.get('/openid-credential-issuer', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    credential_issuer: `${baseUrl}/api/oauth/callback`,
    credentials_supported: [],
    credential_endpoint: `${baseUrl}/api/oauth/callback`,
    authorization_server: `${baseUrl}/api/oauth`,
    display: [
      {
        name: 'Identity Bridge',
        locale: 'en-US',
      },
    ],
    grants: {
      authorization_code: {
        authorization_server: `${baseUrl}/api/oauth`,
      },
    },
  });
});

export default router;


import axios from 'axios';
import dotenv from 'dotenv';

const OAuthController = {
    callback: async(req, res, next) => {
        try {
            const tokenUri = process.env.OAUTH_TOKEN_URI;
            const clientId = process.env.OAUTH_CLIENT_ID;
            const clientSecret = process.env.OAUTH_CLIENT_SECRET;
            const redirectUri = process.env.OAUTH_REDIRECT_URI;

            const authorizationCode = req.query.code;

            if (!authorizationCode) {
                // Logika penanganan error jika code tidak ada
                req.logger.error('OAuth callback: Authorization code missing.');
                return res.status(400).send('Authorization code is missing.');
            }

            req.logger.info(`Attempting to exchange code for token. Code: ${authorizationCode}`);

            // Lakukan permintaan POST untuk menukarkan authorization_code dengan access_token
            const responseToken = await axios.post(tokenUri, {
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: authorizationCode
            });

            // Mendapatkan data JSON dari respons
            const tokenData = responseToken.data;

            req.logger.info('Successfully received token data:', tokenData);

            res.status(200).json({
                message: 'Token exchange successful',
                tokenData: tokenData
            });

        } catch (error) {
            req.logger.error('Error during OAuth token exchange:', error.response ? error.response.data : error.message);
            next(new Error('Failed to exchange authorization code for token.'));
        }
    }
};

export default OAuthController;
// src/services/ssoAuthService.js

import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import winston from 'winston'; // Import winston logger

dotenv.config();

const SSO_BASE_URL = process.env.SSO_BASE_URL;
const SSO_AUTHORIZE_URL = `${SSO_BASE_URL}${process.env.SSO_AUTHORIZE_ENDPOINT}`;
const SSO_TOKEN_URL = `${SSO_BASE_URL}${process.env.SSO_TOKEN_ENDPOINT}`;
const SSO_USERINFO_URL = process.env.SSO_USERINFO_ENDPOINT ? `${SSO_BASE_URL}${process.env.SSO_USERINFO_ENDPOINT}` : null;

const SSO_API_CLIENT_ID = process.env.SSO_API_CLIENT_ID;
const SSO_API_CLIENT_SECRET = process.env.SSO_API_CLIENT_SECRET;
const SSO_API_REDIRECT_URI = process.env.SSO_API_REDIRECT_URI;
const SSO_STATE_VALUE = process.env.SSO_STATE_VALUE;

const JWT_SECRET = process.env.JWT_SECRET;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
});

if (!SSO_BASE_URL || !SSO_AUTHORIZE_URL || !SSO_TOKEN_URL || !SSO_API_CLIENT_ID || !SSO_API_CLIENT_SECRET || !SSO_API_REDIRECT_URI || !SSO_STATE_VALUE || !JWT_SECRET) {
    logger.error('FATAL ERROR: One or more critical SSO environment variables are not defined. Check your .env file.');
    process.exit(1);
}

export const initiateSsoLogin = (req, res) => {
    const authUrl = new URL(SSO_AUTHORIZE_URL);
    authUrl.searchParams.append('client_id', SSO_API_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', SSO_API_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code'); // Sesuai permintaan Anda
    authUrl.searchParams.append('state', SSO_STATE_VALUE); // State yang Anda wajibkan
    authUrl.searchParams.append('scope', 'openid profile email'); // Scope standar, sesuaikan jika SSO Anda memiliki scope khusus

    logger.info(`Redirecting to SSO for login: ${authUrl.toString()}`);
    res.redirect(authUrl.toString());
};

export const handleSsoCallback = async (req, res) => {
    const authCode = req.query.code;
    const receivedState = req.query.state;
    const error = req.query.error;
    const errorDescription = req.query.error_description;

    if (error) {
        logger.error(`SSO Callback Error: ${error} - ${errorDescription || 'No description'}`);
        return res.status(400).json({
            message: `Otentikasi SSO gagal.`,
            error: error,
            error_description: errorDescription
        });
    }

    if (receivedState !== SSO_STATE_VALUE) {
        logger.warn(`SSO Callback: State mismatch. Expected: ${SSO_STATE_VALUE}, Received: ${receivedState}`);
        return res.status(400).json({ message: 'Invalid state parameter. Possible CSRF attack.' });
    }

    if (!authCode) {
        logger.warn('SSO Callback: Authorization code missing.');
        return res.status(400).json({ message: 'SSO Callback: Authorization code missing.' });
    }

    try {
        logger.info('Exchanging Authorization Code for Token...');
        const tokenResponse = await axios.post(SSO_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: SSO_API_REDIRECT_URI,
            client_id: SSO_API_CLIENT_ID,
            client_secret: SSO_API_CLIENT_SECRET,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token, id_token, expires_in } = tokenResponse.data;
        logger.info('Successfully exchanged code for tokens.');

        // 2. Dapatkan User Info (dari ID Token atau UserInfo endpoint)
        let userInfo = {};
        if (id_token) {
            try {
                // Decode ID Token (bukan verifikasi penuh karena kita akan pakai ApiMiddleware untuk verifikasi API JWT)
                const decodedIdToken = jwt.decode(id_token);
                userInfo = { ...decodedIdToken };
                logger.info('ID Token decoded. Basic user info extracted.');
            } catch (jwtError) {
                logger.warn('Could not decode ID Token:', jwtError.message);
            }
        }

        // Jika UserInfo endpoint tersedia dan info belum lengkap dari ID Token
        if (SSO_USERINFO_URL && (!userInfo.sub && !userInfo.email)) {
            try {
                logger.info('Fetching user info from SSO_USERINFO_URL...');
                const userInfoResponse = await axios.get(SSO_USERINFO_URL, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    }
                });
                userInfo = { ...userInfo, ...userInfoResponse.data };
                logger.info('User info successfully fetched from SSO_USERINFO_URL.');
            } catch (userInfoError) {
                logger.warn('Failed to fetch user info from SSO_USERINFO_URL:', userInfoError.message);
            }
        }

        // Default role jika tidak ada dari SSO
        if (!userInfo.role) {
            userInfo.role = 'User';
        }
        if (!userInfo.username) {
            userInfo.username = userInfo.preferred_username || userInfo.email || 'unknown';
        }
        if (!userInfo.userId) { // Pastikan ada userId untuk ApiMiddleware
            userInfo.userId = userInfo.sub || userInfo.username;
        }


        // 3. Buat Token JWT Lokal untuk Sesi API Anda
        const apiTokenPayload = {
            userId: userInfo.userId,
            username: userInfo.username,
            email: userInfo.email,
            role: userInfo.role,
            // Tambahkan access_token dan refresh_token SSO jika API Anda perlu menggunakannya nanti
            ssoAccessToken: access_token,
            ssoRefreshToken: refresh_token, // Kirim refresh token jika ingin memperbarui sesi SSO
            // Sesuaikan expires_in dari SSO untuk mengelola masa hidup token lokal
            ssoExpiresIn: expires_in
        };

        const apiJwtToken = jwt.sign(apiTokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token API berlaku 1 jam
        logger.info(`Local API JWT token generated for user: ${apiTokenPayload.username}`);

        // 4. Kirimkan token API lokal ke frontend
        res.json({
            message: 'Login SSO berhasil!',
            apiToken: apiJwtToken,
            userInfo: {
                userId: apiTokenPayload.userId,
                username: apiTokenPayload.username,
                email: apiTokenPayload.email,
                role: apiTokenPayload.role,
            }, // Informasi pengguna yang disimpan (tanpa token SSO)
            // Anda bisa tambahkan URL redirect ke frontend jika aplikasi frontend Anda yang akan menerima token ini
            // redirectUrl: 'http://localhost:4200/dashboard' // Contoh untuk Angular/React
        });

    } catch (tokenExchangeError) {
        const responseData = tokenExchangeError.response && tokenExchangeError.response.data;

        logger.error('Error exchanging authorization code for token:', responseData || tokenExchangeError.message);
        const errorMessage = (responseData && responseData.error_description) ||
            (responseData && responseData.error) ||
            tokenExchangeError.message;

        res.status(500).json({
            message: 'Failed to Get Code SSO Login',
            error: errorMessage
        });
    }
};
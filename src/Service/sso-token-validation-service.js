// src/services/ssoTokenValidationService.js

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SSO_INTROSPECTION_URL = process.env.SSO_INTROSPECTION_URL;
const SSO_API_CLIENT_ID = process.env.SSO_API_CLIENT_ID;
const SSO_API_CLIENT_SECRET = process.env.SSO_API_CLIENT_SECRET;

if (!SSO_INTROSPECTION_URL || !SSO_API_CLIENT_ID || !SSO_API_CLIENT_SECRET) {
    console.error('FATAL ERROR: One or more SSO Introspection environment variables are not defined.');
    console.error('Required: SSO_INTROSPECTION_URL, SSO_API_CLIENT_ID, SSO_API_CLIENT_SECRET');
    process.exit(1);
}

class SsoTokenValidationService {
    /**
     * Memvalidasi Access Token dari SSO menggunakan Introspection Endpoint.
     * Mengembalikan objek `data` dari respons SSO jika valid, atau null jika tidak valid/error.
     * @param {string} token - Access token dari SSO yang diterima dari klien.
     * @returns {Promise<object|null>} Objek `data` dari respons SSO (`{ id, name, email, nik, branch_code, role_id }`) atau `null`.
     * @throws {Error} Jika terjadi kesalahan pada proses validasi (misal: network error, invalid credentials, server SSO merespons error).
     */
    async validateSsoToken(token) {
        if (!token) {
            console.warn('SSO Token Validation: No token provided for validation.');
            return null;
        }

        try {
            const response = await axios.post(SSO_INTROSPECTION_URL, new URLSearchParams({
                token: token,
                client_id: SSO_API_CLIENT_ID,
                client_secret: SSO_API_CLIENT_SECRET,
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.data && response.data.status === 'success' && response.data.data) {
                return response.data.data;
            } else {
                console.warn('SSO Introspection returned inactive token or unexpected format. Response:', response.data);
                return null;
            }
        } catch (error) {
            let errorMessage = 'Unknown error during SSO Token Introspection.';
            if (error.response) {
                errorMessage = `SSO Introspection failed with status ${error.response.status}. Response Data: ${JSON.stringify(error.response.data)}`;
            } else if (error.request) {
                errorMessage = 'SSO Introspection: No response received from SSO server.';
            } else {
                errorMessage = `SSO Introspection request setup failed: ${error.message}`;
            }
            console.error(errorMessage, error);
            throw error;
        }
    }
}

export const ssoTokenValidationService = new SsoTokenValidationService();
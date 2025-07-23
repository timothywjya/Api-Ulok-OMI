class SsoService {
    constructor() { }

    async getUserInfo(jwtPayload) {
        if (jwtPayload && jwtPayload.userId) {
            return {
                userId: jwtPayload.userId,
                username: jwtPayload.username,
                role: jwtPayload.role,
                email: jwtPayload.email,
                ssoAccessToken: jwtPayload.ssoAccessToken,
            };
        }
        return null;
    }
}

export const defaultSsoService = new SsoService();
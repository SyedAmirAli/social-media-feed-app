import { JWT_EXPIRATION, JWT_SECRET } from "@/config/dotenv";
import { jwtVerify, SignJWT } from "jose";

export default class JWT {
    static async sign(userId: string, expiration: string = JWT_EXPIRATION): Promise<string> {
        return new SignJWT()
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(userId)
            .setIssuedAt()
            .setExpirationTime(expiration)
            .sign(this.getSecret());
    }

    static async verify(token: string): Promise<string> {
        const { payload } = await jwtVerify(token, this.getSecret());

        // throw error if token is invalid
        if (!payload.sub) throw new Error("Invalid token: no subject");

        return payload.sub;
    }

    private static getSecret() {
        if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");
        return new TextEncoder().encode(JWT_SECRET);
    }
}

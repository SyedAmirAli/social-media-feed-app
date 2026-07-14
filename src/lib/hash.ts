import bcrypt from "bcryptjs";

export default class Hash {
    static async create(password: string): Promise<string> {
        return await bcrypt.hash(password, 12);
    }

    static async check({ password, hash }: { password: string; hash: string }): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }
}

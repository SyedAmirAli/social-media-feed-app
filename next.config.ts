import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    redirects: async () => {
        return [
            {
                source: "/auth/signup",
                destination: "/auth/registration",
                permanent: true,
            },
            {
                source: "/auth/signin",
                destination: "/auth/login",
                permanent: true,
            },
            {
                source: "/login",
                destination: "/auth/login",
                permanent: true,
            },
            {
                source: "/register",
                destination: "/auth/registration",
                permanent: true,
            },
            {
                source: "/signup",
                destination: "/auth/registration",
                permanent: true,
            },
            {
                source: "/signin",
                destination: "/auth/login",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;

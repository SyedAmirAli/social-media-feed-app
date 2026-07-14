"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastContainer } from "react-toastify";
import { AppProvider } from "@/contexts/AppContext";
import { getQueryClient } from "@/lib/query-client";
import { IS_PRODUCTION } from "@/config/dotenv";
import "react-toastify/dist/ReactToastify.css";

export default function Providers({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <AppProvider>{children}</AppProvider>
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
                theme="colored"
            />
            {!IS_PRODUCTION ? <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" /> : null}
        </QueryClientProvider>
    );
}

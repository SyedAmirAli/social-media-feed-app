"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys, fetchAuthMe } from "@/lib/api/auth";
import type { AppContextValue, AuthUser } from "@/types";

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUserState] = useState<AuthUser | null>(null);

    const meQuery = useQuery({
        queryKey: authKeys.me,
        queryFn: fetchAuthMe,
        retry: false,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (meQuery.isPending) return;

        if (meQuery.data?.success && meQuery.data.user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUserState(meQuery.data.user);
            return;
        }

        setUserState(null);
    }, [meQuery.isPending, meQuery.data]);

    const setUser = useCallback(
        (nextUser: AuthUser | null) => {
            setUserState(nextUser);
            queryClient.setQueryData(authKeys.me, nextUser ? { success: true, user: nextUser } : { success: false });
        },
        [queryClient],
    );

    const clear = useCallback(() => {
        setUser(null);
    }, [setUser]);

    const refetch = useCallback(async () => {
        const result = await queryClient.fetchQuery({
            queryKey: authKeys.me,
            queryFn: fetchAuthMe,
        });

        if (result.success && result.user) {
            setUserState(result.user);
        } else {
            setUserState(null);
        }
    }, [queryClient]);

    const value = useMemo<AppContextValue>(
        () => ({
            auth: {
                user,
                isAuthenticated: Boolean(user),
                isLoading: meQuery.isPending,
                setUser,
                clear,
                refetch,
            },
        }),
        [user, meQuery.isPending, setUser, clear, refetch],
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within AppProvider");
    return context;
}

/** Shortcut for auth slice: `const { auth } = useApp()` */
export function useAuth() {
    return useApp().auth;
}

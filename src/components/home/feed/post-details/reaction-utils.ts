import type { React as ReactRecord } from "@/types";
import { React as ReactKind, ReactEmoji, ReactTitle } from "@/types/enums";

export const REACTION_OPTIONS = Object.values(ReactKind) as ReactKind[];

export function reactionLabel(type: string) {
    const key = type as keyof typeof ReactTitle;
    return ReactTitle[key] ?? type;
}

export function reactionEmoji(type: string) {
    const key = type as keyof typeof ReactEmoji;
    return ReactEmoji[key] ?? "👍";
}

export function reactorsSummary(reacts: ReactRecord[] = [], total?: number) {
    const active = reacts.filter((react) => react.isActive);
    const names = active
        .map((react) => react.user?.name?.trim() || react.user?.email)
        .filter((name): name is string => Boolean(name));
    const count = total ?? active.length;
    if (count === 0) return "";
    if (names.length === 0) return `${count}`;
    if (names.length === 1 && count === 1) return names[0];
    if (names.length === 1) return `${names[0]} and ${count - 1} others`;
    if (count === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]}, ${names[1]} and ${Math.max(count - 2, 0)} others`;
}

export function uniqueReactTypes(reacts: ReactRecord[] = []) {
    const seen = new Set<string>();
    const types: string[] = [];
    for (const react of reacts) {
        if (!react.isActive) continue;
        if (seen.has(String(react.type))) continue;
        seen.add(String(react.type));
        types.push(String(react.type));
    }
    return types;
}

export function authorLabel(user?: { name?: string | null; email?: string } | null) {
    return user?.name?.trim() || user?.email || "User";
}

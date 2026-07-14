"use client";

import DesktopNav from "@/components/home/header/DesktopNav";
import MobileBottomNav from "@/components/home/header/MobileBottomNav";
import MobileHeader from "@/components/home/header/MobileHeader";

export default function Header() {
    return (
        <>
            <DesktopNav />
            <MobileHeader />
            <MobileBottomNav />
        </>
    );
}

export { default as ProfileMenu } from "@/components/home/header/ProfileMenu";

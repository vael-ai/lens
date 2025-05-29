/**
 * Responsive design utilities for better tooltip positioning and mobile optimization
 */

export const getScreenSize = () => {
    if (typeof window === "undefined") return "desktop";

    const width = window.innerWidth;
    if (width < 640) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
};

export const isMobile = () => {
    return getScreenSize() === "mobile";
};

export const isTablet = () => {
    return getScreenSize() === "tablet";
};

export const isDesktop = () => {
    return getScreenSize() === "desktop";
};

export const getOptimalTooltipPosition = (preferredSide: "top" | "right" | "bottom" | "left" = "top") => {
    const screenSize = getScreenSize();

    // On mobile, prefer bottom to avoid viewport cutoff
    if (screenSize === "mobile") {
        return preferredSide === "top" ? "bottom" : preferredSide;
    }

    return preferredSide;
};

export const getOptimalTooltipAlign = (preferredAlign: "start" | "center" | "end" = "center") => {
    const screenSize = getScreenSize();

    // On mobile, prefer center alignment for better visibility
    if (screenSize === "mobile") {
        return "center";
    }

    return preferredAlign;
};

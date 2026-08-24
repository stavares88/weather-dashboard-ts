import type { HTMLAttributes } from "react";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "arcgis-map": HTMLAttributes<HTMLElement> & {
                basemap?: string;
                center?: string;
                zoom?: string | number;
            };

            "arcgis-zoom": HTMLAttributes<HTMLElement> & {
                slot?: string;
            };
        }
    }
}

export {};
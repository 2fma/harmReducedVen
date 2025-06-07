/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Define the SubstanceResponse interface
export interface SubstanceResponse {
    name: string;
    aliases?: string[];
    summary?: string;
    categories?: string[];
    warnings?: string;
    roas?: RouteOfAdministration[];
    interactions?: {
        dangerous?: string[];
        unsafe?: string[];
        caution?: string[];
    };
    source: string;
}

// Define the RouteOfAdministration interface
export interface RouteOfAdministration {
    name: string;
    bioavailability?: {
        min: number;
        max: number;
    };
    notes?: string;
}

// Define HarmReductionInfo interface
export interface HarmReductionInfo {
    warning?: string;
    // Add other properties as needed
}

// Remove ADDITIONAL_SUBSTANCES export since we're now using the external database
// The database.ts file handles all substance data processing

export interface DrugInfo {
    name: string;
    pretty_name?: string;
    aliases?: string[];
    categories?: string[];
    formatted_dose?: Record<string, Record<string, string>>;
    formatted_duration?: {
        _unit?: string;
        [route: string]: string | undefined;
    };
    formatted_onset?: {
        _unit?: string;
        [route: string]: string | undefined;
    };
    formatted_aftereffects?: {
        _unit?: string;
        value?: string;
        [route: string]: string | undefined;
    };
    dose_note?: string;
    properties?: {
        summary?: string;
        "test-kits"?: string;
        [key: string]: any;
    };
    links?: Record<string, string>;
    formatted_effects?: string[];
}

export interface HarmReductionSection {
    title: string;
    icon: string;
    content: string;
    priority: "critical" | "high" | "medium" | "low";
    subsections?: {
        title: string;
        content?: string;
        tips?: string[];
        warnings?: string[];
        resources?: {
            name: string;
            url?: string;
            region?: string;
            description: string;
            priority?: "critical" | "high" | "medium";
        }[];
    }[];
}

export interface SearchFilters {
    category: string;
    route: string;
    effects: string[];
}

export interface SubstanceSearchResult extends DrugInfo {
    key: string;
}

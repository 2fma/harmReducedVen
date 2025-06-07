/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Import the drugs database
import drugsData from "./data/drugs.json";
import { SubstanceResponse } from "./types";

// Cache for processed substances
let processedSubstances: Record<string, SubstanceResponse> | null = null;

// Process the raw drugs.json data into our SubstanceResponse format
const processSubstanceData = (key: string, data: any): SubstanceResponse => {
    // Handle empty or minimal data entries
    if (!data || Object.keys(data).length === 0) {
        return createPlaceholderSubstance(key);
    }

    const aliases = data.aliases || [];
    const categories = data.categories || [];

    // Extract summary from properties or formatted_effects
    let summary = "";
    if (data.properties?.summary) {
        summary = data.properties.summary;
    } else if (data.formatted_effects && Array.isArray(data.formatted_effects)) {
        summary = `Effects include: ${data.formatted_effects.join(", ")}`;
    }

    // Build ROAs from formatted data
    const roas: any[] = [];
    if (data.formatted_dose) {
        Object.keys(data.formatted_dose).forEach(route => {
            const routeData = data.formatted_dose[route];
            if (routeData && typeof routeData === "object") {
                const roa: any = { name: route };

                // Add onset/duration info if available
                if (data.formatted_onset?.[route]) {
                    roa.notes = `Onset: ${data.formatted_onset[route]} minutes`;
                }
                if (data.formatted_duration?.[route]) {
                    const existing = roa.notes || "";
                    roa.notes = existing ? `${existing}, Duration: ${data.formatted_duration[route]} hours` : `Duration: ${data.formatted_duration[route]} hours`;
                }

                roas.push(roa);
            }
        });
    }

    // Add general onset/duration if no specific routes
    if (roas.length === 0) {
        if (data.formatted_onset?.value || data.formatted_duration?.value) {
            const roa: any = { name: "General" };
            let notes = "";
            if (data.formatted_onset?.value) notes += `Onset: ${data.formatted_onset.value} minutes`;
            if (data.formatted_duration?.value) {
                if (notes) notes += ", ";
                notes += `Duration: ${data.formatted_duration.value} hours`;
            }
            if (notes) {
                roa.notes = notes;
                roas.push(roa);
            }
        }
    }

    // Extract warnings from dose_note
    let warnings = "";
    if (data.dose_note && data.dose_note.includes("NOTE:")) {
        warnings = data.dose_note.replace(/NOTE:\s*/i, "").trim();
    }

    return {
        name: data.pretty_name || data.name || key,
        aliases: aliases,
        summary: summary || `${data.pretty_name || key} is a substance with limited available information.`,
        categories: categories,
        roas: roas.length > 0 ? roas : undefined,
        warnings: warnings || undefined,
        source: "TripSit Database"
    };
};

// Create placeholder data for substances that exist in the database but lack information
const createPlaceholderSubstance = (key: string): SubstanceResponse => {
    // Common substance information that we can infer from the name
    const commonSubstances: Record<string, Partial<SubstanceResponse>> = {
        methamphetamine: {
            aliases: ["meth", "crystal", "ice", "glass"],
            categories: ["stimulant", "habit-forming"],
            summary: "A powerful central nervous system stimulant. Highly addictive and illegal in most jurisdictions. Associated with serious health risks including cardiovascular problems, psychosis, and addiction."
        },
        heroin: {
            aliases: ["smack", "h", "dope", "junk"],
            categories: ["depressant", "habit-forming"],
            summary: "An illegal opioid derived from morphine. Extremely addictive and dangerous, with high overdose risk. Associated with respiratory depression and death."
        },
        cocaine: {
            aliases: ["coke", "blow", "snow", "powder"],
            categories: ["stimulant", "habit-forming"],
            summary: "A powerful stimulant derived from coca plants. Highly addictive and illegal. Associated with cardiovascular risks, addiction, and various health complications."
        },
        mdma: {
            aliases: ["ecstasy", "molly", "x", "e"],
            categories: ["empathogen", "stimulant"],
            summary: "A psychoactive drug primarily used recreationally. Known for its empathogenic and stimulant effects. Illegal in most jurisdictions with potential for addiction and adverse effects."
        },
        lsd: {
            aliases: ["acid", "lucy", "tabs", "doses"],
            categories: ["psychedelic"],
            summary: "A potent psychedelic drug. Known for causing altered states of consciousness and hallucinations. Long duration (8-12 hours). Illegal in most jurisdictions."
        },
        cannabis: {
            aliases: ["marijuana", "weed", "pot", "grass"],
            categories: ["depressant", "psychedelic"],
            summary: "A psychoactive drug from the Cannabis plant. Effects include relaxation, altered perception, and appetite increase. Legal status varies by jurisdiction."
        },
        alcohol: {
            aliases: ["ethanol", "booze", "liquor"],
            categories: ["depressant", "habit-forming"],
            summary: "A central nervous system depressant. Legal in most jurisdictions for adults. Can be addictive and cause serious health problems with chronic use."
        }
    };

    const baseInfo = commonSubstances[key] || {};

    return {
        name: formatSubstanceName(key),
        aliases: baseInfo.aliases || [],
        summary: baseInfo.summary || `${formatSubstanceName(key)} is a substance listed in the database with limited available information. Always research thoroughly and exercise extreme caution.`,
        categories: baseInfo.categories || ["research-chemical"],
        warnings: "Limited information available. Exercise extreme caution. Always test substances and start with minimal doses if choosing to use.",
        source: "TripSit Database (Limited Data)"
    };
};

// Format substance name for display
const formatSubstanceName = (key: string): string => {
    return key
        .split(/[-_\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

// Load and process all substances from drugs.json
export const loadSubstanceDatabase = (): Record<string, SubstanceResponse> => {
    if (processedSubstances) {
        return processedSubstances;
    }

    processedSubstances = {};

    // Process each substance in the drugs.json file
    Object.entries(drugsData).forEach(([key, data]) => {
        // Process all entries, even empty ones
        processedSubstances![key] = processSubstanceData(key, data);

        // Add aliases as direct keys for easier searching
        const substance = processedSubstances![key];
        if (substance.aliases && Array.isArray(substance.aliases)) {
            substance.aliases.forEach((alias: string) => {
                const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (normalizedAlias && !processedSubstances![normalizedAlias]) {
                    processedSubstances![normalizedAlias] = processedSubstances![key];
                }
            });
        }
    });

    return processedSubstances;
};

// Search function for finding substances
export const searchSubstances = (query: string, category?: string): SubstanceResponse[] => {
    const database = loadSubstanceDatabase();
    const normalizedQuery = query.toLowerCase();
    const results: SubstanceResponse[] = [];

    Object.entries(database).forEach(([key, substance]) => {
        // Skip alias entries to avoid duplicates
        if (key !== substance.name.toLowerCase().replace(/[^a-z0-9]/g, "")) {
            return;
        }

        const matchesQuery =
            substance.name.toLowerCase().includes(normalizedQuery) ||
            (substance.aliases && substance.aliases.some(alias =>
                alias.toLowerCase().includes(normalizedQuery)
            ));

        const matchesCategory = !category ||
            category === "all" ||
            (substance.categories && substance.categories.includes(category));

        if (matchesQuery && matchesCategory) {
            results.push(substance);
        }
    });

    return results.slice(0, 15); // Limit results
};

// Get substance by exact name or alias
export const getSubstance = (name: string): SubstanceResponse | null => {
    const database = loadSubstanceDatabase();
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");

    return database[normalizedName] || null;
};

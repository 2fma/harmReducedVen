/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./harmReduction.css";

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import * as React from "@webpack/common";

// Import the comprehensive drug database
import drugData from "./data/drugs.json";
import { DrugInfo, SubstanceSearchResult } from "./types";

const logger = new Logger("HarmReduction");

const settings = definePluginSettings({
    enableNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show safety reminders when Discord starts",
        default: false,
        restartNeeded: false
    },
    showAdvancedInfo: {
        type: OptionType.BOOLEAN,
        description: "Display advanced pharmacological information",
        default: false
    },
    preferredUnits: {
        type: OptionType.SELECT,
        description: "Preferred dosage units",
        options: [
            { label: "Metric (mg/μg)", value: "metric", default: true },
            { label: "Imperial", value: "imperial" }
        ]
    },
    darkMode: {
        type: OptionType.BOOLEAN,
        description: "Use dark theme for harm reduction interface",
        default: true
    }
});

// Comprehensive harm reduction information organized by categories
const HARM_REDUCTION_SECTIONS = {
    testing: {
        title: "Testing",
        content: "Always test your substances before use. Testing kits can identify adulterants and confirm substance identity.",
        priority: "critical",
        subsections: [
            {
                title: "Reagent Testing",
                content: "Different reagents react with specific substances to produce color changes.",
                resources: [
                    { name: "DanceSafe", url: "https://dancesafe.org/", region: "US/CA", description: "Comprehensive testing kits and education" },
                    { name: "Reagent Tests UK", url: "https://www.reagent-tests.uk/", region: "UK/EU", description: "Professional reagent supplier" },
                    { name: "TestDrugS", url: "https://testdrugs.info/", region: "EU", description: "European testing resources" }
                ]
            },
            {
                title: "Professional Analysis",
                content: "Send samples for professional laboratory analysis when possible.",
                resources: [
                    { name: "WEDINOS", url: "https://www.wedinos.org/", region: "UK", description: "Free substance testing service" },
                    { name: "CheckPoint", url: "https://checkyourdrugs.at/", region: "Austria", description: "Anonymous substance analysis" }
                ]
            }
        ]
    },
    safety: {
        title: "Safety",
        content: "Essential safety practices to minimize risks and handle emergencies.",
        priority: "critical",
        subsections: [
            {
                title: "Set and Setting",
                content: "Your mindset and environment significantly impact your experience.",
                tips: [
                    "Choose a safe, comfortable environment",
                    "Have a trusted, sober person present",
                    "Ensure you're in a positive mental state",
                    "Avoid mixing substances",
                    "Have emergency contacts readily available"
                ]
            },
            {
                title: "Emergency Preparedness",
                content: "Know how to respond to overdoses and adverse reactions.",
                resources: [
                    { name: "Emergency Services", description: "US: 911, UK: 999, EU: 112", priority: "critical" },
                    { name: "Poison Control", description: "US: 1-800-222-1222", priority: "critical" },
                    { name: "TripSit Chat", url: "https://chat.tripsit.me/", description: "24/7 harm reduction support" }
                ]
            }
        ]
    },
    dosage: {
        title: "Dosing",
        content: "Proper dosing is crucial for safety and desired effects.",
        priority: "high",
        subsections: [
            {
                title: "General Principles",
                content: "Universal dosing guidelines for safer use.",
                tips: [
                    "Start with the lowest possible dose",
                    "Wait for full onset before redosing",
                    "Use accurate scales (0.1mg precision minimum)",
                    "Account for tolerance and cross-tolerance",
                    "Consider body weight and metabolism"
                ]
            }
        ]
    },
    interactions: {
        title: "Drug Interactions",
        content: "Understanding dangerous and beneficial drug combinations.",
        priority: "critical",
        subsections: [
            {
                title: "Dangerous Combinations",
                content: "These combinations can be life-threatening.",
                warnings: [
                    "Depressants + Depressants = Respiratory depression risk",
                    "Stimulants + Depressants = Masking effects can lead to overdose",
                    "MAOIs + Serotonergics = Serotonin syndrome risk",
                    "Alcohol + Almost anything = Increased toxicity and unpredictability"
                ]
            }
        ]
    },
    aftercare: {
        title: "Recovery & Aftercare",
        content: "Self Aftercare after substance use.",
        priority: "medium",
        subsections: [
            {
                title: "Physical Recovery",
                tips: [
                    "Stay hydrated with electrolytes",
                    "Eat nutritious foods",
                    "Get adequate sleep",
                    "Take vitamins (especially B-complex, C, Magnesium)",
                    "Avoid additional substances during recovery"
                ]
            },
            {
                title: "Mental Health",
                tips: [
                    "Practice integration techniques",
                    "Seek professional help if needed",
                    "Connect with supportive communities",
                    "Journal about your experiences",
                    "Take breaks between uses"
                ]
            }
        ]
    }
};

// Enhanced substance search with comprehensive database
const SubstanceSearch = () => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedSubstance, setSelectedSubstance] = React.useState<DrugInfo | null>(null);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState("all");

    const categories = React.useMemo(() => {
        const cats = new Set<string>();
        Object.values(drugData).forEach(drug => {
            if ("categories" in drug && Array.isArray(drug.categories)) {
                drug.categories.forEach(cat => cats.add(cat));
            }
        });
        return Array.from(cats) as string[];
    }, []);

    const filteredSubstances = React.useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        const results: SubstanceSearchResult[] = [];

        Object.entries(drugData).forEach(([key, drug]) => {
            const matchesQuery =
                drug.name?.toLowerCase().includes(query) ||
                drug.pretty_name?.toLowerCase().includes(query) ||
                ("aliases" in drug && Array.isArray(drug.aliases) && drug.aliases.some(alias => alias.toLowerCase().includes(query)));

            const matchesCategory = selectedCategory === "all" ||
                ("categories" in drug && Array.isArray(drug.categories) && drug.categories.includes(selectedCategory));

            if (matchesQuery && matchesCategory) {
                results.push({ key, ...drug } as SubstanceSearchResult);
            }
        });

        return results.slice(0, 15);
    }, [searchQuery, selectedCategory]);

    const handleSelectSubstance = (substance: SubstanceSearchResult) => {
        setSelectedSubstance(substance);
        setSearchQuery(substance.pretty_name || substance.name);
        setShowSuggestions(false);
    };

    return (
        <div className="hrd-search-container">
            <div className="hrd-search-header">
                <div className="hrd-search-title">
                    <h3>Substance Information Database</h3>
                </div>
                <p className="hrd-search-subtitle">
                    Search through the Substance Info database for safety information, dosages, and harm reduction guidelines.
                </p>
            </div>

            <div className="hrd-search-controls">
                <div className="hrd-search-row">
                    <div className="hrd-input-group">
                        <input
                            type="text"
                            className="hrd-search-input"
                            placeholder="Search substances, aliases, or effects..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                        />
                        <div className="hrd-input-icon">🔍</div>
                    </div>

                    <select
                        className="hrd-category-select"
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                            </option>
                        ))}
                    </select>
                </div>

                {showSuggestions && filteredSubstances.length > 0 && (
                    <div className="hrd-suggestions">
                        {filteredSubstances.map((substance: SubstanceSearchResult, index) => (
                            <div
                                key={index}
                                className="hrd-suggestion-item"
                                onClick={() => handleSelectSubstance(substance)}
                            >
                                <div className="hrd-suggestion-main">
                                    <span className="hrd-substance-name">
                                        {substance.pretty_name || substance.name}
                                    </span>
                                    {substance.categories && (
                                        <div className="hrd-substance-categories">
                                            {substance.categories.slice(0, 3).map(cat => (
                                                <span key={cat} className={`hrd-category-tag hrd-category-${cat}`}>
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {substance.aliases && Array.isArray(substance.aliases) && substance.aliases.length > 0 && (
                                    <div className="hrd-suggestion-aliases">
                                        Also known as: {substance.aliases.slice(0, 3).join(", ")}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedSubstance && (
                <div className="hrd-substance-details">
                    <div className="hrd-substance-header">
                        <h2 className="hrd-substance-title">
                            {selectedSubstance.pretty_name || selectedSubstance.name}
                        </h2>
                        {selectedSubstance.categories && (
                            <div className="hrd-substance-categories">
                                {selectedSubstance.categories.map(cat => (
                                    <span key={cat} className={`hrd-category-tag hrd-category-${cat}`}>
                                        {cat.replace("-", " ")}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedSubstance.properties?.summary && (
                        <div className="hrd-substance-summary">
                            <h4>Overview</h4>
                            <p>{selectedSubstance.properties.summary}</p>
                        </div>
                    )}

                    <div className="hrd-substance-grid">
                        {selectedSubstance.formatted_dose && Object.keys(selectedSubstance.formatted_dose).length > 0 && (
                            <div className="hrd-info-card">
                                <h4>Dosage Information</h4>
                                <div className="hrd-dosage-info">
                                    {Object.entries(selectedSubstance.formatted_dose).map(([route, doses]) => (
                                        <div key={route} className="hrd-dosage-route">
                                            <strong>{route}:</strong>
                                            <div className="hrd-dosage-ranges">
                                                {Object.entries(doses).map(([level, dose]) => (
                                                    <span key={level} className={`hrd-dose-level hrd-dose-${level.toLowerCase()}`}>
                                                        {level}: {dose}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedSubstance.dose_note && (
                                    <div className="hrd-warning">
                                        {selectedSubstance.dose_note}
                                    </div>
                                )}
                            </div>
                        )}

                        {(selectedSubstance.formatted_onset || selectedSubstance.formatted_duration || selectedSubstance.formatted_aftereffects) && (
                            <div className="hrd-info-card">
                                <h4>Timing/Durations</h4>
                                {selectedSubstance.formatted_onset && (
                                    <div className="hrd-timing-info">
                                        <strong>Onset:</strong> {addTimingUnits(formatTimingValue(selectedSubstance.formatted_onset), "onset")}
                                    </div>
                                )}
                                {selectedSubstance.formatted_duration && (
                                    <div className="hrd-timing-info">
                                        <strong>Duration:</strong> {addTimingUnits(formatTimingValue(selectedSubstance.formatted_duration), "duration")}
                                    </div>
                                )}
                                {selectedSubstance.formatted_aftereffects && (
                                    <div className="hrd-timing-info">
                                        <strong>After Effects:</strong> {addTimingUnits(formatTimingValue(selectedSubstance.formatted_aftereffects), "aftereffects")}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedSubstance.properties?.["test-kits"] && (
                            <div className="hrd-info-card">
                                <h4>Test Kit Results</h4>
                                <div className="hrd-test-results">
                                    {selectedSubstance.properties["test-kits"].split(" | ").map((test, index) => (
                                        <div key={index} className="hrd-test-result">
                                            {test}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(selectedSubstance.properties?.bioavailability ||
                            selectedSubstance.properties?.pharmacology ||
                            selectedSubstance.properties?.chemistry ||
                            selectedSubstance.properties?.metabolism ||
                            selectedSubstance.properties?.tolerance) && (
                                <div className="hrd-info-card">
                                    <h4>Advanced Pharmacological Information</h4>
                                    {selectedSubstance.properties?.bioavailability && (
                                        <div className="hrd-advanced-info">
                                            <strong>Bioavailability:</strong> {selectedSubstance.properties.bioavailability}
                                        </div>
                                    )}
                                    {selectedSubstance.properties?.pharmacology && (
                                        <div className="hrd-advanced-info">
                                            <strong>Pharmacology:</strong> {selectedSubstance.properties.pharmacology}
                                        </div>
                                    )}
                                    {selectedSubstance.properties?.chemistry && (
                                        <div className="hrd-advanced-info">
                                            <strong>Chemistry:</strong> {selectedSubstance.properties.chemistry}
                                        </div>
                                    )}
                                    {selectedSubstance.properties?.metabolism && (
                                        <div className="hrd-advanced-info">
                                            <strong>Metabolism:</strong> {selectedSubstance.properties.metabolism}
                                        </div>
                                    )}
                                    {selectedSubstance.properties?.tolerance && (
                                        <div className="hrd-advanced-info">
                                            <strong>Tolerance:</strong> {selectedSubstance.properties.tolerance}
                                        </div>
                                    )}
                                </div>
                            )}

                        {selectedSubstance.links && (
                            <div className="hrd-info-card">
                                <h4>Additional Resources</h4>
                                <div className="hrd-links">
                                    {Object.entries(selectedSubstance.links).map(([type, url]) => (
                                        <a key={type} href={url} target="_blank" rel="noopener noreferrer" className="hrd-resource-link">
                                            {type.charAt(0).toUpperCase() + type.slice(1)} Reports
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedSubstance.formatted_effects && (
                            <div className="hrd-info-card">
                                <h4>Effects Profile</h4>
                                <div className="hrd-effects-info">
                                    {Array.isArray(selectedSubstance.formatted_effects)
                                        ? selectedSubstance.formatted_effects.map((effect, index) => (
                                            <span key={index} className="hrd-effect-tag">
                                                {effect}
                                            </span>
                                        ))
                                        : Object.entries(selectedSubstance.formatted_effects).map(([category, effects]) => (
                                            <div key={category} className="hrd-effect-category">
                                                <strong>{category}:</strong>
                                                <div className="hrd-effect-list">
                                                    {Array.isArray(effects)
                                                        ? effects.map((effect, index) => (
                                                            <span key={index} className="hrd-effect-tag">
                                                                {effect}
                                                            </span>
                                                        ))
                                                        : <span className="hrd-effect-tag">{effects}</span>
                                                    }
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hrd-safety-reminder">
                        <div className="hrd-reminder-header">
                            <strong>Safety Reminder</strong>
                        </div>
                        <ul>
                            <li>Always test your substances with reagent kits</li>
                            <li>Start with low doses and never use alone</li>
                            <li>Have emergency contacts and naloxone available</li>
                            <li>Avoid mixing substances, especially depressants</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

// Beautiful section component for harm reduction info
interface HarmReductionSectionProps {
    section: any;
    sectionKey: string;
}

const HarmReductionSection = ({ section, sectionKey }: HarmReductionSectionProps) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className={`hrd-section hrd-section-${section.priority}`}>
            <div
                className="hrd-section-header"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="hrd-section-title">
                    <h3>{section.title}</h3>
                </div>
                <div className={`hrd-expand-icon ${expanded ? "expanded" : ""}`}>
                    <span>▼</span>
                </div>
            </div>

            <div className={`hrd-section-content ${expanded ? "expanded" : ""}`}>
                <p className="hrd-section-description">{section.content}</p>

                {section.subsections?.map((subsection: any, index: number) => (
                    <div key={index} className="hrd-subsection">
                        <h4 className="hrd-subsection-title">{subsection.title}</h4>
                        {subsection.content && <p>{subsection.content}</p>}

                        {subsection.tips && (
                            <ul className="hrd-tips-list">
                                {subsection.tips.map((tip: string, tipIndex: number) => (
                                    <li key={tipIndex}>{tip}</li>
                                ))}
                            </ul>
                        )}

                        {subsection.warnings && (
                            <div className="hrd-warnings">
                                {subsection.warnings.map((warning: string, warnIndex: number) => (
                                    <div key={warnIndex} className="hrd-warning-item">
                                        {warning}
                                    </div>
                                ))}
                            </div>
                        )}

                        {subsection.resources && (
                            <div className="hrd-resources">
                                <h5>Resources:</h5>
                                <div className="hrd-resource-grid">
                                    {subsection.resources.map((resource: any, resIndex: number) => (
                                        <div key={resIndex} className={`hrd-resource-card ${resource.priority || ""}`}>
                                            {resource.url ? (
                                                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                                    <strong>{resource.name}</strong>
                                                </a>
                                            ) : (
                                                <strong>{resource.name}</strong>
                                            )}
                                            {resource.region && (
                                                <span className="hrd-resource-region">{resource.region}</span>
                                            )}
                                            <p>{resource.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper function to format timing values
const formatTimingValue = (value: any): string => {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "object" && value !== null) {
        // Handle objects like { "value": "3-5" }
        if (value.value) {
            return value.value;
        }

        // Handle route-specific timing data like { "_unit": "minutes", "Oral_IR": "30-120", "Insufflated_XR": "5-10" }
        const routes = Object.keys(value).filter(key => key !== "_unit" && key !== "value");
        if (routes.length > 0) {
            // Format each route with its value
            const routeStrings = routes.map(route => {
                // Clean up route name for display
                const cleanRoute = route.replace(/_/g, " ").replace(/([A-Z]+)$/, " ($1)");
                return `${cleanRoute}: ${value[route]}`;
            });
            return routeStrings.join(", ");
        }

        // Fallback: return the first available timing value
        const firstKey = Object.keys(value)[0];
        return firstKey ? value[firstKey] : "Unknown";
    }
    return "Unknown";
};

// Helper function to add appropriate units to timing values
const addTimingUnits = (value: string, type: "onset" | "duration" | "aftereffects"): string => {
    if (value === "Unknown") return value;

    // Don't add units if they're already present
    if (value.includes("hour") || value.includes("min") || value.includes("day") || value.includes("minutes")) {
        return value;
    }

    // If the value contains route-specific information, add units appropriately
    if (value.includes(":")) {
        // Split by comma to handle multiple routes
        const parts = value.split(", ");
        const formattedParts = parts.map(part => {
            if (part.includes(":")) {
                const [route, timing] = part.split(": ");
                // Add appropriate units based on timing type and route
                let unit = "";
                switch (type) {
                    case "onset":
                        unit = " minutes";
                        break;
                    case "duration":
                    case "aftereffects":
                        unit = " hours";
                        break;
                }
                return `${route}: ${timing}${unit}`;
            }
            return part;
        });
        return formattedParts.join(", ");
    }

    // Add appropriate units based on timing type for simple values
    switch (type) {
        case "onset":
            return `${value} minutes`;
        case "duration":
        case "aftereffects":
            return `${value} hours`;
        default:
            return value;
    }
};

export default definePlugin({
    name: "HarmReduction",
    description: "Comprehensive Substance Information database and safety resources to aid in safer usage.",
    authors: [{ name: "Tietz", id: 272414701369950218n }],
    settings,

    start() {
        try {
            logger.info("HarmReduction plugin started");
            if (settings.store.enableNotifications) {
                showNotification({
                    title: "Harm Reduction Plugin Loaded!",
                    body: "Access the Search from the Plugin Settings. Stay safe, know your limits and always cross reference information",
                    permanent: false,
                    noPersist: true
                });
            }
        } catch (err) {
            logger.error("Failed to start plugin:", err);
        }
    },

    settingsAboutComponent: () => (
        <ErrorBoundary>
            <div className={`hrd-main-container ${settings.store.darkMode ? "dark" : "light"}`}>
                <div className="hrd-header">
                    <div className="hrd-header-content">
                        <h1 className="hrd-main-title">
                            <span className="hrd-logo">🛡️</span>
                            Harm Reduction
                        </h1>
                        <p className="hrd-main-subtitle">
                            Evidence-based safety information and resources for responsible substance use.
                            <br />
                            <strong>For harm reduction purposes only. This is not medical advice.</strong>
                        </p>
                    </div>
                    <div className="hrd-header-stats">
                        <div className="hrd-stat">
                            <span className="hrd-stat-number">{Object.keys(drugData).length}</span>
                            <span className="hrd-stat-label">Substances</span>
                        </div>
                    </div>
                </div>

                <div className="hrd-content">
                    <SubstanceSearch />

                    <div className="hrd-sections-container">
                        <div className="hrd-sections-header">
                            <h2>Essential Safety Information</h2>
                            <p>Click any section to expand detailed information and resources.</p>
                        </div>

                        <div className="hrd-sections-grid">
                            {Object.entries(HARM_REDUCTION_SECTIONS).map(([key, section]) => (
                                <HarmReductionSection
                                    key={key}
                                    section={section}
                                    sectionKey={key}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="hrd-footer">
                        <div className="hrd-emergency-banner">
                            <div className="hrd-emergency-content">
                                <strong>Medical Emergency?</strong>
                                <p>US: 911 | UK: 999 | EU: 112 | Poison Control: 1-800-222-1222</p>
                            </div>
                        </div>

                        <div className="hrd-disclaimer">
                            <p>
                                <strong>Legal Disclaimer:</strong> This information is for harm reduction and educational purposes only.
                                The author and distributors of this plugin are not responsible for any
                                consequences of substance use.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    )
});

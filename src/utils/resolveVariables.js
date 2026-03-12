export const PLACEHOLDER_REGEX = /\{\{([A-Za-z0-9_]+)\}\}/g;

export const extractPlaceholdersFromText = (text = "") => {
    const matches = [...text.matchAll(PLACEHOLDER_REGEX)];
    const unique = [...new Set(matches.map((match) => match[1]))];
    return unique;
};

export const buildVariablesObject = (placeholderNames = [], existingValues = {}) => {
    return placeholderNames.reduce((acc, name) => {
        acc[name] = existingValues[name] ?? "";
        return acc;
    }, {});
};

export const resolveTextWithVariables = (text = "", variables = {}) => {
    return text.replace(PLACEHOLDER_REGEX, (_, name) => {
        const value = variables[name];

        if (value === null || value === undefined) {
            return `{{${name}}}`;
        }

        const stringValue = String(value).trim();

        return stringValue ? stringValue : `{{${name}}}`;
    });
};
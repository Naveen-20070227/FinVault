// Safe DOM manipulation and XSS prevention utilities (replaces Bug C6)

export function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Tagged template literal for building safe HTML strings.
 * Usage: safeHtml`<div>${userText}</div>`
 */
export function safeHtml(strings, ...values) {
    return strings.reduce((result, string, i) => {
        const value = values[i - 1];
        let safeValue = "";
        
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                // If it is an array, join elements assuming they are already safe HTML chunks
                safeValue = value.join("");
            } else if (value && value.__isSafeHtml) {
                // Skip escaping if marked explicitly as safe
                safeValue = value.toString();
            } else {
                // Standard escape
                safeValue = esc(value);
            }
        }
        return result + safeValue + string;
    });
}

/**
 * Wraps a string to mark it as already safe/escaped so safeHtml doesn't double-escape it.
 */
export function markSafe(htmlString) {
    return {
        __isSafeHtml: true,
        toString: () => htmlString
    };
}

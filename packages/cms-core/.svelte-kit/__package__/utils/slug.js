/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A URL-safe slug string
 */
export function generateSlug(text) {
    if (!text)
        return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        // Replace spaces and multiple special characters with single hyphens
        .replace(/[^a-z0-9]+/g, '-')
        // Remove leading and trailing hyphens
        .replace(/^-+|-+$/g, '');
}
/**
 * Validate if a string is a valid slug
 * @param slug - The slug to validate
 * @returns Boolean indicating if the slug is valid
 */
export function isValidSlug(slug) {
    if (!slug)
        return false;
    // Valid slug: lowercase letters, numbers, and hyphens only
    // Cannot start or end with hyphen
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugPattern.test(slug);
}

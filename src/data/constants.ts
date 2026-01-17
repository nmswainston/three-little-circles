/**
 * Destination identifier constants
 * 
 * These constants define the IDs used for grouping entries by destination.
 * The system treats parkId as a generic destination bucket, allowing
 * both parks and resorts to be handled uniformly.
 */

/**
 * Destination ID for the Resorts bucket
 * 
 * Entries with this parkId represent resort destinations.
 * Use display aliases to set:
 * - parkName: "Resorts"
 * - landName: Resort name (e.g., "Wilderness Lodge Resort")
 * - attractionName: Specific location (e.g., "Lobby Window Displays")
 */
export const RESORTS_BUCKET_ID = "resorts_bucket";

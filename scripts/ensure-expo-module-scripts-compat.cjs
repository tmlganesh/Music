#!/usr/bin/env node

/**
 * Kept for build compatibility.
 *
 * This project is an Expo application (not an Expo module package), so there is
 * no module-specific postinstall patching required here. The script exists so
 * CI/EAS postinstall does not fail with MODULE_NOT_FOUND.
 */

console.log('[postinstall] expo-module-scripts compatibility check: no action needed for app project.');

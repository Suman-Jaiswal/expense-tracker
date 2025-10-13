import { config } from "../../config.js";
import { fetchStatements } from "./fetchStatements.js";

const fetchAllStatements = async (gmail, drive) => {
  const results = {
    total: 0,
    newStatements: [],
    skipped: 0,
    failed: 0,
    byResource: {},
  };

  for (const key of Object.keys(config.RESOURCES)) {
    const resource = config.RESOURCES[key];
    if (!resource.enabled) {
      console.log(`Skipping ${resource.label} as it is disabled`);
      results.skipped++;
      continue;
    }
    console.log(`Syncing ${resource.label} statements`);

    try {
      const result = await fetchStatements(gmail, drive, resource);

      if (result && result.newStatements) {
        results.total += result.newStatements.length;
        results.newStatements.push(...result.newStatements);
        results.byResource[resource.label] = result.newStatements.length;
      }
    } catch (error) {
      console.error(`Failed to sync ${resource.label}:`, error.message);
      results.failed++;
    }
  }

  return results;
};
export { fetchAllStatements };

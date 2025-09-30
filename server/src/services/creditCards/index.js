import { config } from "../../config.js";
import { fetchStatements } from "./fetchStatements.js";

const fetchAllStatements = async (gmail, drive) => {
  for (const key of Object.keys(config.RESOURCES)) {
    const resource = config.RESOURCES[key];
    if (!resource.enabled) {
      console.log(`Skipping ${resource.label} as it is disabled`);
      continue;
    }
    console.log(`Syncing ${resource.label} statements`);
    await fetchStatements(gmail, drive, resource);
  }
};
export { fetchAllStatements };

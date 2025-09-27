import { fetchStatementsAXIS } from "./fetchStatementsAXIS.js";
import { fetchStatementsICICI } from "./fetchStatementsICICI.js";
import { fetchStatementsSBI } from "./fetchStatementsSBI.js";

const fetchAllStatements = async (gmail, drive) => {
  console.log("Syncing ICICI Credit cards statements");
  await fetchStatementsICICI(gmail, drive);

  console.log("Syncing SBI Credit cards statements");
  await fetchStatementsSBI(gmail, drive);

  console.log("Syncing AXIS Credit cards statements");
  await fetchStatementsAXIS(gmail, drive);
};
export { fetchAllStatements };

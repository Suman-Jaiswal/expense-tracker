import { fetchStatementsAxis } from "./fetchStatementsAxis.js";

const fetchAllStatements = async (gmail, drive) => {
  // console.log("Syncing ICICI Credit cards statements");
  // await fetchStatementsICICI(gmail, drive);

  // console.log("Syncing SBI Credit cards statements");
  // await fetchStatementsSBI(gmail, drive);

  console.log("Syncing AXIS Credit cards statements");
  await fetchStatementsAxis(gmail, drive);
};
export { fetchAllStatements };

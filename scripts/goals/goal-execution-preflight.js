/**
 * Soda OS Goal Execution Preflight Module
 * Standalone executable and library for goal execution preflight checks.
 */
const fs = require("fs");
const path = require("path");
const cliLib = require("../../cli.js");

function runPreflight(argv) {
  return cliLib.runGoalExecute(argv);
}

module.exports = {
  runPreflight,
  runGoalExecute: cliLib.runGoalExecute,
};

if (require.main === module) {
  runPreflight(process.argv.slice(2));
}

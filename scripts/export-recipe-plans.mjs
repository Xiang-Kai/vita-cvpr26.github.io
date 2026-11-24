// Export data only. No generated command is executed.
import { recipePlan } from "../static/js/recipe.js";
import { recipeContract } from "../static/js/recipe-contract.js";

const plans = ["smoke", "paper"].flatMap((mode) =>
  recipeContract.microbatches.flatMap((batch) =>
    ["all", ...recipeContract.suites].map((suite) =>
      recipePlan(mode, batch, suite),
    ),
  ),
);
console.log(JSON.stringify(plans, null, 2));

import { recipeContract } from "./recipe-contract.js";

export function recipePlan(mode, batch, suite = "all") {
  if (
    !["smoke", "paper"].includes(mode) ||
    !recipeContract.microbatches.includes(batch) ||
    !["all", ...recipeContract.suites].includes(suite)
  ) {
    throw new Error("Choose a supported training plan and integer microbatch.");
  }
  const smoke = mode === "smoke";
  const source = recipeContract.plans[mode];
  const suites = suite === "all" ? [...recipeContract.suites] : [suite];
  const stages = source.stages.map((stage) => {
    const effectiveBatch = smoke ? batch : stage.effectiveBatch;
    const accumulation = effectiveBatch / batch;
    return {
      name: stage.name,
      updates: stage.updates,
      effectiveBatch,
      accumulation,
      microsteps: stage.updates * accumulation,
    };
  });
  const evaluation = {
    ...source.evaluation,
    trials:
      suites.length *
      source.evaluation.tasksPerSuite *
      source.evaluation.episodesPerTask,
  };
  const output = `runs/libero-${smoke ? "smoke" : "paper-budget"}${suite === "all" ? "" : `-${suite.replace("libero_", "")}`}`;
  const command = [
    "python -m vita.libero_recipe prepare \\",
    `  --output ${output}${smoke ? " --smoke" : ""} \\`,
    smoke
      ? `  --microbatch ${batch} --episodes-per-task ${evaluation.episodesPerTask} --max-tasks ${evaluation.maxTasks}`
      : `  --microbatch ${batch} --memory-gib ${source.memoryGiB}`,
  ];
  if (suite !== "all") {
    command[2] += " \\";
    command.push(`  --suites ${suite}`);
  }
  const microsteps = stages.reduce((sum, stage) => sum + stage.microsteps, 0);
  return {
    mode,
    microbatch: batch,
    suites,
    stages,
    evaluation,
    memoryGiB: source.memoryGiB,
    updates: source.updates,
    precision: source.precision,
    microsteps,
    effectiveBatch: [stages[0].effectiveBatch, stages[2].effectiveBatch],
    accumulation: [stages[0].accumulation, stages[2].accumulation],
    command: command.join("\n"),
    description: `${source.updates.toLocaleString("en-US")} optimizer updates / ${microsteps.toLocaleString("en-US")} training microsteps. ${evaluation.trials.toLocaleString("en-US")} requested simulator trials. ${smoke ? "Smoke only." : "Budget only, not a completed experiment."}`,
  };
}

export function recipeSelection(search) {
  const params = new URLSearchParams(search);
  const mode = params.get("plan") ?? "smoke";
  const rawBatch = params.get("batch") ?? "2";
  const batch = Number(rawBatch);
  const suite = params.get("suite") ?? "all";
  try {
    if (String(batch) !== rawBatch) throw new Error("Noncanonical microbatch");
    recipePlan(mode, batch, suite);
    return { mode, batch, suite };
  } catch {
    return { mode: "smoke", batch: 2, suite: "all" };
  }
}

export function recipeURL(href, mode, batch, suite) {
  recipePlan(mode, batch, suite);
  const url = new URL(href);
  // Only planner options are shared; never propagate unrelated query values.
  url.search = new URLSearchParams({ plan: mode, batch: String(batch), suite });
  url.hash = "code";
  return url.href;
}

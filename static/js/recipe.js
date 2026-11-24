const allowedBatches = [1, 2, 4, 8, 16, 32, 64];

export function recipePlan(mode, batch) {
  if (!["smoke", "paper"].includes(mode) || !allowedBatches.includes(batch)) {
    throw new Error("Choose a supported training plan and integer microbatch.");
  }
  const smoke = mode === "smoke";
  return {
    updates: smoke ? 6 : 360000,
    effectiveBatch: smoke ? [batch, batch] : [1024, 192],
    accumulation: smoke ? [1, 1] : [1024 / batch, 192 / batch],
    command: [
      "python -m vita.libero_recipe prepare \\",
      `  --output runs/libero-${smoke ? "smoke --smoke" : "paper-budget"} \\`,
      smoke
        ? `  --microbatch ${batch} --episodes-per-task 1 --max-tasks 1`
        : `  --microbatch ${batch} --memory-gib 16`,
    ].join("\n"),
    description: smoke
      ? `Effective batch: ${batch} in both stages. Smoke only.`
      : `Effective batches: 1,024 / 192. Accumulation: ${1024 / batch} / ${192 / batch}.`,
  };
}

#!/usr/bin/env bash
# Confirmation runs at power for the two live positive leads (sequential, quota-safe).
set -u
cd "$(dirname "$0")/.."
export EVAL_RUN=confirm
OUT=evals/results/confirm; mkdir -p "$OUT"
LOG=evals/results/confirm.log; : > "$LOG"
run () { echo "===== $* =====" | tee -a "$LOG"; eval "$*" 2>&1 | grep -v "_omz_nvm" | tee -a "$LOG"; echo "" | tee -a "$LOG"; }
echo "CONFIRM START $(date -u +%FT%TZ)" | tee -a "$LOG"
# red-team: full balanced DiverseVul (200, 100/100) — no LIMIT to keep balance
run "FORCE_SKILL=red-team CONC=4 OUTFILE=$OUT/redteam-diversevul-balanced-n200.json node evals/run-correctness.js diversevul-balanced"
# fermi dataset: n=150 numeric OOM under probabilistic skill
run "FORCE_SKILL=probabilistic LIMIT=150 CONC=4 OUTFILE=$OUT/numeric-fermi-n150.json node evals/run-numeric.js fermi"
echo "CONFIRM DONE $(date -u +%FT%TZ)" | tee -a "$LOG"

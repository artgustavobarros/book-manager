#!/usr/bin/env bash
# Restaura as skills de agente (fora do git) a partir do skills-lock.json, mais o impeccable,
# que tem instalador próprio, e liga cada skill de .agents/skills em .claude/skills.
set -euo pipefail
shopt -s nullglob
npx -y skills@1.7.4 experimental_install -y
npx -y impeccable@4.7.0 install -y --project --providers=claude,agents
mkdir -p .claude/skills
for dir in .agents/skills/*/; do
  name="$(basename "$dir")"
  [[ -e ".claude/skills/$name" ]] || ln -s "../../.agents/skills/$name" ".claude/skills/$name"
done

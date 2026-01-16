@echo off
setlocal enabledelayedexpansion
echo [DEBUG] before
if not defined USE_ENTRYPOINT (
  if defined SEED_TENANT_IDS (
    echo seeding tenants
  ) else (
    if defined RUN_SEEDS_ON_START (
      echo run seeds on start
    ) else (
      echo skip seeds
    )
  )
) else (
  echo USE_ENTRYPOINT set
)
echo [DEBUG] after

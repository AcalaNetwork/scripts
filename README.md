# scripts

- Install
  - `yarn`
- Run
  - `yarn ts-node src/scripts/loan-positions.ts`
- Configure private node
  - Copy `.env.example` to `.env` and add ws endpoint
- Parameters
  - `--network`: network name, `all` for all the supported networks
  - `--output`: `csv` or `console`. Default `console` which uses `console.table` for output and enable balance formatting.

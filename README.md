# scripts

- Install
  - `yarn`
- Run
  - `yarn ts-node src/scripts/loan-positions.ts`
- Configure private node
  - Copy `.env.example` to `.env` and add ws endpoint
- Parameters
  - `--network`: network name, `all` for all the supported networks. Support comma seperated list: `--network=karura,acala`
  - `--output`: `csv` or `console`. Default `console` which uses `console.table` for output and enable balance formatting.
  - `--at`: Run the script at specific block height. Default `now`. Support comma seperated list: `--at=7d,3d,-100,now`
    - `now`: latest block
    - positive number: block height
    - negative number: x block before
    - relative time unit e.g. `1w`, `2d`, `3h`, `4m`, `5s`: relative time from current block

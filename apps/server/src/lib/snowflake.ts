// Cordis Snowflake ID generator
// Format: [42 bits timestamp][10 bits worker id][12 bits increment]
// Epoch: January 1, 2025 00:00:00 UTC

const CORDIS_EPOCH = 1735689600000n
const WORKER_ID = 1n
let increment = 0n

export function generateSnowflake(): bigint {
  const now = BigInt(Date.now()) - CORDIS_EPOCH
  const inc = increment++ % 4096n
  return (now << 22n) | (WORKER_ID << 12n) | inc
}

export function snowflakeToString(): string {
  return generateSnowflake().toString()
}

export function snowflakeToDate(id: string | bigint): Date {
  const snowflake = typeof id === 'string' ? BigInt(id) : id
  const timestamp = (snowflake >> 22n) + CORDIS_EPOCH
  return new Date(Number(timestamp))
}

export function snowflakeToTimestamp(id: string | bigint): number {
  return snowflakeToDate(id).getTime()
}

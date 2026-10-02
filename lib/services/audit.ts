import { PoolClient } from "pg";
import { CardStatus } from "../types";

export async function createAuditLog(
  client: PoolClient,
  staffId: string,
  cardId: number,
  action: CardStatus,
  reason?: string
): Promise<void> {
  await client.query(
    `
    INSERT INTO AUDIT_LOG
      (
        Staff_ID,
        Card_ID,
        Action,
        Reason
      )
    VALUES
      ($1, $2, $3, $4)
    `,
    [
      staffId,
      cardId,
      action,
      reason || null,
    ]
  );
}
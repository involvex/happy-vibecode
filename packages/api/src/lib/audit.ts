import {createDb} from '@happy-vibecode/db'

export async function logAuditEvent(
	db: ReturnType<typeof createDb>,
	data: {
		actorId: string
		actorName?: string | null
		targetId?: string | null
		targetName?: string | null
		action: string
		details?: Record<string, unknown> | null
	},
) {
	const {schema} = await import('@happy-vibecode/db')

	await db.insert(schema.auditLogs).values({
		id: crypto.randomUUID(),
		actorId: data.actorId,
		actorName: data.actorName ?? null,
		targetId: data.targetId ?? null,
		targetName: data.targetName ?? null,
		action: data.action,
		details: data.details ? JSON.stringify(data.details) : null,
		createdAt: new Date(),
	})
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';

export async function GET() {
  try {
    const db = getDb();
    const result = await db.query<{
      id: string;
      name: string;
      code: string;
      description: string;
      order_index: number;
    }>(
      `SELECT id, name, code, description, order_index
       FROM ecell_departments
       WHERE is_active = 1
       ORDER BY order_index ASC`
    );

    return NextResponse.json({
      success: true,
      departments: result.rows,
    });
  } catch (error: any) {
    console.error('[ECELL Departments GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch departments' }, { status: 500 });
  }
}

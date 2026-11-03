import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';

export async function GET() {
  try {
    const db = getDb();

    // Query question categories count
    const questionCatRows = await db.query<{ category: string; count: string | number }>(
      `SELECT category, COUNT(*) as count FROM questions GROUP BY category ORDER BY count DESC`
    );

    // Standard curated categories aligned with STRUCT's student career focus
    const standardCategories = [
      {
        id: 'cat_dsa',
        name: 'Data Structures & Algorithms',
        slug: 'dsa',
        description: 'Arrays, Trees, Graphs, Dynamic Programming, and algorithmic problem-solving.',
        difficulty: 'Medium to Hard',
        icon: 'code',
      },
      {
        id: 'cat_web',
        name: 'Web Architecture & Full-Stack',
        slug: 'web-architecture',
        description: 'React, Next.js, Node.js, REST APIs, and client-server systems.',
        difficulty: 'Medium',
        icon: 'layers',
      },
      {
        id: 'cat_db',
        name: 'Databases & System Design',
        slug: 'databases',
        description: 'SQL query optimization, indexing, ACID transactions, and scalability.',
        difficulty: 'Medium',
        icon: 'database',
      },
      {
        id: 'cat_aptitude',
        name: 'Quantitative Aptitude',
        slug: 'quantitative-aptitude',
        description: 'Numerical reasoning, percentages, time-work, probability, and speed math.',
        difficulty: 'Easy to Medium',
        icon: 'trending-up',
      },
      {
        id: 'cat_logical',
        name: 'Logical Reasoning',
        slug: 'logical-reasoning',
        description: 'Analytical reasoning, puzzles, syllogisms, and pattern recognition.',
        difficulty: 'Medium',
        icon: 'compass',
      },
      {
        id: 'cat_cs_fundamentals',
        name: 'Core CS Fundamentals',
        slug: 'cs-fundamentals',
        description: 'Operating systems, computer networks, OOPs, and security protocols.',
        difficulty: 'Medium',
        icon: 'cpu',
      },
    ];

    const categoryCounts: Record<string, number> = {};
    for (const row of questionCatRows.rows || []) {
      if (row.category) {
        categoryCounts[row.category.toLowerCase()] = Number(row.count);
      }
    }

    const categoriesWithStats = standardCategories.map(cat => {
      let count = 0;
      if (cat.slug === 'dsa') count = (categoryCounts['data structures'] || 0) + (categoryCounts['algorithms'] || 0) || 8;
      else if (cat.slug === 'web-architecture') count = (categoryCounts['web architecture'] || 0) + (categoryCounts['react'] || 0) + (categoryCounts['typescript'] || 0) || 12;
      else if (cat.slug === 'databases') count = (categoryCounts['databases'] || 0) + (categoryCounts['database architecture'] || 0) + (categoryCounts['system design'] || 0) || 8;
      else count = 10;

      return {
        ...cat,
        questionCount: count,
      };
    });

    return NextResponse.json({
      success: true,
      categories: categoriesWithStats,
    });
  } catch (error: any) {
    console.error('[Categories Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load categories' },
      { status: 500 }
    );
  }
}

'use client';

import React from 'react';
import Link from 'next/link';

export function CategoriesSection() {
  const tracks = [
    {
      title: 'Data Structures & Algorithms',
      badge: 'Core Problem Solving',
      desc: 'Master time-space complexities, arrays, hash maps, trees, recursion, and dynamic programming.',
      topics: ['Arrays & HashMaps', 'Binary Trees', 'Graphs & BFS/DFS', 'Dynamic Programming'],
      color: '#0284C7',
    },
    {
      title: 'Web Architecture & Full-Stack',
      badge: 'Engineering Systems',
      desc: 'Client-server protocols, React lifecycle, Next.js Server Components, state management, and REST APIs.',
      topics: ['React 19 Hooks', 'TypeScript Typing', 'Server Components', 'API Design'],
      color: '#0A1B38',
    },
    {
      title: 'Databases & System Design',
      badge: 'Data Infrastructure',
      desc: 'Relational data modeling, index optimization, transactions, caching architectures, and scaling strategies.',
      topics: ['SQL Queries & Joins', 'ACID Transactions', 'Redis Caching', 'Microservices'],
      color: '#1E293B',
    },
    {
      title: 'Quantitative Aptitude',
      badge: 'Campus Placement Focus',
      desc: 'High-speed mathematical reasoning, time-speed-distance, probability, algebra, and commercial math.',
      topics: ['Speed Math & Ratios', 'Percentages & Profit', 'Permutation & Combination', 'Data Interpretation'],
      color: '#059669',
    },
    {
      title: 'Logical & Analytical Reasoning',
      badge: 'Cognitive Evaluation',
      desc: 'Critical thinking, directional puzzles, syllogisms, sequence patterns, and deductive logic.',
      topics: ['Seating Arrangements', 'Syllogisms', 'Blood Relations', 'Pattern Completion'],
      color: '#D97706',
    },
    {
      title: 'Core CS Fundamentals',
      badge: 'Interview Essentials',
      desc: 'Operating system scheduling, memory management, TCP/IP networking, and secure coding practices.',
      topics: ['Process Scheduling', 'Virtual Memory', 'TCP/IP & DNS', 'OOP Concepts'],
      color: '#64748B',
    },
  ];

  return (
    <section
      id="categories"
      style={{
        padding: '90px 24px',
        background: '#F8FAFD',
        borderTop: '1px solid #E5E8EF',
      }}
    >
      <div style={{ maxWidth: '1220px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#0284C7',
              marginBottom: '10px',
              display: 'inline-block',
            }}
          >
            Curated Skill Assessment Tracks
          </span>
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: 800,
              color: '#0A1B38',
              letterSpacing: '-1px',
              margin: '0 0 16px',
            }}
          >
            Explore Assessment Categories
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#64748B',
              maxWidth: '640px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Practice assessments categorized by industry recruitment patterns. Benchmark your strengths and eliminate skill deficiencies.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: '24px',
          }}
        >
          {tracks.map((t, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(10, 27, 56, 0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      background: '#F1F5F9',
                      color: t.color,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A1B38', margin: '0 0 10px' }}>
                  {t.title}
                </h3>

                <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55, margin: '0 0 18px' }}>
                  {t.desc}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
                  {t.topics.map((top, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        background: '#F8FAFD',
                        border: '1px solid #E2E8F0',
                        color: '#475569',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {top}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Link
                  href="/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: t.color,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>Practice Tests in this Track &rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

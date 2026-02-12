import { Agent, Group, ScoreboardCardData, SidebarLink } from '../models/prompt-catchup.models';

export const SCOREBOARD_DATA: ScoreboardCardData[] = [
  {
    title: 'Prompt Engineering Champions',
    columns: ['Ranking', 'Name', 'Prompts Shared'],
    rows: [
      { ranking: 1, name: 'Rick Lawton', value: 67 },
      { ranking: 2, name: 'Malvinder Kainth', value: 53 },
      { ranking: 3, name: 'Oswaldo Ortiz', value: 46 },
      { ranking: 4, name: 'Lakshmi Desaraju', value: 39 },
      { ranking: 5, name: 'Aditya Singh', value: 38 },
    ],
  },
  {
    title: 'Top-voted Prompts',
    columns: ['Ranking', 'Name', '#’s Upvotes'],
    rows: [
      { ranking: 1, name: 'Meeting Minutes', value: 67 },
      { ranking: 2, name: 'Refine Prompt', value: 53 },
      { ranking: 3, name: 'How do I Catch Up?', value: 46 },
      { ranking: 4, name: 'Summarize Emails', value: 39 },
      { ranking: 5, name: 'Craft response', value: 38 },
    ],
  },
  {
    title: 'Recent Shared Prompts',
    columns: ['Ranking', 'Name', '#’s Upvotes'],
    rows: [
      { ranking: 1, name: 'CSC.TAM', value: 2 },
      { ranking: 2, name: 'Release Engineering', value: 1 },
      { ranking: 3, name: 'Testing Requirements', value: 0 },
      { ranking: 4, name: 'Dev Manifesto', value: 0 },
      { ranking: 5, name: 'Architecture Principles', value: 0 },
    ],
    footnote: 'Refreshed every 30 min',
  },
];

export const GROUPS: Group[] = [
  { name: 'My Upvotes', count: 3, slug: 'my-upvotes' },
  { name: 'Agents', count: 30, slug: 'agents' },
  { name: 'Apps', count: 15, slug: 'apps' },
  { name: 'Roles', count: 15, slug: 'roles' },
  { name: 'Business Org.', count: 20, slug: 'business-org' },
  { name: 'Functions', count: 15, slug: 'functions' },
];

export const SIDEBAR_LINKS: SidebarLink[] = [
  { label: 'Share your Prompt', icon: 'share' },
  { label: 'Add your Agent', icon: 'add_circle' },
  { label: 'About', icon: 'info' },
  { label: 'FAQ', icon: 'help' },
];

export const AGENTS: Agent[] = [
  {
    id: 1,
    name: 'Technology Adherence Manager',
    description: 'Monitors and enforces technology standards across engineering teams, ensuring compliance with approved tech stacks.',
    status: 'ADOPT',
    promptCount: 142,
    updatedDate: '2025-12-15',
    category: 'agents',
  },
  {
    id: 2,
    name: 'Product Owner Agent',
    description: 'Assists product owners with backlog grooming, story writing, and sprint planning activities.',
    status: 'ADOPT',
    promptCount: 128,
    updatedDate: '2025-12-14',
    category: 'roles',
  },
  {
    id: 3,
    name: 'Production Agent',
    description: 'Manages production deployments, rollbacks, and incident response automation workflows.',
    status: 'UNDER_EVALUATION',
    promptCount: 115,
    updatedDate: '2025-12-13',
    category: 'agents',
  },
  {
    id: 4,
    name: 'LSE Agent',
    description: 'Large-scale engineering agent that handles distributed system design and architecture reviews.',
    status: 'ADOPT',
    promptCount: 97,
    updatedDate: '2025-12-12',
    category: 'functions',
  },
  {
    id: 5,
    name: 'Release Engineering Agent',
    description: 'Automates release pipelines, version management, and deployment artifact generation.',
    status: 'ADOPT',
    promptCount: 89,
    updatedDate: '2025-12-11',
    category: 'agents',
  },
  {
    id: 6,
    name: 'Technical Program Manager',
    description: 'Coordinates cross-team technical programs, tracks milestones, and identifies blockers.',
    status: 'UNDER_EVALUATION',
    promptCount: 76,
    updatedDate: '2025-12-10',
    category: 'roles',
  },
  {
    id: 7,
    name: 'Testing Agent',
    description: 'Generates test cases, manages test suites, and provides coverage analysis reports.',
    status: 'ADOPT',
    promptCount: 64,
    updatedDate: '2025-12-09',
    category: 'agents',
  },
  {
    id: 8,
    name: 'Performance Agent',
    description: 'Analyzes application performance metrics, identifies bottlenecks, and suggests optimizations.',
    status: 'UNDER_EVALUATION',
    promptCount: 58,
    updatedDate: '2025-12-08',
    category: 'functions',
  },
  {
    id: 9,
    name: 'Cloud One Agent',
    description: 'Manages cloud infrastructure provisioning, scaling policies, and cost optimization across providers.',
    status: 'ADOPT',
    promptCount: 45,
    updatedDate: '2025-12-07',
    category: 'apps',
  },
  {
    id: 10,
    name: 'Ancestria Agent',
    description: 'Traces dependency trees, maps service lineage, and provides impact analysis for changes.',
    status: 'UNDER_EVALUATION',
    promptCount: 38,
    updatedDate: '2025-12-06',
    category: 'apps',
  },
];

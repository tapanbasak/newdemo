import { Agent, Group } from "@/lib/types";

export const GROUPS: Group[] = [
  { name: "My Upvotes", count: 3, slug: "my-upvotes" },
  { name: "Agents / Assistants", count: 30, slug: "agents" },
  { name: "Apps", count: 15, slug: "apps" },
  { name: "Roles", count: 15, slug: "roles" },
  { name: "Business Org.", count: 20, slug: "business-org" },
  { name: "Functions", count: 15, slug: "functions" },
];

export const SIDEBAR_LINKS: Array<{ label: string; href?: string }> = [
  { label: "Share your Prompt", href: "/prompt-catchup/share" },
  { label: "Add your Agent / Assistant" },
  { label: "About" },
  { label: "FAQ" },
];

export const SCOREBOARD_DATA = [
  {
    title: "Prompt Engineering Champions",
    columns: ["Ranking", "Name", "Prompts Shared"],
    rows: [
      { ranking: 1, name: "Rick Lawton", value: 67 },
      { ranking: 2, name: "Malvinder Kainth", value: 53 },
      { ranking: 3, name: "Oswaldo Ortiz", value: 46 },
      { ranking: 4, name: "Lakshmi Desaraju", value: 39 },
      { ranking: 5, name: "Aditya Singh", value: 38 },
    ],
  },
  {
    title: "Top-voted Prompts",
    columns: ["Ranking", "Name", "#'s Upvotes"],
    rows: [
      { ranking: 1, name: "Meeting Minutes", value: 67 },
      { ranking: 2, name: "Refine Prompt", value: 53 },
      { ranking: 3, name: "How do I Catch Up?", value: 46 },
      { ranking: 4, name: "Summarize Emails", value: 39 },
      { ranking: 5, name: "Craft response", value: 38 },
    ],
  },
  {
    title: "Recent Shared Prompts",
    columns: ["Ranking", "Name", "#'s Upvotes"],
    rows: [
      { ranking: 1, name: "CSC.TAM", value: 2 },
      { ranking: 2, name: "Release Engineering", value: 1 },
      { ranking: 3, name: "Testing Requirements", value: 0 },
      { ranking: 4, name: "Dev Manifesto", value: 0 },
      { ranking: 5, name: "Architecture Principles", value: 0 },
    ],
    footnote: "Refreshed every 30 min",
  },
];

export const AGENTS: Agent[] = [
  {
    id: 1,
    name: "Technology Adherence Manager",
    description:
      "Monitors and enforces technology standards across engineering teams, ensuring compliance with approved tech stacks.",
    status: "ADOPT",
    promptCount: 142,
    updatedDate: "2025-12-15",
    category: "agents",
  },
  {
    id: 3,
    name: "Production Agent",
    description:
      "Manages production deployments, rollbacks, and incident response automation workflows.",
    status: "UNDER_EVALUATION",
    promptCount: 115,
    updatedDate: "2025-12-13",
    category: "agents",
  },
  {
    id: 4,
    name: "LSE Agent",
    description:
      "Large-scale engineering agent that handles distributed system design and architecture reviews.",
    status: "ADOPT",
    promptCount: 97,
    updatedDate: "2025-12-12",
    category: "agents",
  },
  {
    id: 5,
    name: "Release Engineering Agent",
    description:
      "Automates release pipelines, version management, and deployment artifact generation.",
    status: "ADOPT",
    promptCount: 89,
    updatedDate: "2025-12-11",
    category: "agents",
  },
  {
    id: 7,
    name: "Testing Agent",
    description:
      "Generates test cases, manages test suites, and provides coverage analysis reports.",
    status: "ADOPT",
    promptCount: 64,
    updatedDate: "2025-12-09",
    category: "agents",
  },
  {
    id: 8,
    name: "Performance Agent",
    description:
      "Analyzes application performance metrics, identifies bottlenecks, and suggests optimizations.",
    status: "UNDER_EVALUATION",
    promptCount: 58,
    updatedDate: "2025-12-08",
    category: "agents",
  },
  {
    id: 9,
    name: "Cloud One Agent",
    description:
      "Manages cloud infrastructure provisioning, scaling policies, and cost optimization across providers.",
    status: "ADOPT",
    promptCount: 45,
    updatedDate: "2025-12-07",
    category: "agents",
  },
  {
    id: 10,
    name: "Ancestria Agent",
    description:
      "Traces dependency trees, maps service lineage, and provides impact analysis for changes.",
    status: "UNDER_EVALUATION",
    promptCount: 38,
    updatedDate: "2025-12-06",
    category: "agents",
  },
  // Apps
  {
    id: 11,
    name: "Devin AI",
    description:
      "Prompts that help generate code, resolve issues, and automate end-to-end engineering tasks.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 12,
    name: "Copilot",
    description:
      "Copilot prompts that help draft, refine, summarize, and explain code and application logic.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 13,
    name: "OneNote",
    description:
      "OneNote prompts that help organize, summarize, and extract insights from meeting notes, docs, and whiteboards.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 14,
    name: "Excel",
    description:
      "Excel prompts that help automate data cleanup, formula generation, reporting, and structured spreadsheet analysis.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 15,
    name: "Outlook",
    description:
      "Outlook prompts that help draft email responses, summarize threads, and manage calendar workflows.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 16,
    name: "Project Tracking System",
    description:
      "PTS prompts that help track project status, generate status reports, and manage milestones across complex initiatives.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 17,
    name: "Stylus Workspaces",
    description:
      "Stylus prompts that help write, refactor, and comment code inside the workspace for engineering teams.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 18,
    name: "ServiceNow",
    description:
      "ServiceNow prompts that help update tickets, draft incident notes, and suggest next steps for support engineers.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 19,
    name: "GitHub Copilot",
    description:
      "GitHub Copilot prompts that help design repositories, generate pull requests, and summarize code reviews.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  {
    id: 20,
    name: "OpenAI GPT",
    description:
      "OpenAI GPT prompts that help analyze information, generate content, and perform reasoning using general-purpose GPT models.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "apps",
  },
  // Roles
  {
    id: 21,
    name: "Incident Manager",
    description:
      "Incident Manager prompts that help triage issues, summarize impact, generate updates, and drive incident communication.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 22,
    name: "Release Manager",
    description:
      "Release Manager prompts that help plan releases, manage rollout windows, and track release readiness.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 23,
    name: "Scrum Master",
    description:
      "Scrum Master prompts that help run standups, inspect sprint reports, surface risks, and support Agile team ceremonies.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 24,
    name: "Quality Engineer",
    description:
      "Quality Engineer prompts that help create test ideas, validate functionality, track defects, and automate QA documentation.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 25,
    name: "Developer / Software Engineer",
    description:
      "Developer prompts that help generate code, create unit tests, review logic, refactor modules, and accelerate engineering workflows.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 26,
    name: "Business Analyst",
    description:
      "Business Analyst prompts that help gather requirements, draft process flows, analyze metrics, and support impact assessments.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 27,
    name: "Data Analyst",
    description:
      "Data Analyst prompts that help clean data, generate insights, explore outliers, and author analytics summaries.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  {
    id: 28,
    name: "Product Owner",
    description:
      "Product Owner prompts that help define user stories, refine acceptance criteria, prioritize backlog, and prepare release notes.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "roles",
  },
  // Business Org.
  {
    id: 29,
    name: "Services",
    description:
      "Services prompts that help support shared operational processes, enterprise service delivery, and cross-business workflows.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 30,
    name: "Markets",
    description:
      "Markets prompts that help summarize market activity, support trading workflows, and generate cross-border scenario reports.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 31,
    name: "Banking & International",
    description:
      "Banking & International prompts that help compose relationship briefings, prepare client updates, and summarize cross-border servicing.",
    status: "UNDER_EVALUATION",
    promptCount: 63,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 32,
    name: "Wealth",
    description:
      "Wealth prompts that help organize client reviews, support advisory workflows, and enhance wealth management reporting.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 33,
    name: "U.S. Personal Banking",
    description:
      "U.S. Personal Banking prompts that help generate consumer banking campaign ideas, summarize branch insights, and prepare product updates.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 34,
    name: "U.S. Consumer Cards",
    description:
      "Consumer Cards prompts that help support card servicing, regulatory updates, customer communication, and operational reporting.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 35,
    name: "Client Organization",
    description:
      "Client Organization prompts that help summarize portfolio performance, generate client-ready narratives, and prepare briefing docs.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 36,
    name: "Retail Banking",
    description:
      "Retail Banking prompts that help create branch talking points, summarize customer trends, and draft service improvement ideas.",
    status: "UNDER_EVALUATION",
    promptCount: 63,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 37,
    name: "USCC Retail Banking",
    description:
      "USCC Retail Banking prompts that help prepare performance tracking views, campaign roll-ups, and operational readiness updates.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  {
    id: 38,
    name: "Operations & Technology",
    description:
      "Operations & Technology prompts that help streamline operational processes, automate reporting, and summarize technology roadmaps.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "business-org",
  },
  // Functions
  {
    id: 39,
    name: "Human Resources",
    description:
      "HR prompts that help prepare job descriptions, draft policy updates, summarize surveys, and support people-ops activities.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 40,
    name: "Enterprise Services & Public Affairs",
    description:
      "Enterprise Services & Public Affairs prompts that help summarize initiatives, compose talking points, and support public-affairs workflows.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 41,
    name: "Finance",
    description:
      "Finance prompts that help prepare financial packages, forecast scenarios, create variance analysis, and generate planning workflows.",
    status: "UNDER_EVALUATION",
    promptCount: 63,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 42,
    name: "Global Legal Affairs & Compliance",
    description:
      "Legal & Compliance prompts that help summarize policies, prepare memos, and ensure legal review packages are structured clearly.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 43,
    name: "Chief Operating Office",
    description:
      "COO prompts that help coordinate operational dashboards, summary packs, and cross-functional execution updates.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 44,
    name: "Internal Audit",
    description:
      "Internal Audit prompts that help summarize findings, prepare audit plans, and support trackable remediation workflows.",
    status: "ADOPT",
    promptCount: 67,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 45,
    name: "Risk Management",
    description:
      "Risk Management prompts that help assess risk registers, summarize incidents, and support scenario analysis reporting.",
    status: "ADOPT",
    promptCount: 35,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 46,
    name: "Technology & Business Enablement",
    description:
      "Technology & Business prompts that help describe enablement initiatives, draft rollout plans, and summarize stakeholder impacts.",
    status: "UNDER_EVALUATION",
    promptCount: 63,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 47,
    name: "Product & Functions",
    description:
      "Product & Functions prompts that help generate product improvements, structure experiments, and author product documentation.",
    status: "UNDER_EVALUATION",
    promptCount: 28,
    updatedDate: "2025-08-18",
    category: "functions",
  },
  {
    id: 48,
    name: "Marketing",
    description:
      "Marketing prompts that help generate campaign concepts, draft copy variations, and summarize marketing performance.",
    status: "ADOPT",
    promptCount: 21,
    updatedDate: "2025-08-18",
    category: "functions",
  },
];

export const ROLE_MAPPING_VERSION = "1.1.2";

type MappingRow = {
  priority: number;
  roleKey: string;
  roleLabel: string;
  keywords: string[];
};

const ROLE_MAPPINGS: MappingRow[] = [
  { priority: 1, roleKey: "performance-engineer", roleLabel: "Performance Engineer", keywords: ["performance engineer", "performance test", "load test", "capacity"] },
  { priority: 2, roleKey: "security-engineer", roleLabel: "Security Engineer", keywords: ["security engineer", "cybersecurity", "infosec", "appsec"] },
  { priority: 3, roleKey: "devops-sre-engineer", roleLabel: "DevOps / SRE Engineer", keywords: ["devops", "sre", "site reliability", "ci/cd"] },
  { priority: 4, roleKey: "data-engineer", roleLabel: "Data Engineer", keywords: ["data engineer", "etl", "data pipeline", "data integration"] },
  { priority: 5, roleKey: "data-analyst", roleLabel: "Data Analyst", keywords: ["data analyst", "data science", "analytics", "business intelligence"] },
  { priority: 6, roleKey: "architect", roleLabel: "Architect", keywords: ["solution architect", "enterprise architect", "technical architect", "cloud architect", "architect"] },
  { priority: 7, roleKey: "ux-ui-designer", roleLabel: "UX / UI Designer", keywords: ["ux", "ui designer", "user experience", "interaction designer"] },
  { priority: 8, roleKey: "scrum-master", roleLabel: "Scrum Master", keywords: ["scrum master", "agile coach", "agile lead", "scrum"] },
  { priority: 9, roleKey: "technical-program-manager", roleLabel: "Technical Program Manager (TPM)", keywords: ["technical program", "technology program", "program manager"] },
  { priority: 10, roleKey: "product-owner", roleLabel: "Product Owner", keywords: ["product owner", "product manager", "product lead"] },
  { priority: 11, roleKey: "technology-adherence-manager", roleLabel: "Technology Adherence Manager (TAM)", keywords: ["technology adherence manager", "technology adherence", "adherence"] },
  { priority: 12, roleKey: "incident-manager", roleLabel: "Incident Manager", keywords: ["incident manager", "incident management", "command center"] },
  { priority: 13, roleKey: "release-manager", roleLabel: "Release Manager", keywords: ["release manager", "release management", "release admin"] },
  { priority: 14, roleKey: "human-resources", roleLabel: "Human Resources (HR)", keywords: ["human resources", "talent acquisition", "recruiter", "hrbp"] },
  { priority: 15, roleKey: "marketing", roleLabel: "Marketing", keywords: ["marketing", "campaign", "communications", "digital marketing"] },
  { priority: 16, roleKey: "finance-accounting", roleLabel: "Finance / Accounting", keywords: ["finance", "accounting", "financial analyst", "controller"] },
  { priority: 17, roleKey: "legal-compliance", roleLabel: "Legal / Compliance", keywords: ["legal", "compliance", "regulatory", "counsel"] },
  { priority: 18, roleKey: "operations", roleLabel: "Operations", keywords: ["operations", "ops manager", "process improvement", "workflow"] },
  { priority: 19, roleKey: "sales-relationship-management", roleLabel: "Sales / Relationship Management", keywords: ["sales", "relationship manager", "client manager", "account manager"] },
  { priority: 20, roleKey: "training-learning", roleLabel: "Training / Learning", keywords: ["training", "learning", "l&d", "enablement"] },
  { priority: 21, roleKey: "business-analyst", roleLabel: "Business Analyst", keywords: ["business analyst", "requirements analyst", "business systems analyst"] },
  { priority: 22, roleKey: "project-manager", roleLabel: "Project Manager", keywords: ["project manager", "project analyst", "it project", "pmo"] },
  { priority: 23, roleKey: "production-support", roleLabel: "Production Support", keywords: ["production support", "it support", "support engineer", "service desk"] },
  { priority: 24, roleKey: "quality-engineer", roleLabel: "Quality Engineer / Tester", keywords: ["quality", "qa", "tester", "test engineer", "sdet"] },
  { priority: 25, roleKey: "developer", roleLabel: "Developer / Software Engineer", keywords: ["developer", "software engineer", "full stack", "backend", "frontend"] },
];

export type MappedRole = {
  roleKey: string;
  roleLabel: string;
  priority: number;
  matchedKeyword: string | null;
  mappingVersion: string;
};

function normalizeForMatch(input: string): string {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapJobCodeDescriptionToRole(jobCodeDescription: string | null | undefined): MappedRole {
  const input = normalizeForMatch(String(jobCodeDescription ?? ""));
  if (!input) {
    return {
      roleKey: "other",
      roleLabel: "Other",
      priority: 26,
      matchedKeyword: null,
      mappingVersion: ROLE_MAPPING_VERSION,
    };
  }

  for (const mapping of ROLE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      const want = normalizeForMatch(keyword);
      if (want && input.includes(want)) {
        return {
          roleKey: mapping.roleKey,
          roleLabel: mapping.roleLabel,
          priority: mapping.priority,
          matchedKeyword: want,
          mappingVersion: ROLE_MAPPING_VERSION,
        };
      }
    }
  }

  return {
    roleKey: "other",
    roleLabel: "Other",
    priority: 26,
    matchedKeyword: null,
    mappingVersion: ROLE_MAPPING_VERSION,
  };
}

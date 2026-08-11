import type {
  CrawlCadence,
  EmploymentType,
  SearchScope,
  WorkMode,
} from "@jobmatch/shared";

interface SearchCriteriaInputFixture {
  name: string;
  workMode: WorkMode[];
  scope: SearchScope;
  employmentType: EmploymentType[];
  isDefault?: boolean;
}

export function validSearchCriteriaInput(
  overrides: Partial<SearchCriteriaInputFixture> = {},
): SearchCriteriaInputFixture {
  return {
    name: "Remote full-time",
    workMode: ["remote"],
    scope: "global_remote",
    employmentType: ["full_time"],
    ...overrides,
  };
}

interface JobBoardSourceInputFixture {
  criteriaId: string;
  name: string;
  baseUrl: string;
  queryTemplate: string;
  cadence?: CrawlCadence;
  enabled?: boolean;
}

export function validJobBoardSourceInput(
  criteriaId: string,
  overrides: Partial<Omit<JobBoardSourceInputFixture, "criteriaId">> = {},
): JobBoardSourceInputFixture {
  return {
    criteriaId,
    name: "Greenhouse remote eng",
    baseUrl: "https://boards.greenhouse.io/example",
    queryTemplate: "?department=engineering",
    ...overrides,
  };
}

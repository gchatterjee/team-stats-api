export const enum Gender {
  Women = "W",
  NonBinary = "X",
  Men = "M",
}

export interface ApiResponse<T> {
  totalItems: number;
  items: T[];
}

export interface Event {
  eventName: string;
  eventCode: string;
  startDateTime: string;
  weather: null;
  distanceName: string;
  distanceUnitCode: string;
  distanceDimension: number;
  venue: string;
  photoUrl: null;
  basnoPhotoUrl: null;
  photoUrlIndividual: null;
  basnoPhotoUrlIndividual: null;
  runnerAwardsCount: number;
  wheelchairAwardsCount: number;
  teamAwardsCount: number;
  teamsCount: number;
  customStatisticsCount: number;
  customMenu: null;
  headerImageId: null;
  headerImageExtension: null;
  logoImageId: number;
  logoImageExtension: null;
  isVirtual: boolean;
  virtualStartDate: number | null;
  virtualEndDate: number | null;
  isAllowedDeleting: boolean;
  calculateBestPace: boolean;
  submitResultsToRegistration: boolean;
  hasAgeGradedResults: boolean;
}

export interface TeamRunner {
  runnerId: number;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  city: string;
  stateProvince: string;
  countryCode: string;
  iaaf: string;
  bib: string;
  overallTime: string;
  pace: string;
  ageGradeTime: string;
  overallPlace: number;
  genderPlace: number;
  ageGroupPlace: number;
  ageGradePlace: number;
  ageGradePercent: number;
}

export interface TeamAward {
  awardId: number;
  minimumAge: number;
  runnersCount: number;
  summaryPlace: number;
  summaryTime: number;
  teamCode: string;
  teamGender: Gender;
  teamGroupOrder: number;
  teamName: string;
  teamOrder: number;
}

export interface TeamAwardRunner {
  age: number;
  bib: string;
  city: string;
  country: string;
  finishPlace: number;
  finishTime: number;
  firstName: string;
  gender: Gender;
  iaaf: string;
  lastName: string;
  runnerId: number;
  stateProvince: string;
}

export interface RunnerRace {
  actualPace: string;
  actualTime: string;
  bib: string;
  distanceName: string;
  eventCode: string;
  eventName: string;
  runnerId: string;
  startDateTime: string;
  venue: string;
}

export type AugmentedRunnerRace = RunnerRace & {
  teamCode: string | null;
};

export type Document = {
  eventCode: string;
  document: {
    event: Event;
    results: ApiResponse<TeamRunner>;
    awards: (TeamAward | { runners: TeamAwardRunner[] })[];
    runners: Record<number, AugmentedRunnerRace[]>;
  };
};

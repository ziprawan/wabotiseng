export type EventLocation = {
  latitude: number;
  longitude: number;
  name: string;
};

export type EventMessage = {
  name: string;
  description: string;
  location: EventLocation;
  isCanceled: boolean;
  startAt: Date;
  joinLink?: string;
};

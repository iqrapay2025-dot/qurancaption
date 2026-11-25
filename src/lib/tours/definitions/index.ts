import type { TourDefinition, TourId } from "../types";
import { welcomeTour } from "./welcome";
import { quranReaderTour } from "./quran";
import { mushafTour } from "./mushaf";
import { plannerTour } from "./planner";
import { listenTour } from "./listen";
import { adhkarTour } from "./adhkar";
import { editorTour } from "./editor";
import { bookmarksTour } from "./bookmarks";

export const TOURS: Record<TourId, TourDefinition> = {
  welcome: welcomeTour,
  "quran-reader": quranReaderTour,
  mushaf: mushafTour,
  planner: plannerTour,
  listen: listenTour,
  adhkar: adhkarTour,
  editor: editorTour,
  bookmarks: bookmarksTour,
};

export const TOUR_LIST: TourDefinition[] = [
  welcomeTour,
  quranReaderTour,
  mushafTour,
  plannerTour,
  listenTour,
  adhkarTour,
  editorTour,
  bookmarksTour,
];

export function getTourById(id: string): TourDefinition | undefined {
  return TOURS[id as TourId];
}

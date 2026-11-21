import type { TourDefinition, TourId } from "../types";
import { welcomeTour } from "./welcome";
import { quranReaderTour } from "./quran";
import { listenTour } from "./listen";
import { editorTour } from "./editor";
import { bookmarksTour } from "./bookmarks";

export const TOURS: Record<TourId, TourDefinition> = {
  welcome: welcomeTour,
  "quran-reader": quranReaderTour,
  listen: listenTour,
  editor: editorTour,
  bookmarks: bookmarksTour,
};

export const TOUR_LIST: TourDefinition[] = [
  welcomeTour,
  quranReaderTour,
  listenTour,
  editorTour,
  bookmarksTour,
];

export function getTourById(id: string): TourDefinition | undefined {
  return TOURS[id as TourId];
}
